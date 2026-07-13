# Vystaveno.cz — roadmapa dodatků po investorském callu

**Stav dokumentu:** schválený doplňkový produktový backlog

**Vytvořeno:** 2026-07-14

**Určeno pro:** Codex, Claude Code a člověka, který práci přebírá

**Charakter práce:** jeden soustředěný realizační celek bez kalendářního harmonogramu

## 1. Jak tento dokument používat

Tento soubor je **pouze doplněk**. Nenahrazuje a nemění žádný existující kontext projektu.

Před zahájením práce agent vždy přečte v tomto pořadí:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/product/modular-business-roadmap.md`
4. tento dokument
5. kontrakt v `docs/backend/`, pokud se vybraný úkol dotýká API

Pravidla kontinuity:

- Existující dokumenty, rozhodnutí a hotové funkce se nemažou ani nepřepisují jen proto, aby odpovídaly této roadmapě.
- Před implementací každého bodu se ověří skutečný stav v kódu. Veřejný web, starší poznámka ani název komponenty samy o sobě nejsou důkaz, že workflow je ostré.
- Tento dokument popisuje **rozdíl proti současnému produktu**, ne stavbu nové aplikace.
- Stav práce se nepřepisuje zpětně. Každé předání se přidá do append-only logu na konci dokumentu.
- Pokud implementace později vyžaduje aktualizaci `AGENTS.md`, `CLAUDE.md`, manuálu nebo API kontraktu podle jejich vlastních pravidel, agent přidá pravdivý nový kontext a nesmaže historii.
- Marketing a ceník smějí jako hotové označit jen workflow ověřené v API režimu.

## 2. Výchozí kontext a obchodní záměr

Vystaveno.cz už je rozsáhlý modulární systém s fakturací, POS/gastrem, skladem, pobočkami, reportingem, cashflow, upomínkami, účetními exporty, věrností, integracemi a dalšími vertikálami. Investorské poznámky proto představují **dodatky a zpřesnění**, nikoli nový produkt od nuly.

Společný obchodní cíl:

> Uživatel má rychle pochopit, co Vystaveno přinese jeho konkrétnímu podnikání, snadno začít, zvládnout klíčovou práci z mobilu, spravovat více firem a doporučit produkt dál bez ručního zásahu týmu.

Hlavní hodnoty, které musí být z produktu i webu čitelné:

- méně administrativy a přepisování,
- rychlejší vystavení dokladu a inkaso peněz,
- přehled o provozu, cashflow a neuhrazených dokladech,
- jeden účet pro více firem a provozů,
- fakturace, provoz, zákazníci a statistiky v jednom systému,
- jednoduchý přechod z konkurence a srozumitelná cena.

## 3. Pevné hranice odpovědnosti

### Mimo tuto roadmapu — řeší Standa

- role, oprávnění a autorizační politika,
- nativní aplikace pro Android a iOS,
- AI integrace a MCP server.

Tato roadmapa nesmí Standovu oblast paralelně předělávat. Pokud některý bod potřebuje autorizaci, implementace pouze použije kontrakt a capability model dodaný Standou. Nezavádí novou roli, permission ani vlastní pravidlo přístupu.

### V této roadmapě

- mobilní/PWA použitelnost existující aplikace,
- přepínání více firem pod jedním účtem bez návrhu oprávnění,
- pokročilé exportní filtry a související statistiky,
- zjednodušení registrace a aktivace,
- přihlášení přes Google a Apple na webu,
- ceník, moduly a vysvětlení obchodní hodnoty,
- subscription promo/claim kódy,
- referral systém a ambasadorský funnel,
- CRM nad existujícími klienty a doklady,
- klientská zóna,
- konkurenční gap analýza iDoklad/KiloMayo,
- Viva Payments průzkum a rozhodnutí,
- právní, certifikační a nákladový audit,
- produktová a funnel analytika.

### Co není cílem

- přepis existujících modulů od nuly,
- bezmyšlenkovité kopírování všech checkboxů konkurence,
- tvrdé zakódování konkrétní srpnové kampaně,
- vydávání integrační foundation za živé napojení,
- posunutí práce do dlouhodobého kalendářního harmonogramu.

## 4. Co už v repu existuje a na co navazujeme

| Oblast | Současný základ v repu | Požadovaný rozdíl |
| --- | --- | --- |
| PWA a téma | `vite-plugin-pwa`, manifest/service worker a `useUiStore` s light/dark tématem | dokončit a otestovat plnohodnotný mobilní editor; PWA a dark mode prezentovat jako základ, ne placenou zvláštnost |
| Registrace | `RegistracePage.vue` + `auth.register`, e-mail/heslo, 14denní trial, následný onboarding | zjednodušit tok, doplnit Google/Apple web auth, propojit IČO/ARES a sjednotit veřejná CTA s reálným stavem registrace |
| Fakturace | faktury, proformy, dobropisy, opakované faktury, PDF, účetní logika | mobilní UX, exportní výběr, lepší aktivace a jasnější propojení s hodnotou pro firmu |
| Cashflow | pohledávky, aging, dlužníci, CSV a ruční e-mail přes `mailto:` | základ ponechat v ceně, zpřehlednit hodnotu a oddělit současnou ruční upomínku od budoucí automatické sekvence |
| Exporty | ISDOC/CSV faktur, Z-reporty, měsíční CSV, Generic CSV a Pohoda XML | jedno přesné místo pro výběr dat, typu dokladu, období, stavu, firmy/pobočky a formátu + souhrn před stažením |
| Ceník | současně existují `PRO_*` a orientační modulární `PRICING_MODULES`; app billing zatím používá starší Pro model | sjednotit produktovou hierarchii, základní balíček, moduly, odkazy a skutečný billing; odstranit dvojí interpretaci |
| Zákazníci | fakturační `Client`, loyalty `Customer`, klientská zóna, nabídky, zakázky a faktury | CRM vrstvu stavět nad existujícími entitami, ne zakládat třetí izolovaný adresář |
| Pobočky | locations, pobočkový sklad, reporty a konsolidace | nezaměňovat pobočku za firmu; dodat skutečný multi-company context switch |
| Promo a loyalty | cenové hladiny, provozní promo pravidla a věrnostní ledger | přidat oddělené subscription claim kódy a referral odměny; nemíchat je s POS slevami |
| Platby | provider-neutral katalog, connection foundation a credential vault | nejdřív vyhodnotit Viva; živý adapter označit jako hotový až po skutečné platbě, refundaci a webhook testu |
| Podpisy | provider-neutral verified-signing foundation a trezor | právní/provider audit; netvrdit konkrétní právní účinek ani živé BankID bez smlouvy a adapteru |
| Reporting | gastro provozní reporty, pobočková konsolidace a fakturační dashboard | doplnit statistiky pro fakturaci, exportní výběr, CRM a akviziční funnel |

## 5. Priorita práce bez časového harmonogramu

### P0 — produkt musí být jednoduše použitelný a prodejný

1. `INV-01` Mobilní editor a PWA kontrola
2. `INV-02` Více firem pod jedním účtem
3. `INV-03` Přesný exportní filtr
4. `INV-04` Fakturační a exportní statistiky
5. `INV-05` Registrace, IČO a webové Google/Apple přihlášení
6. `INV-06` Sjednocení ceníku a modulové navigace
7. `INV-07` Subscription promo/claim kódy

### P1 — růst, retence a jasná hodnota

8. `INV-08` CRM MVP
9. `INV-09` Klientská zóna
10. `INV-10` Chráněný referral systém
11. `INV-11` Ambasadoři a měřitelný partnerský funnel
12. `INV-12` Produktová a akviziční analytika

### P2 — rozhodovací podklady a integrační readiness

13. `INV-13` Konkurenční gap analýza
14. `INV-14` Viva Payments research a go/no-go
15. `INV-15` Licence, certifikace, podpisy a tříletý TCO

Výzkumný bod je hotový konkrétním rozhodovacím dokumentem, zdroji, náklady, riziky a doporučením. Externí podpis smlouvy, certifikace nebo odpověď partnera není důvod přesouvat produktový backlog do dlouhodobého harmonogramu; eviduje se jako externí závislost.

## 6. Realizační balíčky

### INV-01 — Mobilní editor a PWA kontrola

**Výsledek:** běžný doklad lze z telefonu vytvořit, upravit, uložit, zkontrolovat a odeslat bez desktopu.

Rozsah:

- audit `FakturyEditorPage.vue` na 360/390/768 px,
- mobilní pořadí polí podle skutečného workflow, ne podle desktop gridu,
- pohodlná práce s klientem, položkami, DPH, splatností, poznámkou a součty,
- sticky primární akce bez zakrytí obsahu,
- náhled dokladu a návrat do editace bez ztráty stavu,
- bezpečné obnovení konceptu po refreshi/přerušení,
- kontrola klávesnice, safe-area, focusu, dlouhých názvů a validačních chyb,
- ověření instalace PWA a light/dark varianty,
- ověření, zda „pokladní doklad“ v požadavku znamená existující účetní/pokladní entitu nebo POS účtenku; nový doménový model se nevymýšlí bez této kontroly.

Akceptace:

- hlavní tok projde na mobilním viewportu bez horizontálního scrollu,
- žádná primární akce není schovaná za softwarovou klávesnicí,
- rozepsaný doklad se neztratí,
- mobile e2e a a11y gate projdou,
- desktopové chování zůstane beze změny.

### INV-02 — Více firem pod jedním účtem

**Výsledek:** jeden uživatel může pracovat ve více samostatných firmách a bezpečně přepnout aktivní kontext.

Rozsah:

- odlišit `Company` od existující `Location`/pobočky,
- API seznam firem, ke kterým má přihlášený účet vztah; přesný endpoint se potvrdí s backendem,
- přepínač aktivní firmy v app shellu,
- po přepnutí znovu načíst `/me`, company profil, moduly/features a company-scoped data,
- oddělit company-scoped localStorage/mock klíče nebo je při změně bezpečně invalidovat,
- zabránit zobrazení cache předchozí firmy,
- zachovat poslední zvolenou firmu jen bezpečným způsobem,
- jasně ukazovat název aktivní firmy v rizikových obrazovkách a exportu.

Mimo rozsah tohoto bodu:

- návrh rolí a oprávnění — dodá Standa,
- změny permission matice,
- nahrazování poboček firmami.

Akceptace:

- přepnutí firmy nevyžaduje nové přihlášení,
- faktury, klienti, sklad, statistiky ani export neukážou data předchozí firmy,
- capability/module stav se po přepnutí aktualizuje,
- dva různé tenanty jsou pokryté integračním nebo e2e testem,
- UI používá Standův autorizační kontrakt, nevytváří vlastní.

### INV-03 — Přesný exportní filtr

**Výsledek:** uživatel před stažením přesně určí, jaká data exportuje.

Minimální volby:

- datová sada: faktury, pokladní doklady/účtenky, produkty, klienti, tržby, Z-reporty,
- typ dokladu: běžná faktura, proforma, dobropis a další reálně podporované typy,
- stav: koncept, vystaveno, uhrazeno, po splatnosti, stornováno podle dané entity,
- období a rozhodné datum,
- aktivní firma a případně pobočka,
- klient/dodavatel nebo produkt, pokud to dataset podporuje,
- formát: CSV/XLSX/PDF/ISDOC/Pohoda XML pouze tam, kde existuje pravdivý renderer,
- náhled počtu vybraných záznamů a souhrnných částek před stažením.

Implementační zásady:

- navázat na `UctarnaPage.vue`, `useIntegrations`, `accounting-export.ts` a stávající exporty; nevytvářet druhou účetní logiku,
- daňové součty a rozhodné filtry musí odpovídat backendu,
- proforma se nesmí omylem dostat do daňového exportu,
- nepodporovaný formát je disabled s pravdivým vysvětlením, ne falešně aktivní.

Akceptace:

- export odpovídá zvoleným filtrům a preview,
- výstup je deterministický a testovaný na faktuře/proformě/dobropisu,
- company/location context je vždy viditelný,
- prázdný výsledek se nestahuje jako zavádějící soubor.

### INV-04 — Fakturační a exportní statistiky

**Výsledek:** výběr dat dává okamžitý obchodní přehled, nejen soubor.

Minimální statistiky:

- vystaveno, uhrazeno, neuhrazeno a po splatnosti,
- příjmy a výdaje tam, kde máme spolehlivý zdroj,
- počet a průměrná hodnota dokladů,
- průměrná doba úhrady,
- top klienti a produkty,
- vývoj v čase,
- rozpad podle firmy/pobočky bez smíchání tenantů.

Akceptace:

- čísla mají jasně popsaný zdroj a období,
- proforma a dobropis respektují pravidla z Invoicing V2,
- cizí měny se nesčítají do CZK bez definovaného přepočtu,
- agregace kritických finančních hodnot počítá server nebo sdílená testovaná doménová logika.

### INV-05 — Registrace, IČO a webové Google/Apple přihlášení

**Výsledek:** nový zákazník projde od veřejného webu do připravené firmy bez ruční pomoci.

Současná realita:

- repo má e-mail/heslo registraci a onboarding,
- registrační formulář zatím nemá Google ani Apple auth,
- IČO/ARES je v onboarding/klientských tocích, ne v samotném registračním formuláři,
- některé veřejné texty stále komunikují early access a osobní přístup.

Rozsah:

- odstranit rozpor mezi veřejnými CTA, FAQ, sliby a reálnou dostupností registrace,
- zkrátit první krok na nezbytné údaje,
- umožnit načíst firmu přes IČO/ARES v registraci nebo bezprostředním onboardingu,
- doplnit webové OAuth přihlášení Google a Apple s bezpečným account linkingem,
- zachovat e-mail/heslo fallback,
- řešit duplicitu účtu, přerušený OAuth tok a návrat do onboardingu,
- měřit start, dokončení, založení firmy a první hodnotovou akci.

Akceptace:

- uživatel dokončí registraci a založení firmy bez podpory,
- stejný e-mail nevytvoří nekontrolovaně dva účty,
- právní souhlasy jsou zachované a auditovatelné,
- každá auth varianta má integrační/e2e test,
- veřejný web neslibuje neexistující login metodu.

### INV-06 — Sjednocení ceníku a modulové navigace

**Výsledek:** zákazník pochopí jednu produktovou hierarchii a cenu vztáhne k výsledku pro svůj byznys.

Produktová hierarchie k potvrzení:

- nadřazený produkt: **Vystaveno.cz**,
- základ: fakturace, klienti, PWA, dark mode, základní cashflow a upomínky,
- provozní moduly: pokladna, gastro/restaurace, sklad, rezervace, docházka a další existující vertikály,
- růstové nástavby: CRM, pokročilé reporty, klientská zóna, integrace podle schváleného balení.

Rozsah:

- odstranit souběh starého `PRO_*` billing modelu a orientačního modulárního ceníku,
- vybrat jediný source of truth pro landing, app předplatné a paywall,
- nenabízet modul, jehož hlavní workflow není ověřené,
- PWA a dark mode neprodávat jako zvláštní příplatek,
- základní cashflow/upomínky přesunout z placeného add-onu do schváleného základu podle investorského rozhodnutí,
- z karty/funkce vést na přesný anchor v ceníku a zvýraznit odpovídající balíček,
- na kartách používat obchodní výsledek, proof pointy a konkrétní cílový segment,
- porovnat navržené ceny s iDokladem a relevantními gastro systémy, ale cenu neurčovat pouze podle konkurence.

Akceptace:

- stejná cena a dostupnost se zobrazí na webu, v aplikaci i paywallu,
- žádný modul není v jednom místě „v ceně“ a ve druhém add-on,
- uživatel se z modulu dostane jedním klikem na jeho cenu,
- copy vysvětluje přínos, ne jen technický seznam funkcí.

### INV-07 — Subscription promo/claim kódy

**Výsledek:** tým spustí více kampaní a změří, která přivádí aktivní platící zákazníky.

Subscription kód je oddělený od POS promotions a loyalty.

Minimální model:

- kód a interní název kampaně,
- funnel/source/partner,
- benefit: trial dny, bezplatné měsíce, procentní sleva, fixní kredit,
- platnost od/do, celkový limit a limit na firmu/účet,
- podmínka pouze pro nový účet nebo jiný definovaný segment,
- redemption se stavem a auditními časy,
- možnost deaktivace bez mazání historie.

Rozsah:

- claim v registraci/onboardingu i v předplatném,
- validace na serveru,
- výsledek a důvod odmítnutí srozumitelný v UI,
- report registrace → aktivace → první hodnotová akce → platba,
- srpnové nabídky realizovat konfigurací, ne hard-coded podmínkou v komponentě.

Akceptace:

- jeden kód nelze uplatnit opakovaně mimo pravidla kampaně,
- expirace a limity fungují atomicky,
- benefit se správně propíše do předplatného,
- každá kampaň má samostatně měřitelný funnel.

### INV-08 — CRM MVP

**Výsledek:** obchodní vztah je vidět u existujícího klienta společně s doklady a dalšími aktivitami.

Zásada: CRM rozšiřuje existující `Client`; v první iteraci nedělá destruktivní sloučení `Client` a loyalty `Customer` a nezakládá třetí izolovaný adresář.

MVP:

- kontaktní osoby a základní firemní údaje,
- štítky a segment,
- poznámky,
- úkoly s termínem a odpovědnou osobou,
- jednoduchý obchodní případ/pipeline,
- časová osa z faktur, nabídek, zakázek, plateb a ručních aktivit,
- obchodní souhrn: obrat, otevřené pohledávky, poslední aktivita a další úkol,
- vazba na existující klientskou zónu.

Akceptace:

- z klienta je dosažitelný celý relevantní kontext bez přeskakování mezi izolovanými adresáři,
- existující fakturační workflow a client ID zůstávají kompatibilní,
- finanční souhrn používá existující faktury a správná pravidla typů dokladů,
- workflow má e2e průchod klient → poznámka/úkol → obchodní případ → faktura nebo nabídka.

### INV-09 — Klientská zóna

**Výsledek:** zákazník firmy vidí přehledný stav svých dokumentů a ví, co má udělat.

Rozsah:

- navázat na existující `useClientPortal`, faktury a přijetí nabídek,
- přehled faktur, nabídek, stavů, splatností a souborů,
- jasné primární akce: stáhnout, přijmout nabídku, kontaktovat dodavatele,
- branding firmy a mobilní zobrazení,
- online platbu ukázat pouze při aktivním runtime provideru,
- inspirovat se srozumitelností iDokladu, ne kopírovat jeho UI.

Akceptace:

- veřejný token/odkaz neodhalí dokument jiné firmy nebo jiného klienta,
- stav dokumentu odpovídá API,
- bez platebního adapteru není falešné tlačítko „Zaplatit online“,
- klientská zóna projde mobilním e2e testem.

### INV-10 — Chráněný referral systém

**Výsledek:** zákazníci a partneři mohou doporučovat Vystaveno, ale odměna nevzniká za nekvalitní nebo falešnou registraci.

Minimální model:

- unikátní referral link/kód,
- attribution na novou firmu,
- kvalifikační událost,
- reward ledger se stavem pending/approved/rejected/paid/credited,
- důvod zamítnutí a auditní stopa.

Ochrana:

- zákaz self-referral,
- jedna odměna na skutečně novou firmu,
- kontrola opakovaného IČO, účtu a dostupných platebních/rizikových signálů,
- odměna až po první skutečné platbě nebo jiné schválené hodnotové události,
- čekací lhůta před připsáním kvůli refundaci/chargebacku,
- limity a možnost manuálního review,
- žádná odměna pouze za vyplnění formuláře.

Akceptace:

- duplicitní a self-referral scénáře jsou testované,
- připsání odměny je idempotentní,
- referral funnel je měřitelný od odkazu po kvalifikaci,
- pravidla jsou popsaná ve veřejných podmínkách před spuštěním.

### INV-11 — Ambasadoři a partnerský funnel

**Výsledek:** vznikne konkrétní seznam lidí, kteří mají důvěru v cílových oborech, a každý zdroj bude samostatně měřitelný.

Segmenty:

- kuchaři, majitelé a manažeři restaurací,
- gastro konzultanti a dodavatelé,
- kadeřníci a provozovatelé salonů,
- účetní a daňoví poradci,
- řemeslníci a provozní manažeři,
- stávající spokojení klienti.

Výstupy:

- seznam konkrétních kandidátů s veřejným pracovním kontaktem, segmentem, dosahem a důvodem relevance,
- priorita podle důvěry v komunitě, ne jen počtu followerů,
- vlastní referral/promo kód a landing varianta pro každého partnera,
- jednotný outreach text a podmínky odměny,
- evidence oslovení, odpovědi, aktivace a výsledků,
- zpracovávat pouze přiměřené veřejné profesní údaje a respektovat opt-out.

Akceptace:

- každý partner má jednoznačný zdroj atribuce,
- lze porovnat registrace, aktivace a platící firmy,
- partnerská odměna používá `INV-10`, nevzniká mimo ledger.

### INV-12 — Produktová a akviziční analytika

**Výsledek:** tým pozná, která nabídka a který krok produktu vytváří skutečnou aktivaci.

Jednotná funnel událostní mapa:

1. návštěva relevantní landing page,
2. zahájení registrace,
3. dokončení účtu,
4. založení firmy,
5. dokončení základního onboardingu,
6. první hodnotová akce podle segmentu,
7. návrat do produktu,
8. zahájení předplatného,
9. první úspěšná platba,
10. referral kvalifikace.

Zásady:

- event names a properties jsou dokumentované,
- campaign/referral source se přenese celým funnelem,
- osobní a finanční data se neposílají do analytiky bez potřeby,
- dashboard rozlišuje registraci, aktivaci, retenci a platbu,
- A/B testy mění vždy jednu hlavní proměnnou nabídky.

### INV-13 — Konkurenční gap analýza

**Výsledek:** vznikne prioritizovaný backlog podle obchodního dopadu, ne nekonečný seznam funkcí.

Srovnávací skupiny:

- fakturace: iDoklad, Fakturoid, Vyfakturuj a další relevantní české nástroje,
- gastro/provozní systém: KiloMayo, Storyous/Teya, Dotykačka, iKelp,
- účetní/exportní benchmark: POHODA, Flexi a formáty používané účetními.

KiloMayo se používá jako benchmark pro spojení POS, skladu, týmu, zákazníků, loyalty, statistik a financí do jednoho provozního flow. iDoklad je benchmark pro jednoduchost fakturace, mobilní použití, účetní spolupráci a klientskou zkušenost.

Výstupní matice:

- funkce/workflow,
- Vystaveno stav: ostré / foundation / chybí / není relevantní,
- konkurent a ověřený zdroj,
- cílový segment,
- obchodní dopad,
- technická závislost,
- rozhodnutí: implementovat / zlepšit / odložit / nedělat.

### INV-14 — Viva Payments research a go/no-go

**Výsledek:** jasné rozhodnutí, zda Viva patří mezi podporované providery a pro jaký use case.

Prověřit:

- dostupnost v ČR, CZK a podporované typy obchodníků,
- acquiring poplatky a další fixní/variabilní náklady,
- settlement, refundace, chargebacky a reconciliation,
- online platby, terminál, SoftPOS, opakované platby a případný platformní model,
- KYC/onboarding obchodníka,
- sandbox, API/SDK, webhooky, idempotence a dokumentace,
- PCI DSS rozsah,
- smlouvu, závazky, SLA a podporu,
- Apple/Google Pay jako platební metodu neplést s OAuth přihlášením.

Pokud vyjde go:

- přidat Viva do provider-neutral katalogu,
- definovat connection fields a credential refs bez ukládání tajemství ve frontendu,
- runtime adapter považovat za hotový až po testu platby, zamítnutí, refundace a duplicitního webhooku,
- aktualizovat integrační readiness pravdivým stavem.

### INV-15 — Licence, certifikace, podpisy a tříletý TCO

**Výsledek:** rozhodovací dokument oddělí povinnosti, obchodní očekávání a volitelné certifikace včetně nákladů na pořízení i údržbu.

Prověřit podle konkrétních use cases:

- GDPR, zpracovatelské smlouvy, subprocesory, retention a výmaz,
- zákonné požadavky na účetní/daňové doklady a archivaci,
- elektronický podpis, eIDAS, časová razítka, pečeť a důkazní balíček,
- PCI DSS a smluvní povinnosti platebních providerů,
- bezpečnostní audit, penetrační test, incident response, zálohy a obnova,
- ochrannou známku Vystaveno.cz v ČR/EU,
- ISO 27001 nebo jiné standardy jen podle skutečné obchodní potřeby,
- podmínky Google/Apple OAuth, ARES a dalších externích služeb,
- dostupnost a přístupnost produktu podle cílových zákazníků a trhů.

Pro každou položku zaznamenat:

- povinné / smluvně očekávané / volitelné,
- vztah ke konkrétní funkci,
- současný stav a chybějící krok,
- interní vlastník a externí dodavatel,
- jednorázová cena,
- roční provozní/obnovovací cena,
- technická údržba,
- riziko a doporučení,
- ověřený zdroj nebo právní stanovisko.

Právní účinek podpisu ani certifikační shodu neprohlašovat bez potvrzení kvalifikovanou osobou.

## 7. Závislosti a paralelní práce agentů

Práce se řídí závislostmi, ne kalendářem.

```text
Skutečný audit repa
├── registrace → promo attribution → referral → funnel analytika
├── company context → multi-company switch → export/statistiky po firmách
├── klienti → CRM → klientská zóna
├── současný pricing → sjednocený ceník → promo benefit v subscription
├── integrační foundation → Viva rozhodnutí → případný runtime adapter
└── signing foundation → právní/provider audit → pravdivý obchodní wording
```

Paralelně lze bezpečně oddělit:

- mobilní editor,
- registraci/auth,
- multi-company kontrakt a frontend switch,
- export/statistiky,
- CRM/klientskou zónu,
- promo/referral,
- pricing/copy,
- competitor/Viva/compliance research.

Agenti nesmějí paralelně měnit stejné centrální soubory (`src/lib/types.ts`, `src/lib/pricing.ts`, `auth.ts`, router, API DTO/migrace) bez explicitního rozdělení vlastnictví. Každá větev má řešit jeden vertikální slice a uvést závislosti na backendu nebo Standově kontraktu.

## 8. Definice hotovo

Produktový bod je hotový pouze tehdy, když:

- je napojený na skutečný API nebo pravdivě označený jako foundation,
- funguje v mock i API režimu tam, kde to architektura vyžaduje,
- nevytvořil druhý source of truth pro ceny, zákazníky, exporty nebo finanční výpočty,
- má unit testy pro kritickou logiku,
- má e2e test pro hlavní uživatelský tok,
- prošel relevantní mobile/a11y kontrolou,
- `npm run build`, `npm run lint` a `npm run test` projdou,
- u uživatelsky viditelného flow projde relevantní Playwright sada,
- backendový kontrakt a oba repozitáře zůstaly synchronizované,
- marketing, ceník, manuál a readiness stav říkají pravdu,
- do append-only logu je přidán výsledek, testy, větev/PR a známé externí závislosti.

Výzkumný bod je hotový pouze tehdy, když obsahuje ověřené zdroje, varianty, náklady, rizika, konkrétní doporučení a jasné go/no-go nebo další externí krok.

## 9. Startovací instrukce pro Codex nebo Claude Code

Použij při převzetí libovolného bodu:

```text
Přečti AGENTS.md, CLAUDE.md, docs/product/modular-business-roadmap.md a
docs/product/investor-additions-roadmap.md. Vyber právě jeden neblokovaný INV bod.
Nejdřív ověř skutečný stav v kódu a napiš delta plán s testem. Implementuj minimální
vertikální slice ve frontend i backend repu, pokud se mění kontrakt. Neměň role ani
oprávnění, nativní Android/iOS ani AI/MCP — to řeší Standa. Nemaž existující kontext.
Po ověření přidej append-only záznam do logu roadmapy se stavem, testy, větví/PR,
změněnými kontrakty a zbývající externí závislostí.
```

## 10. Append-only execution log

Do této sekce se pouze přidává. Starší záznamy se nemažou ani nepřepisují.

Formát:

```text
YYYY-MM-DD | agent | INV-XX | stav | branch/PR
Výsledek:
Ověření:
Kontrakty/dokumentace:
Závislosti nebo další bezpečný krok:
```

### 2026-07-14 | Codex | roadmap foundation | připraveno | docs/investor-additions-roadmap

**Výsledek:** Investorské poznámky byly převedeny na doplňkový backlog nad skutečným stavem repa. Dokument výslovně odděluje existující foundation od nových požadavků a vyjímá Standovu oblast.

**Ověření:** porovnáno s `AGENTS.md`, `CLAUDE.md`, modulární roadmapou a relevantními frontend soubory.

**Kontrakty/dokumentace:** přidán pouze tento nový soubor; existující kontext nebyl změněn.

**Závislosti nebo další bezpečný krok:** při zahájení implementace vybrat jeden `INV-XX`, ověřit stav v obou repech a zapsat delta plán.
