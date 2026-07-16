# Backend backlog pro `vystaveno-api` (Standa)

Tady žijí **úkoly pro backend**. U každé featury je frontend buď hotový, nebo se dodělá hned, jak
backend přijde — tenhle soubor je jednoznačný kontrakt (endpointy, payloady, rozhodnutí). Cíl:
nic neposílat přes chat, stačí `git pull`.

Frontend je frontend-only MVP; datová vrstva teče jedním swap-pointem (`useApi` / `http`), takže
jakmile endpoint existuje, FE se přepne bez dalšího zásahu.

## Nová investorská roadmapa

Začni souhrnem [`standa-nova-roadmapa.md`](./standa-nova-roadmapa.md). Obsahuje pořadí A–F, závislosti a odkazy na detailní kontrakty pro multi-company, OAuth, CRM, billing, referral a klientskou zónu.

## Pořadí (návrh — od nejlevnějšího a nejvíc odemykajícího)

| #   | Úkol                                                         | Velikost | Co odemkne                                                      |
| --- | ------------------------------------------------------------ | -------- | --------------------------------------------------------------- |
| 1   | [`role-a-opravneni.md`](./role-a-opravneni.md)               | malé     | reálné vynucení rolí (dnes jen UX na FE)                        |
| 2   | [`import-faktur.md`](./import-faktur.md)                     | malé     | dokončení F9 importu (historické faktury do produkce)           |
| 2b  | [`import-klienti-produkty.md`](./import-klienti-produkty.md) | malé     | F9 import klientů/produktů (jen potvrdit CRUD pole)             |
| 3   | [`provize-z-trzeb.md`](./provize-z-trzeb.md)                 | malé     | provize u Směn (`Sale.employeeId`)                              |
| 4   | [`objednavkovy-kanal.md`](./objednavkovy-kanal.md)           | střední  | vlastní objednávky bez provizí (2 public endpointy)             |
| 5   | [`rezervace-pripominky.md`](./rezervace-pripominky.md)       | střední  | připomínky rezervací (scheduler + SMS/e-mail)                   |
| 6   | [`online-platba-faktur.md`](./online-platba-faktur.md)       | větší    | platba faktur kartou v Klientské zóně (platební brána)          |
| 7   | [`uzaverka.md`](./uzaverka.md)                               | větší    | „Zavřít den" (Z-report + zámek), historie, per-číšník, hotovost |
| 8   | [`import-historie-prodeju.md`](./import-historie-prodeju.md) | větší    | historie prodejů z konkurenčního POS do analytiky (od dne 0)    |
| 9   | [`subscription-claims-referrals-v1.md`](./subscription-claims-referrals-v1.md) | větší | chráněné kampaně, referral a měřitelný akviziční funnel |
| 10  | [`crm-mvp-v1.md`](./crm-mvp-v1.md) | větší | klientská timeline, další krok a obchodní přehled bez duplikace klientů |

U každého jsou i **otázky/rozhodnutí**, na které potřebuju od tebe odpověď, ať doladím FE.
