# Backend backlog pro `vystaveno-api` (Standa)

Tady žijí **úkoly pro backend**. U každé featury je frontend buď hotový, nebo se dodělá hned, jak
backend přijde — tenhle soubor je jednoznačný kontrakt (endpointy, payloady, rozhodnutí). Cíl:
nic neposílat přes chat, stačí `git pull`.

Frontend je frontend-only MVP; datová vrstva teče jedním swap-pointem (`useApi` / `http`), takže
jakmile endpoint existuje, FE se přepne bez dalšího zásahu.

## Pořadí (návrh — od nejlevnějšího a nejvíc odemykajícího)

| #   | Úkol                                                   | Velikost | Co odemkne                                             |
| --- | ------------------------------------------------------ | -------- | ------------------------------------------------------ |
| 1   | [`role-a-opravneni.md`](./role-a-opravneni.md)         | malé     | reálné vynucení rolí (dnes jen UX na FE)               |
| 2   | [`import-faktur.md`](./import-faktur.md)               | malé     | dokončení F9 importu (historické faktury do produkce)  |
| 3   | [`provize-z-trzeb.md`](./provize-z-trzeb.md)           | malé     | provize u Směn (`Sale.employeeId`)                     |
| 4   | [`objednavkovy-kanal.md`](./objednavkovy-kanal.md)     | střední  | vlastní objednávky bez provizí (2 public endpointy)    |
| 5   | [`rezervace-pripominky.md`](./rezervace-pripominky.md) | střední  | připomínky rezervací (scheduler + SMS/e-mail)          |
| 6   | [`online-platba-faktur.md`](./online-platba-faktur.md) | větší    | platba faktur kartou v Klientské zóně (platební brána) |

U každého jsou i **otázky/rozhodnutí**, na které potřebuju od tebe odpověď, ať doladím FE.
