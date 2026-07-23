# Persona-based E2E audit — 2026-07-22

Rozšíření E2E auditu (`e2e/audit/`) o povinné **persona testování**: aplikace se neověřuje jen jako
admin, ale jako 8 skutečných uživatelů v různých typech provozu. Testy běží výhradně přes UI proti
reálnému backendu (`vystaveno-api`, DB `vystaveno_e2e`), v desktopovém (1280×720) i mobilním
(Pixel 7, 412×915) viewportu.

- Spuštění: `npm run test:e2e:personas` (viz `e2e/personas/README.md`; prostředí = stejné jako audit).
- Účty: 6 person se zakládá idempotentně přes reálný pozvánkový flow API (`e2e/personas/personas.setup.ts`);
  majitel = demo účet ze seedu; nový uživatel = čerstvá registrace per běh. Hesla POUZE z env
  (`E2E_PERSONA_PASSWORD` v gitignorovaném `.env.e2e`), nic v repozitáři.
- Bezpečnost: lokální izolovaná DB; skladové akce v páru +1/−1 ks; inventura/korekce se otevře, ale
  NEPOTVRZUJE; žádné e-maily (SMTP není nakonfigurováno); platby jen v lokální e2e DB.
- Výsledek finálního běhu 2026-07-22: **104 passed, 2 failed (= záměrně červený P0 nález N1
  na desktopu i mobilu), 18 skipped (viewport-specifické scénáře)**.

## Matice person

| Persona                                   | Hlavní cíl                                        | Dostupné moduly/menu                                                        | Prošlé workflow                                                                                                                                                                      | Nalezené chyby                                                                                                                                                           | Stav                                |
| ----------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 1. Majitel (Owner, demo účet)             | přehled firmy, vystavit doklad, kontrola provozu  | vše (plné menu vč. Pobočky, Audit, Schvalování)                             | dashboard, faktury/cashflow/DPH, reporty+konsolidace, klienti, sklad, **faktura draft uložena**, exporty, nastavení, moduly, předplatné                                              | N7 (dashboard bez přepínače pobočky), N8 (Faktury desktop bez štítku „po splatnosti"), N9 (správa členů na mobilu není v Nastavení vidět)                                | ✅ prošel (desktop i mobil)         |
| 2. Skladník (Stockkeeper)                 | příjem, stav zásob, výdej, inventura, doobjednání | menu NEfiltrované — vidí i finance (N4); reálně funkční jen sklad           | stav skladu + hledání, **příjemka +1 ks uložena**, výdej −1 ks, inventura/korekce dialogy, skladové doklady + zrcadlo, K doobjednání                                                 | N2 (bez poboček — /locations 403 → chybí filtr poboček, tab „Podle poboček", příjemka padá do „Nezařazeno"), N4, N10 (nepravdivá hláška „zkontrolujte připojení" na 403) | ⚠️ prošel s výhradami               |
| 3. Kadeřnice / služby (Manager)           | klienti, rezervace, služby, doklad za službu      | plné menu Manažera (bez Poboček/Auditu)                                     | vytvoření+vyhledání klienta, katalog služeb + ceník, rezervace (kolize → srozumitelná česká hláška), CRM, **faktura za službu uložena**, průvodce, mobil bez přetečení               | žádná nová (kolize 409 je korektní chování)                                                                                                                              | ✅ prošel                           |
| 4. Číšník (Employee)                      | směna: stoly, objednávky, kuchyň, platba          | landing rovnou na provoz; menu správně jen provozní                         | mapa stolů → účet → 2 položky → poznámka → **odeslání do kuchyně OK**; storno/rozdělení bez oprávnění nenabízeno přímo                                                               | **N1 (P0): platba NEDOKONČITELNÁ** — dialog se neotevře (403 /promotions/calculate); N3 (403 šum /locations, /customers, /price-levels, /loyalty/settings)               | ❌ hlavní workflow rozbité (platba) |
| 5. Kuchař (Kitchen)                       | fronta bonů, stavy, špička                        | menu NEfiltrované (vidí Pokladnu, Faktury…) — N4                            | bon s poznámkou viditelný, filtr sekcí, **nová → připravuje se → hotová → vydaná → historie**, fronta se sama obnovuje, tablet bez přetečení                                         | N4 (menu + přístup do Pokladny — UI ukáže prázdnou pokladnu s výzvou „přidejte provozovnu"), N2/N10                                                                      | ⚠️ prošel s výhradami               |
| 6. Manažer provozovny (Manager @ Centrum) | směna, lidi, sklad, rezervace jedné pobočky       | menu bez Poboček a Historie změn (správně)                                  | pobočkový scope drží (zásoby podle poboček jen Centrum, provozní reporty jen Centrum, konsolidace „Poboček 1"), docházka+směny, schvalování, mzdy vlastního týmu (záměr)             | žádný únik cizí pobočky nezjištěn                                                                                                                                        | ✅ prošel                           |
| 7. Účetní (Accountant)                    | doklady, DPH, exporty                             | finance ano; sklad/uzávěrka/směny/schvalování správně skryté a přesměrované | faktury (typy: zálohové+dobropisy viditelné), DPH, cashflow (neslibuje automatické upomínky), **export stažen (CSV)**, prázdné stavy srozumitelné                                    | N2 (403 /locations na dashboardu), pokladna přes přímou URL dostupná (prázdná, matoucí — N4/N10); ISDOC nabízen v Účtárně (ověřit ostrost před vydáním)                  | ✅ prošel s poznámkami              |
| 8. Nový uživatel                          | registrace → onboarding → první hodnota           | —                                                                           | validace registrace česky, registrace → onboarding → výběr oboru (služby) → firma (validní IČO) → **doporučený první krok**, průvodce, předplatné, veřejný ceník s trialem, mobil OK | N5 (422 při neplatném IČO = jen generický toast), N6 (dashboard bez pos volá /sales → 403), N11 (web login bez Google/Apple)                                             | ✅ prošel s výhradami               |

## Nálezy

### P0 — rozbitý hlavní workflow

- **N1 — Obsluha (Employee) nedokončí platbu v Restauraci ani Pokladně.**
  `openPayment` (RestauracePage) i `openPaymentDialog` (PokladnaPage) volají před otevřením dialogu
  `POST /api/v1/promotions/calculate`, který vyžaduje `loyalty.read`. Role Employee ho nemá → 403 →
  „Výslednou cenu se nepodařilo ověřit. Zkuste platbu znovu." a platební dialog se **nikdy neotevře**.
  V demo firmě (modul loyalty zapnutý) tak číšník nemůže markovat — jádro POS je pro řadovou obsluhu
  nefunkční. Reprodukce: `04-cisnik.spec.ts` „mapa stolů → … → platba" (záměrně červený).
  **Návrh opravy:** buď přesunout `/promotions/calculate` pod `pos.operate` (cenu stejně finálně počítá
  server při platbě), nebo ve FE degradovat: 403 z preview ⇒ pokračovat bez náhledu slev (vzor
  `loyaltyEnabled` gating), nikdy neblokovat platbu.

### P1 — zásadní pro personu

- **N2 — Provozní role nevidí pobočky: `GET /api/v1/locations` vyžaduje `company.read`.**
  Accountant, Employee, Kitchen i Stockkeeper ho nemají → 403 na každé stránce, která pobočky
  potřebuje. Důsledky: skladník nemá filtr poboček ani tab „Podle poboček" a **příjemka se uloží do
  „Nezařazeno" místo pobočky** (pobočkové stavy pak nesedí); POS ukazuje zavádějící výzvu „nejdřív si
  přidejte provozovnu" (pobočky existují, jen na ně role nevidí); trvalý 403 šum v konzoli.
  **Návrh:** dát `company.read` (nebo nový `locations.read`) všem provozním rolím — pobočka není
  citlivý údaj a provoz na ní stojí.
- **N3 — Vlastník bez SMTP nepřidá člena týmu: pozvánka vrací 503 až PO commitu.**
  `InvitationService.CreateAsync` uloží pozvánku a teprve pak posílá e-mail; bez SMTP (`LoggingEmailSender`
  je fail-closed) spadne na 503, raw token se ztratí a Pending pozvánka blokuje další pokus (409
  „čekající pozvánka existuje"). UI tak bez ručního zrušení pozvánky člena nepřidá.
  **Návrh:** token vracet i při nedoručeném e-mailu (201 + upozornění „e-mail se nepodařilo odeslat,
  předejte odkaz ručně"), nebo e-mail poslat před commitem / kompenzovat.
  (Persona setup to obchází nastavením známého token_hash přímo v e2e DB.)

### P2 — důležitá UX / funkční mezera

- **N4 — FE nezná role Kitchen a Stockkeeper.** `hiddenForRoles` ani landing redirect s nimi nepočítá:
  kuchař i skladník vidí KOMPLETNÍ menu (Faktury, DPH, Klienti, Pobočky, Historie změn, Nastavení…),
  kuchař po přihlášení přistane na firemním dashboardu a do Pokladny se prokliká. Backend data chrání
  (403), ale UX je matoucí a všude 403 šum. **Návrh:** doplnit obě role do `hiddenForRoles`/redirect
  logiky v `src/lib/modules.ts` + `router/index.ts`.
- **N5 — Onboarding neukáže příčinu 422.** Neplatné IČO (kontrolní součet) vrátí backend jako
  `Ico: Neplatné IČO`, ale UI ukáže jen „Profil firmy se nepodařilo uložit. Zkuste to znovu." Uživatel
  neví, co opravit. **Návrh:** propsat field-errors z ProblemDetails k polím formuláře.
- **N6 — Dashboard nové firmy bez modulu `pos` volá `GET /sales` → 403.** Gating vzor existuje
  (invoicing), pro POS část chybí.
- **N10 — Nepravdivé chybové hlášky na 403.** Stránky Faktury/POS ukazují při 403 „Obsah se nepodařilo
  načíst. Zkontrolujte internetové připojení." resp. „přidejte provozovnu" — příčinou přitom je chybějící
  oprávnění. **Návrh:** rozlišit 403 („Na tuto část nemáte oprávnění") od síťové chyby.
- **N11 — Web login nenabízí Google/Apple.** Backend web-identity (OAuth PKCE) je hotový a mobilní appka
  ho používá; `/prihlaseni` na webu tlačítka nemá. Dokumentovat/doplnit dle plánu.
- **N12 — Web nemá PIN lock-screen / rychlé přepnutí obsluhy** (RBAC M4): PIN infra na backendu
  existuje (M2/M3), sdílená webová pokladna se bez plného e-mail loginu nepřepne. Známý plánovaný
  milník — připomenuto, protože se týká person číšník/kuchař/skladník.
- **N13 — FE volá pro Employee `/customers`, `/loyalty/settings`, `/price-levels`** (403 šum) —
  `/me` nevrací granulární permissions, FE nemá podle čeho gate-ovat. Souvisí s N1/N4; zvážit
  `permissions` v `/me` kontraktu.

### P3 — drobné

- **N7** — Dashboard majitele multi-pobočkové firmy nemá přepínač pobočky (číslům chybí kontext).
- **N8** — Desktop tabulka Faktur nezobrazuje štítek/filtr „po splatnosti" (mobilní karty ano).
- **N9** — Sekce správy členů týmu není na mobilu v Nastavení viditelná (desktop ano).
- **N14** — Sonner toast zůstává při najeté myši rozbalený a překrývá tlačítko „Zaplatit" (na dotyku
  méně pravděpodobné; testy obcházejí odjetím kurzoru).
- Pozitivní: kolize rezervace vrací srozumitelnou českou hlášku; scoped manažer nikde neviděl data
  cizí pobočky; KDS tři-krokový stav funguje včetně historie; export účetní CSV se reálně stáhne.

## Povinné výstupy testů

Každý spec v `e2e/personas/` má v hlavičce roli+moduly, testovací data, výchozí route a bezpečnostní
omezení; kroky a očekávané chování jsou samotné testy. Skutečný výsledek, chyby konzole a neúspěšné
requesty sbírá fixture `watch` (příloha `page-errors.json` v HTML reportu, `playwright-report-personas/`);
screenshot + trace se ukládají při selhání (`test-results/`). Desktop i mobil běží jako samostatné
Playwright projekty; dokumentační zjištění jsou v annotations typu `nález` (viz JSON report
`test-results/personas-results.json`).

Manuální scénáře (mimo automatizaci, ověřit ručně):

- platba kartou přes terminál (jen `manual`/`mock` provider — ostrá brána neexistuje),
- tisk účtenky/bonu přes tiskového agenta,
- e-mailové toky (SMTP v e2e prostředí není),
- přepnutí firmy u účtu s více firmami (demo má jednu firmu).
