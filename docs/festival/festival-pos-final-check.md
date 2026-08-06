# Festivalový POS — finální kontrola před ostrým provozem

**Datum auditu:** 2026-08-05
**Rozsah:** vystaveno-api `main` `3d4d5a2` · vystavenocz `main` `56072e8` · vystaveno-mobile `main` `3452df1`
**Prostředí:** lokální backend (`localhost:5176`) nad testovací DB `vystaveno_e2e` s demo firmou
„Vystaveno Demo Gastro“ (3 pobočky: Centrum, Zahrádka, Event bar), web v API režimu (`localhost:5173`),
**Android tablet 1280×800 (emulátor `festival_tablet`, Android 15, arm64)**.

> **Žádná ostrá platba, refund, storno ani výdej skladu neproběhly nad produkčními daty.**
> Funkční audit běžel výhradně proti testovací databázi. Na produkci `vystaveno.cz` proběhlo jen
> ověření spojení a **čtecí** průchod mobilní aplikace na tabletu (§2.8): `ping`/`health`, přihlášení
> účtem demo firmy, prohlídka pokladny a naplnění košíku — **platbu jsem záměrně nedokončil**
> a nakonec se odhlásil. Žádný zápis do provozních dat.
> Report neobsahuje žádné heslo, PIN, token ani platební údaj.

---

## 1. Verdikt

# READY WITH MANUAL STEPS

Jádro POS je pro festivalový provoz **bezpečné**: server je jediným zdrojem pravdy o ceně,
souběžné prodeje ani dvojklik nevytvoří duplicitu, tenant a pobočková izolace drží pod tlakem,
uzávěrka se nedá obejít a audit log sedí. **Není tu riziko dvojí platby ani přístupu k cizím datům.**

Původní tři P1 už **nejsou otevřené** — dva jsou opravené v kódu a ověřené, u třetího zůstává jen
chybějící funkce (ne chybné chování). Podrobnosti k opravám jsou v **§7**.

| #        | Problém                                               | Stav                                                                                                                                  |
| -------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **P1-1** | Mobilní pokladna posílala prodej **bez pobočky**      | ✅ **OPRAVENO** — bez zvolené pobočky pokladna neprodá, volba je vidět v liště a přežije restart (§7.3, 5 testů + ověřeno na tabletu) |
| **P1-2** | `Auth__PinLookupKey` nebyl v žádné deploy konfiguraci | ✅ **OPRAVENO** — doplněn do compose i `docs/deployment-vps.md`; operátor jen vygeneruje klíč (§7.4)                                  |
| **P1-3** | PIN přihlášení a sdílený terminál nemají klienta      | ⚠️ **funkce chybí dál** (nová funkčnost je mimo zadání auditu), ale UI už to **neslibuje falešně** (§7.5)                             |

**Vydání proto podmiňuji jen projitím checklistu v §9** — hlavně vygenerováním `AUTH_PIN_LOOKUP_KEY`,
nastavením limitů slev a tím, že každý barman dostane účet s e-mailem (PINem se sám nepřihlásí).

---

## 2. Co bylo reálně otestováno (živý průchod)

### 2.1 Povinný průchod barmana — Android tablet, skutečné klepání

Emulátor `festival_tablet` (1280×800, 160 dpi), debug APK proti lokálnímu API přes `10.0.2.2`.
**Toto je první skutečný Android runtime průchod tohoto produktu** — dosud byl ověřený jen iOS.

| #   | Krok                              | Výsledek                                                                                                               |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Spuštění aplikace                 | ✅ přihlašovací obrazovka, bez pádu                                                                                    |
| 2   | Přihlášení obsluhy (Employee)     | ✅ přihlášení e-mailem + heslem                                                                                        |
| 3   | **Ověření správného baru**        | ❌ tehdy: na pokladně nebyla vidět, výchozí „—“ → **opraveno, viz §7.3**                                               |
| 4   | Otevření pokladny                 | ✅ barman přistane rovnou na Pokladně                                                                                  |
| 5   | Výběr kategorií                   | ✅ „Káva a nápoje“ → 3 produkty                                                                                        |
| 6   | Přidání produktů                  | ✅ dlaždice → košík                                                                                                    |
| 7   | Změna množství                    | ✅ +/− na řádku, 2× Cola = 90 Kč                                                                                       |
| 8   | Poznámka / modifikátor            | ✅ poznámka „bez ledu“ dorazila na bon; povinná skupina modifikátorů je vynucená serverem (422)                        |
| 9   | Kontrola košíku a součtu          | ✅ 2×45 + 1×69 = **159,00 Kč**                                                                                         |
| 10  | Výběr platební metody             | ✅ Hotovost / Karta                                                                                                    |
| 11  | Bezpečné dokončení prodeje        | ✅ „Prodej dokončen“, 159,00 Kč / bez DPH 141,97 / DPH 17,03                                                           |
| 12  | Zobrazení účtenky                 | ✅ PDF s IČO/DIČ, položkami, rozpadem DPH, datem a číslem dokladu                                                      |
| 13  | Okamžitý nový prodej              | ✅ košík vyčištěn, „Nový prodej“                                                                                       |
| 14  | **Dvě rychlá klepnutí na platbu** | ✅ **vznikl přesně JEDEN prodej** (1119 → 1120), účtenka nese idempotency klíč                                         |
| 15  | Timeout / slabá síť               | ✅ viz §2.4                                                                                                            |
| 16  | Odhlášení obsluhy                 | ✅ potvrzovací dialog → přihlašovací obrazovka                                                                         |
| 17  | Přihlášení jiného uživatele       | ✅ funguje (emulátorová klávesnice `adb input text` je nespolehlivá — testovací artefakt, ne chyba produktu)           |
| 18  | **Nezůstala předchozí data?**     | ✅ v úložišti aplikace **není po odhlášení žádný token**; PDF účtenka v cache tehdy zůstávala → **opraveno, viz §7.7** |

**Chování z pozadí a po restartu (ověřeno klepáním):**

| Scénář                        | Výsledek                                              |
| ----------------------------- | ----------------------------------------------------- |
| Návrat z pozadí (HOME → zpět) | ✅ relace i **rozdělaný košík zůstaly** (114,00 Kč)   |
| `force-stop` aplikace         | ✅ relace obnovena bez přihlašování, ⚠️ košík ztracen |
| **Restart celého zařízení**   | ✅ relace obnovena bez přihlašování, ⚠️ košík ztracen |

Ztráta košíku je korektní (in-memory) a **nevytváří žádný prodej-duch** — jen se musí naúčtovat znovu.

### 2.2 Povinný průchod vedoucího baru — živé API

Persona „Manažerka Marie“ (`Manager`, scoped na pobočku Centrum):

| Co                                | Výsledek                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Přehled směn                      | ✅ `GET /shifts`                                                                                                         |
| Tržby pobočky                     | ✅ `pos-reports/summary`, `/staff` — jen svá pobočka                                                                     |
| Denní souhrn                      | ✅ 15 prodejů / 203,55 Kč / hotovost 203,55 / karta 0                                                                    |
| Prodeje (historie)                | ✅ 377 dokladů                                                                                                           |
| Stav skladu pobočky               | ✅ `stock-levels?locationId=`                                                                                            |
| Nízké zásoby                      | ✅ `low-stock?locationId=`                                                                                               |
| Storno podle role                 | ✅ Manager stornuje rovnou (200); druhé storno → **409**                                                                 |
| Sleva podle role                  | ✅ limit slevy vynucený, viz §2.3                                                                                        |
| Schvalování rizikových akcí       | ✅ fronta + limity (storno 1000 / odpis 1500 / inventura 3000 Kč)                                                        |
| Uzávěrka v bezpečném režimu       | ✅ na vlastní izolované testovací pobočce, Z-report č. 1                                                                 |
| **Zákaz přístupu k jiné pobočce** | ✅ **6/6 pokusů → 403** (uzávěrka, sklad, low-stock, reporty, výkon obsluhy, účetní export)                              |
| Audit provedených akcí            | ✅ `SaleCancelled`, `DayClosed`, `ApprovalRequested/Approved` (Manager sám na `/company/audit` nemá — je to Owner/Admin) |

### 2.3 Povinný security audit — živé HTTP volání, ne kód

Všech **41 kontrol prošlo.**

**Barman (Employee) nesmí:**

| Kontrola                                                | Výsledek                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Měnit ceny (`PUT /products/{id}`)                       | ✅ 403                                                                      |
| Spravovat produkty (`POST` / `DELETE /products`)        | ✅ 403 / 403                                                                |
| Vidět firemní finance (`pos-reports/summary`, `/costs`) | ✅ 403 / 403                                                                |
| Vidět nákupní cenu (`catalog.cost_view`)                | ✅ `purchasePrice = null` (Ownerovi 6,00 Kč)                                |
| Číst audit log, tým, API tokeny                         | ✅ 403 / 403 / 403                                                          |
| Měnit moduly a nastavení firmy                          | ✅ 403 / 403                                                                |
| Zavřít den                                              | ✅ 403                                                                      |
| Registrovat POS terminál                                | ✅ 403                                                                      |
| **Přepnout se na jinou firmu**                          | ✅ **404** (existenci cizí firmy neprozradí)                                |
| Neautorizované storno                                   | ✅ **202** — fronta schválení, prodej zůstává `Completed`, sklad se nevrátí |

**Barman smí to, co k prodeji potřebuje:** produkty, kategorie, historie prodejů, výpočet ceny košíku, pobočky — vše 200. ✅

**Tenant izolace (proti reálné druhé firmě založené registrací):**

| Kontrola                                         | Výsledek             |
| ------------------------------------------------ | -------------------- |
| Cizí prodej: `GET` jako demo Owner               | ✅ 404               |
| Cizí prodej: storno jako demo Owner              | ✅ 404               |
| Cizí prodej: `GET` jako barman                   | ✅ 404               |
| Cizí účtenka (PDF)                               | ✅ 404               |
| Demo prodej z cizí firmy                         | ✅ 404               |
| Cizí firma nevidí demo katalog / pobočky / audit | ✅ 0 / 0 / 0 záznamů |
| Cizí firma neprodá na demo pobočku               | ✅ odmítnuto         |

**Zařízení a relace:**

| Kontrola                       | Výsledek                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Bez tokenu / rozbitý token     | ✅ 401 / 401                                                                                               |
| Terminálová gateway bez tokenu | ✅ 401                                                                                                     |
| Po restartu zařízení           | ✅ relace bezpečně obnovena z uloženého refresh tokenu                                                     |
| Po odhlášení nezůstal token    | ✅ v `shared_prefs` jen prázdný keyset EncryptedSharedPreferences                                          |
| **Tokeny v logu**              | ✅ **při `LogLevel=Debug` (449 řádků, 354 kB) NULA výskytů** JWT, `Bearer`, hesla, PINu i tokenu terminálu |

**Admin obrazovka přes deep link:** mobilní `Nastavení` je pro barmana **jen ke čtení** (účet, firma, tmavý
režim, odhlášení) — žádná editace. Podtitul v menu slibuje „číselné řady, tým“, které tam nejsou (kosmetika, P3).
Web posílá role bez nároku na `/app/modul/:module`, backend odmítá nezávisle na UI.

**Idempotence prodeje — měřeno na skladu, ne jen na odpovědi:**

| Scénář                                    | Výsledek                                                        |
| ----------------------------------------- | --------------------------------------------------------------- |
| Retry se stejným klíčem                   | ✅ vrátí **PŮVODNÍ** prodej, sklad odečten **1×** (32 → 31)     |
| **Bez klíče** (chování webu před opravou) | ⚠️ **2 prodeje, sklad odečten 2×** (31 → 29) — potvrzené riziko |
| 5 souběžných prodejů (5 barmanů)          | ✅ 5 různých prodejů, sklad −5, žádný lost update               |
| 5× stejný klíč naráz                      | ✅ **JEDEN** prodej, sklad −1                                   |
| Klientský timeout + retry                 | ✅ jeden prodej, v historii právě jednou                        |

### 2.4 Síť a platby — reálné přepnutí do letadlového režimu

| Scénář                             | Výsledek                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Výpadek Wi-Fi uprostřed platby** | ✅ „Nepodařilo se připojit k serveru. Zkontrolujte připojení.“ — **košík zachován, žádný prodej nevznikl** (1120 → 1120) |
| **Návrat sítě + opakování**        | ✅ vznikl **právě jeden** prodej (1120 → 1121)                                                                           |
| Timeout API + retry                | ✅ idempotence drží (§2.3)                                                                                               |
| Restart aplikace během prodeje     | ✅ žádný prodej-duch                                                                                                     |
| Restart zařízení                   | ✅ relace obnovena, žádný prodej-duch                                                                                    |
| Duplicitní payment callback        | — netestovatelné, viz §5                                                                                                 |

**Nikdy nedošlo k falešnému úspěchu.** Aplikace nikdy netvrdila „zaplaceno“, když prodej nevznikl.

### 2.5 Bar / kuchyně — objednávky na účet

| Krok                                                | Výsledek                                     |
| --------------------------------------------------- | -------------------------------------------- |
| Otevření účtu u stolu                               | ✅ 200                                       |
| Položka + poznámka                                  | ✅ poznámka „bez ledu“ dorazila na bon       |
| Odeslání na stanice                                 | ✅ 200                                       |
| Bon ve frontě KDS (kuchař)                          | ✅ 1 položka                                 |
| Posun `Preparing → Ready → Served`                  | ✅ 204 / 204 / 204                           |
| Zpětný posun `Served → Preparing`                   | ✅ **409** (nelze vrátit)                    |
| Stejný stav podruhé                                 | ✅ 204, idempotentní                         |
| **3 terminály platí týž účet naráz**                | ✅ **uspěje právě JEDEN (200), ostatní 409** |
| Kuchař na prodej / účet / platbu / tržby / uzávěrku | ✅ 403 × 5                                   |

### 2.6 Uzávěrka, hotovost, sklad

| Kontrola                     | Výsledek                                                         |
| ---------------------------- | ---------------------------------------------------------------- |
| Uzávěrka dne (Z-report)      | ✅ číslo, počty, součty, očekávaná hotovost, rozdíl              |
| **Prodej do uzavřeného dne** | ✅ **409**                                                       |
| Druhá uzávěrka téhož dne     | ✅ **409**                                                       |
| Uzávěrka s otevřeným účtem   | ✅ 409 (dokumentováno v kódu i e2e)                              |
| Hotovost pokrývá účet        | ✅ 1000 Kč na 69 Kč → vráceno **931,00 Kč**                      |
| Hotovost nepokrývá účet      | ✅ 422                                                           |
| Hotovost u platby kartou     | ✅ 422                                                           |
| Sklad na správné pobočce     | ✅ prodej na Zahrádce nesnížil Centrum                           |
| Sklad smí do mínusu          | ⚠️ **záměr** — prodej se nikdy nezablokuje kvůli skladu (0 → −1) |
| Účetní export tržeb          | ✅ Generic CSV 3 830 B, Pohoda XML 29 467 B                      |
| Účetní export Z-reportů      | ✅ Generic CSV + Pohoda XML                                      |

### 2.7 Neplatné vstupy — server je zdroj pravdy o ceně

Záporná cena → 422 · prázdný košík → 422 · neexistující produkt → 422 · hotovost pod částkou → 422 ·
sleva nad limit obsluhy → **403 s `overridable: true`** · sleva pod limitem → 201. ✅

### 2.8 Android proti OSTRÉMU serveru `vystaveno.cz`

Funkční audit běžel proti testovací databázi. Navíc jsem aplikaci sestavil **na hostname
`https://vystaveno.cz/api/v1`** (nikdy na IP) a prošel s ní produkci na tabletu — **bez jediného
zápisu do provozních dat**: platbu jsem záměrně nedokončil, viz konec sekce.

**Spojení — hostname, ne IP**

| Kontrola                                        | Výsledek                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Produkční API                                   | ✅ `GET /api/v1/ping` → `200 {"status":"ok"}`, `/health/live` i `/ready` → `Healthy`      |
| Je produkce na úrovni `main`?                   | ✅ `/entitlements`, `/pos-terminals`, `/subscription-claims/me` → `401` (existují)        |
| Build APK                                       | ✅ `BuildConfig.API_BASE_URL = "https://vystaveno.cz/api/v1"` — **hostname**              |
| IP nikde v konfiguraci                          | ✅ `grep 91.134.23.91` ve zdrojích, `build.gradle.kts` i `gradle.properties` → 0 výskytů  |
| DNS z emulátoru                                 | ✅ `ping vystaveno.cz` → `vps-028aa3d9.vps.ovh.net (91.134.23.91)`                        |
| **Síťová vrstva** — `/proc/net/tcp` v emulátoru | ✅ navázané TLS spojení na `91.134.23.91:443` (= to, na co `vystaveno.cz` ukazuje)        |
| Holá IP `https://91.134.23.91/api/v1`           | ❌ **nepoužitelná** — `http_code=000` i s `-k`; server odpovídá jen na SNI `vystaveno.cz` |
| Guard v buildu proti holé IP                    | ✅ `assembleRelease` s IP **BUILD FAILED** („must use a hostname, not a bare IP")         |

**Průchod na tabletu proti produkci** (účet demo firmy, role Owner)

| Krok                         | Výsledek                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Přihlášení e-mailem a heslem | ✅ Přehled: dnešní tržby 0,00 Kč / 0 účtenek, 2 faktury po splatnosti 66 550,00 Kč               |
| Otevření pokladny            | ✅ 4 čisté kategorie (Vše, Káva a nápoje, Kuchyně, Alkohol), 14 produktů s cenami                |
| Filtr kategorie              | ✅ „Alkohol" → Pivo Plzeň 0,5 (59 Kč), Víno rozlévané 0,2 (65 Kč)                                |
| Přidání položek + množství   | ✅ 2× Pivo + 1× Cappuccino                                                                       |
| Kontrola součtu              | ✅ 2×59 + 69 = **187,00 Kč**                                                                     |
| Cenová hladina / věrnost     | ✅ Základní · Personál · VIP host; výběr zákazníka i „Nový"                                      |
| **Volba baru**               | ❌ **P1-1 potvrzen i na produkci** — chipy `— · Centrum · Event bar · Zahrádka`, vybráno **„—"** |
| Dokončení platby             | ⛔ **záměrně neprovedeno** — nezapisuji do provozních dat                                        |
| Odhlášení                    | ✅ potvrzovací dialog → přihlašovací obrazovka, v úložišti zařízení **nezůstal žádný token**     |
| Google/Apple přihlášení      | ❌ viz **P2-5** (`assetlinks.json` — serverová část opravena, čeká na otisk klíče)               |

Volba baru je na produkci ještě názornější než na testovací DB: chipy jsou přesně tři festivalové
bary a vybraný je **„—"**. Barman, který nesjede na konec košíku, prodá **bez baru**.

> Pozn.: „Smazat účet" je v Nastavení hned pod „Odhlásit se" (60 px). U vlastníka firmy je to
> nebezpečné sousedství — na dotykovém tabletu si o překlep říká. Zaznamenáno jako **P3-8**.

**Příkaz pro festivalový tablet:**

```bash
cd vystaveno-mobile
./gradlew :composeApp:installDebug -Pvystaveno.enableIos=false \
  -Pvystaveno.apiBaseUrl=https://vystaveno.cz/api/v1
```

⚠️ **Je to debug build** — release je bez keystoru nepodepsaný, a tedy neinstalovatelný. Debug build má
`usesCleartextTraffic="true"` a `DEBUG=true`. Proti produkci po HTTPS je to funkčně v pořádku, ale pro
ostrý festival **nechte podepsat release build** (`assembleRelease` se stejným `-Pvystaveno.apiBaseUrl`)
a rozdejte ten. Zadejte URL vždy s doménou, nikdy s IP — build to u release sám odmítne.

---

## 3. Co bylo pouze zkontrolováno ve zdrojovém kódu

- **Transakční hranice** `SaleService.PersistSaleAsync` (advisory lock na uzávěrku + prodej + skladové
  výdeje v jedné transakci) — chování jsem ověřil zvenčí (souběh, uzávěrka), vnitřní implementaci jen četl.
- **`DayCloseService`** agregace a shoda s `GetDailySummaryAsync` — čísla jsem porovnal, kód jen četl.
- **Webová pokladna `PokladnaPage.vue`** — kompletně přečtená; průchod pokrytý e2e testy (133 zelených
  včetně tabletového cockpitu), ale **ne ručním klepáním v prohlížeči** (přihlašovací údaje persony
  nechci zapisovat do transkriptu; místo toho jsem napsal e2e regresní test, viz §7).
- **`RoleGates.kt`** (mobilní zrcadlo `RolePermissions.cs`) — zrcadlení ověřeno četbou, vynucení testováno
  přes API.
- **Deploy konfigurace** (`docker-compose*.yml`, `.env.example`, `appsettings*.json`, `docs/deployment*.md`) —
  z ní pochází nález P1-2.

---

## 4. Co nebylo možné ověřit

| Oblast                                  | Proč                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fyzický tablet / terminál**           | K dispozici byl jen emulátor. Výkon, dosah Wi-Fi, čtečka čárových kódů, kasa a tiskárna na reálném HW **nejsou ověřené.**                                                      |
| **Tisk účtenky na tiskárně**            | Tisková fronta + agent existují (`/integrations/print-jobs`, `/print-agents`), ale **žádná fyzická tiskárna ani agent nebyl připojen.** Na mobilu se účtenka otevírá jako PDF. |
| **Reálná platební brána / terminál**    | Viz §5.                                                                                                                                                                        |
| **Provoz pod skutečnou zátěží**         | Testoval jsem souběh 5 prodejů a 3 plateb jednoho účtu, ne stovky transakcí za minutu na více zařízeních.                                                                      |
| **Přepnutí obsluhy PINem**              | Klient neexistuje (P1-3).                                                                                                                                                      |
| **iOS**                                 | Mimo zadání (festival = Android tablety).                                                                                                                                      |
| **Účetní export faktur `/app/uctarna`** | Tlačítko exportu zůstává pro roli Účetní **disabled** (persona test padá timeoutem). Netýká se POS Z-reportů, které exportují správně. Nediagnostikováno do konce.             |

---

## 5. Teya / payment provider — status

## `NEOVĚŘENO — čeká na zařízení/credentials`

Přesněji: **Teya jako platební provider v projektu vůbec neexistuje.**

- Jediné výskyty řetězce „Teya“ v celém workspace jsou **importní adaptéry katalogu**
  (`vystavenocz/src/import/adapters/pos-products.ts` — „Storyous / Teya“ CSV/XLSX import produktů a menu).
  To je jednorázový import ceníku z konkurenční pokladny, **ne platební integrace.**
- Katalog platebních providerů (`GET /integrations/payment-providers/catalog`) obsahuje `manual` a `mock`
  jako běžící a `csob`, `nfctron`, `comgate`, `sumup`, `gpwebpay`, `stripe` jako **„Připraveno k napojení“**.
  Žádný z nich nemá runtime adapter → `POST /terminal-payments` je odmítne 422.
- **Platba kartou v pokladně není propojená s žádným terminálem.** Dialog to obsluze říká sám:
  _„Terminál zatím není propojený — potvrďte výsledek platby ručně.“_ Prodej vzniká **až po ručním
  potvrzení** obsluhou. To je poctivé a bezpečné, ale znamená to, že **systém nezná skutečný výsledek
  transakce na terminálu** — decline se do systému nedostane, pokud ho obsluha nepotvrdí správně.

**Neoznačovat žádného platebního providera za funkčního**, dokud neproběhne reálný sandbox nebo device test.

---

## 6. Chyby

### P0 — blokující

**Žádná.** Nenašel jsem cestu k dvojí platbě, ke špatnému skladu ani k cizím datům.

### P1 — nalezené při auditu (stav po opravách)

#### P1-1 · Mobilní pokladna prodávala „bez pobočky“ — ✅ OPRAVENO (§7.3)

- **Kde:** `vystaveno-mobile` `feature/pos/PosScreenModel.kt:74` (`selectedLocationId = null`),
  UI `feature/pos/PosScreen.kt:253` (volba „Pobočka“ je až **na konci košíku**, výchozí „—“).
- **Důkaz (živě):** prodej za 159,00 Kč naklepaný na tabletu skončil v DB s `location_id = NULL`.
  Denní souhrn firmy = 362,55 Kč, souhrn pobočky Centrum = 203,55 Kč, **3 prodeje za 323,00 Kč nejsou
  v žádném baru.** `POST /day-close` je per pobočka → tyto tržby **nikdy nikdo neuzavře.**
- **Dopad:** kasa baru přebývá o částku, kterou Z-report nevidí; vypadá to jako přebytek nebo krádež.
  Sklad se odečte z „Nezařazeno“, ne z baru.
- **Oprava (§7.3):** volba pobočky je povinná (bez ní pokladna neprodá), zobrazuje se v **trvale
  viditelné liště košíku** a **pamatuje si ji** přes restart aplikace i zařízení. Chip „—“, který
  prodej bez pobočky umožňoval, je pryč.

#### P1-2 · `Auth__PinLookupKey` chyběl v deploy konfiguraci → PIN vrstva 503 — ✅ OPRAVENO (§7.4)

- **Kde:** klíč nebyl v `docker-compose*.yml`, `.env.example`, `appsettings*.json` ani v `docs/deployment*.md`.
- **Důkaz (živě):** `POST /sales` se slevou nad limit obsluhy a s PINem nadřízeného vrátil **503**
  (fail-closed, správně), ne 401/403. Bez klíče nefungovalo **ani** nastavení PINu, **ani** `pin-login`.
- **Dopad:** nastavíte-li obsluze limit slevy (což byste měli — §9 krok 2), barman se nad limit nedostane
  jinak než **frontou schválení**, kterou musí vedoucí odklikat na jiném zařízení. Uprostřed fronty
  u baru to je nepoužitelné.
- **Oprava (§7.4):** `Auth__PinLookupKey` je namapovaný v compose a popsaný v `docs/deployment-vps.md`
  (včetně varování, že se po nastavení už nesmí měnit). **Operátor jen vygeneruje hodnotu** — §9 krok 1.

#### P1-3 · PIN přihlášení a sdílený terminál nemají klienta — ⚠️ funkce chybí dál, falešný slib ✅ opraven

- **Kde:** backend má `POST /auth/pin-login`, `POST /api/v1/pos-terminal/pin-login`,
  `POST /company/members/staff` i správu PINů. **Klient neexistuje nikde** — `grep` přes
  `vystavenocz/src`, `vystaveno-mobile/composeApp/src` i `vystaveno-desktop/src` na `pin-login`
  a `pos-terminal` vrací **nula** výskytů.
- **Falešný slib v UI (✅ opraveno, §7.5):** `TymPage.vue` po založení pracovníka bez e-mailu tvrdil
  _„Nastavte mu PIN, ať se může přihlásit na pokladně.“_ — přihlásit se nemohl. Texty teď říkají pravdu:
  PIN dnes slouží ke **schválení rizikové akce**, ne k přihlášení, a kdo se má přihlašovat sám,
  potřebuje pozvánku na e-mail.
- **Co zůstává:** střídání obsluhy na sdíleném tabletu = plné odhlášení + psaní e-mailu a hesla na
  dotykové klávesnici (ověřeno na emulátoru — trvá to a chybuje se). Není auto-lock; na tabletu
  **trvale leží silný refresh token** (po restartu zařízení se obsluha přihlásí sama). Model A
  („vyhrazený nízkoprivilegovaný terminálový token“) je implementovaný na serveru, ale nepoužitý.
  **Dodělání PIN obrazovky je nová funkčnost, tedy mimo zadání tohoto auditu.**
- **Obejití pro festival:** §9, krok 5 — každý barman dostane účet s e-mailem.

### P2 — opravit brzy, festival přežije

| #        | Nález                                                                                                             | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P2-1** | **Neexistuje částečná vratka ani refund**                                                                         | Jediná cesta zpět je storno **CELÉ** účtenky. `POST /sales/{id}/refund` i `/return` → 404. Vrací-li host jeden z pěti nápojů, musí obsluha stornovat celý doklad a naúčtovat znovu. Ověřeno živě.                                                                                                                                                                                                                                                                                                                   |
| **P2-2** | **Výchozí limit slevy obsluhy je „bez limitu“**                                                                   | `discountLimitPercent = null` → barman může dát **100 % slevu** a prodat za 0 Kč. Ověřeno živě (201, total 0,00 Kč). Po nastavení limitu 10 % vrací sleva 50 % správně 403 `overridable`.                                                                                                                                                                                                                                                                                                                           |
| **P2-3** | **Selhání náhledu ceny zablokuje platbu**                                                                         | Web: `pricingReady` je `false` při síťové chybě `/promotions/calculate` (`PokladnaPage.vue:200`) → obsluha nemůže zaplatit. U 403 se to řeší správně (platba pokračuje, cenu spočítá server), u síťové chyby ne — přitom server cenu stejně přepočítá. Na slabé festivalové síti to zbytečně zastaví pokladnu.                                                                                                                                                                                                      |
| **P2-4** | **Sklad jde do mínusu bez varování**                                                                              | Ověřeno: 0 → −1. Je to záměr („prodej nikdy neblokovat“) a pro festival správný, ale nikde se to obsluze ani vedoucímu neohlásí.                                                                                                                                                                                                                                                                                                                                                                                    |
| **P2-5** | **Google/Apple přihlášení na Androidu nedokončí proti produkci** — _serverová část opravena, čeká na otisk klíče_ | `https://vystaveno.cz/.well-known/assetlinks.json` vracelo `200`, ale **index.html SPA** (`content-type: text/html`) → Android App Link (`autoVerify`) se neověřil a redirect skončil v prohlížeči. **Opraveno v repu** (§7.2): soubor `public/.well-known/assetlinks.json` + `location /.well-known/` v `nginx.conf`, ověřeno proti skutečnému nginx. **Zbývá doplnit `sha256_cert_fingerprints`** otiskem podpisového klíče — do té doby se přihlašujte e-mailem a heslem (funguje, ověřeno živě proti produkci). |

### P3 — kosmetika / hygiena

| #    | Nález                                                                                                                                                                                                                                           |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-1 | Mobil: **IBAN firmy** je vidět roli Zaměstnanec v `Nastavení` (na sdíleném tabletu u baru).                                                                                                                                                     |
| P3-2 | Mobil: PDF účtenka předchozí obsluhy zůstává v `cache/documents/` i po odhlášení.                                                                                                                                                               |
| P3-3 | Mobil: položka `Nastavení` má podtitul „Firma, číselné řady, tým, vzhled“, ale obrazovka je jen ke čtení — podtitul slibuje víc, než dává.                                                                                                      |
| P3-4 | Mobil: barman vidí `Předplatné — Tarif firmy a jeho rozsah` (`/entitlements` mu backend vrací 200).                                                                                                                                             |
| P3-5 | Mobil: na účtence ani v prodeji **není vidět bar** (souvisí s P1-1) ani jméno obsluhy.                                                                                                                                                          |
| P3-6 | Web: účetní export faktur (`/app/uctarna`) má pro roli Účetní trvale disabled tlačítko — persona test padá. Netýká se POS.                                                                                                                      |
| P3-7 | Mobil: retry po timeoutu drží idempotency klíč jen v paměti — po zabití aplikace uprostřed platby se klíč ztratí (košík taky, takže duplicita hrozí jen při ručním přeúčtování).                                                                |
| P3-8 | Mobil: **„Smazat účet" je 60 px pod „Odhlásit se"** v Nastavení. U vlastníka firmy je to nebezpečné sousedství — na dotykovém tabletu u baru si to říká o překlep. Potvrzovací dialog tam je, ale odstup a vizuální oddělení by měly být větší. |

---

## 7. Opravené chyby

### 7.1 Webová pokladna neposílala idempotency klíč (P1, opraveno + regresní test)

**Nález:** `POST /api/v1/sales` z webové pokladny neposílal `idempotencyKey`, ačkoli backend ho podporuje
a mobilní pokladna ho posílá. Na slabé síti tedy retry po timeoutu vytvořil **druhou účtenku a druhý
skladový výdej**. Ověřeno živě: dva identické requesty bez klíče → 2 prodeje, sklad −2 (31 → 29).

**Oprava (3 soubory, ~15 řádků):**

| Soubor                             | Změna                                                                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/composables/useSales.ts`      | `SaleOptions.idempotencyKey` + průchod do těla requestu                                                                                                   |
| `src/pages/PokladnaPage.vue`       | `pendingCheckout` drží klíč posledního nedokončeného pokusu; **stejný košík → stejný klíč**, změna košíku → nový klíč (zrcadlí `PosScreenModel.checkout`) |
| `src/composables/useSales.spec.ts` | kontrakt volání + nový unit test na klíč                                                                                                                  |

**Regresní test:** `e2e/pokladna-idempotence.spec.ts` (nový, 2 testy)

1. _opakovaná platba po výpadku sítě pošle TÝŽ idempotency klíč_ — první `POST /sales` je přerušen
   (`route.abort('connectionfailed')`), test ověří českou hlášku, **zachovaný košík**, a že druhý pokus
   nese **identický klíč**.
2. _nový prodej dostane NOVÝ idempotency klíč_ — dva samostatné nákupy se nesmí sloučit do jednoho.

Oba zelené.

### 7.2 `/.well-known/assetlinks.json` se servírovalo jako SPA (P2-5, serverová část opravena)

**Nález:** `https://vystaveno.cz/.well-known/assetlinks.json` vracelo `200`, ale `content-type: text/html`
a tělo bylo `index.html` — soubor v repu neexistoval a `nginx.conf` neměl pro `/.well-known/` pravidlo,
takže požadavek spadl do SPA fallbacku `try_files $uri $uri/ /index.html`. Android verifikátor dostal
místo JSON HTML, `autoVerify="true"` tiše selhalo a **redirect po Google/Apple přihlášení skončil
v prohlížeči místo v aplikaci**.

**Oprava:**

| Soubor                                 | Změna                                                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/.well-known/assetlinks.json`   | deklarace domény pro balíček `cz.vystaveno.mobile` (Vite kopíruje `public/` do `dist/`; service worker soubor **necachuje** — ověřeno, 204 precache entries beze změny) |
| `nginx.conf`                           | nový `location /.well-known/` s `default_type application/json` a `try_files $uri =404` — chybějící soubor je 404, **nikdy** SPA                                        |
| `docs/deploy/well-known-assetlinks.md` | postup pro operátora (kde vzít otisk, jak ověřit po deployi, proč tam nepatří debug klíč)                                                                               |

**Ověřeno proti skutečnému nginx** (kontejner `nginx:alpine` nad `dist/` s produkční `nginx.conf`):

| Kontrola                            | Před        | Po                                              |
| ----------------------------------- | ----------- | ----------------------------------------------- |
| `nginx -t`                          | ok          | ✅ ok                                           |
| `/.well-known/assetlinks.json`      | `text/html` | ✅ **`200 application/json`** se správným tělem |
| `/.well-known/<neexistující>`       | SPA `200`   | ✅ **`404`**                                    |
| `/app/pokladna`, `/` (SPA fallback) | `200`       | ✅ `200` beze změny                             |

**Zbývá jediná hodnota:** `sha256_cert_fingerprints` je zatím prázdné pole. Otisk podpisového klíče
(release keystore nebo Play App Signing) v repu ani na dev stroji **není** — release build je proto
nepodepsaný a aplikace není na Google Play. Po doplnění otisku App Link projde bez dalšího zásahu do kódu.

### 7.3 Mobilní pokladna prodávala „bez pobočky“ (P1-1) — opraveno + 5 testů + ověřeno na tabletu

**Nález:** `selectedLocationId` startoval na `null`, volič „Pobočka“ byl až **na konci košíku** (dva
scrolly) a nabízel chip „—“. Volba se nikde neukládala, takže se po každém restartu vrátila na „—“.
Živě to vyrobilo 3 prodeje za 323,00 Kč s `location_id = NULL` — mimo každý pobočkový Z-report.

**Oprava (chování, ne jen default):**

| Změna                                                        | Proč                                                                                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `checkout()` odmítne prodej bez pobočky                      | Hlasitá chyba místo tiché. Obsluha dostane hlášku a **žádný prodej nevznikne**      |
| chip „—“ odstraněn, hlavička zčervená                        | „Bez pobočky“ přestala být volitelný stav                                           |
| pobočka je ve **stále viditelné liště košíku**               | `KOŠÍK (1) · VYBERTE POBOČKU` → `KOŠÍK (1) · CENTRUM`; obsluha už nemusí scrollovat |
| volba se **pamatuje** (`AppPreferences`, per firma+uživatel) | Tablet stojí u jednoho baru celou akci — volba přežije restart aplikace i zařízení  |
| jediná pobočka se vybere sama                                | Firma s jedním barem nemá co vybírat                                                |
| zrušená/neexistující zapamatovaná pobočka se neobnoví        | Nesmí se prodat na pobočku, která už není                                           |

Soubory: `core/settings/AppPreferences.kt` (+Android/iOS impl), `feature/pos/PosScreenModel.kt`,
`feature/pos/PosScreen.kt`, `app/navigation/ScreenRegistry.kt`.

**Regresní testy** `feature/pos/PosLocationTest.kt` (5, všechny zelené): odmítnutí bez pobočky ·
prodej po výběru nese `locationId` · volba přežije restart · jediná pobočka se vybere sama ·
zrušená pobočka se neobnoví.

**Ověřeno na tabletu (emulátor, proti lokálnímu API):**

| Krok                                | Výsledek                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| Přidání položky bez zvolené pobočky | ✅ lišta hlásí `KOŠÍK (1) · VYBERTE POBOČKU`                                        |
| Pokus o platbu                      | ✅ _„Vyberte pobočku, na které prodáváte — jinak tržba nespadne do její uzávěrky.“_ |
| Vznikl prodej?                      | ✅ **NE** — 1125 → 1125, košík zachován                                             |
| Po výběru „Centrum“ a zaplacení     | ✅ 1125 → 1126, prodej v DB **na pobočce Centrum**                                  |
| Restart aplikace                    | ✅ lišta hlásí `KOŠÍK (1) · CENTRUM`, volba v `pos_location_<user>\|<firma>`        |

### 7.4 `Auth__PinLookupKey` chyběl v deploy konfiguraci (P1-2) — opraveno

`docker-compose.yml` teď mapuje `Auth__PinLookupKey: ${AUTH_PIN_LOOKUP_KEY:-}` (volitelný, stejný
vzor jako `INTEGRATIONS_SECRET_ENCRYPTION_KEY`), hlavička `docker-compose.prod.yml` ho zmiňuje
a `docs/deployment-vps.md` má řádek v `.env`, vysvětlení dopadu i řádek v tabulce potíží — včetně
varování, že **po nastavení se klíč už nesmí měnit** (jinak se uložené PINy stanou nedohledatelnými).
Ověřeno `docker compose config`: hodnota se do API propíše. Operátor jen vygeneruje klíč (§9 krok 1).

### 7.5 Falešný slib o přihlášení PINem (P1-3) — opraveno

`TymPage.vue` na třech místech tvrdil, že se pracovník bez e-mailu přihlásí PINem na pokladně.
Taková obrazovka neexistuje. Nové texty: po založení _„Zatím se ale sám nepřihlásí — potřebuje účet
s e-mailem.“_, v seznamu _„Bez e-mailu — zatím se nemůže sám přihlásit“_, v dialogu PINu vysvětlení,
že PIN dnes slouží ke **schválení rizikové akce** (storno, sleva nad limit), ne k přihlášení.
E2E `tym.spec.ts` upraven na nový text.

### 7.6 Selhání náhledu ceny blokovalo platbu (P2-3) — opraveno + regresní test

`pricingReady` byl `false` i při **síťové** chybě `/promotions/calculate`, takže na slabé síti nešlo
vůbec zaplatit — přestože účtovanou cenu autoritativně počítá server (u 403 to už bylo ošetřeno
správně). Nově se blokuje jen po dobu načítání; selhání náhledu platbu **nezastaví**, jen se obsluze
ukáže varování _„Náhled akcí se nenačetl. Konečnou cenu spočítá server — může být nižší.“_
Regrese: `e2e/pokladna-idempotence.spec.ts` → _selhání náhledu akcí NEZABLOKUJE platbu_.

### 7.7 Drobnosti (P3-1, P3-2, P3-8) — opraveno

| #    | Oprava                                                                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P3-1 | **IBAN firmy** se v mobilu ukazuje jen vedení (`canEditCompany`) — sdílený tablet u baru už firemní účet nezobrazí                                                                    |
| P3-2 | `PdfOpener.clearOpenedDocuments()` (Android i iOS) volané z `SessionManager.clearSession()` — odhlášení **smaže stažené účtenky z cache**, další obsluha je neotevře správcem souborů |
| P3-8 | „Smazat účet“ je oddělené sekcí `Nevratné` s odstupem a vysvětlením — už není 60 px pod „Odhlásit se“                                                                                 |

**Neopravoval jsem:** P1-3 (chybějící PIN obrazovka a sdílený terminál = nová funkčnost, mimo zadání),
P2-1 (částečná vratka = nová funkčnost), P2-2 (výchozí limit slevy = produktové rozhodnutí, §9 krok 2),
P2-4 (sklad do mínusu je záměr), P2-5 zbytek (chybí otisk podpisového klíče), P3-6 (export faktur účetní).

---

## 8. Výsledky testů a buildů

### Backend — `vystaveno-api` `main` `3d4d5a2`

Kompletní sada spuštěná **znovu po všech opravách z §7** (idempotence pokladny i `assetlinks`/nginx).

```
dotnet test
  Vystaveno.UnitTests         413 passed,    0 failed  (216 ms)
  Vystaveno.IntegrationTests 1291 passed,    0 failed  (7 m 19 s)
```

✅ **1704 testů, 0 chyb.**

### Web — `vystavenocz` `main` `56072e8` + opravy z §7

```
npm run build     ✅ (vue-tsc + vite, PWA 204 precache entries — assetlinks se NEcachuje)
npm run lint      ✅ (eslint, bez chyb)
npm run test      ✅ 63 souborů / 577 testů
npm run test:e2e  ✅ 134 testů, 0 chyb  (+3 nové oproti výchozímu stavu)
```

Pozn.: `e2e/smeny-planner.spec.ts` a `e2e/google-oauth.spec.ts` občas spadnou pod paralelní zátěží
(`element is not stable` / `element was detached from the DOM` na položce Reka UI selectu).
Samostatně i v plném opakovaném běhu procházejí — jsou to **flaky testy**, ne regrese.

### nginx — ověření opravy `/.well-known/` proti skutečnému serveru

```
docker run nginx:alpine  (produkční nginx.conf nad dist/)
  nginx -t                                     ✅ syntax ok
  /.well-known/assetlinks.json                 ✅ 200  application/json
  /.well-known/<neexistující>                  ✅ 404  (dříve SPA 200 text/html)
  /app/pokladna, /                             ✅ 200  SPA fallback beze změny
```

### Mobil — `vystaveno-mobile` `main` `3452df1` (pracovní strom s cizí rozpracovanou prací)

```
./gradlew :composeApp:testDebugUnitTest -Pvystaveno.enableIos=false --rerun-tasks
  ✅ 390 testů, 0 chyb  (+5 nových: PosLocationTest)
./gradlew :composeApp:compileKotlinIosSimulatorArm64                                    ✅
./gradlew :composeApp:assembleDebug   -Pvystaveno.enableIos=false                      ✅
./gradlew :composeApp:assembleRelease -Pvystaveno.enableIos=false \
          -Pvystaveno.apiBaseUrl=https://vystaveno.cz/api/v1                           ✅
  composeApp-debug.apk            24,1 MB
  composeApp-release-unsigned.apk  3,3 MB

# negativní test bezpečnostního guardu — MUSÍ selhat:
./gradlew :composeApp:assembleRelease … -Pvystaveno.apiBaseUrl=https://91.134.23.91/api/v1
  ✅ BUILD FAILED: "Release API URL must use a hostname, not a bare IP … TLS cannot validate it"
```

### Playwright proti reálnému API

```
npm run test:e2e:personas
  119 passed · 3 failed · 10 skipped · 4 did not run   (4,2 min)
```

Ze tří pádů: `08-novy-uzivatel` (registrace) při samostatném opakování **prošel** → flaky pod paralelní
zátěží. Zbývá `07-ucetni` „účetní exporty“ (desktop i mobil) — disabled tlačítko exportu faktur, viz P3-6.
**Žádný z pádů se netýká POS, pokladny, uzávěrky ani skladu.**

### Vlastní živé sondy (nad testovací DB)

| Sonda                                                            | Kontrol | Výsledek                              |
| ---------------------------------------------------------------- | ------- | ------------------------------------- |
| Oprávnění, role, tenant, pobočky                                 | 41      | ✅ všechny                            |
| POS provoz (idempotence, souběh, storno, uzávěrka, sklad, audit) | 34      | ✅ všechny (1 artefakt testu opraven) |
| Vedoucí baru + vratky                                            | 24      | ✅ všechny                            |
| Bar/kuchyně + souběžné platby účtu                               | 15      | ✅ všechny                            |
| Tokeny v logu při `LogLevel=Debug`                               | 6 vzorů | ✅ 0 výskytů                          |

---

## 9. Přesný checklist před otevřením festivalu

Projít **v tomto pořadí**, na každém zařízení.

### Den předem — nastavení (Owner/Admin, web)

1. **Vygenerovat a nastavit `AUTH_PIN_LOOKUP_KEY`** _(P1-2 opraveno, §7.4 — compose i dokumentace ho už znají)_
   `openssl rand -base64 32` → do VPS `.env` → redeploy API. Pak už klíč **nikdy neměňte**.
   Bez něj: `PUT /company/members/{id}/pin` vrátí 503. Ověření:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X PUT "$API/company/members/$USER_ID/pin" \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"pin":"<PIN>"}'
   ```

   `200` = v pořádku, `503` = klíč chybí → doplnit do VPS `.env` a restartovat API.

2. **Nastavit každé obsluze limit slevy** _(P2-2)_
   Tým → člen → `Limit slevy`. Bez něj smí barman prodat za 0 Kč. Doporučení: 0–10 %.

3. **Nastavit limity schvalování**
   Schvalování → storno / odpis / inventura. Demo hodnoty 1000 / 1500 / 3000 Kč jsou rozumný start.

4. **Založit pobočku pro KAŽDÝ bar** a zkontrolovat, že se ve výběru zobrazí pod srozumitelným názvem.

5. **Účty obsluhy: každý barman musí mít e-mail a heslo** _(P1-3)_
   Pracovník bez e-mailu se **nepřihlásí**. Hesla rozdat předem, ne u baru.
   Přihlašovat se **e-mailem a heslem**, ne přes Google/Apple — to na Androidu proti produkci
   nedokončí _(P2-5)_.

5b. **Nainstalovat na tablety aplikaci mířící na produkci** a ověřit to _(§2.8)_

```bash
cd vystaveno-mobile && ./gradlew :composeApp:installDebug \
  -Pvystaveno.enableIos=false -Pvystaveno.apiBaseUrl=https://vystaveno.cz/api/v1
```

Kontrola: přihlášení nesmyslným účtem musí vrátit **„Špatný e-mail nebo heslo."**
Když aplikace hlásí **„Nepodařilo se připojit k serveru."**, míří jinam nebo nemá síť.
Nikdy nezadávejte `91.134.23.91` — TLS na holou IP neprojde.

6. **Zkontrolovat sklad na každé pobočce** a doplnit minima (`low-stock` pak funguje per bar).

7. **Uzavřít předchozí obchodní dny**, ať Z-reporty začínají čistě.

### Ráno — každý tablet, každý bar

8. **Přihlásit obsluhu** a nechat aplikaci na Pokladně.

9. **Vybrat bar — jednou na zařízení** _(P1-1 opraveno, §7.3)_
   Mobil: `Otevřít košík` → sekce **Pobočka** → klepnout na správný bar. Pokladna **bez zvolené
   pobočky neprodá** a lišta košíku hlásí `VYBERTE POBOČKU`, takže se na to nedá zapomenout.
   Volba se **pamatuje** — po restartu aplikace i tabletu je pořád nastavená (lišta ukáže název baru).
   Web: výběr provozovny v hlavičce pokladny (pamatuje si ho stejně).

10. **Testovací prodej za pár korun** → hned zkontrolovat, že je vidět v denním souhrnu **správného baru**:

    ```
    Prodeje → Denní tržby      (mobil)
    Uzávěrka → vybraný bar     (web)
    ```

    Když prodej v souhrnu baru **není**, je špatně vybraná pobočka → opravit a prodej stornovat.

11. **Ten testovací prodej stornovat** (vedoucí) a ověřit, že se vrátil sklad.

12. **Zkusit odpojit Wi-Fi a zaplatit** — musí přijít
    _„Nepodařilo se připojit k serveru. Zkontrolujte připojení.“_ a **košík musí zůstat**.
    Nikdy se nesmí objevit „zaplaceno“ bez sítě.

13. **Zapnout tablet do nabíječky a vypnout uspávání obrazovky.**

### Během dne — vedoucí, každé 2 hodiny

14. Zkontrolovat, že **žádná tržba nevisí bez baru**:

    ```sql
    SELECT count(*), sum(total) FROM sales
    WHERE location_id IS NULL AND status = 'Completed' AND created_at::date = current_date;
    ```

    Musí být **0**. Nenulové číslo může pocházet už jen ze starších prodejů nebo z jiného klienta —
    aktuální mobilní pokladna prodej bez baru neodešle (§7.3).

15. Projít frontu **Schvalování** (storna a odpisy obsluhy tam čekají).

16. Sledovat **nízké zásoby** per bar (sklad smí jít do mínusu, nic nezastaví — P2-4).

### Zavírání

17. **Doplatit nebo zrušit všechny otevřené účty** — jinak uzávěrka vrátí 409.
18. **Uzavřít den na každé pobočce zvlášť**, spočítat hotovost, zapsat počáteční stav, vklady, výběry a odvod.
19. Zkontrolovat `cashDifference` v Z-reportu.
20. Stáhnout účetní export (`Uzávěrka → Export měsíc účetní CSV`, případně Pohoda XML).
21. Projít **Audit** (Owner/Admin): storna, změny cen, uzávěrky.

---

## 10. Postup při výpadku internetu, zařízení nebo terminálu

### Výpadek internetu — **aplikace nemá offline režim, prodej bez sítě nevznikne**

**Co systém udělá sám:**

- Platba selže s hláškou _„Nepodařilo se připojit k serveru. Zkontrolujte připojení.“_
- **Košík zůstane** — nic se nepíše, nic se neztratí.
- Po návratu sítě stačí **znovu klepnout na platbu**; idempotency klíč zajistí, že vznikne **jeden** prodej,
  i kdyby první pokus na serveru proběhl.

**Co udělá obsluha:**

1. **Nikdy neúčtovat znovu ručně „pro jistotu“** — vždy nejdřív zopakovat tutéž platbu.
2. Krátký výpadek (do minuty): počkat, zopakovat.
3. Delší výpadek: přepnout tablet na **mobilní data / hotspot z telefonu** (aplikace nepotřebuje nic navíc).
4. Bez sítě delší dobu: **prodávat na papír** (čárky), po návratu naúčtovat souhrnně jako jeden prodej
   s volnou položkou. Historii lze později dorovnat importem (`POST /sales/import`, dělá vedoucí, sklad neupravuje).
5. Po návratu sítě **zkontrolovat denní souhrn baru** proti hotovosti v kase.

### Výpadek / rozbití tabletu

1. Vzít náhradní tablet, nainstalovat APK, **přihlásit obsluhu**.
2. **Vybrat správný bar** (§9 krok 9) — na novém zařízení se vybírá poprvé; pak si ho tablet pamatuje.
3. Rozdělaný účet z rozbitého zařízení je **ztracený, pokud nebyl zaplacen** (košík je jen v paměti).
   Otevřené účty **u stolu** (Restaurace) na serveru zůstávají a jiné zařízení je vidí a doplatí.
4. Rozbitý tablet: pokud zůstane u někoho cizího, **hned zrušit relaci** — Tým → odebrat člena nebo
   změnit heslo obsluhy (token na zařízení tím přestane platit). _Vzdálené odhlášení jednoho zařízení
   zatím není — proto se rozbité/ztracené zařízení řeší přes účet obsluhy._
5. Do konce dne prodávat na zbývajících tabletech; souběžný prodej na jednom baru je bezpečný (ověřeno).

### Výpadek platebního terminálu (karty)

Terminál **není propojený se systémem** — prodej vzniká až po ručním potvrzení obsluhou (§5).

1. Terminál nereaguje / platba **decline** → **nepotvrzovat** platbu v aplikaci, prodej nevzniká.
2. Zákazníka nechat zaplatit **hotově** — vybrat Hotovost a naúčtovat normálně.
3. Terminál vypíše „zaplaceno“, ale aplikace to nezaznamenala → **naúčtovat prodej jako Karta**
   a poznamenat číslo transakce z terminálu; večer porovnat součet karet v Z-reportu s uzávěrkou terminálu.
4. **Nikdy neúčtovat kartu dvakrát** — když je pochyba, ověřit v `Prodeje → historie`, jestli doklad existuje.
5. Rozdíl mezi Z-reportem (`cardTotal`) a uzávěrkou terminálu **řešit až po zavření**, ne u fronty.

### Výpadek serveru / API

1. Ověřit `https://<doména>/api/v1/ping` z telefonu.
2. Neběží-li: prodej se **zastaví na všech barech** — přejít na papír (výše, bod 4).
3. Po obnovení nechat **každý bar zkontrolovat denní souhrn** proti hotovosti dřív, než se zavře den.

---

## Příloha — jak se to testovalo

- Backend `dotnet run` nad DB `vystaveno_e2e` (demo seed), **nikdy nad produkcí**.
- Android: `sdkmanager` + `avdmanager` (cmdline-tools, system-image `android-35;google_apis_playstore;arm64-v8a`),
  AVD `festival_tablet` (10.1" WXGA), debug APK přes `10.0.2.2:5176`.
- Skripty sond a snímky obrazovky z průchodu jsou v session scratchpadu
  (`probe.sh`, `pos-probe.py`, `pos-probe2.py`, `manager-probe.py`, `kds-probe.py`, `and-*.png`).
- Persona e2e: `npm run test:e2e:personas` proti běžícímu backendu (8 person, desktop + mobil).
