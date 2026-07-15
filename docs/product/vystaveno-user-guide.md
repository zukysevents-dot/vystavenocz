# Vystaveno — rychlý uživatelský průvodce

Tento návod je pro běžnou práci v aplikaci. Než začnete, zkontrolujte v **Nastavení** údaje firmy, provozovny a role kolegů. V levém menu uvidíte pouze moduly, které má firma zapnuté.

## Začátek pro každou firmu

1. Doplňte údaje firmy a pobočky.
2. Pozvěte kolegy a přidělte jim jen potřebná oprávnění.
3. Otevřete **Průvodce** v dolní části levého menu. Nabídne postupy podle vašich modulů; u každého vysvětlí pojmy, kdy ho použít, jednotlivé kroky i praktický tip a jedním tlačítkem otevře správnou obrazovku.

## Fakturace

V **Klientech** založte odběratele a ve **Fakturách** vystavte doklad. Pro zálohy použijte proformu, po úhradě ji převeďte na daňový doklad. Dobropis vždy založte z původní faktury. Pro pravidelné platby slouží **Opakované faktury**.

## Gastro a obchod

Na začátku nastavte produkty, kategorie a sklad. V gastru připravte stoly, menu, receptury a modifikátory. Obsluha pracuje přes **Pokladnu** nebo **Restauraci**, kuchyně vidí bony v samostatné frontě. Po prodeji se propíše tržba a sklad; den končí **Uzávěrkou**.

Podrobný návod pro restauraci je v [gastro-user-manual.md](gastro-user-manual.md).

## Sklad

Zboží přijímejte přes **Naskladnění**. Jednoduchou dodávku zapište rovnou příjemkou; plánovaný nákup ve stejné obrazovce veďte přes dodavatele a nákupní objednávku. Objednávku lze přijímat postupně a každý dílčí příjem zvýší stejný sklad jen o skutečně dodané množství. U zboží s expirací jednou celofiremně zapněte sledování šarží a při příjmu zapisujte číslo šarže a datum; výdej pak automaticky používá nejbližší expiraci. Aktivaci nelze vrátit a sledovaný produkt už nesmí do záporného stavu, proto musí být před prodejem či výrobou dostatečně naskladněn. Tab **Šarže** ukazuje zůstatky, umožní přesný odpis a přes **Změnit stav** okamžitě vyřadí podezřelou sérii do karantény, blokace nebo konečné reklamace; povinný důvod zůstane v historii. Pravidelně udělejte inventuru a ve **Zrcadle skladu** vyřešte rozdíly mezi očekávaným a skutečným stavem. Každá oprava zanechává auditní stopu.

Při opakovaném nákupu nastavte u dodavatele jeho SKU/EAN, velikost balení, minimální odběr a obvyklou cenu produktu. Akce **Z návrhů** pak aktuální doporučení bezpečně převede do konceptu objednávky, množství zaokrouhlí nahoru na celá balení a uloží tehdejší kódy i balení do historie.

## Směny a docházka

Vedoucí vytváří plán v **Plánu směn**, pak týden publikuje. Zaměstnanci vidí jen zveřejněné směny a zapisují příchod/odchod v **Docházce**. Vedoucí zde řeší výjimky, opravy a export pro mzdy.

## Rezervace a služby

V **Rezervacích** udržujte kalendář a potvrzujte termíny. U řemesel vytvořte ceník služeb, nabídku a z ní zakázku. V detailu zakázky zapisujte práci, materiál a předání, poté vytvořte fakturu.

Podrobný postup pro řemesla a servis je v [sluzby-zakazky-manual.md](sluzby-zakazky-manual.md).

## Integrace a podpisy

V **Nastavení firmy** jsou účetní exporty, tiskoví agenti a poskytovatelé plateb či podpisů. Stav „Připraveno k napojení" znamená, že systém je nachystaný, ale bez smlouvy a přístupů poskytovatele není služba ostrá. Nikdy do poznámek nevkládejte API klíče nebo hesla.

## Když si nejste jistí

Vraťte se do **Průvodce**. Pokud něco neodpovídá očekávání, poznamenejte si obrazovku, kroky a očekávaný výsledek. To umožní problém rychle dohledat v auditu.
