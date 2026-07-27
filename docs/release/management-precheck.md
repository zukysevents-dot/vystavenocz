# Management Pre-check

Datum: **2026-07-26** · Provedl: QA/release kontrola nad všemi repozitáři projektu Vystaveno.
Bez produkčního deploye, bez push, bez publikace do storů, bez destruktivních DB akcí.

Ověřované stavy (SHA v okamžiku kontroly):

| Repozitář           | Větev / SHA                                         | Pracovní strom                                     |
| ------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `vystavenocz`       | lokální `main` 6d2640f, **`origin/main` cee3f59**   | 24 souborů cizí rozpracované práce + 1 moje oprava |
| `vystaveno-api`     | checkout `feat/crm-mvp` 57bb5f5, **`main` b9db0d4** | 22 souborů + nové Billing složky (necommitnuto)    |
| `vystaveno-mobile`  | `main` fd7dcd8                                      | 40 souborů necommitnuto                            |
| `vystaveno-desktop` | `main` 220dd9d                                      | čistý                                              |
| `vystaveno-mcp`     | `main` 0118316                                      | čistý                                              |

---

## Verdikt

`READY WITH RISKS`

Automatické brány na **mergnutém kódu** jsou zelené (backend 1 630 testů, web 555 unit + 107 e2e, mobil 204 testů + všechny buildy) a živé bezpečnostní sondy proti běžícímu backendu prošly. Vydání ale **není hotové**: dnešní práce na placených modulech je necommitnutá ve všech třech hlavních repozitářích a backendová část stojí na zastaralé větvi, mobilní aplikace nikdy neběžela za běhu (jen se přeložila) a operátorské kroky (podpis, deploy, SMTP, store) zůstávají otevřené.

---

## Stav repozitářů

| Repozitář           | Build | Lint |                                 Testy |                       E2E | Stav                                |
| ------------------- | ----: | ---: | ------------------------------------: | ------------------------: | ----------------------------------- |
| `vystavenocz`       |    ✅ |   ✅ |                   ✅ 555/555 (vitest) | ✅ 107/107 mock · ⚠️ živé | OK, strom špinavý cizí prací        |
| `vystaveno-api`     |    ✅ |  ✅¹ | ✅ 383 unit + 1 247 integr., 0 failed |                       n/a | main plně zelený                    |
| `vystaveno-mobile`  |    ✅ |  n/a |                            ✅ 204/204 |                       n/a | buildy OK, runtime neověřen         |
| `vystaveno-desktop` |    ⚠️ |  n/a |                           žádné testy |                       n/a | `.app` OK, DMG krok v buildu selhal |
| `vystaveno-mcp`     |    ✅ |  n/a |             ✅ smoke proti živému API |                       n/a | OK                                  |

¹ `dotnet format --verify-no-changes` + `dotnet build -warnaserror` (0 warnings).

Doplňující fakta:

- Backend: `dotnet test` na `main` b9db0d4 — **383 unit + 1 247 integračních, 0 failed** (29 min 48 s, Testcontainers PostgreSQL).
- Backend pracovní strom (crm-mvp + entitlements) se **přeloží čistě** (0 warnings); testy na něm neběžely (stojí na zastaralém základu — viz P1-1).
- Mobil: `testDebugUnitTest` puštěn s `--rerun --no-build-cache` (ne z cache), `assembleDebug`, `compileKotlinIosSimulatorArm64`, `assembleRelease` (nepodepsané APK 3,0 MB) — vše BUILD SUCCESSFUL. Navíc kompletní Xcode build `iosApp` pro simulátor: `** BUILD SUCCEEDED **`.
- Mobil HTTPS-only v release ověřen **negativními testy**: `http://…` → „Release API URL must use HTTPS“; `https://203.0.113.10/…` → „must use a hostname, not a bare IP“. Manifest má `usesCleartextTraffic="false"`.

---

## Playwright výsledky

Živé běhy proti **reálnému backendu** (`vystaveno-api-main` na :5176, DB `vystaveno_e2e`, frontend v API režimu na :5173).

| Workflow                                     | Desktop | Mobilní viewport | Stav | Poznámka                                                                    |
| -------------------------------------------- | ------: | ---------------: | ---: | --------------------------------------------------------------------------- |
| Audit celé aplikace (42 rout, a11y, konzole) |  ✅ 126 |               ✅ |   ⚠️ | 1 test spadl pod zátěží (session po refreshi), samostatně prošel; 1 skipped |
| Persona: majitel                             |      ✅ |               ✅ |   ✅ |                                                                             |
| Persona: manažer / služby / location-scoped  |      ✅ |               ✅ |   ✅ |                                                                             |
| Persona: číšník (POS + platba)               |      ✅ |               ✅ |   ✅ | dřívější P0 (`promotions/calculate`) se už neprojevil                       |
| Persona: kuchař (KDS)                        |      ✅ |               ✅ |   ✅ |                                                                             |
| Persona: účetní                              |      ✅ |               ✅ |   ✅ |                                                                             |
| **Persona: skladník**                        |      ❌ |               ❌ |   ❌ | příjemka i inventura zablokované bez výběru pobočky (P2-3)                  |
| Persona: nový uživatel (registrace)          |      ❌ |               ✅ |   ⚠️ | 429 z rate limitu — způsobené mým vlastním testováním, ne produkt           |
| Mock režim (celá sada `npm run test:e2e`)    |      ✅ |              n/a |   ✅ | 107/107 **po opravě** (před opravou 105 ✅ / 2 ❌)                          |
| Tmavý režim (6 klíčových rout)               |      ✅ |              n/a |   ✅ | ověřeno ručně skriptem — žádná konzolová chyba ani 4xx/5xx                  |

Souhrn živých běhů: audit **126 passed / 1 failed / 1 skipped**, persony **106 passed / 4 failed / 10 skipped / 4 nespuštěné**.
Důkazy (trace, screenshoty, error-context) leží v `vystavenocz/test-results/` a `playwright-report-personas/`.

---

## Mobilní výsledky

| Platforma        |                               Build | Runtime | Login | Kritické flow | Stav                         |
| ---------------- | ----------------------------------: | ------: | ----: | ------------: | ---------------------------- |
| Android debug    |                  ✅ `assembleDebug` |      ❌ |    ❌ |            ❌ | Přeloženo, **neběželo**      |
| Android release  |  ✅ `assembleRelease` (nepodepsané) |      ❌ |    ❌ |            ❌ | Bez keystore, HTTPS guard OK |
| iOS simulátor    | ✅ KMP compile + Xcode `.app` build |      ❌ |    ❌ |            ❌ | Simulátor nešel nastartovat  |
| Fyzická zařízení |                                   — |      ❌ |    ❌ |            ❌ | Nikdy neproběhlo             |

**Runtime mobilní aplikace v této kontrole NEBYL ověřen.** Kompilace ≠ běh. Důvody v sekci „Neověřené body“.

---

## Nalezené chyby

### P0 — release blocker

Žádné.

### P1 — zásadní problém

**P1-1 · Release kandidát je rozpadlý mezi větvemi a necommitnutou prací**

- Oblast: proces vydání, všechny tři hlavní repozitáře.
- Kroky reprodukce: `git status` + `git log HEAD..origin/main` ve `vystaveno-api`, `vystavenocz`, `vystaveno-mobile`.
- Očekávané chování: to, co jde do release, je commitnuté a otestované na jednom základu.
- Skutečné chování: dnešní práce na placených modulech (entitlements/billing) je necommitnutá ve všech třech repozitářích. Backendová část navíc leží na větvi `feat/crm-mvp`, která je **18 commitů za `main`** — chybí jí mimo jiné bezpečnostní oprava revalidace API tokenů, oprava poboček/pozvánek a obnova hesla. Migrace `20260726115424_AddEntitlementsAndSubscriptions` byla vygenerována nad model snapshotem, který **neobsahuje** `20260726093030_AddPasswordResetTokens`.
- Důkaz: `vystaveno-api` HEAD 57bb5f5 vs `origin/main` b9db0d4; ve `Migrations/` chybí `AddPasswordResetTokens`.
- Dopad: po merge vznikne konflikt v `AppDbContextModelSnapshot` a migrační řada musí být přegenerována; plná testovací suita na výsledném stavu zatím nikdy neběžela.
- Stav opravy: **neopraveno záměrně** — je to cizí rozpracovaná práce, kterou nesmím měnit. Patří vlastníkovi.

**P1-2 · CI brána E2E byla na `main` červená**

- Oblast: `vystavenocz`, `e2e/tym.spec.ts`, workflow `.github/workflows/e2e.yml` (běží při každém pushi).
- Kroky reprodukce: čistý klon `origin/main` cee3f59 → `npx playwright test e2e/tym.spec.ts`.
- Očekávané chování: sada projde, aby ochránila `main` před regresemi.
- Skutečné chování: 2 testy padaly deterministicky (3× po sobě, i na čistém klonu bez rozpracované práce). Příčiny: (a) stránka `/app/tym` volá `GET /api/v1/company`, který test nemockoval → mock vrátil 404 → konzolová chyba shodila fixture; (b) sidebar má sekci s nadpisem „Tým“, což kolidovalo s `h1` stránky (Playwright strict mode: 2 shody).
- Důkaz: `NOT_MOCKED: /company` z instrumentovaného běhu; `strict mode violation: getByRole('heading', { name: 'Tým' }) resolved to 2 elements`.
- Dopad: brána, která má chytat regrese na `main`, byla trvale červená — skutečná regrese by zapadla mezi známé červené testy.
- Stav opravy: **OPRAVENO** (viz níže).

### P2 — důležitý problém

**P2-3 · Skladník nedokončí příjemku ani inventuru bez ručního výběru pobočky**

- Oblast: `vystavenocz` — `NaskladneniPage.vue:248`, `ZasobyPage.vue` (`openStocktake`).
- Kroky reprodukce: přihlásit se rolí Stockkeeper ve firmě s víc pobočkami → `/app/naskladneni` → vyplnit dodavatele + produkt → `Uložit příjemku`. Totéž `/app/zasoby` → `Inventura`.
- Očekávané chování: hlavní workflow persony projde, nebo stránka pobočku předvybere.
- Skutečné chování: toast „Vyberte konkrétní pobočku, na kterou příjemku uložit.“ a u inventury se dialog vůbec neotevře („Inventuru spusťte pro konkrétní pobočku.“).
- Důkaz: `e2e/personas/02-sklad.spec.ts` — 2 testy, reprodukované 2× (desktop i mobil); trace v `test-results/`.
- Dopad: skladník po přihlášení narazí na blokaci ve svém hlavním úkolu; nedozví se to dřív než po kliknutí na Uložit.
- Stav opravy: neopraveno — jde o záměrný ochranný guard (starší commit `feat(inventory): add location stock UI`), oprava je produktové rozhodnutí (předvybrat jedinou/domovskou pobočku, nebo blokaci vysvětlit dopředu). **Backlog.**

**P2-4 · Playwright audit config si může smazat vlastní důkazy o selhání**

- Oblast: `vystavenocz/playwright.audit.config.ts`.
- Kroky reprodukce: `npm run test:e2e:audit`.
- Očekávané: trace a screenshoty selhání zůstanou k dispozici.
- Skutečné: Playwright hlásí `HTML reporter output folder clashes with the tests output folder` — `outputFolder: 'test-results/audit-report'` leží uvnitř `test-results/`, které HTML reporter před generováním maže.
- Dopad: ztráta důkazního materiálu právě u běhu, kde je potřeba.
- Stav opravy: neopraveno (P2, jednořádková změna cesty). **Backlog.**

**P2-5 · Odkaz na stažení desktopové aplikace míří na soubor, který nikdo neupekl**

- Oblast: `vystavenocz` `origin/main` cee3f59 (PR #202) — `SiteFooter.vue` odkazuje na `/download/vystaveno-mac.dmg`, nginx ho servíruje z bind mountu (`try_files $uri =404`), soubor **není v gitu**.
- Skutečné: `npm run build` ve `vystaveno-desktop` skončil chybou v kroku `bundle_dmg.sh` (Rust build i `.app` bundle prošly). Tentýž skript spuštěný ručně DMG vyrobil → příčina vypadá environmentálně (Finder/AppleScript automatizace), ne produktově.
- Dopad: pokud operátor DMG nevyrobí a nenahraje na VPS, veřejná patička vede na 404.
- Stav opravy: neopraveno. **Operátorský krok + backlog** (ověřit `npm run build` na release stroji).

**P2-6 · Tři repozitáře nemají žádné CI**

- `vystaveno-mobile`, `vystaveno-desktop`, `vystaveno-mcp` nemají `.github/workflows`. Buildy a testy tam běží jen ručně. `vystavenocz` (CI/E2E/Security) a `vystaveno-api` (CI) je mají. **Backlog.**

**P2-7 · Tmavý režim nemá automatický test**

- V žádné e2e sadě není kontrola tmavého režimu. V této kontrole ověřen ručně (6 rout, bez chyb) — ale při další změně to nikdo nezachytí. **Backlog.**

### P3 — polish

- **P3-8** Suroviny (`Bulka`, `Mléko`, `Kávová zrna`, `Sýr plátek`, `Hovězí mleté`) mají prodejní cenu 0 Kč a zobrazují se jako dlaždice v Pokladně → obsluha může přidat položku za 0 Kč. Doména nemá `ProductKind.Ingredient`, takže jde o kvalitu demo dat + chybějící filtr POS.
- **P3-9** `GET /attendance/current` vrací 403 „Přihlášený uživatel není evidovaný zaměstnanec“ i majiteli. Doménově korektní, ale 403 v konzoli/UI vypadá jako chyba přístupu.
- **P3-10** Demo firma má zapnutý modul `ai`, ačkoli žádná AI funkce neexistuje (z ceníku a textů už byla odstraněna).
- **P3-11** `vystaveno-desktop`: `package.json` verze 1.0.0 vs `tauri.conf.json` 0.1.0; instalátor se jmenuje `…_0.1.0_aarch64.dmg`.

---

## Opravené věci

**Oprava CI E2E brány (P1-2)** — `vystavenocz/e2e/tym.spec.ts` (1 soubor, +17/−1, **necommitnuto**):

- Změna: do mock tabulky přidán `GET /company` (stejný tvar jako v `nastaveni.spec.ts`); assert nadpisu zúžen na `page.getByRole('main')`.
- Důvod: stránka `/app/tym` reálně volá `/company` (company store) a sidebar má sekci se stejným názvem — testy zůstaly u staršího stavu aplikace. Produktový kód je v pořádku, chyba byla v testu.
- Test, který opravu ověřuje: `npx playwright test e2e/tym.spec.ts` → 2/2 ✅, a celá sada `npm run test:e2e` → **107/107 ✅** (před opravou 105 ✅ / 2 ❌). `eslint` + `prettier --check` na souboru čisté.

Nic jiného jsem neopravoval — všechny ostatní nálezy jsou buď cizí rozpracovaná práce, produktová rozhodnutí, nebo P2/P3 do backlogu.

---

## Neověřené body

| Co                                                            | Proč                                                                                                                    | Co je potřeba dodat                                                                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime mobilní aplikace (iOS)**                            | CoreSimulator na tomto stroji umírá (`server died`), protože `xcode-select` míří na CommandLineTools                    | Vlastník spustí: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, pak lze spustit login/session/offline/tmavý režim |
| **Runtime mobilní aplikace (Android)**                        | V SDK není žádný AVD ani system image, žádné připojené zařízení                                                         | Stáhnout cmdline-tools + system image (~1,7 GB), nebo fyzické zařízení                                                                |
| **Podepsané release balíčky** (AAB, iOS archive)              | Keystore ani Apple Developer certifikáty nejsou v tomto prostředí                                                       | Operátor: signing + upload                                                                                                            |
| **OAuth end-to-end, assetlinks.json**                         | Vyžaduje produkční konzole Google/Apple a hostovaný `.well-known`                                                       | Operátor                                                                                                                              |
| **Produkční deploy, SMTP, reálné e-maily**                    | Nesmělo se deployovat; SMTP tu neexistuje                                                                               | Deploy + smoke dle `docs/deploy-smoke-checklist.md`                                                                                   |
| **Záloha / restore**                                          | Skripty (`ops/vps-backup.sh`, `vps-verify-backup.sh`, `vps-health-check.sh`) i dokumentace existují, ale nespouštěly se | Ostrý běh zálohy + ověřený restore před deployem s migracemi                                                                          |
| **Backend testy nad rozpracovanými entitlements**             | Kód stojí na základu 18 commitů za `main`; testovat ho tam by nic nedokazovalo                                          | Po merge do `main` znovu plná suita                                                                                                   |
| **Runtime desktopové aplikace**                               | Build míří na produkční `https://vystaveno.cz/api/v1`; nesahal jsem na ostrá data                                       | Ověřit proti stagingu                                                                                                                 |
| **Fyzická zařízení, TalkBack/VoiceOver, kamera, PDF sdílení** | Zařízení nejsou k dispozici                                                                                             | QA dle `docs/MOBILE_QA_CHECKLIST.md`                                                                                                  |

Backend a bezpečnost naopak ověřeny **živě** proti běžícímu API: health `/health/live` + `/health/ready` 200 Healthy; login → refresh (rotace + replay 401) → logout → refresh po odhlášení 401; CORS allowlist (cizí origin bez hlavičky); **cross-tenant čtení i zápis (GET/PUT/DELETE) → 404, cizí data nedotčena**; matice rolí přes 6 person a 12 endpointů odpovídá RBAC; rate limit na přihlášení (429 po 9 pokusech); veřejné API tokeny (scopes 200, aplikační endpoint s tokenem 401, JWT na veřejném endpointu 401, zápis bez scope 403, revoke → okamžitě 401); exporty (Generic CSV, Pohoda XML) i PDF faktury se reálně stáhnou; migrace na hlavě bez pending změn; 5 background jobů registrovaných a nastartovaných bez chyby. **Hygiena logů: ve 136 000 řádcích 0 hesel, 0 JWT, 0 hlaviček Authorization, 0 e-mailů.** Žádné secrets v gitu (`.env.production` obsahuje jen veřejnou `/api/v1`), žádné build artefakty v gitu, 0 TODO/FIXME/HACK, 0 rozbitých odkazů v dokumentaci.

---

## Doporučení pro vedení

**Co lze prezentovat jako hotové**

- Backend: celý produkt na `main` — 1 630 automatických testů zelených, izolace firem a oprávnění ověřené živými útoky, logy bez citlivých dat.
- Web a PWA: build, lint, 555 unit testů, 107 e2e testů, plus živý průchod 42 rout včetně mobilního viewportu, tmavého režimu a přístupnosti bez vážných nálezů.
- Provozní workflow ověřená za běhu pod skutečnými rolemi: majitel, manažer, číšník (POS + platba), kuchař (KDS), účetní.
- Veřejné API + MCP server: tokeny, scopes, okamžitá revokace a napojení MCP klienta ověřeny end-to-end.

**Co musí být prezentováno jako omezené**

- Mobilní aplikace: **přeložená, ne odzkoušená.** Android i iOS se sestaví včetně release varianty a HTTPS je vynucené už při buildu, ale aplikace v této kontrole ani jednou nenaběhla.
- Skladová persona: příjem zboží a inventura jsou dostupné až po ručním výběru pobočky.
- Desktopová aplikace: sestaví se, ale instalační DMG se v automatickém buildu neupeklo a odkaz na stažení na webu zatím nemá co servírovat.
- Placené moduly (entitlements): funkční kód existuje, ale je **necommitnutý a neotestovaný na cílovém základu**.

**Co NESMÍ být prezentováno jako ostré**

- Jakýkoli běh mobilní aplikace na zařízení, přihlášení přes Google/Apple na mobilu, obnova session, offline režim.
- Podepsané buildy pro store, publikace do Google Play / App Store.
- Odesílání e-mailů (SMTP není nakonfigurované), ostré platební brány a ostré BankID podpisy.
- Placené moduly jako vydaná funkce.

**Největší rizika před vydáním**

1. Necommitnutá práce na třech místech + backendová větev 18 commitů za `main` s migrací nad zastaralým snapshotem (P1-1) — merge může rozbít migrační řadu.
2. Mobilní aplikace bez jediného runtime testu jde do storu jako černá skříňka.
3. Operátorské kroky (signing, deploy, SMTP, OAuth konzole, advokátní review právních textů) zůstávají neuzavřené.

**Přesný seznam kroků před finálním GO**

1. Dokončit a **commitnout** práci na entitlements ve `vystavenocz`, `vystaveno-api` a `vystaveno-mobile`; backendovou část rebasovat na `main` b9db0d4, **přegenerovat model snapshot a migrační řadu**, spustit plnou suitu znovu.
2. Commitnout opravu `e2e/tym.spec.ts` (samostatně od cizí práce) a zkontrolovat, že CI `E2E` na `main` je zelené.
3. Spustit `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, pak provést runtime QA na iOS simulátoru a na fyzickém Androidu podle `docs/MOBILE_QA_CHECKLIST.md` — minimálně přihlášení, obnova session, odhlášení, návrat z pozadí, offline, tmavý režim.
4. Vyrobit podepsané balíčky (Android AAB s upload keystore, iOS archive), nahrát `assetlinks.json`, doplnit produkční OAuth klíče.
5. Rozhodnout P2-3 (předvyplnit pobočku skladníkovi, nebo blokaci vysvětlit dopředu) a doplnit regresní test.
6. Vyrobit a nahrát desktopové DMG na VPS, nebo do vydání skrýt odkaz v patičce.
7. Nasadit na produkci s ověřenou zálohou (`ops/vps-backup.sh` + `vps-verify-backup.sh`), nastavit SMTP a projít `docs/deploy-smoke-checklist.md`.
8. Uzavřít advokátní review právních textů (`/gdpr`, `/podminky`) a rozhodnout otevření registrace vs. early access.
