# Rozsah MVP vs. placené moduly nad rámec

Pro oba programátory (Patrik, Standa) i pro AI agenty. Přečti si to **dřív, než začneš stavět nový modul nebo větší funkci.**

## Proč to tu je

Vystaveno se vyvíjí na **fixní cenu do dohodnutého termínu akceptace** (MVP). Všechno nad tento rozsah je samostatně objednávané a **samostatně placené** plnění.

Když nový modul vznikne potichu jako „to ještě doděláme", stanou se dvě věci najednou: zaplatí se za něj nula a zároveň to posune termín akceptace MVP, na kterém visí výše odměny. Proto:

> **Nezačínej stavět, dokud není jasné, do které škatulky to patří.**

## Co je součást MVP

Závazný rozsah drží smlouva — tělo smlouvy a **Přílohy č. 1 (Návrh vývoje) a č. 2 (Zadání)**. Při rozporu má přednost tělo smlouvy.

Fixní plnění se dodává ve třech fázích:

1. **Webový frontend na úrovni MVP** (veřejný web, fakturace, klienti, dashboard), **technický základ backendu** (architektura, databáze, CI) a **pokladní systém (POS)**.
2. **Napojení fakturace a klientů na server**, **monetizace** (tarify a předplatné), **skladové a provozní funkce**, dokončení webového frontendu.
3. **Desktopová a mobilní aplikace**, finální nasazení a předání.

Rozpad rozsahu podle Přílohy 2:

| Oblast                | Co do MVP patří                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Technická stabilizace | repozitář, doména, hosting/VPS, databáze, env proměnné, produkční běh                                      |
| Základní fakturace    | registrace, přihlášení, firma, klient, faktura, položky, splatnost, variabilní symbol, PDF, seznam, úhrada |
| Klienti               | seznam, detail, IČO, DIČ, adresa, e-mail, telefon, poznámka, historie faktur, vyhledávání                  |
| Monetizace            | platební stránka, free/paid tarif, evidence tarifu, omezení funkcí, webhooky                               |
| Dashboard             | faktury, úhrady, po splatnosti, celková částka, poslední faktury a klienti, rychlé akce                    |
| Pokladna (POS)        | prodej, účtenky, denní tržby, základní uzávěrka                                                            |
| Sklad                 | produkty, SKU, ceny, zásoby, pohyby, inventura, nízký stav                                                 |
| Desktop a mobil       | desktopová aplikace, mobilní aplikace, nasazení, předání                                                   |

**Cokoli, co v téhle tabulce není, je kandidát na plnění nad rámec.** Příloha 1 navíc jmenovitě řadí mezi moduly **po MVP**: rezervační systém, docházkový systém, provozovny/role/tým, PWA a mobilní verzi, publikaci na Google Play a App Store. Ty tedy do fixní ceny nepatří, dokud na ně není objednávka.

Nejde o výčet, který by šel číst extenzivně — „sklad" znamená rozsah z tabulky, ne multipobočkové zrcadlo s příjemkami a nákupními doporučeními.

## Signály, že jde o plnění NAD RÁMEC (placené zvlášť)

Stačí jeden bod → zastav se a nahlas to:

- Zavádí to **nový modul** do `src/lib/modules.ts` nebo novou položku hlavní navigace.
- Je to **oborová vertikála** (gastro, řemesla, rezervace, věrnost…), ne obecná fakturace / POS / sklad.
- Vyžaduje to **novou entitu a migraci** plus nové API kontrakty, ne rozšíření stávajících.
- Zákazník by za to podle `src/lib/pricing.ts` platil **jako za add-on**.
- Je to **integrace na třetí stranu** — platební provider, účetní systém, ověřené podpisy, tiskový agent, import z konkurenční pokladny.
- Přišlo to **jako nový požadavek v průběhu**, ne z původního zadání.

## Signály, že to je pořád MVP

- Oprava chyby v tom, co už je hotové.
- Doplnění chybějícího kusu funkce, kterou zadání jmenuje.
- Refaktor, testy, dokumentace ke stávajícímu rozsahu.
- Změna textu, UI nebo nastavení bez nové entity.

## Postup, když to vypadá na plnění nad rámec

1. **Nezačínej.** Rozdělaná práce se zpětně fakturuje mizerně.
2. **Ozvi se písemně.** Standa → Patrikovi. Patrik → objednateli. Ne ústně, ne „domluvíme se cestou".
3. **Vyžádej si písemnou objednávku** od objednatele: co, proč, do kdy. E-mail stačí, ale musí být dohledatelný.
4. **Zapiš to do registru níž**, ať se na to nezapomene.
5. **Teprve po potvrzení stav.**

Dvě lhůty, na které pozor:

- Když s požadavkem v objednávce **nesouhlasíš**, musíš to dát vědět **do 48 hodin**.
- Cokoli, co přibude **těsně před termínem akceptace MVP**, ten termín ohrožuje. Default odpověď na nový požadavek v tomhle okně je: _„Ano — ale jako samostatná objednávka až po akceptaci MVP."_

## Registr nahlášených položek

Přibývá odspoda. Stav: `nahlášeno` → `čeká na objednávku` → `objednáno` / `nestavíme`.

| Datum      | Položka                                                                                  | Kdo vznesl | Stav                            | Poznámka                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------- | ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-08 | Rezervace, docházka/směny, provozovny a role, PWA, publikace do app storů                | —          | **nahlášeno**                   | Příloha 1 je řadí mezi moduly **po MVP**, do fixní ceny nepatří. Části už v aplikaci existují (`attendance`, pobočky, role) — před fakturací nad rámec je potřeba doložit objednávku.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-08-08 | Možnost „vypnout EET"                                                                    | objednatel | **nestavíme**                   | EET bylo v ČR zrušeno k 1. 1. 2023 a v aplikaci **není implementované** — není co vypínat. Přepínač v nastavení by zákazníkovi tvrdil funkci, kterou nemáme. Viz `src/lib/faq-data.ts`. Pokud jde ve skutečnosti o slovenskou **eKasu**, je to certifikovaná fiskalizace = samostatný projekt, ne zaškrtávátko.                                                                                                                                                                                                                                                                                                                                  |
| 2026-08-09 | Import faktur z jiného účetního programu (ISDOC, PDF, ZIP dávka) + navázání číselné řady | objednatel | **postaveno, objednávka chybí** | Nový požadavek v průběhu + import z cizího programu → nad rámec. Nahlášeno, pak **postaveno na výslovný pokyn Patrika (2026-08-09)** — písemná objednávka od objednatele **stále chybí a je potřeba ji doložit před fakturací**. Dodáno: ISDOC/ISDOCX (Pohoda, Money, ABRA, Helios, iDoklad), PDF vytěžení z textové vrstvy, ZIP dávka, navázání číselné řady. Vědomá omezení: **OCR skenů neumíme**, PDF nerozpadá jednotlivé řádky (souhrnná položka podle rekapitulace DPH). Backend `POST /invoices/import` existuje a je hotový (ověřeno v repu 2026-08-09; dřívější poznámka v `docs/backend/import-faktur.md`, že chybí, byla zastaralá). |

## Související

- `docs/product/modular-business-roadmap.md` — produktová roadmapa a modulový záběr
- `src/lib/modules.ts` — seznam modulů a gatování navigace/rout
- `src/lib/pricing.ts` — co se prodává jako add-on
