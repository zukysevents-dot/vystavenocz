# Rozsah MVP vs. placené moduly nad rámec

Pro oba programátory (Patrik, Standa) i pro AI agenty. Přečti si to **dřív, než začneš stavět nový modul nebo větší funkci.**

## Proč to tu je

Vystaveno se vyvíjí na **fixní cenu do dohodnutého termínu akceptace** (MVP). Všechno nad tento rozsah je samostatně objednávané a **samostatně placené** plnění.

Když nový modul vznikne potichu jako „to ještě doděláme", stanou se dvě věci najednou: zaplatí se za něj nula a zároveň to posune termín akceptace MVP, na kterém visí výše odměny. Proto:

> **Nezačínej stavět, dokud není jasné, do které škatulky to patří.**

## Co je součást MVP

Závazný rozsah drží smlouva — tělo smlouvy a **Přílohy č. 1 (Návrh vývoje) a č. 2 (Zadání)**. Při rozporu má přednost tělo smlouvy.

Tělo smlouvy dělí fixní plnění do tří fází:

1. **Webový frontend na úrovni MVP** (veřejný web, fakturace, klienti, dashboard), **technický základ backendu** (architektura, databáze, CI) a **pokladní systém (POS)**.
2. **Napojení fakturace a klientů na server**, **monetizace** (tarify a předplatné), **skladové a provozní funkce**, dokončení webového frontendu.
3. **Desktopová a mobilní aplikace**, finální nasazení a předání.

Detailní rozsah je v Příloze 1 a 2. **Když je nemáš po ruce, vyžádej si je u Patrika, než začneš** — bez nich nikdo neumí spolehlivě říct, jestli je featura uvnitř, nebo mimo.

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

| Datum      | Položka               | Kdo vznesl | Stav          | Poznámka                                                                                                                                                                                                                                                                                                        |
| ---------- | --------------------- | ---------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-08 | Možnost „vypnout EET" | objednatel | **nestavíme** | EET bylo v ČR zrušeno k 1. 1. 2023 a v aplikaci **není implementované** — není co vypínat. Přepínač v nastavení by zákazníkovi tvrdil funkci, kterou nemáme. Viz `src/lib/faq-data.ts`. Pokud jde ve skutečnosti o slovenskou **eKasu**, je to certifikovaná fiskalizace = samostatný projekt, ne zaškrtávátko. |

## Související

- `docs/product/modular-business-roadmap.md` — produktová roadmapa a modulový záběr
- `src/lib/modules.ts` — seznam modulů a gatování navigace/rout
- `src/lib/pricing.ts` — co se prodává jako add-on
