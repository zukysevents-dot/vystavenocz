# Vystaveno — rychlý uživatelský průvodce

Tento návod je pro běžnou práci v aplikaci. Než začnete, zkontrolujte v **Nastavení** údaje firmy, provozovny a role kolegů. V levém menu uvidíte pouze moduly, které má firma zapnuté.

## Začátek pro každou firmu

1. Doplňte údaje firmy a pobočky.
2. Pozvěte kolegy a přidělte jim jen potřebná oprávnění.
3. Otevřete **Průvodce** v dolní části levého menu. Nabídne postupy podle vašich modulů; u každého vysvětlí pojmy, kdy ho použít, jednotlivé kroky i praktický tip a jedním tlačítkem otevře správnou obrazovku.

## Fakturace

V **Klientech** založte odběratele a ve **Fakturách** vystavte doklad. Pro zálohy použijte proformu, po úhradě ji převeďte na daňový doklad. Dobropis vždy založte z původní faktury. Pro pravidelné platby slouží **Opakované faktury**.

### Přechod z jiného programu

Ve **Fakturách** klikněte na **Import faktur**. Nahrajte, co máte z původního programu — jednotlivé soubory, nebo rovnou celý ZIP.

- **Nejlepší je ISDOC** (přípona `.isdoc` nebo `.isdocx`). Umí ho vyexportovat Pohoda, Money, ABRA, Helios i iDoklad. Údaje jsou přesné, protože se čtou jako data.
- **Máte jen PDF?** Také to jde — údaje z faktury přečteme z textu. Doklady, u kterých si nejsme jistí, označíme **Varování** a ve výchozím stavu je přeskočíme, abyste je mohli zkontrolovat. **Naskenované faktury (obrázek) přečíst neumíme.**
- U PDF se do faktury uloží jedna souhrnná položka, ne jednotlivé řádky. Celková částka i DPH ale sedí na originál.

Před importem uvidíte náhled: číslo, klienta, datum, částku a zdroj. U každého řádku můžete zvolit **Importovat**, nebo **Přeskočit**. Import jde vrátit tlačítkem **Vrátit import**.

**Navázání číselné řady** je to hlavní. Aplikace najde nejvyšší importované číslo a nabídne, jakým číslem má pokračovat vaše příští faktura — stačí kliknout na **Navázat číselnou řadu**. Pozor: pořadí faktur se každý rok vrací na začátek, takže když importujete starší roky, nová řada začne od jedničky s letošním rokem. Číslo, které dostane příští faktura, vidíte vždy dopředu i v **Nastavení**.

## Gastro a obchod

Na začátku nastavte produkty, kategorie a sklad. V gastru připravte stoly, menu, receptury a modifikátory. Obsluha pracuje přes **Pokladnu** nebo **Restauraci**, kuchyně vidí bony v samostatné frontě. Po prodeji se propíše tržba a sklad; den končí **Uzávěrkou**.

Podrobný návod pro restauraci je v [gastro-user-manual.md](gastro-user-manual.md).

## Sklad

Zboží přijímejte přes **Naskladnění**. Pravidelně udělejte inventuru a ve **Zrcadle skladu** vyřešte rozdíly mezi očekávaným a skutečným stavem. Každá oprava zanechává auditní stopu.

## Směny a docházka

Vedoucí vytváří plán v **Plánu směn**, pak týden publikuje. Zaměstnanci vidí jen zveřejněné směny a zapisují příchod/odchod v **Docházce**. Vedoucí zde řeší výjimky, opravy a export pro mzdy.

## Rezervace a služby

V **Rezervacích** udržujte kalendář a potvrzujte termíny. U řemesel vytvořte ceník služeb, nabídku a z ní zakázku. V detailu zakázky zapisujte práci, materiál a předání, poté vytvořte fakturu.

Podrobný postup pro řemesla a servis je v [sluzby-zakazky-manual.md](sluzby-zakazky-manual.md).

## Integrace a podpisy

V **Nastavení firmy** jsou účetní exporty, tiskoví agenti a poskytovatelé plateb či podpisů. Stav „Připraveno k napojení" znamená, že systém je nachystaný, ale bez smlouvy a přístupů poskytovatele není služba ostrá. Nikdy do poznámek nevkládejte API klíče nebo hesla.

## Když si nejste jistí

Vraťte se do **Průvodce**. Pokud něco neodpovídá očekávání, poznamenejte si obrazovku, kroky a očekávaný výsledek. To umožní problém rychle dohledat v auditu.
