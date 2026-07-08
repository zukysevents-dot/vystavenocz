# Gastro uživatelský manuál

Tento manuál je živý podklad pro obsluhu restaurace, baru nebo bistra. Má vysvětlovat běžnou práci v systému jednoduše, bez technických detailů. Při každé nové gastro funkci ho udržuj aktuální.

## Denní provoz

1. Přihlaste se do aplikace a zkontrolujte správnou provozovnu.
2. Otevřete pokladnu nebo mapu stolů podle toho, jestli prodáváte na pultu nebo u stolu.
3. Všechny prodeje, storna, slevy, spropitné, skladové pohyby a uzávěrky zapisujte do systému. Papír může být jen výtisk nebo pomocná poznámka, ne zdroj pravdy.

## První nastavení gastro provozu

1. V onboardingu vyberte typ podnikání `Gastro`.
2. Systém ukáže doporučený start: `Pobočky`, `Mapa stolů`, `Sklad`, `Modifikátory` a `Uzávěrka`.
3. Po uložení profilu se otevřou `Pobočky`, protože provozovna určuje sklad, uzávěrku, reporting a oprávnění obsluhy.
4. Další kroky dokončete z levého menu. Cílem je mít stoly, QR odkazy, menu, sklad a denní uzávěrku připravené dřív, než začne ostrý provoz.

## Prodej na pokladně

1. Otevřete `Pokladna`.
2. Vyberte produkty, kategorii nebo použijte `Hledat produkt` podle názvu, SKU či EAN.
3. Produkt můžete přidat i skenem: v poli `Sken / EAN` použijte běžnou čtečku čárových kódů, zadejte EAN ručně a potvrďte Enterem, nebo klikněte na `Kamera` a naskenujte kód mobilem/tabletem.
4. Zkontrolujte účtenku vpravo.
5. Klepněte na `Zaplatit` a vyberte `Hotově` nebo `Kartou`.
6. U hotovosti zadejte, kolik host dal (nebo použijte rychlou volbu bankovky) — systém hned ukáže, kolik vrátit.
7. U karty zadejte částku na platebním terminálu a po dokončení potvrďte `Platba prošla`. Terminál zatím není propojený, výsledek potvrzuje obsluha.
8. Po zaplacení vznikne prodej, DPH rozpad a skladový pohyb. Produkt s recepturou odečítá suroviny, produkt bez receptury odečítá sám sebe. Účtenka u hotovosti ukazuje `Přijato` a `Vráceno`.

## Restaurace a stoly

1. Otevřete `Restaurace`.
2. Vyberte stůl a přidejte položky.
3. Na mobilu nebo tabletu můžete stůl vybrat i ze seznamu stolů; na větším displeji zůstává vizuální mapa.
4. Položky můžete přesouvat, účty slučovat, rozdělit mezi hosty a zaplatit jen vybranou část.
5. Na mobilu zůstává dole rychlá lišta s aktuálním stolem, počtem položek, celkem a hlavními akcemi.
6. Placení spustíte tlačítkem `Zaplatit` (celý účet) nebo ikonou bankovky u osoby v rozdělení účtu. Hotovost počítá vrácení, karta jde přes terminálový krok.
7. Když host mezitím doobjedná přes QR kód ke stolu, otevřený účet se sám průběžně obnovuje a před stiskem `Zaplatit` se ještě jednou načte aktuální stav — vidíte tedy správný počet položek i částku, ne zastaralou.
8. Pokud účet mezitím uzavřel nebo zrušil jiný terminál (nebo ho host doplatil přes QR) a vy zrovna přidáváte položku nebo posíláte do kuchyně, systém vás na to upozorní hláškou a vrátí vás na mapu stolů — nepracujete tak omylem se zavřeným účtem.
9. Po zaplacení zůstane otevřený jen nezaplacený zbytek účtu.

## Kuchyně a bar

1. Položky s kuchyňskou nebo barovou sekcí posílejte do výroby.
2. `Kuchyně` ukazuje bony podle stanice, stolu a času přípravy.
3. Stav bonu postupuje `Odesláno` → `Připravuje se` → `Hotovo` → `Vydáno`.
4. Když stejný bon mezitím posunul jiný terminál (druhá obrazovka v kuchyni), systém vás upozorní hláškou „Bon už mezitím posunul jiný terminál." a hned frontu obnoví — nepřepíšete tak omylem novější stav zpět.
5. Historie vydaných bonů je jen pro kontrolu, nemění stav objednávky.

## Online objednávky

1. V `Nastavení firmy` nastavte veřejný slug, například `moje-bistro`.
2. Zákazník otevře veřejný odkaz `/objednavka/:slug`.
3. Vybere položky z menu, zvolí `Výdej` nebo `Rozvoz`, vyplní kontakt a odešle objednávku.
4. Ceny počítá server podle katalogu, ne zákaznický prohlížeč.
5. Objednávka bez stolu se po odeslání objeví rovnou v `Kuchyně` jako veřejný bon se jménem zákazníka.
6. QR objednávku ke stolu vytvoříte v `Mapa stolů`: vyberte stůl, otevřete `QR objednávka` a použijte QR kód nebo odkaz.
7. Host po načtení QR kódu objednává ke konkrétnímu stolu; nevybírá výdej ani rozvoz. Na mobilu má po přidání položek dole rychlý přístup ke košíku a celkové částce.
8. U položek host vidí nastavené alergeny podle číselníku 1–14.
9. Položky se připíšou do otevřeného účtu stolu; pokud účet ještě neexistuje, systém ho založí.
10. Obsluha QR objednávku zaplatí běžným způsobem v `Restaurace`, stejně jako ostatní položky na stole.

## Naskladnění

1. Otevřete `Naskladnění`.
2. Máte-li víc poboček, vyberte nahoře `Pobočka skladu` — stav, doporučení i poslední příjemky se filtrují podle ní a novou příjemku uložíte na konkrétní sklad. `Všechny pobočky` slouží jen k přehledu; příjemku na ně uložit nelze.
3. Vyplňte dodavatele, číslo dokladu a datum příjmu.
4. Přidejte zboží skenerem, kamerou nebo vyhledáním produktu.
5. Zadejte množství a volitelně nákupní cenu.
6. Uložte příjemku. Sklad se mění přes příjemku, ne přes anonymní ruční příjem.
7. Blok `K doobjednání` doporučuje množství podle minim, skutečné spotřeby a receptur (pro vybranou pobočku).

## Alergeny v menu

1. Otevřete `Sklad` a upravte produkt.
2. V části `Alergeny` zaškrtněte číselné alergeny 1–14, které se produktu týkají.
3. Uložte produkt. Alergeny jsou informační údaj pro hosta; nemění cenu, sklad ani recepturu.
4. Host je uvidí ve veřejném/QR menu u položky. Pokud se receptura změní, zkontrolujte i alergeny produktu.

## Skupiny modifikátorů

1. V menu otevřete `Modifikátory` a vytvořte `Nová skupina`: zadejte název, typ `Jedna volba` nebo `Více voleb`, jestli je volba povinná, a jednotlivé volby s případnými příplatky.
2. Otevřete `Sklad`, u produktu klikněte na ikonu `Modifikátory`, zaškrtněte skupiny, které se mají u produktu nabízet, a uložte.
3. V `Restaurace` se při klepnutí na produkt s modifikátory otevře výběr voleb. Povinnou skupinu nejde přeskočit; u `Jedna volba` vyberte jednu možnost, u `Více voleb` lze vybrat víc položek podle nastaveného maxima.
4. Vybrané modifikátory se ukážou pod položkou na účtu, na kuchyňském/baru bonu a na účtence. Příplatek je už započtený v ceně položky, nepřičítá se ručně podruhé.
5. Stejné modifikátory se nabídnou i hostovi ve veřejné/QR objednávce. Host musí vybrat povinné volby, příplatky vidí v košíku a objednávka se do účtu stolu uloží už s vybranými volbami.

## Import katalogu z jiné pokladny

1. Otevřete `Import dat` a zvolte `Produkty`, pokud systém typ souboru nerozpozná sám.
2. Nahrajte CSV nebo XLSX export katalogu/menu z Dotykačky, Storyous/Teya, iKelp nebo běžné tabulky.
3. Zkontrolujte mapování sloupců: název, PLU/SKU, EAN, cena, DPH, nákupní cena, kategorie a sklad.
4. V náhledu vyřešte duplicity. Produkt se stejným SKU, EAN nebo názvem můžete přeskočit nebo přepsat.
5. Import katalogu nepřenáší historické účtenky ani mapu stolů. Slouží k rychlému založení sortimentu bez ručního přepisování.

## Import historických tržeb

1. Otevřete `Import dat`, zvolte `Tržby` a vyberte zdroj exportu.
2. Nahrajte CSV nebo XLSX se starými účtenkami. Jeden doklad může být ve více řádcích podle položek; systém je seskupí podle čísla účtenky.
3. Zkontrolujte náhled účtenek, počet položek, datum a celkovou částku.
4. Nejprve použijte `Zkontrolovat bez uložení`. Ostrý import spusťte až po kontrole chyb.
5. Historické tržby slouží pro analytiku po přechodu z jiné pokladny. Neodečítají sklad a zpětně nemění uzavřené Z-reporty.

## Zásoby, výdeje a přesuny

1. `Zásoby` ukazují aktuální stav produktů.
2. Pokud má firma víc poboček nebo skladů, nejdřív vyberte `Pobočka skladu`.
3. `Všechny pobočky` slouží jen pro přehled celkového stavu. Příjem, výdej, korekce a inventura se vždy zapisují na konkrétní pobočku.
4. Máte-li víc poboček, tab `Podle poboček` ukáže přehlednou tabulku: u každého produktu vidíte, kolik ho je na které provozovně, plus celkový součet. Zboží bez přiřazené pobočky je ve sloupci `Nezařazeno`.
5. Ruční výdej vždy vyberte podle důvodu: běžný výdej, odpis, jídlo personálu, rozbití nebo expirace.
6. Přesun mezi barem, kuchyní nebo skladem zapisujte přes přesun. Celkový sklad firmy se nemění, mění se jen místo.

## Schvalování

1. Pokud storno, výdej/odpis nebo inventura překročí nastavený limit, systém akci neprovede hned a založí žádost o schválení.
2. Obsluha uvidí hlášku, že akce čeká na schválení managerem.
3. Majitel, admin nebo manager otevře `Schvalování`, zkontroluje částku a žádost schválí nebo zamítne.
4. Po schválení systém provede původní akci; po zamítnutí se nic nezmění.

## Akce a ceny

1. Otevřete `Akce a ceny`.
2. Stránka teď ukazuje model cenových hladin, časových akcí, produktových/kategoriových slev a věrnostních bodů.
3. Cenová hladina upraví cenu před akcemi. Akční pravidla se potom aplikují podle produktu, kategorie, času nebo minimální útraty.
4. Trvalé ukládání pravidel a napojení do ostré pokladny, restaurace a QR objednávek bude další krok. Finální cenu má vždy potvrdit server.

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
3. V části `Provozní předávka` zkontrolujte hotovost, karty, storna/slevy a provozní checklist pro předání směny.
4. Zadejte hotovostní počátek, vklady, výběry, napočítanou hotovost a odvod.
5. Před zavřením dne doplaťte nebo zrušte všechny otevřené účty na provozovně. Pokud nějaký účet zůstává otevřený, systém zavření dne zablokuje.
6. Zavřete den. Z-report se tím uzamkne a čísla se dál nemění.
7. Exporty slouží pro účetní, kontrolu a předání směny (`Export předávky CSV`).
8. `Export měsíc účetní CSV` stáhne detailní účetní řádky za všechny uzavřené Z-reporty ve vybraném měsíci a pobočce.
9. `Export měsíc souhrn CSV` stáhne přehled jeden řádek na Z-report plus řádek `CELKEM`, aby účetní rychle zkontrolovala tržby, DPH, hotovost, karty, storna a rozdíl hotovosti za měsíc.

## Integrace a exporty

1. V `Nastavení firmy` otevřete část `Integrace a exporty`.
2. Souhrn nahoře ukazuje, kolik napojení je použitelné v provozu, kolik exportů je připravených a kolik věcí čeká na skutečný konektor.
3. `Připraveno` znamená, že export už můžete používat ručně, například ISDOC/CSV faktury nebo Z-reporty.
4. `Manuální krok` u platebního terminálu nebo tisku znamená, že obsluha zatím provede krok ve fyzickém zařízení nebo v tiskovém dialogu.
5. `Exportní režim` u POHODA/Flexi znamená předání přes ISDOC/CSV. Přímá synchronizace se doplní jako samostatný konektor.
6. `Plánováno` znamená, že funkce je v roadmapě, ale nemá se tvářit jako hotová integrace.

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
