# Zadání pro implementaci: odolnost provozu (rate limit, PostgreSQL, offline POS)

Tři samostatné implementační dávky, které vzešly z [E2E auditu 2026-08-07](../testing/e2e-audit-2026-08-07.md)
a z otázky „vydrží aplikace 10 barů na festivalu?“. Každá dávka je vlastní PR, vlastní repo, vlastní
akceptační kritéria. Pořadí podle poměru přínos/riziko: **1 → 2 → 3**.

Naměřený výchozí stav (lokální backend, PostgreSQL v Dockeru, `POST /api/v1/sales`):
medián **12 ms** na prodej, p95 20 ms; při 10 souběžných klientech **≈120 prodejů/s**, p95 96 ms,
0 chyb. Výkon jedné instance API tedy limitem není — limitem je rate limit, síť a odolnost DB.

---

## Dávka 1 — Rate limit nesmí trestat celou provozovnu za jednu IP

**Repo:** `vystaveno-api` · **Soubor:** `src/Vystaveno.Api/Program.cs` (řádky ~65–120)

### Dnešní stav (ověřeno v kódu)

```csharp
static string ClientIp(HttpContext ctx) => ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    RateLimitPartition.GetFixedWindowLimiter(ClientIp(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 600, Window = TimeSpan.FromMinutes(1) }));
```

- globální limit **600 req/min na IP**, `auth` a `pin` 10/min, `public-booking` 8/min,
  `public-portal` 30/min, `public-api` 120/min **na token**, `job-file-upload` 30/min na uživatele
- `UseForwardedHeaders()` běží před limiterem, takže `RemoteIpAddress` je skutečná klientská IP
- `ForwardedHeadersOptions` má `KnownProxies.Clear()` + `KnownIPNetworks.Clear()` → API věří
  `X-Forwarded-For` od kohokoli
- `app.UseRateLimiter()` je **před** `app.UseAuthentication()` → v partition funkci **nejsou
  dostupné JWT claims** (žádné `companyId`, žádné `sub`)

### Problém

Festival s 10 bary sedí za jednou konektivitou = jedna veřejná IP. Restaurace i KDS se dotazují
každých 5 s (`RestauracePage.vue:261`, `KuchynePage.vue:264`), takže 20 zařízení vygeneruje
240–480 req/min jen pollingem, než kdokoli něco prodá. Limit 600/min se přetáhne a **provoz dostane
429 kvůli sousednímu baru**. Audit to reprodukoval: se čtyřmi Playwright workery backend vrátil
780× HTTP 429.

Druhý, méně viditelný problém: kdokoli může poslat `X-Forwarded-For: <náhodná IP>` a dostat vlastní
kbelík — dnešní limit tedy proti cílenému útoku stejně nechrání, jen proti nešikovnosti.

### Co udělat

1. **Přesunout `app.UseRateLimiter()` za `app.UseAuthentication()`** (před `UseAuthorization`),
   aby partition funkce viděla claims. Ověřit, že per-endpoint policy metadata dál fungují
   (limiter musí zůstat za `UseRouting`).
2. **Globální limiter partitionovat podle identity, ne podle IP:**
   - přihlášený request → `company:{companyId}` (claim `companyId`), limit **3000/min** (10 barů ×
     ~2 zařízení × polling + provoz má rezervu ~5×)
   - request s API tokenem → ponechat stávající `public-api` chování (per token)
   - nepřihlášený request → `ip:{ClientIp}` s dnešním limitem 600/min
   - hodnoty vytáhnout do konfigurace (`RateLimit:Company`, `RateLimit:Anonymous`, …) s dnešními
     čísly jako default, aby šly na VPS doladit bez rebuildu
3. **Ponechat přísné per-IP policy** u `auth`, `pin`, `public-booking`, `public-portal` — tam je
   IP správná osa (brute-force), a NEZVYŠOVAT je.
4. **Zúžit důvěru k proxy hlavičkám:** `KnownProxies`/`KnownIPNetworks` naplnit z konfigurace
   (v compose je před API jen nginx/Caddy z docker sítě). Fallback: když konfigurace chybí,
   chovat se jako dnes, ale zalogovat varování při startu.
5. **Do odpovědi 429 doplnit `Retry-After`** (už je) a do `ProblemDetails` uživatelskou českou větu
   bez technického žargonu (viz CLAUDE.md §6) — zkontrolovat, že frontend ji zobrazí, ne že spadne.

### Akceptační kritéria

- Integrační test: dvě různé firmy za **stejnou IP** se navzájem nevyčerpají — firma A vyčerpá svůj
  limit, firma B dostane 200.
- Integrační test: přihlášený klient dostane 429 až po překročení `RateLimit:Company`, ne po 600.
- Integrační test: `auth` policy dál limituje na 10/min podle IP (brute-force se nezhoršil).
- Test, že `X-Forwarded-For` od nedůvěryhodného odesílatele nemění partition, když jsou
  `KnownProxies` nakonfigurované.
- `dotnet test` zelené, `EndpointAuthorizationConventionTests` beze změny.

### Mimo rozsah

Přechod na sliding-window/token-bucket, distribuovaný limiter (Redis), změna pollingu na SSE.

---

## Dávka 2 — PostgreSQL: přežít výpadek, ne jen mít zálohu

**Repo:** `vystavenocz` (compose + `ops/`) · **Soubory:** `docker-compose.yml`,
`docker-compose.prod.yml`, `ops/vps-*.sh`, `docs/vps-reliability.md`

### Dnešní stav (ověřeno)

- jeden kontejner `db` (`postgres:16-alpine`), data ve volume `pgdata`, healthcheck `pg_isready`
- API se připojuje přímo (`Host=db`), žádný pooler
- `ops/vps-backup.sh` dělá konzistentní snapshot PostgreSQL + `api_files`, publikuje ho atomicky;
  `ops/vps-verify-backup.sh` obnovuje do izolovaného PostgreSQL; `ops/vps-health-check.sh` hlídá
  stáří zálohy a disk
- žádná replika, žádné WAL archivování → **obnova jde jen k poslednímu snapshotu**, změny od té
  doby jsou pryč; výpadek DB = výpadek celého provozu

### Co udělat

1. **PITR (Point-in-Time Recovery) místo pouhých snapshotů.** Zapnout `archive_mode`, WAL posílat
   do stejného úložiště jako zálohy (`ops/vps-backup.sh` už řeší retenci a atomicitu — rozšířit ho,
   ne psát nový nástroj). Cíl: RPO v jednotkách minut místo „od poslední noci“.
2. **Hot standby replika** (streaming replication) jako druhá služba v compose na stejném stroji
   NEBO na druhém VPS. Bez automatického failoveru — stačí ruční `promote` s napsaným postupem;
   automatika (Patroni) je mimo rozsah.
3. **Postup obnovy do 15 minut** doplnit do `docs/vps-reliability.md`: co spustit, jak přepnout
   `Database__ConnectionString`, jak ověřit, že běží správný uzel, jak se vrátit zpět.
4. **Rozšířit `ops/vps-health-check.sh`**: stáří posledního WAL segmentu, replikační lag, volné
   místo pro WAL (plný disk WAL = zastavená databáze).
5. **Připravit provoz na festival:** dokumentovat postup pro předakční kontrolu (záloha ověřená
   restorem, replika v syncu, volné místo, otestované přepnutí).

### Akceptační kritéria

- `ops/vps-verify-backup.sh` (nebo nový krok) prokáže obnovu **na konkrétní čas** (PITR), ne jen
  na snapshot; test je součástí `ops/tests/`.
- Simulovaný pád primárního uzlu: podle dokumentace jde do 15 minut běžet nad replikou, aplikace
  po přepnutí funguje (přihlášení, prodej, uzávěrka).
- Health check hlásí replikační lag a zaplnění WAL adresáře.
- Nic z toho nesmí změnit chování aplikace ani migrace (forward-only pravidlo platí dál).

### Mimo rozsah

Automatický failover, multi-region, managed PostgreSQL. Pokud vyjde levněji managed služba,
napiš to jako doporučení do dokumentace — ale migraci neprováděj.

---

## Dávka 3 — Offline režim POS (největší kus, dělej ho jako poslední)

**Repo:** `vystavenocz` (frontend) + drobnosti v `vystaveno-api` · **Soubory:**
`src/pages/PokladnaPage.vue`, `src/composables/useSales.ts`, `src/lib/http.ts`, `vite.config.ts`

### Dnešní stav (ověřeno)

- PWA plugin už je nasazený (`vite-plugin-pwa`), ale precachuje jen app shell
  (`globPatterns: **/*.{js,css,html}`); **žádná data, žádná fronta zápisů**
- `RestauracePage.vue` má indikátor `connectionState` (`online | syncing | offline`) — jen
  informativní, prodej při výpadku nedokončí
- `POST /sales` už umí **idempotency klíč** (`CreateSaleRequest.IdempotencyKey`, backend má
  advisory lock + filtrovaný unique na `Sale.IdempotencyKey`) — základ pro bezpečnou synchronizaci
  už existuje a nesmí se obcházet
- backend **odmítne prodej do uzavřeného dne** (`SaleService.EnsureDayNotClosedAsync`, 409) a
  serializuje prodeje s uzávěrkou přes `pg_advisory_xact_lock`
- ceny, promo, cenové hladiny a věrnostní body počítá **výhradně server**
  (`SaleService.PersistSaleAsync`) — offline klient je počítat nesmí

### Cíl

Bar musí při výpadku sítě dál prodávat: naskenovat/naklikat položky, vzít hotovost, vytisknout
účtenku a po obnovení spojení všechno bezpečně doúčtovat — **bez duplicit a bez vymyšlených cen**.

### Návrh řešení

1. **Offline katalog.** Produkty, kategorie, cenové hladiny a promo pravidla pro zvolenou pobočku
   uložit do IndexedDB při každém úspěšném načtení. Stáří dat zobrazit v UI („ceník z 14:32“).
2. **Fronta prodejů.** Prodej vzniklý offline se uloží do IndexedDB s:
   - `idempotencyKey` (vygenerovaný jednou, při retry se NEMĚNÍ),
   - časem pořízení (`soldAt`) — server ho musí umět přijmout, viz bod 5,
   - snapshotem položek a hotovosti,
   - stavem `pending | syncing | failed`.
3. **Synchronizace.** Po návratu sítě odesílat frontu sériově, s exponenciálním backoffem.
   Výsledky:
   - `201` → prodej hotový, z fronty pryč
   - `409 den uzavřen` → prodej **nezahazovat**; označit `failed` s jasnou hláškou a nabídnout
     manažerovi rozhodnutí (den znovu otevřít / prodej zapsat na další den)
   - `422 / 403` → `failed` s uživatelskou hláškou, nikdy tiché zahození
4. **UI pravdy.** Offline stav musí být vidět (nezaměnitelně, ne jen ikonka), s počtem čekajících
   účtenek. Nikdy nesmí tvrdit „zaplaceno a odesláno“, když je prodej ve frontě — účtenka
   vytištěná offline se označí jako **doklad k doúčtování**, dokud sync neproběhne (konzultovat
   text s pravidly v CLAUDE.md §6 — žádný falešný úspěch).
5. **Backend:** `CreateSaleRequest` doplnit o volitelný `SoldAt` (offline čas pořízení) se stejnou
   sémantikou jako `POST /sales/import` (`Sale.CreatedAt` se nastaví po insertu přes `ExecuteUpdate`).
   Server ho přijme jen v rozumném okně (např. 24 h zpět, nikdy do budoucna) a jen pro **neuzavřený**
   business den; jinak 409/422 s vysvětlením. Bez toho by offline prodej spadl do špatného Z-reportu.
6. **Co offline NEJDE** (a UI to musí říct předem, ne až po pokusu): platba kartou přes terminál,
   věrnostní body (server drží zůstatek), sleva nad limit s manažerským PINem, storno, uzávěrka dne,
   objednávky ke stolu z QR. Offline držet jen jednoduchý hotovostní prodej z pokladny.

### Akceptační kritéria

- E2E (mock i API režim): vypnutá síť → prodej dokončitelný, po zapnutí sítě se objeví na serveru
  **právě jednou**; opakovaný sync se stejným klíčem nevytvoří druhý prodej.
- E2E: prodej pořízený offline do dne, který se mezitím uzavřel, skončí srozumitelnou hláškou a
  zůstane ve frontě — nikdy nezmizí.
- E2E: po tvrdém refreshi během offline provozu fronta i katalog přežijí (IndexedDB, ne paměť).
- Sklad a Z-report po synchronizaci sedí s tím, co se reálně prodalo (kontrola přes zrcadlo skladu
  a uzávěrku).
- `npm run build`, `npm run lint`, `vitest`, `npm run test:e2e` zelené; nové testy u fronty a syncu.

### Rizika, na která si dát pozor

- **Duplicitní účtenky** — jediná ochrana je idempotency klíč; nikdy negenerovat nový klíč při retry.
- **Ceny** — offline se smí použít jen uložený ceník; promo/hladiny/body dopočítá server při syncu
  a výsledná částka se může lišit → UI musí umět ukázat rozdíl, ne ho zamlčet.
- **Uzávěrka** — obsluha nesmí zavřít den, dokud je fronta neprázdná; přidat blokaci s vysvětlením.
- **Více zařízení** — každé zařízení má vlastní frontu; při syncu se nesmí přepsat cizí prodeje.
- Nepouštět offline do gastro účtů u stolů (sdílený stav mezi zařízeními) — to je samostatný,
  mnohem těžší problém.

### Mimo rozsah

Offline pro Restauraci/KDS, offline tisk přes agenta, offline věrnostní program, konfliktní editace
katalogu.

---

## Doporučené pořadí a odhad

| Dávka           | Přínos pro festival | Riziko změny | Poznámka                                  |
| --------------- | ------------------- | ------------ | ----------------------------------------- |
| 1 · rate limit  | vysoký              | nízké        | bez toho může 429 shodit provoz celé akce |
| 2 · PostgreSQL  | vysoký              | střední      | chrání data, ne dostupnost pokladny       |
| 3 · offline POS | nejvyšší            | vysoké       | jediné, co pomůže při výpadku konektivity |

Do vyřešení dávky 3 platí provozní opatření: mít záložní konektivitu (druhá SIM/router) a počítat
s tím, že bez sítě se neúčtuje.

## Poznámka k počtu instancí API

Výkonově stačí **jedna** instance (naměřeno ≈120 prodejů/s, festival potřebuje jednotky za sekundu).
Než se pustíš do horizontálního škálování, vyřeš `ReservationReminderJob`
(`src/Vystaveno.Infrastructure/Booking/ReservationReminderJob.cs`): připomínku odesílá PŘED zápisem
do `ReservationReminderLog`, takže druhá instance ji může odeslat podruhé. Ostatní joby jsou vůči
více instancím ošetřené — `RecurringInvoiceJob` (row-lock + `periodKey`), `WebhookDeliveryJob`
(lease claim), `OverdueInvoiceJob` (podmíněný `ExecuteUpdate`).
