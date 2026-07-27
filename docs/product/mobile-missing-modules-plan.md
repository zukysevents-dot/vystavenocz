# Mobil: co chybělo proti webu a co s tím

Vstupem byl audit všech webových rout (`APP_NAV_DEFINITIONS` + router) proti mobilnímu
`NavigationCatalog`/`ScreenRegistry`. Kompletní matice je ve
[web-mobile-module-parity.md](web-mobile-module-parity.md).

## P0 — muselo být stejné jako na webu

Všechno bylo v mobilu už před touto vlnou: fakturace, klienti, nabídky, zakázky, produkty/služby,
sklad, POS, gastro, kuchyně, rezervace, docházka, směny, pobočky, členové, dashboard a hlavní
reporty. P0 tedy nezůstalo nic otevřeného; ověřeno seznamem obrazovek v `ScreenAccessTest`.

## Doplněno 2026-07-27

| Modul   | Obrazovka                                                                                    | Backend                                                                                                                                 | Rozsah                                |
| ------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| crm     | CRM — seznam klientů (pohledávky, otevřené úkoly), detail s poznámkami, úkoly a timeline     | `/crm/clients`, `/crm/clients/{id}`, `/crm/clients/{id}/timeline`, `/crm/clients/{id}/activities`, `/crm/tasks(/{id}/complete\|cancel)` | plný (čtení + zápis dle `crm.manage`) |
| loyalty | Věrnost — pravidla programu, cenové hladiny, zákazníci, zůstatek bodů, ledger, ruční korekce | `/loyalty/settings`, `/price-levels`, `/customers`, `/customers/{id}/loyalty(/adjust)`                                                  | plný                                  |
| loyalty | Akce a ceny — přehled akčních pravidel a hladin                                              | `/promotions`, `/price-levels`                                                                                                          | read-only (viz níže)                  |
| jobs    | Ceník služeb — seznam, založení a úprava služby                                              | `/service-items`                                                                                                                        | plný                                  |

Každá obrazovka má loading / empty / error + retry stav (`StateContent`), modulovou i rolovou bránu
a texty bez interního slovníku.

## Zbývá (P1)

| Priorita | Modul            | Co                                               | Proč zatím ne                                                                                                               |
| -------- | ---------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| P1       | verified_signing | přehled podpisových obálek a jejich stavů        | obálky se zakládají z dokumentu (hash souboru) — mobilní výběr souboru a evidence si zaslouží vlastní návrh                 |
| P1       | stock            | dodavatelé, nákupní objednávky, skladové doklady | tok koncept → odeslání → příjem → potvrzení je vícekrokový; na telefonu dává smysl jen příjem, který už mobil má (příjemky) |
| P1       | loyalty          | zakládání a editace promo pravidel               | pravidlo kombinuje produkty, kategorie, dny, časová okna a priority                                                         |
| P1       | core             | historie změn (audit log)                        | čtení dlouhého seznamu s filtry, na telefonu okrajové                                                                       |
| P2       | invoicing        | cashflow / upomínky                              | web to počítá klientsky nad celým seznamem faktur; mobil nefabrikuje agregace — čeká na serverový report                    |

## Vědomě web-only

| Funkce                                                                | Důvod                                                  | Mobilní alternativa                      |
| --------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| Veřejná objednávka, veřejné menu, veřejné rezervace, klientský portál | host bez přihlášení, ne firemní aplikace               | QR odkaz vede do prohlížeče              |
| Účetní exporty (ISDOC, Pohoda XML, CSV)                               | soubor pro účetní na počítači                          | v mobilu PDF faktury a odeslání e-mailem |
| Konsolidace poboček                                                   | široká tabulka porovnání                               | mobilní Statistiky s filtrem pobočky     |
| Správa API tokenů, webhooků a credential trezorů                      | tajemství se zobrazují jednou; správa patří k počítači | —                                        |
| Předplatné a platba                                                   | změna tarifu je obchodní krok s právními texty         | mobil vysvětlí přínos a odkáže na web    |
| Mapa stolů a modifikátory                                             | konfigurace sálu a voleb, ne provozní úkon             | mobil se stoly pracuje, jen je nezakládá |
| Import dat z konkurenčních pokladen                                   | nahrávání CSV/XLSX                                     | —                                        |

## Jak přidat další modul do mobilu

1. `Screen` v `Navigator.kt` (+ titulek v `ScreenTitles.kt`).
2. `navDestination(...)` v `NavigationCatalog.kt` — jeden řádek, nese modul i roli.
3. `ScreenAccess.gateDestinationOf` — detail/formulář namapovat na jeho seznam (bez toho se to
   nepřeloží, což je záměr).
4. Repository + DTO + ScreenModel + Screen podle stávajícího vzoru, zapojit v `AppGraph` a
   `ScreenRegistry`.
5. Test v `ScreenAccessTest` (obrazovka je v seznamu `allScreens`) + testy DTO/screen modelu.
6. Aktualizovat tuto stránku a matici parity.
