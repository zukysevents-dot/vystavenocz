# Finální release readiness — Vystaveno (web + PWA, Android, iOS, backend)

Datum kontroly: **2026-07-22** · Kontrola provedena agentovým grafem PLANNER → BUILDER → ATTACKER → FIXER → JUDGE nad repozitáři `vystavenocz` (main), `vystaveno-mobile` (main, e7369cf), `vystaveno-api` (main, 02e6971). Bez produkčního deploye, bez push, bez publikace do storů.

## 1. Verdict

**`GO S MANUÁLNÍMI KROKY`** — kód všech tří platforem prošel automatickými branami a nalezené P0/P1 pravdivostní blockery byly opraveny v této kontrole. Vydání ale nelze dokončit bez operátorských kroků (sekce 17): produkční credentials, signing, deploy, advokátní review právních textů a ruční QA na fyzických zařízeních.

## 2. P0/P1 blockery nalezené v této kontrole

| #   | Závažnost             | Nález                                                                                                                                                                                                                                                 | Stav                                                                           |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| B1  | P0                    | Živá stránka `/gdpr` uváděla nepravdivé zpracovatele (Supabase, Cloudflare, Resend, Google AI, Stripe, „Row-Level Security") — realita je vlastní VPS + PostgreSQL + SMTP                                                                             | **OPRAVENO**                                                                   |
| B2  | P0                    | „AI asistent" inzerován jako placená funkce na 4+ místech (ceník `pricing.ts`, obchodní podmínky, články nápovědy, popis modulu, PWA manifest), přitom žádná AI funkce v aplikaci ani backendu neexistuje                                             | **OPRAVENO**                                                                   |
| B3  | P1                    | Obchodní podmínky tvrdily „platby zpracovává Stripe" a „předplatné se automaticky obnovuje" — backend žádný subscription billing nemá, online platby předplatného nejsou spuštěné                                                                     | **OPRAVENO**                                                                   |
| B4  | P1                    | Cookie banner nabízel „Google Analytics & Plausible", přitom analytika je vědomě vypnutá (no-op)                                                                                                                                                      | **OPRAVENO** (text pravdivý; volba zůstává jako budoucí souhlas)               |
| B5  | P1                    | Ceník sliboval „Cizí měny + kurz ČNB" (editor umí jen CZK) a „Automatické upomínky" (upomínka je předvyplněný e-mail v poštovním klientu uživatele); článek nápovědy tvrdil „faktura se pošle e-mailem klientovi" (odeslání z aplikace není dostupné) | **OPRAVENO**                                                                   |
| B6  | P1 (rozhodnutí)       | Rozpor go-to-market: web komunikuje uzavřený early access (CTA vedou na e-mail), ale `/registrace` je plně funkční otevřená registrace s backendem                                                                                                    | **OTEVŘENÉ — rozhodnutí vlastníka** (otevřít, nebo routu před vydáním schovat) |
| B7  | P0 (právní, mimo kód) | Právní texty (`/gdpr`, `/podminky`) jsou nyní pravdivé k dnešní realitě, ale dle `docs/legal/09` (C-27) vyžadují advokátní review a doplnění faktů F1–F8 (VPS/SMTP provider, retence) před ostrým provozem                                            | **OTEVŘENÉ — operátor**                                                        |
| B8  | P1                    | Článek nápovědy na veřejné routě `/clanky` sliboval „odkaz na platbu kartou přes Stripe" na faktuře — Stripe integrace neexistuje (nalezeno nezávislým JUDGE, 2. kolo)                                                                                | **OPRAVENO**                                                                   |

## 3. Co bylo opraveno (soubory)

- `src/pages/GdprPage.vue` — pravdiví subprocesoři (vlastní VPS EU + PostgreSQL, SMTP, Google/Apple jen OAuth), platby „zatím nespuštěné", cookies bez nasazené analytiky, tenant izolace místo RLS, odkaz na `/smazani-uctu`, datum aktualizace.
- `src/pages/PodminkyPage.vue` — odstraněn AI asistent a „odesílání faktur e-mailem" z výčtu služby; sekce plateb přepsána (individuální aktivace, podmínky se doplní před spuštěním online plateb).
- `src/components/CookieBanner.vue` — popis analytiky: „zapneme jen s vaším souhlasem; zatím žádné neběží".
- `src/lib/pricing.ts` — `PRO_FEATURES` bez AI, cizích měn a „automatických" upomínek; nahrazeno reálnými funkcemi (zálohové faktury a dobropisy, přehled pohledávek s připravenou upomínkou, Pohoda XML).
- `src/lib/articles.ts` — návod bez AI asistenta a bez „pošle e-mailem klientovi"; článek o platebních branách už neslibuje „platbu kartou přes Stripe" (B8).
- `src/pages/NastaveniPage.vue` — popis modulu AI: „Připravujeme — zatím není součástí aplikace."
- `public/manifest.json` — název/popis PWA bez AI a bez „faktura za 30 sekund"; nově modulární positioning.

Mimo tuto kontrolu (dříve, součást stavu): mobilní release balíček z 2026-07-20 (mazání účtu `DELETE /api/v1/me`, `PrivacyInfo.xcprivacy`, FileProvider fix, POS idempotence) je mergnutý v main obou repozitářů.

## 4. Ověřeno automaticky

| Brána                                                                                                                         | Výsledek                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Web `npm run build` (vue-tsc + Vite)                                                                                          | ✅ bez chyb (i po opravách)                                                  |
| Web `npm run lint`                                                                                                            | ✅                                                                           |
| Web `npm run test` (vitest)                                                                                                   | ✅ 544/544                                                                   |
| Web `npm run test:e2e` (mock režim)                                                                                           | ✅ 93/93                                                                     |
| Web e2e audit proti reálnému API (`playwright.audit.config.ts`, 42 rout, desktop + mobilní viewport, konzole + 4xx/5xx + axe) | ✅ 126 passed, 1 flaky (`/app/sklad` — samostatně prošla), 1 skipped         |
| Mobil `:composeApp:testDebugUnitTest`                                                                                         | ✅ BUILD SUCCESSFUL                                                          |
| Mobil `:composeApp:assembleDebug`                                                                                             | ✅                                                                           |
| Mobil `:composeApp:assembleRelease -Pvystaveno.apiBaseUrl=https://example.invalid/api/v1`                                     | ✅ (unsigned APK, versionCode 1 / 1.0.0; HTTPS enforcement v buildu funguje) |
| Mobil `:composeApp:compileKotlinIosSimulatorArm64`                                                                            | ✅                                                                           |
| Backend `dotnet test` (main)                                                                                                  | ✅ 379 unit + 1231 integračních, 0 failed                                    |

## 5. Ověřeno manuálně (browser, reálné API + demo data)

Přihlášení přes UI demo účtem; průchod: dashboard, faktury (rok historie, filtry typů), POS (položka na účtenku, hladiny, spropitné, věrnost), restaurace (mapa stolů, sekce, otevřené účty), KDS (bony vč. QR/rozvoz, historie), uzávěrka (živý den, předávka, měsíční exporty), docházka, rezervace, výsledky provozu (marže, food cost, ztráty, ležáky, výkon obsluhy), konsolidace poboček, plán směn, sklad + zrcadlo, CRM, věrnost, schvalování, audit, API/webhooky (tokeny se zápisovými scopes reálně použité), podpisy, pobočky, nastavení (moduly, integrace, platební katalog, growth/claim), předplatné (pravdivě „brána není v MVP"), `/gdpr` po opravě; mobilní šířka 375 px (hamburger, karty). Žádné chyby konzole, žádné neočekávané 4xx/5xx.

## 6. Co nebylo možné ověřit a proč

- **iOS release archive + upload** — vyžaduje Apple Developer účet, certifikáty a Xcode signing (nejsou v tomto prostředí).
- **Android AAB (`bundleRelease`) + Play upload** — vyžaduje upload keystore (mimo Git, operátor); ověřen unsigned release APK.
- **Fyzická zařízení** (OAuth end-to-end, PDF sdílení, kamera skener, TalkBack/VoiceOver) — není k dispozici zařízení; kryto `MOBILE_QA_CHECKLIST.md` pro operátora.
- **Produkční prostředí** (assetlinks.json, HTTPS certifikáty, SMTP, produkční OAuth klíče) — vyžaduje VPS a konzole.
- **Veřejné toky bez přihlášení** (`/objednavka/:slug`, `/rezervace/:slug`) a skutečné odeslání e-mailů (SMTP) — neověřeno v tomto běhu.
- **Registrace end-to-end** — endpoint i stránka existují (rate-limited), ale nevytvářel jsem účty; navíc čeká rozhodnutí B6.
- **Kilo Mayo / konkurenční ceníky Storyous, FakturaOnline** — oficiální ceníky nezveřejněné (individuální nabídky), označeno v tabulce.

## 7. Výsledky buildů, testů a Playwrightu

Viz sekce 4. Poznámky: audit suite při 4 paralelních workerech narazí na backend rate limit (429) — pro CI doporučen `--workers=1` (3,0 min). Backend integrační testy běží ~50 min (sekvenčně přes reálnou DB).

## 8. Stav webu / PWA

**Připraveno.** Build čistý, 544 unit + 93 mock e2e + 126 audit testů zelených, a11y axe brána v auditu prochází, responsivita ověřena (375 px + desktop; tablet šířka jen rámcově), tmavý/světlý režim přepínatelný v shellu. PWA: `manifest.json` (ikony 192/512, standalone, start_url `/app`) + service worker (`vite-plugin-pwa`, autoUpdate) se generují v buildu. Právní stránky `/gdpr`, `/podminky`, `/smazani-uctu`, `/faq` živé a po opravách pravdivé (čeká advokátní review — B7).

## 9. Stav Androidu

**Kód připraven, chybí operátorské kroky.** versionCode 1 / versionName 1.0.0, minSdk 24, target/compileSdk 36 (splňuje aktuální Play požadavek target ≥ 35 pro nové aplikace — ověřit při odeslání), `usesCleartextTraffic=false`, release build vynucuje HTTPS API URL a zakazuje debug flag, tokeny v Android Keystore (`AndroidSecureTokenStore` s recovery fallbackem), monochrome adaptive icon, FileProvider opraven. Unsigned release APK se builduje; **AAB + podpis + assetlinks.json + feature graphic 1024×500 = operátor** (`docs/release/RELEASE_CHECKLIST.md`).

## 10. Stav iOS

**Kód připraven, chybí operátorské kroky.** Kotlin iOS target kompiluje, `PrivacyInfo.xcprivacy` (UserDefaults CA92.1, file timestamp C617.1, collected data types) zapojen do Resources, Keychain ThisDeviceOnly, entitlements Sign in with Apple, verze 1.0.0. **Archive/upload, App Store Connect, privacy labels z `DATA_SAFETY.md`, review notes = operátor.** Bez fyzického zařízení neproběhl žádný runtime test iOS.

## 11. Stav OAuth

**Implementace hotová a bezpečná dle inspekce kódu:** OIDC s `state`, `nonce`, PKCE S256 (`OidcIdentityProvider.cs`), Apple client secret jako krátkodobý ES256 JWT, nativní Apple id_token validován (JWKS, iss, aud, exp, nonce), redirect URI výhradně z konfigurace + allowlist pro mobilní návraty a bridge (žádný open redirect z requestu), rate limit `auth` 10/min/IP na login/register/refresh. **Ostrý provoz vyžaduje operátora:** Google Cloud OAuth client + consent screen, Apple Services ID + `.p8` klíč, `assetlinks.json` s otiskem Play App Signing, produkční env (`OAuth__*`). Bez nich OAuth nelze end-to-end ověřit.

## 12. Stav privacy a store podkladů

- `vystaveno-mobile/docs/release/DATA_SAFETY.md` (Play Data Safety podklady) a `STORE_LISTING.md` (texty, screenshot checklist, review notes) existují; store texty AI neslibují.
- Account deletion: v aplikaci (Nastavení → Smazat účet, `DELETE /api/v1/me`) + veřejná stránka `/smazani-uctu` (povinný Play odkaz) — splňuje Google User Data policy a Apple 5.1.1(v) na úrovni kódu.
- `PrivacyInfo.xcprivacy` přítomen; privacy labels vyplní operátor v App Store Connect dle `DATA_SAFETY.md`.
- Privacy policy URL `/gdpr`, terms `/podminky`, support kontakt v patičce — živé; **před vyplněním store formulářů musí projít advokátním review (B7) a produkčním deployem webu**.
- Store compliance NENÍ prohlášena za hotovou — finální kontrola proti aktuálním pravidlům Apple/Google proběhne při odeslání (operátor).

## 13. Bezpečnostní zjištění

- **Tenant izolace:** vynucená serverem, krytá `TenantIsolationHttpTests` + per-feature testy (1231 integračních testů zelených). Účetní/skladová/provozní data jsou serverový zdroj pravdy (FE peníze nepočítá).
- **Autorizace:** server vynucuje moduly+role (403), UI jen skrývá; `EndpointAuthorizationConventionTests` hlídá whitelist anonymních endpointů.
- **Idempotence:** POS prodej (`IdempotencyKey` + advisory lock), gastro `pay-items`, mark-paid faktury, opakované faktury per `periodKey`, referral/claim redeem s idempotency hlavičkou.
- **Secrets:** heuristický grep tracked souborů všech tří repozitářů čistý; signing a credentials žijí mimo Git (`keystore.properties` gitignored, server env). Webhook/API/agent tokeny se zobrazují jen jednou, výpisy nesou jen prefix.
- **Mobil:** tokeny v Keystore/Keychain (ne plaintext), cleartext zakázán, release HTTPS-only.
- **Rate limit:** auth endpointy 10/min/IP; obecný rate limit se při zátěži projevuje 429 (viz audit).
- **Nálezy:** žádný P0 bezpečnostní nález. P3: cookie banner sbírá souhlas s analytikou, která je no-op (pravdivě popsáno, do nasazení analytiky neškodné).

## 14. Konkurence (zdroje ověřeny 2026-07-22)

| Oblast                         | Vystaveno dnes                            | Konkurence (kdo a co)                                                                                                                                                                              | Priorita dorovnání         | Doporučení                                                                                                          |
| ------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Cena + trial                   | 100 Kč/měs. (roční platba), 14denní trial | iDoklad 187–625 Kč + 60 dní zdarma [1]; Fakturoid 82–215 Kč, 30 dní, free do 5 odběratelů [2]; mPOHODA free Start [3]; SuperFaktura 129–469 Kč, free [8]; Dotykačka od ~425 Kč dle obratu [10][11] | P1                         | Nejlevnější all-in-one na trhu; slabina je nejkratší trial (14 dní). Ke schválení: 30denní trial, zvážit free tier. |
| Fakturace (proforma, dobropis) | ✅ má                                     | standard u všech [1][2][8][9]                                                                                                                                                                      | P3                         | Parita.                                                                                                             |
| Nabídky → zakázky → faktura    | ✅ má v základu                           | u Fakturoidu až v top tarifu [2]                                                                                                                                                                   | P3                         | Výhoda — komunikovat.                                                                                               |
| CRM                            | ✅ light (poznámky, úkoly, timeline)      | fakturační mají jen adresář; KiloMayo loyalty+DB [6]                                                                                                                                               | P2                         | Nedorovnávat velká CRM.                                                                                             |
| Cashflow                       | ✅ přehled                                | Fakturoid „finanční plánování" top tarif [2]                                                                                                                                                       | P3                         | Držet; přidat predikci ze splatností.                                                                               |
| Upomínky                       | připravený e-mail (mailto)                | iDoklad/Fakturoid/SuperFaktura automatické [1][2][8]                                                                                                                                               | **P1**                     | Dorovnat automatické serverové upomínky (vyžaduje SMTP).                                                            |
| Párování bankovních plateb     | ❌ chybí                                  | iDoklad od 358 Kč [1], Fakturoid od 116 Kč [2] — hlavní důvod upgradu                                                                                                                              | **P0 (produktová mezera)** | Největší funkční mezera; bank API + párování VS.                                                                    |
| Exporty účetní                 | ✅ ISDOC + Pohoda XML + CSV               | Fakturoid/iDoklad exporty [1][2]; mPOHODA nativní sync [3]                                                                                                                                         | P3                         | Ověřit import u reálných účetních.                                                                                  |
| Mobilní aplikace               | připravená, není v obchodech              | všichni fakturační mají, často i free [1][2][8]                                                                                                                                                    | **P0 (produktová mezera)** | Dokončit vydání (release příprava hotová).                                                                          |
| PWA                            | ✅                                        | konkurence nekomunikuje                                                                                                                                                                            | P3                         | Most do vydání nativní appky.                                                                                       |
| Více firem pod účtem           | ❌ (větev nemerged)                       | Vyfakturuj Profi 3 firmy [9]; mPOHODA +firma [3]                                                                                                                                                   | P2                         | Add-on pro účetní — monetizace.                                                                                     |
| Sklad                          | ✅ vč. inventur, zrcadla, receptur        | Dotykačka sklad až vyšší licence [10]; Storyous receptury [12]                                                                                                                                     | P2                         | Parita+; receptury už jsou — komunikovat food cost.                                                                 |
| POS/gastro                     | ✅ stoly, KDS, uzávěrky                   | Dotykačka KDS až ~1 386 Kč/měs. [10][11]; Storyous od ~690 Kč [12]                                                                                                                                 | **P1**                     | Obrovský cenový argument; chybí ostrý platební terminál — bez něj gastro neuvěří.                                   |
| Rezervace                      | ✅ interní; veřejné připravené            | Reservio free 40 rez./měs. [7]                                                                                                                                                                     | P2                         | Dorovnat jen online stránku + připomínky.                                                                           |
| Docházka + směny               | ✅ vč. plánovače a mezd podkladů          | Dotykačka top licence [10]; KiloMayo HR [4][6]                                                                                                                                                     | P3                         | Unikát v ceně; HR hloubku nekopírovat.                                                                              |
| API/webhooky                   | ✅ v základní ceně (čtení+zápis)          | konkurence zpoplatňuje/limituje [1][2][8][9]                                                                                                                                                       | P3                         | Výhoda — budovat integrace.                                                                                         |
| Google/Apple login             | ✅ (kód hotový, čeká klíče)               | Apple login vzácný                                                                                                                                                                                 | P3                         | Parita+.                                                                                                            |
| Referral/promo                 | připraveno (kvalifikace po billingu)      | iDoklad 60 dní, program pro účetní [1]                                                                                                                                                             | P2                         | Program pro účetní = hlavní distribuční kanál.                                                                      |
| UX onboarding                  | oborové balíčky + ARES                    | FakturaOnline „faktura za 30 s" [13]; KiloMayo „do minuty" [6]                                                                                                                                     | **P1**                     | Cíl: první faktura do 2 minut od registrace.                                                                        |
| Marketingový slib              | „jeden systém místo pěti"                 | nikdo neslibuje celou firmu za 100 Kč                                                                                                                                                              | P1                         | Volná pozice: „Faktury, sklad, pokladna i směny. Jeden systém, 100 Kč měsíčně."                                     |

Zdroje (ověřeno 2026-07-22): [1] idoklad.cz/cenik · [2] fakturoid.cz/cenik · [3] mpohoda.cz/cenik · [4] supplo.cz rozhovor KiloMayo · [5] forbes.cz článek KiloMayo (titulek, paywall) · [6] kilomayo.com · [7] reservio.com/cs/cenik · [8] superfaktura.cz/cenik · [9] vyfakturuj.cz/cenik · [10] dotykacka.cz/cenik · [11] pokladni-system.cz (sekundární, orientační ceny Dotykačka) · [12] banky.cz + pokladnaprolidi.cz (sekundární, Storyous — oficiální ceník individuální) · [13] fakturaonline.cz (tarify MINI/PREMIUM, ceny neověřeny).

**„Kilo Mayo" identifikováno:** KiloMayo (kilomayo.com) — český gastro-tech startup (zakladatelé Nikola Pantovič, Pavel Fuchs): POS + KDS, sklad s recepturami a AI, loyalty, směny/HR, kiosek; 7denní trial, veřejný ceník nemá. Nejbližší koncepční konkurent v gastru; Vystaveno se odliší šíří mimo gastro a transparentní cenou.

## 15. Největší produktové mezery oproti konkurenci

1. Automatické párování bankovních plateb (P0 mezera — hlavní upgrade-důvod u iDokladu/Fakturoidu).
2. Vydaná mobilní aplikace v obchodech (P0 mezera — u konkurence standard i ve free).
3. Automatické upomínky odesílané systémem (P1 — dnes jen mailto).
4. Ostrý platební terminál v POS (P1 — bez něj gastro segment neuvěří).
5. Onboarding time-to-first-value (P1 — cíl „první faktura do 2 minut").
6. Delší trial / kanál přes účetní (P1–P2 akvizice).
7. Více firem pod jedním účtem (P2 — add-on pro účetní).

## 16. Doporučený backlog 30 dní po vydání

1. **T+0–7:** vydání mobilní appky (operátorské kroky ze sekce 17), produkční deploy s SMTP, advokátní review právních textů, rozhodnutí B6 (registrace vs. early access), zapnutí Sentry DSN (crash monitoring webu).
2. **T+7–14:** automatické upomínky (SMTP už bude) + e-mail faktury z aplikace (`IEmailSender` na backendu existuje, chybí UI tok); prodloužení trialu na 30 dní (po schválení).
3. **T+14–30:** bankovní párování plateb V1 (Fio API jako první), veřejná rezervační stránka, program pro účetní (referral už je připravený), tablet QA (768–1024 px) pro číšnický flow.
4. **Backlog (neblokující):** multi-firma pod účtem (větev existuje), platební terminál adapter (katalog připraven), Money/SuperFaktura export, EET 2.0 sledovat.

## 17. Checklist — co musí ručně dodat vlastník

- [ ] **Apple Developer:** App ID `cz.vystaveno.mobile` + Sign in with Apple capability, Services ID, `.p8` klíč (→ backend env `OAuth__Apple__*`), Distribution certifikát + provisioning, App Store Connect záznam, privacy labels dle `DATA_SAFETY.md`, review notes + demo účet pro review.
- [ ] **Google Cloud:** OAuth consent screen (produkční), Web client ID + secret (→ `OAuth__Google__*`), redirect URIs přesně dle `RELEASE_CHECKLIST.md`.
- [ ] **Signing:** Android upload keystore (`keystore.properties` mimo Git) + `bundleRelease` AAB; Play App Signing SHA-256 → `assetlinks.json` na `https://app.vystaveno.cz/.well-known/`.
- [ ] **Google Play Console:** záznam aplikace, Data Safety dle `DATA_SAFETY.md`, odkaz na smazání účtu `/smazani-uctu`, feature graphic 1024×500, screenshoty dle `STORE_LISTING.md`.
- [ ] **Produkční secrets/VPS:** deploy backendu main (migrace aditivní: `AddOAuthMobilePlatform`, `AddCrm` — před deployem `pg_dump`), `.env` s OAuth klíči, `EMAIL_*` (SMTP), `Integrations__SecretEncryptionKey`, `PAYMENTS_PORTAL_BASE_URL`; deploy webu (nová `/gdpr`, `/podminky`, `/smazani-uctu`); smoke dle `docs/deploy-smoke-checklist.md`.
- [ ] **Právní review:** advokátní kontrola `/gdpr` + `/podminky` (C-27), doplnění faktů F1–F8 (`docs/legal/00-chybejici-fakta.md`) — hlavně VPS/SMTP provider a retence.
- [ ] **Rozhodnutí:** otevřít registraci, nebo skrýt `/registrace` (B6); délka trialu; marketingový slib (sekce 14) — změny ceníku/trialu jen po schválení.
- [ ] **Fyzická zařízení:** ruční QA dle `vystaveno-mobile/MOBILE_QA_CHECKLIST.md` (login, OAuth, POS, gastro, PDF, offline chování, TalkBack/VoiceOver).

## 18. Změněné dokumenty a artefakty

- Opravy (tento check, necommitnuto): `src/pages/GdprPage.vue`, `src/pages/PodminkyPage.vue`, `src/components/CookieBanner.vue`, `src/lib/pricing.ts`, `src/lib/articles.ts`, `src/pages/NastaveniPage.vue`, `public/manifest.json`.
- Tento report: `docs/release/final-release-readiness.md`.
- Navazující dokumenty: `docs/product/vystaveno-product-overview.md` (produktový přehled ověřený proti API, 2026-07-21/22), `vystaveno-mobile/docs/release/*` (checklist, report, data safety, store listing), `docs/legal/*` (návrhy právních textů k review), `docs/deploy-smoke-checklist.md`.
- Testovací artefakty (gitignored): `test-results/.last-run.json` + trace/screenshoty selhání v `test-results/` (HTML report se generuje jen při audit běhu, po následných opravných bězích nemusí existovat), build výstupy `dist/`, `composeApp/build/outputs/apk/release/composeApp-release-unsigned.apk`.

---

> Závěrečná poznámka: verdikt „GO S MANUÁLNÍMI KROKY" znamená „prošlo definovanými automatickými branami a nezávislou kontrolou kódu; vydání blokují pouze kroky, které vyžadují produkční přístupy, právní review a fyzická zařízení". Není to tvrzení o úplné store compliance — ta se finálně ověřuje při odeslání proti aktuálním pravidlům Apple a Google.
