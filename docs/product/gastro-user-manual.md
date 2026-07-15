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

1. Otevřete `Stoly a objednávky`. Provozní obrazovka se otevře přes celou plochu; tlačítkem `Přehled` se vrátíte do ostatních částí systému.
2. Vyberte stůl. Na mobilu a tabletu se ukáže přehledný seznam; na širokém displeji vizuální mapa a vpravo nejstarší otevřené účty.
3. Produkty přidávejte velkými dlaždicemi. Kategorie jsou vlevo nebo nahoře a pole hledání najde název, SKU i EAN.
4. Před odesláním klepněte u položky na `Poznámka · chod`. Napište požadavek pro kuchyni a podle potřeby vyberte `Předkrm`, `Hlavní chod` nebo `Dezert`. Účet i kuchyňský bon je zobrazí v tomto pořadí pod jednoduchými oddělovači; nezařazené položky jsou v části `Bez chodu`.
5. Účet je na široké obrazovce stále vpravo. Na mobilu ho otevřete klepnutím na částku ve spodní liště. `Úpravy` obsahují zákazníka, cenovou hladinu, slevu a spropitné; `Další` obsahuje split, přesun, sloučení a zrušení.
6. Sloučení účtů je dvoukrokové: vyberte zdrojový stůl, zkontrolujte směr `zdroj → cíl` a teprve potom potvrďte. Zrušení účtu vždy vyžaduje samostatné potvrzení.
7. Placení spustíte tlačítkem `Zaplatit` (celý účet) nebo ikonou bankovky u osoby v rozdělení účtu. Pokud jsou na účtu nové neodeslané položky, systém doporučí nejdřív je poslat na kuchyňskou nebo barovou stanici. Hotovost počítá vrácení, karta jde přes terminálový krok.
8. Když host mezitím doobjedná přes QR kód ke stolu, otevřený účet se sám průběžně obnovuje a před stiskem `Zaplatit` se ještě jednou načte aktuální stav — vidíte tedy správný počet položek i částku, ne zastaralou.
9. Pokud účet mezitím uzavřel nebo zrušil jiný terminál (nebo ho host doplatil přes QR) a vy zrovna přidáváte položku nebo posíláte do kuchyně, systém vás na to upozorní hláškou a vrátí vás na mapu stolů — nepracujete tak omylem se zavřeným účtem.
10. Na mobilu zůstává dole rychlá lišta s přesným celkem a akcemi `Odeslat` a `Zaplatit`; na široké obrazovce jsou stejné akce pevně pod účtem. `Odeslat na stanice` pošle kuchyňské položky do kuchyně a nápoje na bar.
11. Po zaplacení zůstane otevřený jen nezaplacený zbytek účtu.

## Kuchyně a bar

1. Položky s kuchyňskou nebo barovou sekcí posílejte do výroby.
2. `Kuchyně` ukazuje bony podle stanice, stolu a času přípravy.
3. Položky na bonu jsou oddělené na `Předkrm`, `Hlavní chod`, `Dezert` a případně `Bez chodu`; stejné oddělovače jsou i na tištěném bonu.
4. Každý chod má vlastní velké tlačítko a postupuje samostatně přes `Odesláno` → `Připravuje se` → `Hotovo` → `Vydáno`. Předkrm tak můžete vydat bez posunutí hlavního chodu nebo dezertu.
5. Když stejný bon mezitím posunul jiný terminál (druhá obrazovka v kuchyni), systém vás upozorní hláškou „Bon už mezitím posunul jiný terminál." a hned frontu obnoví — nepřepíšete tak omylem novější stav zpět.
6. Historie vydaných bonů je jen pro kontrolu, nemění stav objednávky.

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
8. Pro dodávku, kterou objednáváte předem, otevřete nahoře `Dodavatelé`, založte kontakt a potom `Nová objednávka`.
9. Návrh naplňte produkty, množstvím a cenami; po odeslání dodavateli zvolte `Objednat`.
10. Při doručení zvolte `Přijmout` a zadejte jen skutečně dodané množství. Nedodaný zbytek zůstane ve stavu `Částečně přijato` pro další příjemku.
11. Každý dílčí příjem je samostatný skladový doklad. Opakované potvrzení po výpadku nevytvoří druhou příjemku ani druhý pohyb.
12. U produktu se sledováním šarží vyplňte při každém příjmu číslo šarže a podle potřeby expiraci. Jednu dodávku stejného produktu můžete rozdělit do více řádků šarží.

## Polotovary a výrobní dávky

1. V `Sklad / katalog` otevřete produkt, který vyrábíte ze surovin, a jako typ nastavte `Polotovar vyráběný ze surovin`.
2. Uložte mu recepturu stejným tlačítkem jako u jídel. Receptura určuje spotřebu jedné vyrobené jednotky včetně odpadu.
3. V seznamu produktu klikněte na ikonu výroby, zadejte vyrobené množství a potvrďte dávku.
4. Pokud má výstupní polotovar zapnuté šarže, zadejte číslo výstupní šarže a expiraci. Systém odečte suroviny a naskladní hotový polotovar jako propojené pohyby. Dávku neupravujte zpětně; případný omyl opravte běžnou skladovou korekcí.
5. Ikona `Varianty` slouží pro velikosti porce a odlišné ceny. U každé varianty nastavte název, případnou cenu a násobek receptury.
6. V `Pokladna`, `Restaurace` i ve veřejné/QR objednávce se před přidáním takového produktu vybere konkrétní varianta. Cena a spotřeba surovin se dopočítají na serveru.
7. Název, cena i spotřeba se uloží k účtu a prodeji. Pozdější změna varianty nebo receptury proto nemění staré účtenky, bon ani storno skladu.

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
7. Tab `Pohyby` je skladová karta. Vyberte období, produkt, typ pohybu a případně pobočku. U každého řádku vidíte změnu, stav po pohybu, poznámku a vazbu na příjemku, prodej, inventuru, výrobu nebo zakázku.
8. `Export CSV` stáhne přesně aktuálně vyfiltrovanou historii. Export se vytvoří až po načtení všech řádků; pokud se sklad během načítání změnil, použijte `Zkusit znovu`, aby nevznikl neúplný soubor.
9. Pro zboží s expirací nejdřív v `Sklad` zapněte `Sledování šarží`. Aktivace platí pro celou firmu a nelze ji vypnout; dosavadní zásoba zůstane v systémové počáteční šarži. Od této chvíle POS, QR platba, zakázka i výroba při nedostatku šarží operaci odmítnou místo vytvoření záporného stavu.
10. Tab `Šarže` ukazuje autoritativní množství po šarži a pobočce, datum a počet dní do expirace. Odtud lze odepsat přesně vybranou expirovanou šarži.
11. Při výdeji nebo přesunu můžete zvolit konkrétní šarži. Bez výběru systém použije FEFO — nejdřív zboží s nejbližší expirací. Přesun zachová číslo šarže v cílové pobočce.
12. V `Pohyby` lze filtrovat jednu šarži; detail i CSV ukazují číslo, expiraci a množství. Jeden výdej přes více šarží má v CSV samostatný řádek pro každou alokaci.

## Směny a docházka

Plán směn (`Směny`):

1. Otevřete `Směny`. Uvidíte týdenní plán: řádky jsou zaměstnanci, sloupce dny v týdnu.
2. Máte-li víc poboček, nahoře vyberte pobočku. Šipkami přepínáte týdny, `Dnešní týden` skočí na tento týden.
3. Zaměstnance a jejich hodinovou sazbu založíte v `Docházka` → `Zaměstnanci`. Sazba se použije pro mzdový podklad.
4. Novou směnu přidáte tlačítkem `Nová směna` nebo kliknutím `+ přidat` v buňce dne u zaměstnance. Vyberte zaměstnance, datum, čas, případně pozici a jednorázovou sazbu.
5. Nová směna je nejdřív `Rozpracovaná` (čárkovaná) — obsluha ji ještě nevidí.
6. Až je plán hotový, klikněte `Publikovat týden`. Rozpracované směny se změní na `Zveřejněné` (plné) a obsluha je uvidí.
7. `Šablony` slouží pro opakované směny (například „Ranní bar, pondělí 8–16"). Uloženou šablonu vložíte do týdne tlačítkem `Použít` — stačí doplnit zaměstnance.
8. `Export plánu` stáhne plánované hodiny a mzdový náklad do CSV (Excel).
9. Mzdové podklady pod plánem ukazují počet směn, hodiny a plánovaný náklad celkem i po jednotlivých zaměstnancích.

Docházka a píchačka (`Docházka`):

1. Zaměstnanec s vlastním účtem si v `Docházka` píchne příchod, pauzu a odchod.
2. `Zaměstnanci` slouží k evidenci lidí, jejich pozice a hodinové sazby.
3. `Přehled` ukazuje odpracované hodiny za měsíc a mzdový náklad; `Export mezd CSV` je stáhne pro účetní.
4. Manažer má navíc tab `Opravy`: když někdo zapomene píchnout odchod nebo se splete, opraví časy. Každá oprava se zapíše do auditu.
5. Tab `Výjimky` ukáže odchylky za období: chybějící odchod, přesčas nebo rozdíl plánu proti realitě.
6. Manažer vidí a opravuje jen docházku své pobočky; hodinové sazby a mzdy vidí jen vedení.

## Schvalování

1. Pokud storno, výdej/odpis nebo inventura překročí nastavený limit, systém akci neprovede hned a založí žádost o schválení.
2. Obsluha uvidí hlášku, že akce čeká na schválení managerem.
3. Majitel, admin nebo manager otevře `Schvalování`, zkontroluje částku a žádost schválí nebo zamítne.
4. Po schválení systém provede původní akci; po zamítnutí se nic nezmění.

## Akce a ceny

1. Otevřete `Akce a ceny`.
2. Vytvořte cenovou hladinu, například `VIP host` nebo `Personál`, a nastavte procentní úpravu ceny.
3. Vytvořte akční pravidlo: procentní nebo pevná sleva, celý účet / kategorie / produkt, časové okno, minimální útrata a priorita.
4. Náhled účtu počítá server, takže vidíte stejnou logiku, která se používá při ostrém prodeji.
5. Akční pravidla se v běžném prodeji uplatní automaticky podle nastavení. Obsluha je nemusí zapínat ručně.
6. Pokud má zákazník VIP/personální cenu, vyberte před platbou v `Pokladna` nebo `Restaurace` pole `Cenová hladina`. Systém hned ukáže dopad cenové hladiny, případnou akci a finální částku.
7. Cenová hladina se posílá na server až při zaplacení. Když náhled ceny není dostupný, finální cenu pořád dopočítá server při platbě.
8. QR objednávky zatím používají běžné automatické akce; výběr VIP hladiny u hosta bez obsluhy je samostatný další krok.

## Věrnostní program

1. Otevřete `Věrnost`.
2. Nastavte, kolik Kč znamená jeden získaný bod, kolik Kč má jeden bod při uplatnění a maximální počet bodů na jednu účtenku.
3. Založte zákazníka nebo otevřete existujícího zákazníka. U každého vidíte aktuální stav bodů a historii změn.
4. Ruční úpravu bodů používejte jen s poznámkou, například kompenzace, reklamace nebo převod z původního systému.
5. Při prodeji v `Pokladna` nebo při platbě celého účtu v `Restaurace` vyberte zákazníka před zaplacením.
6. Pokud má zákazník body, zadejte počet bodů k uplatnění. Systém hned ukáže slevu z bodů, finální částku a předpokládaný počet nově získaných bodů.
7. Po zaplacení server uloží body do ledgeru, účtenka ukáže uplatněné i získané body a zákazník má aktualizovaný zůstatek.
8. Částečná platba osoby z rozdělení účtu zatím věrnostní body neuplatňuje. Body použijte u celé platby účtu.

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
3. V API režimu panel ukazuje účetní export `Generic CSV` nebo `Pohoda XML`, poslední terminálové platby a tiskovou frontu.
4. U účetního exportu vyberte cíl (`Generic CSV` nebo `Pohoda XML`), typ `Z-reporty` nebo `Prodeje`, datum od/do a případně provozovnu, potom stáhněte soubor.
5. Platební terminál má zatím backendový životní cyklus, ale bez reálné brány. Obsluha dál potvrzuje výsledek karty ručně.
6. `Platební provideri` je otevřený katalog platebních bran a terminálů (ČSOB, NFCTRON, Comgate, SumUp, GP webpay a další). U každého vidíte, jestli je `Aktivní`, nebo `Připraveno k napojení`, jaké umí schopnosti (terminál, online platby, webhooky) a co napojení vyžaduje (smlouvu s poskytovatelem, přístupové údaje). Je to přehled podporovaných cílů — ostré platby poběží až přes skutečně napojený adaptér, katalog sám žádnou platbu nespouští a žádného providera neoznačuje za hotový, dokud reálně nefunguje. Tlačítkem `Nastavit` u providera si připravíte konfiguraci (název, režim sandbox/produkce, provozovnu, stav) a odškrtnete, které údaje už máte bezpečně připravené. Tajné klíče se do aplikace nezadávají ani neukládají — ostré spuštění vyžaduje bezpečné napojení credentialů mimo aplikaci.
7. `Tiskoví agenti` slouží pro lokální program u fyzické tiskárny. Manažer klikne `Přidat`, pojmenuje agenta, případně vybere provozovnu a uloží si token. Token se zobrazí jen jednou.
8. Lokální agent používá token k načtení tiskové fronty a k potvrzení výsledku tisku. Pokud agenta zrušíte, token okamžitě přestane platit.
9. Tisková fronta ukazuje poslední účtenky, kuchyňské bony a Z-reporty; bez nainstalovaného lokálního agenta tisk probíhá stávající cestou.
10. `Pohoda XML` je soubor pro ruční import v Pohodě (`Soubor -> Datová komunikace -> XML import`), ne živá synchronizace. Pokud export hlásí chybějící IČO, doplňte IČO firmy v horní části nastavení.
11. Money/SuperFaktura zatím nejsou přímé adaptéry. Používejte Generic CSV nebo Pohoda XML podle účetního systému.
12. `Plánováno` znamená, že funkce je v roadmapě, ale nemá se tvářit jako hotová integrace.

## Ověřené podpisy (add-on modul)

Samostatný placený add-on pro ověřený podpis dokumentů (smlouvy, předávací protokoly, dohody, objednávky). Není součástí gastro prodeje ani fakturace. Zobrazí se jen firmám se zapnutým modulem `Podpisy`.

1. Otevřete `Podpisy`. Stránka má dva taby: `Obálky` a `Provider podpisů`.
2. V `Provider podpisů` (manažerská role) je katalog poskytovatelů. `Testovací poskytovatel` je aktivní pro zkoušení, `BankID` je „Připraveno k napojení". U providera `Nastavit` založíte konfiguraci (název, režim sandbox/produkce, stav) a v zabezpečeném trezoru uložíte přístupové klíče — po uložení se pole vyčistí a hodnota se už nikdy nezobrazí.
3. V `Obálky` přes `Nová obálka` připravíte dokument k podpisu: název, typ, podepisující osobu a poskytovatele.
4. V detailu obálky dáte `Odeslat k podpisu`. Máte-li konfiguraci poskytovatele ve stavu `Připraveno`, můžete odeslání nasměrovat přes ni; jinak proběhne základní odeslání.
5. **Zatím jde o přípravu obálky a evidenci, ne ostrý právní podpis.** Odeslání přes BankID poctivě hlásí, že ostrý adapter čeká na zapnutí — živý BankID podpis se zapne až po napojení poskytovatele, credentialech a potvrzeném právním znění. Netvrďte zákazníkovi, že „BankID podpis je hotový".
6. Přehled, co je v celém produktu ostré a co jen připravené, je v [`interni-test-manual.md`](interni-test-manual.md).

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
