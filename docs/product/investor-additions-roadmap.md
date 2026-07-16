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

### Produktové upřesnění — systém pro všechny živnostníky

Vystaveno.cz není produkt jen pro gastro, sklady nebo jeden vybraný obor. Cílem je společné podnikatelské jádro použitelné pro živnostníky a malé firmy napříč obory — například řemeslníky, konzultanty, kadeřníky, maloobchod, gastro, služby s materiálem i lehkou výrobu. Uživatel při registraci dostane jednoduchý základ a podle svého podnikání si zapne pouze relevantní moduly.

Společný základ musí pokrýt klienty a dodavatele, nabídky a objednávky, faktury a zálohy, příjmové i výdajové pokladní doklady, produkty/služby, náklady, cashflow, upomínky, exporty a přehled podnikání. POS účtenka je další podporovaný typ dokladu pro provozy, které prodávají přes pokladnu; nenahrazuje účetní příjmový nebo výdajový pokladní doklad. Sklad, POS/gastro, CRM, rezervace, docházka, výroba a regulované evidence jsou volitelné moduly nad společným základem.

**Důležité upřesnění stavu:** klienti, nabídky, objednávky, fakturace, pokladna, sklad a další uvedené oblasti už ve Vystaveno.cz existují. Nejsou novými body k vývoji a tato roadmapa je nesmí plánovat znovu. Jsou zde pouze jako existující společný produktový základ; implementační backlog řeší výhradně investorské dodatky, konkrétní chybějící funkce, sjednocení existujících toků a pravdivě ověřené mezery proti požadovanému výsledku.

Oborová specializace nesmí komplikovat základní používání ani vytvářet samostatné neslučitelné produkty. Všechny moduly používají stejnou firmu, kontakty, produkty, doklady, platby, exporty a reporting tam, kde je jejich význam společný.

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
- kompletní skladové hospodářství od nákupu a příjmu přes šarže, přesuny, spotřebu a inventury až po dohledatelné výstupy.

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
| Sklad | API skladové stavy a pohyby, příjem/výdej/korekce, převody mezi pobočkami, inventury, skladové zrcadlo, příjemky s cenami, návrhy objednání, EAN skenování a výrobní dávky | doplnit ucelený skladový ledger, dodavatele a objednávky, rezervace, šarže/expirace, oceňování, dohledatelnost, automatizace, auditní exporty a volitelný regulovaný režim podle ověřených povinností |
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
16. `INV-16` Kompletní skladové hospodářství a dohledatelnost

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
- produktové rozhodnutí: podporovat oba scénáře — samostatný příjmový/výdajový pokladní doklad pro obecné podnikání a POS účtenku pro provozy s pokladnou; UI a exporty je musí jasně rozlišovat.

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

[ePML](https://epml.cz/) se používá jako veřejně ověřitelný benchmark pro dohledatelný tok příjem → výdej/prodej → šarže → inventura → kontrolní export, pobočkové zásoby, čárové kódy, upozornění a auditní historii. Jeho PML legislativní režim se nekopíruje automaticky do obecného skladu; případná specializace pro psychomodulační nebo jiné regulované zboží musí projít `INV-15` a mít ověřené právní požadavky.

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

### INV-16 — Kompletní skladové hospodářství a dohledatelnost

**Výsledek:** Vystaveno pokrývá celý skladový tok od nákupní potřeby a objednávky přes příjem, umístění, přesun, prodej/spotřebu a výrobu až po inventuru, ocenění, dohledání původu a kontrolní výstup. Existující sklad se rozšiřuje; nevytváří se druhý paralelní skladový model.

Benchmark a hranice:

- veřejný přehled [ePML](https://epml.cz/) potvrzuje jako relevantní vzor evidenci každého příjmu/výdeje a šarže, pobočkové zásoby, inventury, CSV/PDF výstupy, prodej s čárovým kódem, notifikace a auditní dohledatelnost,
- obecné skladové jádro musí fungovat pro gastro, maloobchod, služby s materiálem i lehkou výrobu,
- PML nebo jiný regulovaný vertikální režim je volitelná nadstavba; legislativní tvrzení, povinná pole, archivace, podpisy a časová razítka se implementují až podle výsledku `INV-15`,
- role a oprávnění inventur, odpisů, schválení a kontrolních exportů dodá Standa; tento bod spotřebuje jeho autorizační kontrakt.

Existující základ, který se zachová a sjednotí:

- `useInventory` a API pro stavy, pohyby, příjem, výdej, korekce, převody a inventury,
- skladové zrcadlo, centrální přehled zásob podle poboček a návrhy doobjednání,
- vícepoložkové příjemky s dodavatelem, číslem dokladu, nákupní cenou a historií,
- EAN skenování čtečkou nebo mobilní kamerou,
- odpisy, expirace, rozbití, personální spotřeba, prodej/storno a návaznost na schvalování,
- receptury, odpis surovin prodejem a existující výrobní dávky/polotovary.

Doménový a datový základ:

- výslovně odlišit `Company`, `Location`, fyzický/logický `Warehouse` a skladovou pozici; nepotvrzené pojmy neslévat do jedné entity,
- jeden neměnný skladový ledger, kde každá změna množství vzniká pohybem s důvodem, zdrojovým dokladem, časem, autorem, firmou, skladem a případně šarží,
- opravy a storna provádět kompenzačním pohybem, ne přepisem nebo smazáním historie,
- oddělit fyzický stav, rezervované množství a disponibilní množství,
- definovat politiku záporného skladu, souběžných změn, idempotence a zamykání inventury,
- všechny finanční výpočty a ocenění držet na backendu; frontend nesmí být druhý source of truth.

Nákup a dodavatelé:

- adresář dodavatelů včetně kontaktů, dodacích podmínek, dodavatelských SKU/EAN, balení, minimálního odběru a obvyklé ceny,
- návrh nákupu → nákupní objednávka → částečné/plné přijetí → příjemka → vazba na dodavatelský doklad,
- stav objednávky, očekávané datum, backorder, rozdíl objednáno/přijato a historie změn,
- převod existujícího návrhu doobjednání do skutečné objednávky bez ručního přepisování,
- jednotky a převody balení, například karton → kus nebo sud → litr, s přesně definovaným zaokrouhlením,
- import/export katalogu a počátečních stavů s validačním reportem a možností bezpečného opakování.

Šarže, expirace a dohledatelnost:

- šarže/dávka, datum výroby, datum minimální trvanlivosti/expirace, dodavatel, nákupní doklad a volitelně sériové číslo,
- výdej podle explicitní politiky FIFO/FEFO nebo ruční volby šarže,
- upozornění na blížící se expiraci, expirované zásoby, nízký stav a chybějící povinná data,
- dohledání dopředu i zpět: z příjemky/šarže na výrobu, přesun, prodej a odpis a z prodeje zpět na původ,
- blokace, karanténa, uvolnění a hromadné stažení šarže s auditní stopou,
- výrobní dávka eviduje spotřebované vstupní šarže, výtěžnost, odpad/ztrátu a vzniklou výstupní šarži.

Skladové operace a inventury:

- příjem, výdej, interní spotřeba, odpis, vratka, korekce a obousměrně svázaný převod mezi sklady/pobočkami,
- převod má stav odesláno → na cestě → přijato a nesmí vytvořit nebo ztratit zásobu při opakovaném requestu,
- úplná, částečná, cyklická a namátková inventura; možnost slepého počítání bez zobrazení systémového stavu,
- rozpracovaná inventura s uložením průběhu, mobilním skenem, druhým přepočítáním a protokolem rozdílů,
- schválení rozdílů podle Standova permission kontraktu a atomické propsání schválené inventury do ledgeru,
- tisk/CSV/PDF inventurního protokolu, příjemky, výdejky, převodky a karty zásoby.

Ocenění, reporting a automatizace:

- rozhodnout a zdokumentovat metodu ocenění (například vážený průměr nebo FIFO) podle účetních a produktových potřeb,
- nákupní hodnota, skladová hodnota, COGS/spotřeba, marže, ztráty, odpisy a inventurní rozdíly podle firmy, skladu, produktu, šarže a období,
- karta produktu se stavem, rezervací, disponibilním množstvím, historií, průměrnou spotřebou, obrátkou a odhadem dnů do vyprodání,
- min/max zásoba, bezpečnostní zásoba, doporučené množství objednávky a notifikace s potlačením duplicit,
- filtry a exporty CSV/PDF podle data, firmy, pobočky/skladu, produktu, kategorie, typu pohybu, dodavatele a šarže,
- kontrolní výstupy musí být reprodukovatelné: stejný filtr a uzavřené období vrátí stejná data a součty,
- POS prodej/storno, receptura, výroba, zakázka s materiálem a veřejná objednávka mění sklad přes stejný ledger a transakční pravidla.

Mobilní/PWA použití:

- příjem, výdej, převod a inventura jsou použitelné na 360/390/768 px,
- EAN/QR sken má klávesnicový fallback, ruční zadání a srozumitelný stav oprávnění kamery,
- rozpracovaná vícepoložková operace se po refreshi neztratí a opakované odeslání nevytvoří duplicitní pohyby,
- primární akce respektují softwarovou klávesnici a safe-area a žádný hlavní tok nemá horizontální scroll stránky.

Akceptace:

- součet ledgeru odpovídá stavu zásoby pro každý produkt, sklad a šarži a existuje automatická reconciliation kontrola,
- dva tenanty ani dvě pobočky si nikdy nezobrazí nebo nezapíší cizí zásobu,
- nákupní objednávka projde přes částečný příjem až do uzavření a nevytvoří duplicitní zásobu,
- šarži lze dohledat od příjmu přes přesuny/výrobu až ke konkrétnímu prodeji, spotřebě nebo odpisu,
- prodej, storno, receptura a výrobní dávka mění zásobu atomicky a při retry idempotentně,
- inventura podporuje přerušení, pokračování, schválení a auditní protokol bez tiché změny historie,
- ocenění a exportní součty odpovídají backendovému ledgeru a zvolené metodě ocenění,
- mobilní příjem a inventura projdou e2e i a11y gate; kritická ledger/ocenění/šaržová logika má unit a integrační testy,
- migrace existujících stavů a pohybů má dry-run, reconciliation report, rollback strategii a neztratí současná data,
- regulovaný/PML režim není označen za legislativně vyhovující bez právního potvrzení a odpovídajících kontrolních testů.

## 7. Závislosti a paralelní práce agentů

Práce se řídí závislostmi, ne kalendářem.

```text
Skutečný audit repa
├── registrace → promo attribution → referral → funnel analytika
├── company context → multi-company switch → export/statistiky po firmách
├── klienti → CRM → klientská zóna
├── současný pricing → sjednocený ceník → promo benefit v subscription
├── integrační foundation → Viva rozhodnutí → případný runtime adapter
├── současný inventory API → jednotný ledger → nákup/šarže/ocenění → kontrolní exporty
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
- kompletní sklad po vertikálních řezech: ledger, nákup, šarže, inventura, ocenění a reporting.

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

### 2026-07-14 | Codex | INV-16 | roadmap doplněna | docs/investor-additions-roadmap

**Výsledek:** Přidán kompletní plán skladového hospodářství navazující na existující inventory API. Pokrývá jednotný ledger, dodavatele a nákupní objednávky, příjemky, šarže/expirace, převody, výrobu, inventury, ocenění, automatizace, auditní výstupy a mobilní skenování.

**Ověření:** porovnáno se současnými `useInventory`, skladovými typy a obrazovkami v repu a s veřejným přehledem funkcí [ePML](https://epml.cz/) dne 2026-07-14.

**Kontrakty/dokumentace:** změněna pouze tato roadmapa přidáním `INV-16`; existující roadmapové body ani jejich kontext nebyly odstraněny.

**Závislosti nebo další bezpečný krok:** nejdřív uzavřít inventory doménový audit frontend + backend a navrhnout ledger/migraci. Případný PML regulovaný profil závisí na `INV-15`; role a oprávnění dodá Standa.

### 2026-07-14 | Codex | INV-01 | první mobilní vertikální slice | feat/inv-01-mobile-web / PR #184

**Výsledek:** Webový editor faktury je použitelný na 360, 390 i 768 px. Náhled se přizpůsobuje šířce bez oříznutí dlouhého dokladu, primární uložení zůstává na mobilu dostupné a rozpracovaný koncept má lokální obnovu s tenant/session izolací a 24hodinovým úklidem. Doplněna validace, přístupné názvy akcí a pravdivý read-only stav vystavených dokladů. `INV-01` zůstává částečně otevřený pro ostré odeslání e-mailu a responsivní audit dalších webových obrazovek.

**Ověření:** `npm run build`, `npm run lint`, 528/528 unit testů a 88/88 Playwright E2E. Produkční PWA ověřena přes manifest, ikony a aktivní service worker; mobilní editor prošel axe kontrolou bez serious/critical porušení.

**Kontrakty/dokumentace:** API kontrakt se neměnil. Doplněn uživatelský manuál a shodný kontext v `AGENTS.md` a `CLAUDE.md`.

**Závislosti nebo další bezpečný krok:** ostré odesílání e-mailu vyžaduje samostatný backendový slice. Nativní Android/iOS, role/oprávnění a AI/MCP zůstávají ve Standově oblasti.

### 2026-07-14 | Codex | produktový rozsah | upřesněno | docs/investor-additions-roadmap

**Výsledek:** Roadmapa výslovně stanovuje Vystaveno.cz jako modulární systém pro všechny živnostníky a malé firmy, nikoli jako produkt omezený na gastro nebo sklad. Společný základ zahrnuje obecné podnikatelské doklady a podporuje příjmový/výdajový pokladní doklad i POS účtenku jako dva rozdílné scénáře.

**Ověření:** upřesnění navazuje na existující modulární architekturu a nemění hranice Standovy oblasti.

**Kontrakty/dokumentace:** přidán pouze nový produktový kontext, rozhodnutí k `INV-01` a tento append-only záznam; existující kontext zůstal zachován.

**Závislosti nebo další bezpečný krok:** při návrhu registrace a ceníku zobrazit jednoduchý společný základ a oborové moduly doporučovat podle typu podnikání, nikoli je všem vnucovat.

### 2026-07-14 | Codex | produktový rozsah | oprava interpretace | docs/investor-additions-roadmap

**Výsledek:** Výslovně potvrzeno, že klienti, nabídky, objednávky, fakturace, pokladna, sklad a ostatní současné moduly jsou existující základ Vystaveno.cz, nikoli nový backlog. Roadmapa plánuje pouze dodatky a skutečně chybějící části.

**Ověření:** oprava navazuje na úvodní pravidlo roadmapy, že jde o rozdíl proti současnému produktu, ne o stavbu nové aplikace.

**Kontrakty/dokumentace:** přidáno pouze vysvětlení stavu a tento append-only záznam; žádný existující bod ani kontext nebyl odstraněn.

**Závislosti nebo další bezpečný krok:** před každým `INV-XX` nejprve ověřit existující implementaci a vytvořit pouze delta plán bez duplikace hotových modulů.

### 2026-07-14 | Codex | INV-03 | první fakturační vertikální slice | agent/inv-03-export-filter / PR #185

**Výsledek:** Export pro účetní načte všechny stránky fakturačních dokladů a umožní přesný výběr podle data vystavení, typu, stavu, odběratele a měny. Náhled, souhrny, seznam a CSV používají stejný seřazený výběr; měny se nesčítají, dobropisy zůstávají záporné a proformy, koncepty nebo storna se přidávají pouze vědomě. ISDOC zůstává po jednom podporovaném dokladu. `INV-03` zůstává částečně otevřený pro další datové sady.

**Ověření:** `npm run build`, `npm run lint`, 558/558 unit testů a 93/93 Playwright E2E. Mobilní obrazovka 390 px prošla axe a overflow kontrolou; desktop i mobil byly vizuálně ověřeny bez chyb v konzoli. Nezávislé QA a finální code review nenašly P0/P1/P2.

**Kontrakty/dokumentace:** API endpoint ani tvar response se neměnil; frontend nově stránkuje stávající `GET /invoices` do úplného výsledku a dál používá serverové peněžní součty. Zpřesněn Invoicing V2 kontrakt, `AGENTS.md`, `CLAUDE.md`, oba uživatelské návody a vygenerovaný PDF manuál. CSV chrání uživatelský text před spuštěním jako tabulkový vzorec.

**Závislosti nebo další bezpečný krok:** navázat samostatnými řezy pro produkty, klienty, POS doklady a Z-reporty. Filtr více firem doplnit až po Standově multi-company/auth kontraktu; role/oprávnění, nativní Android/iOS a AI/MCP zůstávají ve Standově oblasti.

### 2026-07-14 | Codex | INV-16 | skladová karta a kontrolní export | frontend PR #186 / backend PR #253

**Výsledek:** Existující append-only skladový ledger má první ucelenou skladovou kartu: serverově stránkovaný přehled a přesný CSV export podle období, produktu, typu pohybu a pobočky. Pohyby nesou čitelné popisky i auditní ID a filtry zpřístupní také archivované produkty a pobočky bez obejití tenantového nebo pobočkového scope. Web načítá celý ledger pouze při výslovném exportu, kontroluje souběžnou změnu dat a bezpečně pokrývá i více než 100 produktů. Rozhraní funguje jako mobilní web/PWA na 390 px; nativní aplikace nejsou součástí řezu.

**Ověření:** frontend `npm run build`, `npm run lint`, 551/551 unit testů a 93/93 Playwright E2E; skladová karta prošla přesným vícestránkovým exportem, axe a kontrolou horizontálního overflow. Backend build bez varování, `dotnet format --verify-no-changes`, 42/42 cílených `InventoryTests`; před aditivním dokončením řezu prošlo také 365/365 unit a 1177/1177 integračních testů. Všechny závěrečné QA/review nálezy byly opraveny a znovu cíleně ověřeny.

**Kontrakty/dokumentace:** backend rozšiřuje `GET /api/v1/inventory/movements` o `locationId`, deterministické řazení a čitelné metadata a přidává `GET /api/v1/inventory/movement-filters`; bez databázové migrace. Frontend kontraktuje úplné stránkování, stabilní export a ochranu CSV proti formula injection. Doplněny oba repozitářové kontexty, backendové dokumenty, uživatelské návody a vizuálně ověřený 17stránkový PDF manuál. Implementace netvrdí shodu s PML ani jiným regulovaným režimem.

**Závislosti nebo další bezpečný krok:** `INV-16` zůstává otevřený pro navazující samostatné řezy: dodavatelé a nákupní objednávky, rezervace/disponibilita, šarže a expirace, skenerová inventura, ocenění a hlubší reporting. Role a oprávnění dodá Standa; nativní Android/iOS a AI/MCP zůstávají mimo tuto roadmapu.

### 2026-07-14 | Codex | INV-16 | dodavatelé a nákupní objednávky V1 | frontend PR #187 / backend PR #255

**Výsledek:** Na existující sklad navazuje tenantový adresář dodavatelů a nákupní objednávka `Draft → Ordered → PartiallyReceived → Received`, kterou lze před prvním příjmem zrušit. Částečný i úplný příjem používá současnou `PurchaseReceipt` a append-only ledger; atomická transakce, zámek objednávky, fingerprint payloadu a idempotency klíč brání přeplnění i dvojímu naskladnění. Responzivní web v `Naskladnění` podporuje celý tok, stránkování, bezpečný výchozí příjem nula kusů a explicitní akci pro doplnění všech zbývajících množství. Nativní aplikace nejsou součástí řezu.

**Ověření:** frontend `npm run lint`, `npm run build`, 4/4 cílené unit testy a mobilní Playwright E2E na 390 × 844 px včetně axe a kontroly overflow; před závěrečnými izolovanými úpravami prošlo také 555/555 unit a 94/94 Playwright testů. Backend build bez varování, `dotnet format --verify-no-changes`, 3/3 validační unit testy a 9/9 integračních testů nákupního toku; před závěrečnými izolovanými úpravami prošlo také 365/365 unit a 1181/1181 integračních testů. Nezávislá QA odhalila a ověřila opravy bezpečného částečného příjmu, souběžných retry, stránkování, mezí desetinných hodnot, pobočkového scope a konfliktu při obnově dodavatele; finální re-review nezanechalo P1/P2 nález.

**Kontrakty/dokumentace:** backend přidává `/api/v1/inventory/suppliers` a `/api/v1/inventory/purchase-orders`, nové tenantové entity a migraci, ale zachovává existující `PurchaseReceipt`, skladové pohyby a oprávnění `inventory.read/manage`. Peněžní součty se zaokrouhlují po řádcích na dvě desetinná místa a neúplně oceněná objednávka nepublikuje zavádějící total. Doplněn shodný kontrakt v obou repech, `AGENTS.md`, `CLAUDE.md`, uživatelské návody, smoke checklist a vizuálně ověřený 17stránkový PDF manuál.

**Závislosti nebo další bezpečný krok:** `INV-16` zůstává otevřený pro dodavatelské SKU/balení a převod návrhu doobjednání do objednávky, rezervované/disponibilní množství, šarže a expirace, skenerovou inventuru, ocenění a hlubší reporting. Nejbližší samostatný řez má přidat šarže a expirace nad stejný ledger bez paralelního skladového modelu. Role a oprávnění dodá Standa; nativní Android/iOS a AI/MCP zůstávají mimo tuto roadmapu.

### 2026-07-14 | Codex | INV-16 | šarže, expirace a FEFO V1 | frontend PR #188 / backend PR #256

**Výsledek:** Existující append-only sklad je rozšířen o nevratné sledování šarží produktu bez paralelního stavu zásob. Příjmy, příjemky, dílčí příjmy objednávek a výrobní výstupy ukládají číslo šarže a expiraci; výdeje, POS/QR prodej, výroba a materiál zakázky alokují FEFO a nedovolí sledovaný produkt dostat do záporného stavu. Přesun zachová šarži a storno prodeje nebo odebrání materiálu zakázky vrací přesně původní alokace. Mobilní web/PWA nabízí přehled `Zásoby → Šarže`, přesný odpis expirace, ruční výběr šarže, rozdělení dodávky do více šarží a auditní rozpad v pohybech i CSV. Aktivace je celofiremní, pobočkově scoped člen ji nespustí a stará kladná zásoba se převede do transparentní počáteční šarže bez změny celkového množství.

**Ověření:** backend build s warnings-as-errors, `dotnet format --verify-no-changes`, 368/368 unit a 1200/1200 integračních testů v jednom kompletním běhu; samostatná cílená regrese 28/28 pokryla FEFO, souběžnou aktivaci, přesun, inventuru, výrobu, POS/storno, zakázkové vrácení, pobočkový scope a nákupní objednávky. Frontend `npm run lint`, produkční build, 62/62 unit souborů a 560/560 testů; Playwright ověřil mobil 390 px, a11y/overflow, přesný odpis a příjem, desktopové sloupce/filtry/CSV, split objednávky do dvou šarží a reset i odeslání výstupní šarže výroby. Nezávislé QA a review nálezy byly opraveny před commitem.

**Kontrakty/dokumentace:** backend přidává `StockLot`, `StockMovementLotAllocation`, `lotTrackingEnabled`, aditivní migraci `AddStockLotsExpiry`, `POST /api/v1/inventory/stock-lots/products/{productId}/enable`, `GET /api/v1/inventory/stock-lots` a rozšiřuje skladové DTO o šaržová pole. Množství šarže se vždy odvozuje z ledgeru, FEFO a aktivace se serializují transakčním advisory lockem a víceproduktová výroba bere locky v deterministickém pořadí. Nové role ani permission claimy nevznikly; použil se existující `inventory.read/manage` a location scope. Synchronizovány oba repozitářové kontexty, API kontrakty, manuály, nápověda a deploy smoke checklist.

**Závislosti nebo další bezpečný krok:** `INV-16` zůstává otevřený pro rezervované versus disponibilní množství, dodavatelská SKU a balení, převod návrhu doobjednání do objednávky, blokaci/karanténu/stažení šarže, rozpracovanou skenerovou inventuru, ocenění/COGS a hlubší skladové reporty. Nejbližší samostatný řez má zavést rezervace a disponibilitu nad stejný ledger bez změny fyzického stavu; role a oprávnění dodá Standa, nativní Android/iOS a AI/MCP zůstávají mimo tuto roadmapu.

### 2026-07-14 | Codex | INV-16 | rezervované a disponibilní množství V1 | frontend PR #189 / backend PR #257

**Výsledek:** Sklad nyní odděluje fyzické množství `Skladem`, aktivně držené `Rezervováno` a skutečně použitelné `K dispozici`. Rezervaci lze založit pro zákazníka, objednávku nebo zakázku, vyhledat a stránkovat, bezpečně uvolnit nebo atomicky vyskladnit. Aktivní rezervace chrání zásobu před ručním výdejem a korekcí dolů, přesunem, inventurou pod rezervovaný stav, POS/QR prodejem, spotřebou zakázky a výrobou. Vyskladnění zachovává FEFO šarží a vytváří auditovatelný ledger pohyb s přímou vazbou na rezervaci; uvolnění fyzický stav nemění. Nízké zásoby a návrhy nákupu vycházejí z disponibilního, nikoli pouze fyzického množství. Responzivní web/PWA pokrývá celý tok včetně 390px mobilu; nativní aplikace nejsou součástí řezu.

**Ověření:** backend build s warnings-as-errors, `dotnet format --verify-no-changes`, migration drift kontrola, 368/368 unit a 1204/1204 integračních testů v kompletním běhu; po finální izolované úpravě minim a návrhů nákupu prošlo 25/25 cílených integračních testů. Frontend `npm run lint`, produkční build, 62/62 unit souborů a 562/562 testů; cíleně 26/26 testů inventory composable a 4/4 mobilní/regresní Playwright scénáře pro rezervace, šarže a ledger export včetně axe a kontroly horizontálního overflow. Nová část kompletního uživatelského manuálu byla vygenerována do 18stránkového kontrolního PDF a vizuálně ověřena na stranách 11–13 bez oříznutí nebo překryvu.

**Kontrakty/dokumentace:** backend přidává tenantovou entitu `StockReservation`, aditivní migraci `AddStockReservations`, endpointy `GET/POST /api/v1/inventory/stock-reservations`, detail, `release` a `fulfill`, pohyb `ReservationFulfillment` a aditivní pole reserved/available do skladových DTO. Současný location scope a oprávnění `inventory.read/manage` zůstávají zachované; nový permission claim nevznikl. Synchronizovány oba repozitářové kontexty, backendový kontrakt, uživatelský manuál, frontendové typy a CSV popisky.

**Závislosti nebo další bezpečný krok:** `INV-16` zůstává otevřený pro dodavatelská SKU a balení, převod návrhu doobjednání do objednávky, blokaci/karanténu/stažení šarže, rozpracovanou skenerovou inventuru, ocenění/COGS a hlubší skladové reporty. Nejbližší samostatný řez má doplnit skladové ocenění a COGS nad stejný append-only ledger; role a oprávnění dodá Standa, nativní Android/iOS a AI/MCP zůstávají mimo tuto roadmapu.

### 2026-07-14 | Codex | INV-16 | skladové ocenění a COGS V1 | frontend PR #190 / backend PR #258

**Výsledek:** Vystaveno nyní poskytuje serverově vypočtené provozní ocenění skladu za období a pobočku. Periodický vážený průměr z nákupních příjemek oceňuje počáteční a koncový stav, nákupy, COGS z prodejů po odečtení storen, ostatní spotřebu, ztráty a inventurní rozdíly. Pobočkový výkaz používá bezpečný fallback pobočka → firma → katalogová nákupní cena. Jakákoli neoceněná část relevantní historie je viditelně označena jako neúplná; diagnostický odhad může zůstat zobrazený, ale odvozená peněžní hodnota ani souhrn se nikdy nevydávají za nulu. Mobilní web/PWA přidává kartu `Zásoby → Ocenění` s filtry, stránkovanými produktovými kartami, dynamickou měnou a úplným CSV s kontrolním řádkem.

**Ověření:** backend build s 0 warningy a 0 chybami, `dotnet format --verify-no-changes`, EF model bez pending změn, 368/368 unit a 1210/1210 integračních testů; cílené ocenění 5/5. Frontend `npm run lint`, produkční build, 62/62 unit souborů a 567/567 testů; cíleně 35/35 testů inventory composable a exportu a 6/6 mobilních/regresních Playwright scénářů pro ocenění, rezervace, šarže, ledger a skladové zrcadlo včetně axe, 390px overflow a CSV formula injection. Kompletní manuál zůstal 18stránkový a strany 11–13 byly vizuálně ověřeny bez oříznutí a překryvu.

**Kontrakty/dokumentace:** backend přidává `GET /api/v1/inventory/stock-valuation` se stránkováním, filtrem období/pobočky/produktu, řazením, `costSource`, `isCostComplete` a `dataVersion`; nevzniká databázová migrace ani paralelní skladový stav. Frontend finanční čísla nepřepočítává a vícestránkový export zavřeně odmítne, pokud se `dataVersion` nebo počet produktů během načítání změní. Synchronizovány oba repozitářové kontexty, shodný API kontrakt a kompletní uživatelský manuál. V1 je výslovně provozní manažerský výkaz, nikoli tvrzení o zákonné účetní metodě, FIFO finančních vrstvách nebo kapitalizaci výrobního BOM.

**Závislosti nebo další bezpečný krok:** `INV-16` zůstává otevřený pro dodavatelská SKU a balení, převod návrhu doobjednání do objednávky, blokaci/karanténu/stažení šarže, rozpracovanou skenerovou inventuru a hlubší skladové reporty. Nejbližší bezpečný řez má propojit dodavatelské produktové údaje s návrhem objednání a převodem návrhu do nákupní objednávky; role a oprávnění dodá Standa, nativní Android/iOS a AI/MCP zůstávají mimo tuto roadmapu.

### 2026-07-15 | Codex | INV-16 | dodavatelský katalog a objednávka z návrhů V1 | frontend PR #191 / backend PR #259

**Výsledek:** Existující dodavatelé, serverová nákupní doporučení a nákupní objednávky jsou propojené do jednoho mobilního workflow. U produktu lze pro konkrétního dodavatele uložit jeho SKU/EAN, počet základních skladových jednotek v balení, minimální odběr a obvyklou cenu za jednotku. Nákupní doporučení ukáže dostupné dodavatele, množství zaokrouhlené nahoru na celá balení a známý odhad ceny. Vybrané položky lze převést do běžného konceptu objednávky; server potřebu i ceny znovu přepočítá, nevěří klientským číslům a do historie uloží snapshot tehdejších kódů, velikosti a počtu balení. UUID idempotency klíč, tenantový advisory lock a unikátní index brání duplicitě i při souběžném dvojkliku.

**Ověření:** backend build s 0 warningy a 0 chybami, `dotnet format --verify-no-changes`, EF model bez pending změn, 371/371 unit a 1213/1213 kompletních integračních testů; cílený dodavatelský katalog 4/4 včetně souběžného replay. Frontend `npm run lint`, produkční build, Prettier kontrola, 62/62 unit souborů a 568/568 testů; 2/2 mobilní Playwright scénáře na 390 px ověřily katalog, okamžitý refresh návrhů, zaokrouhlení, snapshot, dílčí příjem, axe a horizontální overflow. Kompletní manuál byl vygenerován do 19stránkového PDF a strany 11–13 vizuálně prošly bez ořezu a překryvu.

**Kontrakty/dokumentace:** backend přidává tenantovou vazbu `SupplierProduct`, aditivní migraci `AddSupplierProductCatalog`, CRUD pod `/api/v1/inventory/suppliers/{supplierId}/products`, `supplierOptions` v nákupních návrzích a `POST /api/v1/inventory/purchase-orders/from-suggestions`. Objednávka zůstává současný `PurchaseOrder Draft` a příjem dál používá stávající `PurchaseReceipt` a append-only ledger. Synchronizovány oba repozitářové kontexty, shodný API kontrakt, nápověda, uživatelské návody, smoke checklist a verzované PDF. Nový permission claim nevznikl; zůstává `inventory.read/manage`.

**Závislosti nebo další bezpečný krok:** `INV-16` zůstává otevřený pro blokaci/karanténu a stažení šarže, rozpracovanou skenerovou inventuru a hlubší skladové reporty. Nejbližší bezpečný řez má přidat stav šarže `Active/Quarantined/Blocked/Recalled` nad existující alokační vrstvu, aby blokovanou zásobu nešlo prodat ani vydat; role a oprávnění dodá Standa, nativní Android/iOS a AI/MCP zůstávají mimo tuto roadmapu.

### 2026-07-15 | Codex | INV-16 | karanténa, blokace a stažení šarže V1 | frontend PR #192 / backend PR #260

**Výsledek:** Šarže mají nad existujícím append-only ledgerem provozní stav `Active`, `Quarantined`, `Blocked` nebo konečný `Recalled`. Každá skutečná změna vyžaduje důvod, zapisuje neměnnou historii a audit; opakování stejného stavu je idempotentní. Pouze aktivní šarže vstupují do FEFO. Karanténa, blokace i stažení okamžitě sníží disponibilní zásobu bez změny fyzického množství a blokují přesný i automatický výdej, POS/QR prodej, zakázku, výrobu, přesun, rezervaci, inventuru pod chráněný stav a další příjem do stejné šarže. Mobilní web/PWA nabízí stavový filtr, jasné štítky, dialog s povinným důvodem a úplnou historii; `Zásoby` a matice poboček oddělují `Skladem`, `Rezervováno`, `Blokováno` a `K dispozici`.

**Ověření:** backend build s 0 warningy a 0 chybami, `dotnet format --verify-no-changes`, EF model bez pending změn, 373/373 unit a 1216/1216 kompletních integračních testů. Úplná regrese odhalila a ověřila opravu zachování záporného diagnostického deficitu v nízkých zásobách. Frontend `npm run lint`, produkční build, Prettier kontrola, 62/62 unit souborů a 570/570 testů; mobilní Playwright scénář na 390 px ověřil změnu stavu, historii, přesný odpis, příjem, axe a horizontální overflow. Kompletní manuál byl vygenerován do 19stránkového PDF a nové strany 12–13 byly vizuálně ověřeny bez oříznutí nebo překryvu.

**Kontrakty/dokumentace:** backend přidává `StockLot.Status`, append-only `StockLotStatusEvent`, aditivní migraci `AddStockLotRestrictions`, filtr `status`, `POST /api/v1/inventory/stock-lots/{stockLotId}/status`, `GET /api/v1/inventory/stock-lots/{stockLotId}/status-history` a `restrictedQuantity` do skladových odpovědí. Disponibilní množství je `max(0, quantity - reservedQuantity - restrictedQuantity)`; nízké zásoby od stejného základu odečítají rezervace i omezení, ale zachovávají záporný deficit. Stav je celofiremní, proto jej location-scoped člen nesmí měnit a historii vidí jen u šarže dostupné ve svém scope. Synchronizovány oba repozitářové kontexty pro Codex/Claude, backendové kontrakty, nápověda, uživatelské návody, interní test manuál, smoke checklist a verzované PDF. Nový permission claim nevznikl; zůstává `inventory.read/manage`.

**Závislosti nebo další bezpečný krok:** `INV-16` zůstává otevřený pro rozpracovanou skenerovou inventuru a hlubší skladové reporty. Nejbližší bezpečný řez má dodat mobilní skenovací inventuru nad současným produktem, šaržemi, pobočkami a stocktake API bez paralelního ledgeru. Role a oprávnění řeší Standa; nativní Android/iOS a AI/MCP zůstávají mimo tuto roadmapu.

### 2026-07-15 | Codex | INV-16 | mobilní skenovací inventura V1 | frontend PR #193 / backend commit `4005bb6`

**Výsledek:** `Zásoby → Inventura` je použitelné na telefonu i s HW čtečkou. První kolo je standardně slepé a bez nebezpečného předvyplnění, EAN lze načítat vstupem nebo kamerou a každý platný sken přičte jeden kus. Rozpracovaný průběh se automaticky ukládá odděleně pro firmu, uživatele a pobočku, přežije zavření dialogu i obnovu stejného prohlížeče a drží stabilní UUID pro retry. Druhé nezávislé kolo vyžaduje přepočítat pouze rozdílné položky. Finální inventura dál atomicky používá současný `Stocktake` a append-only ledger; stejný UUID a payload vrátí původní doklad bez druhých korekčních pohybů, změněný payload skončí 409 a stejný klíč deduplikuje také čekající schválení. Po úspěchu se otevře autoritativní inventurní protokol s CSV a tiskem/PDF.

**Ověření:** backend API build s 0 warningy a 0 chybami, `dotnet format --verify-no-changes`, EF model bez pending změn, 374/374 unit a 1220/1220 kompletních PostgreSQL integračních testů včetně sekvenčního i souběžného retry, konfliktu změněného payloadu a approval replay. Frontend `npm run lint`, produkční build, 63/63 unit souborů a 576/576 testů; mobilní Playwright na 390 × 844 ověřil slepé počítání, EAN, zavření/obnovení draftu, druhé kolo, stabilní UUID, protokol, CSV, odstranění draftu, axe a horizontální overflow. In-app mobilní vizuální kontrola proběhla bez chyb v konzoli. Kompletní manuál byl znovu vygenerován do 19stránkového PDF a strany 11–14 byly vizuálně ověřeny bez ořezu nebo překryvu.

**Kontrakty/dokumentace:** `POST /api/v1/inventory/stocktake` přijímá volitelný UUID `idempotencyKey`, odpověď ho vrací a aditivní migrace `AddStocktakeIdempotency` přidává tenantový unikátní index a SHA-256 fingerprint normalizovaného požadavku. Transakční PostgreSQL advisory lock serializuje souběžné retry. Lokální draft V1 expiruje za sedm dní, při neplatném obsahu nebo změně katalogu se zahodí fail-closed a maže se až po 201/202 nebo výslovném zahození. Nejde o serverovou ani mezizařízení synchronizaci. Synchronizovány oba repozitářové kontexty pro Codex/Claude, shodný backendový kontrakt, nápověda, uživatelské návody, interní test, deploy smoke a verzované PDF. Backendová větev `feat/inv-16-mobile-stocktake-scanner` je pushnutá; draft PR zatím nelze založit, protože GitHub aplikace nemá k backend repozitáři přístup a místní `gh` token vyžaduje obnovení.

**Závislosti nebo další bezpečný krok:** `INV-16` zůstává otevřený pro serverově uloženou inventurní relaci napříč zařízeními, částečnou/cyklickou/namátkovou inventuru podle skladu, kategorie a produktů a pro hlubší skladové reporty. Nejbližší bezpečný řez má rozšířit inventurní relaci a výběr rozsahu nad stejný stocktake a ledger, nikoli vytvořit paralelní skladový stav. Role a oprávnění řeší Standa; nativní Android/iOS a AI/MCP zůstávají mimo tuto roadmapu.

### 2026-07-16 | Codex | INV-16 | sdílená mobilní inventura a rozsahy | frontend commit `927b5f9` / backend commits `7534e13`, `8eaac60`

**Výsledek:** Inventura nyní podporuje úplný, částečný, cyklický a namátkový rozsah. Rozpracovaný koncept se v API režimu ukládá tenantově na server vedle lokální offline zálohy, takže jej lze bezpečně otevřít na jiném zařízení. Serverový koncept je pouze synchronizační vrstva: nikdy nemění sklad ani ledger. Každé uložení průběhu nese revision; souběžná změna z jiného zařízení vrátí konflikt, klient zastaví finální uzavření a nabídne načíst aktuální serverový stav. Dokončení nebo výslovné zahození koncept odstraní; finální zápis stále probíhá jen atomickým idempotentním `POST /inventory/stocktake`.

**Ověření:** frontend `npm run lint`, produkční build a 33 cílených unit testů; backend `dotnet format --verify-no-changes` a cílené PostgreSQL integrační testy `StocktakeTests` v Dockeru. Nový test potvrzuje, že odstranění serverového konceptu nemění fyzický stav zásoby.

**Kontrakty/dokumentace:** přidány tenantově a pobočkově scoped endpointy `GET/POST /api/v1/inventory/stocktake-drafts`, detail, revision-protected `PUT .../progress` a `DELETE`. Používají stávající `inventory.read/manage`, nevzniká nový permission model. Kontext v modulární roadmapě a interním test manuálu byl doplněn aditivně.

**Závislosti nebo další bezpečný krok:** draft PR nelze dosud založit, protože místní GitHub CLI token je neplatný; lokální commity jsou připravené. Další práce může pokračovat ve skladových reportech nebo dalším konkrétním datovém řezu `INV-03`; multi-company kontext, role/oprávnění, nativní Android/iOS a AI/MCP zůstávají mimo tento řez.

### 2026-07-16 | Codex | INV-03 | přesný export nákupních příjemek | frontend pracovní větev `feat/inv-16-shared-stocktake-ui`

**Výsledek:** `Naskladnění` dostává mobilní export existujících nákupních příjemek podle data od/do, dodavatele nebo čísla dokladu a aktuálně vybrané pobočky. CSV obsahuje každý řádek dokladu: dodavatele, doklad, produkt, SKU, množství, jednotkovou i řádkovou cenu, šarži, expiraci a poznámku. Export načítá všechny stránky a před stažením ověří nezměněný počet řádků, takže při souběžné změně raději selže než aby tiše vynechal doklad. Uživatelský text je chráněn před formula injection.

**Ověření:** frontend `npm run lint`, produkční build a 34 cílených unit testů composable; test pokrývá stránkování 101 příjemek, přesné query parametry a ověřovací první stránku.

**Kontrakty/dokumentace:** využívá existující serverové `GET /api/v1/inventory/purchase-receipts` s parametry `from`, `to`, `search`, `sort` a `locationId`; nevzniká nový backendový endpoint ani účetní doménový model.

**Závislosti nebo další bezpečný krok:** stejný vzor lze navázat na další existující datové sady vyžadované `INV-03` (produkty, klienti, POS doklady a Z-reporty), vždy jako samostatný ověřený řez nad autoritativním API.

### 2026-07-16 | Codex | INV-14 | Viva Payments research a go/no-go | `docs/product/viva-payments-research.md`

**Výsledek:** Vznikl aktuálně zdrojovaný rozhodovací podklad. Viva je vhodná pro technický discovery a případný první adapter hostovaného Smart Checkout pro platbu jednotlivé faktury nebo objednávky, nikoli zatím pro ostré platby ani marketplace/split-funds model. Podklad pokrývá ČR/CZK, ceník, onboarding/KYC, OAuth/demo, webhookové potvrzení, refund, terminál/SoftPOS a PCI hranici.

**Rozhodnutí:** pokračovat může pouze serverový spike s provider-neutral vaultem, hostovaným checkoutem a idempotentním webhookem. Ostré spuštění čeká na obchodní podmínky pro český partner/ISV model, ověřený onboarding obchodníka, právní audit, test skutečné platby, zamítnutí, refundu a duplicitního webhooku.

### 2026-07-16 | Codex | INV-15 | licence, certifikace a tříletý TCO | `docs/product/compliance-certification-tco.md`

**Výsledek:** Vznikla rozhodovací matice, která odděluje zákonné povinnosti od smluvních očekávání a dobrovolných certifikací. Prioritou je GDPR/security/retention základ a průkazný provoz, ne nákup obecného certifikátu. Podpisy jsou rozdělené podle jejich právního významu, platební PCI scope podle hostovaného checkoutu a ochranná známka má jasný veřejný nákladový orientační bod.

**Rozhodnutí:** ISO 27001 ani kvalifikovaný podpis nejsou univerzální blokátor. Spustit se má GDPR/DPA a retention gap audit; Viva a podpisy pokračují až s konkrétním obchodním/provider rozhodnutím. TCO se schvaluje z nabídek podle vzorce zavedení + provoz + audit + objemové poplatky, ne odhadem bez rozsahu.

### 2026-07-16 | Codex | INV-13 | konkurenční gap analýza | `docs/product/competitive-gap-analysis.md`

**Výsledek:** Analýza veřejně ověřila hodnotové benchmarky iDokladu, KiloMayo a ePML a mapuje je na skutečný stav Vystaveno. Doporučuje nezdvojovat hotovou fakturaci, nabídky, sklad, POS ani provozní moduly; soustředit se na jednoduchý start, jednotný ceník, multi-company kontext, přesný export se statistikou a následný chráněný partnerský růst.

**Rozhodnutí:** Vystaveno staví obecný základ pro živnostníky a volitelné oborové moduly. Kompletní sklad je produktová síla, ale regulovaný PML režim zůstává oddělený až do právního rozhodnutí. Nativní aplikace a AI nejsou součástí tohoto backlogu.

### 2026-07-16 | Codex | INV-03 | export aktuálně vyfiltrovaných produktů | frontend commit `e43505e`

**Výsledek:** `Produkty a menu` nově exportuje přesně aktuální výběr podle vyhledávání do CSV. Výstup obsahuje název, SKU, EAN, prodejní i nákupní cenu, DPH, minimální množství, alergeny, typ produktu a stav sledování šarží. Textová pole jsou chráněna před formula injection; prázdný výběr nelze exportovat.

**Ověření:** `npm run lint` a produkční `npm run build` proběhly bez chyby. Export používá sdílený český CSV renderer se stávajícím BOM, oddělovačem a formátováním čísel; nevzniká nový backendový endpoint ani klientský skladový stav.

### 2026-07-16 | Codex | INV-05 | snadné založení firmy přes ARES | frontend commit `4a74747`

**Výsledek:** První nastavení firmy nyní umí z IČO načíst veřejné údaje z ARES. Tlačítko `Načíst z ARES` použije existující serverový proxy kontrakt, předvyplní název, DIČ a sídlo a uživatel data před uložením stále vidí a potvrzuje. Zůstává funkční i ruční zadání, takže krok neblokuje zahraniční subjekt ani neúplný záznam ve veřejném registru.

**Ověření:** frontendový `npm run lint` a produkční `npm run build` prošly bez chyby. Kompletní uživatelský manuál byl přegenerován do PDF a krok prvního přihlášení byl vizuálně ověřen bez ořezu nebo překryvu.

**Kontrakty/dokumentace:** využívá se existující composable `useAres` a backendový ARES proxy endpoint; nevzniká nový backendový endpoint, nový model ani externí pověření. OAuth přihlášení, multi-company kontext, role/oprávnění, nativní Android/iOS a AI/MCP nejsou součástí tohoto řezu.

### 2026-07-16 | Codex | INV-03 | přesný účetní export faktur a dobropisů | frontend commit `3b9950e`

**Výsledek:** `Export pro účetní` nyní vybírá přesný výřez podle období, typu dokladu (faktura/dobropis), stavu a hledání podle odběratele, IČO, DIČ nebo čísla. Počet řádků u tlačítka odpovídá výsledku a CSV stahuje právě zobrazené doklady; samostatný ISDOC zůstává dostupný u konkrétní české faktury. To rozšiřuje hotový export, nikoli účetní pravidla nebo data dokladů.

**Ověření:** frontendový `npm run lint`, produkční `npm run build` a `git diff --check` prošly bez chyby. Uživatelský manuál byl přegenerován do PDF a účetní kapitola byla vizuálně ověřena bez ořezu nebo překryvu.

**Kontrakty/dokumentace:** filtry běží nad stávajícím autoritativním seznamem faktur a používají existující CSV/ISDOC renderer. Nevzniká endpoint, účetní výpočet, nový model, nový permission claim ani klientský zdroj pravdy.

### 2026-07-16 | Codex | INV-07/10/11/12 | chráněný claim, referral a měřitelný funnel | `docs/backend/subscription-claims-referrals-v1.md`

**Výsledek:** Vznikl společný backendový kontrakt pro kampaně, subscription claim kódy, referral a ambasadory. Odděluje tyto nároky od pokladních slev a věrnostních bodů, zavádí neměnnou atribuci a append-only ledger benefitů a vyžaduje idempotentní kvalifikační billingovou událost pro automatickou odměnu. Zahrnuje anti-abuse pravidla, neprozrazení kódů, reversal, agregovanou funnel analytiku a mobilní webové hranice.

**Rozhodnutí:** současný lokální 14denní trial není billingová autorita. Proto se nezačíná falešným frontendovým zadáním kódu ani vlastním prodlužováním trialu; server smí nárok uložit jako `Pending`, ale skutečné dva měsíce zdarma nebo benefit doporučujícího se uplatní až po reálné, idempotentně potvrzené platbě.

**Další bezpečný krok:** backend může dodat model, claim endpoint, audit, rate limit a konfiguraci kampaní nad tímto kontraktem. Po jeho dostupnosti frontend přidá zobrazení a zadání kódu do registrace/onboardingu; skutečný billing callback zůstává explicitní závislostí.
