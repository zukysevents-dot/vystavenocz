# Gastro uživatelský manuál

Tento manuál je živý podklad pro obsluhu restaurace, baru nebo bistra. Má vysvětlovat běžnou práci v systému jednoduše, bez technických detailů. Při každé nové gastro funkci ho udržuj aktuální.

## Denní provoz

1. Přihlaste se do aplikace a zkontrolujte správnou provozovnu.
2. Otevřete pokladnu nebo mapu stolů podle toho, jestli prodáváte na pultu nebo u stolu.
3. Všechny prodeje, storna, slevy, spropitné, skladové pohyby a uzávěrky zapisujte do systému. Papír může být jen výtisk nebo pomocná poznámka, ne zdroj pravdy.

## Prodej na pokladně

1. Otevřete `Pokladna`.
2. Vyberte produkty nebo kategorii.
3. Zkontrolujte účtenku vpravo.
4. Klepněte na `Zaplatit` a vyberte `Hotově` nebo `Kartou`.
5. U hotovosti zadejte, kolik host dal (nebo použijte rychlou volbu bankovky) — systém hned ukáže, kolik vrátit.
6. U karty zadejte částku na platebním terminálu a po dokončení potvrďte `Platba prošla`. Terminál zatím není propojený, výsledek potvrzuje obsluha.
7. Po zaplacení vznikne prodej, DPH rozpad a skladový pohyb. Produkt s recepturou odečítá suroviny, produkt bez receptury odečítá sám sebe. Účtenka u hotovosti ukazuje `Přijato` a `Vráceno`.

## Restaurace a stoly

1. Otevřete `Restaurace`.
2. Vyberte stůl a přidejte položky.
3. Na mobilu nebo tabletu můžete stůl vybrat i ze seznamu stolů; na větším displeji zůstává vizuální mapa.
4. Položky můžete přesouvat, účty slučovat, rozdělit mezi hosty a zaplatit jen vybranou část.
5. Na mobilu zůstává dole rychlá lišta s aktuálním stolem, počtem položek, celkem a hlavními akcemi.
6. Placení spustíte tlačítkem `Zaplatit` (celý účet) nebo ikonou bankovky u osoby v rozdělení účtu. Hotovost počítá vrácení, karta jde přes terminálový krok.
7. Po zaplacení zůstane otevřený jen nezaplacený zbytek účtu.

## Kuchyně a bar

1. Položky s kuchyňskou nebo barovou sekcí posílejte do výroby.
2. `Kuchyně` ukazuje bony podle stanice, stolu a času přípravy.
3. Stav bonu postupuje `Odesláno` → `Připravuje se` → `Hotovo` → `Vydáno`.
4. Historie vydaných bonů je jen pro kontrolu, nemění stav objednávky.

## Online objednávky

1. V `Nastavení firmy` nastavte veřejný slug, například `moje-bistro`.
2. Zákazník otevře veřejný odkaz `/objednavka/:slug`.
3. Vybere položky z menu, zvolí `Výdej` nebo `Rozvoz`, vyplní kontakt a odešle objednávku.
4. Ceny počítá server podle katalogu, ne zákaznický prohlížeč.
5. Objednávka bez stolu se po odeslání objeví rovnou v `Kuchyně` jako veřejný bon se jménem zákazníka.
6. QR objednávku ke stolu vytvoříte v `Mapa stolů`: vyberte stůl, otevřete `QR objednávka` a použijte QR kód nebo odkaz.
7. Host po načtení QR kódu objednává ke konkrétnímu stolu; nevybírá výdej ani rozvoz. Na mobilu má po přidání položek dole rychlý přístup ke košíku a celkové částce.
8. Položky se připíšou do otevřeného účtu stolu; pokud účet ještě neexistuje, systém ho založí.
9. Obsluha QR objednávku zaplatí běžným způsobem v `Restaurace`, stejně jako ostatní položky na stole.

## Naskladnění

1. Otevřete `Naskladnění`.
2. Máte-li víc poboček, vyberte nahoře `Pobočka skladu` — stav, doporučení i poslední příjemky se filtrují podle ní a novou příjemku uložíte na konkrétní sklad. `Všechny pobočky` slouží jen k přehledu; příjemku na ně uložit nelze.
3. Vyplňte dodavatele, číslo dokladu a datum příjmu.
4. Přidejte zboží skenerem, kamerou nebo vyhledáním produktu.
5. Zadejte množství a volitelně nákupní cenu.
6. Uložte příjemku. Sklad se mění přes příjemku, ne přes anonymní ruční příjem.
7. Blok `K doobjednání` doporučuje množství podle minim, skutečné spotřeby a receptur (pro vybranou pobočku).

## Import katalogu z jiné pokladny

1. Otevřete `Import dat` a zvolte `Produkty`, pokud systém typ souboru nerozpozná sám.
2. Nahrajte CSV nebo XLSX export katalogu/menu z Dotykačky, Storyous/Teya, iKelp nebo běžné tabulky.
3. Zkontrolujte mapování sloupců: název, PLU/SKU, EAN, cena, DPH, nákupní cena, kategorie a sklad.
4. V náhledu vyřešte duplicity. Produkt se stejným SKU, EAN nebo názvem můžete přeskočit nebo přepsat.
5. Import katalogu nepřenáší historické účtenky ani mapu stolů. Slouží k rychlému založení sortimentu bez ručního přepisování.

## Zásoby, výdeje a přesuny

1. `Zásoby` ukazují aktuální stav produktů.
2. Pokud má firma víc poboček nebo skladů, nejdřív vyberte `Pobočka skladu`.
3. `Všechny pobočky` slouží jen pro přehled celkového stavu. Příjem, výdej, korekce a inventura se vždy zapisují na konkrétní pobočku.
4. Ruční výdej vždy vyberte podle důvodu: běžný výdej, odpis, jídlo personálu, rozbití nebo expirace.
5. Přesun mezi barem, kuchyní nebo skladem zapisujte přes přesun. Celkový sklad firmy se nemění, mění se jen místo.

## Schvalování

1. Pokud storno, výdej/odpis nebo inventura překročí nastavený limit, systém akci neprovede hned a založí žádost o schválení.
2. Obsluha uvidí hlášku, že akce čeká na schválení managerem.
3. Majitel, admin nebo manager otevře `Schvalování`, zkontroluje částku a žádost schválí nebo zamítne.
4. Po schválení systém provede původní akci; po zamítnutí se nic nezmění.

## Inventura a zrcadlo

1. Inventura porovnává `Stav má být` se skutečně napočítanou `Realitou`.
2. Inventuru dělejte pro konkrétní pobočku/sklad, ne za všechny pobočky najednou.
3. `Rozdíl` znamená realita minus systém.
4. Skladové zrcadlo vysvětluje, z čeho se stav skládá: příjem, prodej, storno, výdej, korekce, inventura a přesuny.
5. U položky ve zrcadle otevřete `Detail zrcadla`, pokud potřebujete vidět výpočet: otevření + příjem + storno - prodej - výdej = stav má být.
6. Rozdíl vzniká z korekcí a inventur. Prodeje, výdeje a přesuny jsou už započtené ve stavu `Stav má být`.
7. Rozdíly sledujte v kusech i v Kč.

## Uzávěrka

1. Na konci dne otevřete `Uzávěrka`.
2. Zkontrolujte tržby, hotovost, karty, spropitné, storna, slevy, DPH a prodané položky.
3. Zadejte hotovostní počátek, vklady, výběry, napočítanou hotovost a odvod.
4. Zavřete den. Z-report se tím uzamkne a čísla se dál nemění.
5. Exporty slouží pro účetní a kontrolu.

## Provozní přehled

1. `Provozní přehled` používá majitel, manažer nebo admin.
2. Sleduje tržby, food cost, marži, výkon obsluhy, storna, slevy, ztráty skladu a ležáky.
3. Pokud číslo nesedí, hledejte souvislost v uzávěrce, auditu a skladovém zrcadle.

## Konsolidace poboček

1. `Konsolidace` používá majitel nebo vedení při více pobočkách.
2. První tabulka porovnává pobočky podle tržeb, počtu prodejů, průměrného účtu a spropitného.
3. `Provozní srovnání poboček` přidává marži, food cost, ztráty skladu, mrtvý sklad a marži po ztrátách.
4. Export CSV slouží pro účetní, poradu nebo kontrolu manažerů bez ručního přepisování.

## Audit

Audit ukazuje důležité zásahy: storna, slevy, změny cen, uzávěrky a další citlivé akce. Každá důležitá změna má mít čas, uživatele a dohledatelný důvod.
