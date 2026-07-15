# Interní testovací manuál (VPS staging)

Tenhle manuál je pro **interní test** produktu na staging/VPS před ostrým spuštěním. Provede vás hlavními částmi tak, jak je uvidí zákazník, a hlavně **jasně říká, co už je ostré a co je zatím jen připravené k napojení**. Cílem není znát techniku — stačí projít kroky a všímat si, jestli se chová podle očekávání.

- Podrobný provozní manuál pro obsluhu je v [`gastro-user-manual.md`](gastro-user-manual.md).
- Technický deploy + kontrola po nasazení je v [`../deploy-smoke-checklist.md`](../deploy-smoke-checklist.md).

## Než začnete

1. Přihlaste se testovacím účtem na staging adrese aplikace.
2. Pokud je staging naplněný backend příkazem `seed-demo`, použijte účet `demo@vystaveno.cz` / `DemoGastro.2026`. Demo firma `Vystaveno Demo Gastro` má 3 pobočky, zapnuté všechny relevantní moduly a **simuluje cca rok provozu** — reporty, uzávěrky, tržby, faktury, směny, docházka i rezervace tedy nejsou prázdné, ale plné historie (počítejte s tím při kontrole čísel). Roční data vzniknou jen při prvním naseedování firmy (viz deploy checklist).
3. Zkontrolujte, že jste ve správné testovací firmě a provozovně (vlevo nahoře).
4. Testujte v klidu, na testovacích datech. Nic z toho není ostrý provoz.
5. Když se něco chová jinak, než popisuje tento manuál, poznamenejte: co jste dělali, co jste čekali a co se stalo.

## 1. Gastro rychlý start

Cíl: prodat na pokladně a obsloužit stůl.

1. Otevřete `Pokladna`. Přidejte pár položek (klik na dlaždici, hledání podle názvu/SKU/EAN, nebo `Sken / EAN` čtečkou).
2. Klikněte `Zaplatit`, zvolte `Hotově` nebo `Kartou`. U hotovosti zadejte přijatou částku — systém ukáže, kolik vrátit. U karty potvrďte `Platba prošla` (terminál zatím potvrzuje obsluha ručně).
3. Otevřete `Stoly a objednávky` na tabletu 1024 × 768. Ověřte plnoobrazovkový režim bez levého menu, vyberte stůl, najděte produkt názvem/SKU/EAN a přidejte ho. Přes viditelné tlačítko `Poznámka · chod` nastavte u tří položek `Předkrm`, `Hlavní chod` a `Dezert`; na účtu i po `Odeslat na stanice` v kuchyni musí být v tomto pořadí pod samostatnými oddělovači. Před zaplacením přidejte ještě jednu položku a ověřte, že systém upozorní na neodeslanou položku. Nakonec ji odešlete a účet zaplaťte.
4. V `Další` vyzkoušejte, že výběr zdrojového stolu účet ještě nesloučí a až `Sloučit účty` provede akci. U `Zrušit účet` ověřte, že bez závěrečného potvrzení účet zůstane otevřený.
5. V `Kuchyně` posuňte předkrm přes stavy `Odesláno → Připravuje se → Hotovo → Vydáno` a ověřte, že hlavní chod a dezert zůstaly ve svém původním stavu.

Co ověřit: prodej se objeví v tržbách, bon projde kuchyní, po zaplacení účtu zůstane jen nezaplacený zbytek (nebo se stůl uvolní).

## 2. Sklad a inventura

Cíl: vidět, že sklad sedí a rozdíly se dají vysvětlit.

1. Otevřete `Naskladnění`, vyberte pobočku skladu (má-li firma víc poboček), vyplňte dodavatele/doklad/datum, přidejte zboží s množstvím a uložte příjemku.
2. V bloku `Nákupní objednávky` založte dodavatele, vytvořte návrh s alespoň dvěma produkty a zvolte `Objednat`.
3. Přijměte jen část množství jednoho produktu. Objednávka musí ukázat `Částečně přijato`, vznikne jedna příjemka a stav skladu se zvýší jen o zadané množství. Potom přijměte zbytek a ověřte stav `Přijato`.
4. U jednoho testovacího produktu v `Sklad` zapněte sledování šarží. Přijměte dvě šarže s různou expirací a ověřte je v `Zásoby → Šarže`. Bez ručního výběru vydejte množství přesahující první šarži — v `Pohyby` musí být nejdřív bližší expirace a potom druhá šarže.
5. V `Šarže` odepište část první šarže přes `Odepsat expiraci`. Musí se snížit jen vybraná šarže. Na šířce mobilu nesmí stránka vodorovně přetékat.
6. Otevřete `Zásoby`. Vpravo je tab `Zrcadlo` — porovnává `Stav má být`, `Realitu` a `Rozdíl`. V detailu řádku uvidíte výpočet (otevření + příjem + storno − prodej − výdej = stav má být).
7. Spusťte `Inventuru` na konkrétní pobočku: zadejte fyzicky napočítané množství a uložte. `Rozdíl` = realita minus systém, ukazuje se v kusech i v Kč.
8. V tabu `Pohyby` nastavte období, produkt, šarži, typ pohybu a pobočku. Ověřte čitelné názvy, změnu množství, stav po pohybu a zdrojové ID.
9. Stáhněte `Export CSV`. Počet datových řádků musí odpovídat alokacím šarží a soubor nesmí obsahovat pohyby mimo filtry.

Co ověřit: ruční i objednávková příjemka zvýší stav přes stejný sklad, částečný příjem nepřijme nedodaný zbytek, prodej stav sníží a inventura/korekce se projeví jako rozdíl ve zrcadle. Inventura ani výdej nejdou spustit pro „Všechny pobočky" — vždy pro konkrétní sklad. Skladová karta i CSV respektují období, produkt, typ a pobočku a načtou celou vyfiltrovanou historii, ne jen první stránku.

## 3. Uzávěrka

Cíl: zavřít den a mít čísla pro účetní.

1. Na konci dne otevřete `Uzávěrka`.
2. Zkontrolujte tržby, hotovost, karty, spropitné, storna, slevy, DPH a prodané položky.
3. Zadejte hotovostní počátek, vklady, výběry, napočítanou hotovost a odvod.
4. Doplaťte nebo zrušte všechny otevřené účty — jinak systém zavření dne zablokuje (to je správně).
5. Zavřete den. Z-report se uzamkne a čísla se dál nemění.
6. Vyzkoušejte exporty: běžný CSV, účetní CSV, `Export předávky CSV` a měsíční `Export měsíc účetní CSV` / `Export měsíc souhrn CSV`.

Co ověřit: tržby po testovacím prodeji nejsou nulové, otevřený účet blokuje zavření, exporty se stáhnou.

## 4. Integrace a exporty

Cíl: vidět účetní exporty, tiskovou frontu a katalog platebních providerů.

1. Otevřete `Nastavení firmy` → `Integrace a exporty`.
2. **Účetní export:** vyberte cíl `Generic CSV` nebo `Pohoda XML`, typ `Z-reporty` / `Prodeje`, datum od/do a stáhněte soubor. Pohoda XML je soubor pro **ruční import** v Pohodě, ne živá synchronizace.
3. **Tiskoví agenti:** klikněte `Přidat`, pojmenujte agenta a uložte. Token se ukáže **jen jednou**. `Revoke` token okamžitě zneplatní. Bez lokálního agenta tisk běží stávající cestou.
4. **Platební provideri:** otevřete katalog (ČSOB, NFCTRON, Comgate, SumUp, GP webpay). U providera `Nastavit` → založte konfiguraci → v `Zabezpečeném trezoru credentialů` uložte testovací klíč. Po uložení se pole vyčistí a přejde na `Uloženo`; hodnota se nikdy nezobrazí zpět.

Co ověřit: exporty se stáhnou, token se ukáže jen jednou, uložení klíče do trezoru vyčistí input. **Uložení klíče nespouští žádnou platbu** — ostré platby čekají na runtime adaptér.

## 5. Ověřené podpisy (modul BankID / Podpisy)

Cíl: připravit podpisovou obálku a vyzkoušet nastavení poskytovatele + trezor. Modul je samostatný placený add-on, není součástí gastro/POS.

1. Otevřete `Podpisy`.
2. Tab `Provider podpisů`: v katalogu je `Testovací poskytovatel` (`Aktivní`) a `BankID` (`Připraveno k napojení`).
   - `Testovací poskytovatel` jde bez credentialů rovnou nastavit na `Připraveno`.
   - U `BankID` založte konfiguraci a v trezoru uložte testovací klíč (stejně jako u plateb — input se vyčistí, hodnota se nezobrazí zpět).
3. Tab `Obálky`: `Nová obálka` → vyplňte název dokumentu, podepisující osobu a poskytovatele. V detailu obálky dejte `Odeslat k podpisu`.
   - Základní odeslání přepne obálku na `Odesláno` — jde o **přípravu obálky a evidenci**, ne ostrý právní podpis.
   - Pokud máte `BankID` konfiguraci ve stavu `Připraveno`, detail nabídne výběr konfigurace poskytovatele. Odeslání přes BankID zatím **poctivě** vrátí hlášku „BankID konfigurace je připravená, ale ostrý adapter ještě není zapnutý." — to je očekávané, ne chyba.

Co ověřit: obálka se založí a odešle (stav `Odesláno`), trezor vyčistí input, BankID poctivě hlásí, že ostrý adapter čeká na zapnutí. Pokud odeslání přes konfiguraci vrátí, že konfigurace není připravená / chybí credentialy, hláška vás nasměruje do tabu `Provider podpisů`.

## 6. Směny a docházka

Cíl: naplánovat a zveřejnit směny, projít docházku a mzdové podklady.

1. Otevřete `Směny`. Máte-li víc poboček, nahoře vyberte pobočku. Šipkami přepínáte týdny.
2. `Nová směna` nebo `+ přidat` v buňce dne: vyberte zaměstnance, čas, případně pozici a sazbu. Nová směna je `Rozpracovaná` (čárkovaná).
3. `Šablony` → `Nová šablona` (den, čas, pozice). Uloženou šablonu vložte tlačítkem `Použít` a doplňte zaměstnance.
4. `Publikovat týden` — rozpracované směny zesílí na `Zveřejněné`. Zkuste `Export plánu` (CSV plánovaného nákladu).
5. Otevřete `Docházka` → tab `Zaměstnanci` a u zaměstnance nastavte pozici a hodinovou sazbu (potřeba pro mzdu).
6. Zaměstnanec s vlastním účtem si píchne příchod/pauzu/odchod v tabu `Píchačka`.
7. Manažer: tab `Opravy` opraví časy (zapíše se do auditu, jen svá pobočka); tab `Výjimky` ukáže chybějící odchod, přesčas nebo rozdíl plánu vs. reality.
8. Tab `Přehled` → `Export mezd CSV` (odpracované hodiny × sazba).

Co ověřit: publikace mění stav směn, obsluha bez manažerských práv vidí jen zveřejněné směny, oprava docházky se zapíše do auditu, mzda se počítá jen tam, kde je sazba.

## 7. Veřejné / QR menu (pokud je dostupné)

1. V `Nastavení firmy` ověřte veřejný slug (např. `moje-bistro`).
2. Otevřete `/objednavka/<slug>` v anonymním okně (bez přihlášení). Menu se načte, u položek jsou alergeny, ceny počítá server.
3. QR odkaz ke stolu (`/objednavka/<slug>?table=<id>&name=<název>`) skryje výdej/rozvoz a připíše objednávku do účtu stolu.

## 8. Co je ostré a co je zatím připravené

Tohle je nejdůležitější tabulka pro interní test. **Netvrďte zákazníkovi, že „připravené" věci už ostře fungují.**

| Oblast                                                                                      | Stav                      | Poznámka                                                                                                                   |
| ------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Gastro POS prodej (hotovost/karta)                                                          | **Ostré**                 | Karta: výsledek potvrzuje obsluha ručně, terminál není propojený.                                                          |
| Restaurace, stoly, kuchyně (KDS)                                                            | **Ostré**                 | Účty, sloučení, split, bony, historie.                                                                                     |
| Sklad, naskladnění, šarže/expirace/FEFO, inventura, zrcadlo, skladová karta a CSV           | **Ostré**                 | Odečet surovin přes receptury, per-pobočka; přesný odpis šarže a export respektující filtry.                               |
| Uzávěrka + Z-report + exporty                                                               | **Ostré**                 | Denní i měsíční účetní CSV, předávka.                                                                                      |
| Akce/ceny, věrnost, audit                                                                   | **Ostré**                 | Serverový výpočet promo a bodů.                                                                                            |
| Veřejné / QR objednávky                                                                     | **Ostré**                 | Bez přihlášení, ceny ze serveru.                                                                                           |
| Směny (plánovač, publikace, šablony) + docházka (píchačka, korekce, výjimky, mzdový export) | **Ostré**                 | Manažerská práva podle role a pobočky; hodinové sazby a mzdy vidí jen vedení.                                              |
| Účetní export Generic CSV / Pohoda XML                                                      | **Ostré**                 | Pohoda = soubor pro ruční import, ne živá synchronizace.                                                                   |
| Tiskoví agenti (registrace/token/revoke)                                                    | **Ostré**                 | Vlastní lokální tiskový program u tiskárny.                                                                                |
| Credential trezor (platby i podpisy)                                                        | **Ostré**                 | Uložit/rotovat/smazat/revokovat klíče; hodnoty se nikdy nevrací.                                                           |
| Platební brány ČSOB/NFCTRON/Comgate/SumUp/GP                                                | **Připraveno k napojení** | Katalog + konfigurace hotové; ostré stržení čeká na runtime adaptér a smlouvu. Žádné tlačítko „zaplatit online".           |
| Ověřené podpisy — obálky, evidence, provider settings, trezor                               | **Ostré (příprava)**      | Zakládání obálek, evidence a nastavení fungují.                                                                            |
| Ověřené podpisy — odeslání                                                                  | **Připraveno k napojení** | Základní/testovací odeslání = příprava a evidence, ne právní podpis.                                                       |
| **BankID ostrý podpis**                                                                     | **Není ostré**            | Čeká na BankID credentials + runtime adaptér + potvrzený právní wording. Do té doby poctivé 422 „adapter čeká na zapnutí". |
| Money / SuperFaktura přímý adaptér                                                          | **Není**                  | Používejte Generic CSV nebo Pohoda XML.                                                                                    |

## Když něco nefunguje

- Zapište krok, očekávání a skutečnost (ideálně se screenshotem).
- Hlášky `503` u trezoru = chybí serverový šifrovací klíč na VPS/backendu (chyba deploye, ne UI) — nahlaste, ať se doplní.
- Techniku a nasazení řeší [`../deploy-smoke-checklist.md`](../deploy-smoke-checklist.md).
