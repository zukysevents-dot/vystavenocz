# Služby a zakázky — uživatelský manuál (instalatér, elektrikář, servis)

Jednoduchý průvodce pro řemeslníky a servisní firmy. Cíl: vést zakázku od poptávky až po fakturu **bez papíru jako zdroje pravdy**. Systém počítá ceny i DPH za vás.

## Než začnete

1. Přihlaste se a zkontrolujte správnou firmu/provozovnu.
2. V `Ceník služeb` (menu, jen pro vedení) si založte běžné práce — název, jednotka (`h`, `ks`…), cena **bez DPH** a sazba DPH. Např. „Montážní práce / h / 550 / 21 %". Ceník pak nabízí položky do nabídek i zakázek.
3. Materiál se bere ze `Sklad / Zásoby` — produkty, které máte na skladě.

## 1. Nabídka (volitelný start)

1. Otevřete `Nabídky` → `Nová nabídka`.
2. Přidejte řádky: u každého vyberte, jestli je to **práce** nebo **materiál**, množství, cenu bez DPH a sazbu. Součty a DPH dopočítá server.
3. Stav nabídky: `Koncept` → `Odesláno` → `Přijato` / `Zamítnuto`. Po platnosti (`validUntil`) ji lze označit `Expirováno`.
4. Když zákazník nabídku přijme, tlačítkem **`Převést na zakázku`** z ní vznikne zakázka i s položkami. (Jedna nabídka vytvoří zakázku jen jednou.)

## 2. Zakázka

1. `Zakázky` → `Nová zakázka` (nebo vznikne z přijaté nabídky).
2. Vyplňte název, zákazníka, adresu výjezdu, plánovaný termín, přiřazeného technika a prioritu. Číslo zakázky (`ZAK-…`) přidělí systém.
3. Stav zakázky vede práci: `Naplánováno` → `Rozpracováno` → `Čeká` → `Hotovo` (nebo `Zrušeno`). Stav měňte tlačítky — nelogické přechody systém nepustí. Každá změna se zapíše do časové osy.

## 3. Pracovní list (v detailu zakázky)

Otevřete zakázku (klik na řádek). V detailu je vše k jednomu výjezdu:

1. **Práce** — přidejte provedené úkony z ceníku nebo napište volně (množství, cena, DPH). Náhled částky vidíte hned.
2. **Materiál** — najděte produkt (podle názvu/kódu/EAN), zadejte množství a přidejte. **Systém rovnou odečte sklad.** Když materiál z listu smažete, sklad se zase vrátí. Vše je dohledatelné.
3. **Checklist** — odškrtávací seznam úkonů (např. „Odzkoušen tlak", „Uklizeno").
4. **Dokumenty a soubory** — přiložte jeden nebo více PDF dokumentů či fotografií ve formátu JPEG, PNG nebo WebP. Jeden soubor může mít nejvýše 10 MB. Když se některý z více souborů nepodaří nahrát, ostatní se nahrají dál a aplikace přesně vypíše výsledky. Každá příloha ukazuje název, velikost, datum a autora; uživatelé s přístupem k zakázce ji mohou stáhnout, vedení a technik také nahrát nebo po potvrzení smazat.
5. **Časová osa** — automatická historie událostí (změny stavu, přidaný materiál…).

## 4. Předání

1. V detailu zakázky vytvořte `Předávací protokol` — uloží se jako datový záznam s položkami a stavem.
2. Pokud máte modul **Ověřené podpisy**, můžete protokol poslat k podpisu (připraveno k napojení na poskytovatele). Bez ostrého napojení netvrdíme právní účinek podpisu.

## 5. Faktura

1. Až je zakázka `Hotovo`, klikněte **`Vytvořit fakturu`**. Systém z prací a materiálu připraví **koncept běžné faktury** (ceny a DPH počítá stejně jako u ostatních faktur) a otevře editor faktury.
2. **Zakázka vyrobí fakturu jen jednou** — opakované kliknutí vás vrátí na už vytvořenou fakturu, ne na duplicitní.
3. Fakturu smí vytvořit jen vedení/účetní (má právo fakturovat). Technik zakázku vede a účtuje materiál, ale fakturu netvoří.
4. Zakázka potřebuje k faktuře přiřazeného **zákazníka**; pokud chybí, systém vás vyzve ho doplnit.

## Co je zatím mimo

- Přílohy jsou dostupné v aplikaci připojené k API. Lokální ukázkový režim je záměrně nesimuluje, aby nevytvářel dojem trvalého uložení.
- **Ostrý elektronický podpis (BankID)** je připravený jako napojení, ne hotová právní služba.
