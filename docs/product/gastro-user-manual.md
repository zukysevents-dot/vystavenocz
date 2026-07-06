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
3. Položky můžete přesouvat, účty slučovat, rozdělit mezi hosty a zaplatit jen vybranou část.
4. Placení spustíte tlačítkem `Zaplatit` (celý účet) nebo ikonou bankovky u osoby v rozdělení účtu. Hotovost počítá vrácení, karta jde přes terminálový krok.
5. Po zaplacení zůstane otevřený jen nezaplacený zbytek účtu.

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
7. Host po načtení QR kódu objednává ke konkrétnímu stolu. Položky se připíšou do otevřeného účtu stolu; pokud účet ještě neexistuje, systém ho založí.
8. Obsluha QR objednávku zaplatí běžným způsobem v `Restaurace`, stejně jako ostatní položky na stole.

## Naskladnění

1. Otevřete `Naskladnění`.
2. Vyplňte dodavatele, číslo dokladu a datum příjmu.
3. Přidejte zboží skenerem, kamerou nebo vyhledáním produktu.
4. Zadejte množství a volitelně nákupní cenu.
5. Uložte příjemku. Sklad se mění přes příjemku, ne přes anonymní ruční příjem.
6. Blok `K doobjednání` doporučuje množství podle minim, skutečné spotřeby a receptur.

## Zásoby, výdeje a přesuny

1. `Zásoby` ukazují aktuální stav produktů.
2. Ruční výdej vždy vyberte podle důvodu: běžný výdej, odpis, jídlo personálu, rozbití nebo expirace.
3. Přesun mezi barem, kuchyní nebo skladem zapisujte přes přesun. Celkový sklad firmy se nemění, mění se jen místo.

## Inventura a zrcadlo

1. Inventura porovnává `Stav má být` se skutečně napočítanou `Realitou`.
2. `Rozdíl` znamená realita minus systém.
3. Skladové zrcadlo vysvětluje, z čeho se stav skládá: příjem, prodej, storno, výdej, korekce, inventura a přesuny.
4. U položky ve zrcadle otevřete `Detail zrcadla`, pokud potřebujete vidět výpočet: otevření + příjem + storno - prodej - výdej = stav má být.
5. Rozdíl vzniká z korekcí a inventur. Prodeje, výdeje a přesuny jsou už započtené ve stavu `Stav má být`.
6. Rozdíly sledujte v kusech i v Kč.

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

## Audit

Audit ukazuje důležité zásahy: storna, slevy, změny cen, uzávěrky a další citlivé akce. Každá důležitá změna má mít čas, uživatele a dohledatelný důvod.
