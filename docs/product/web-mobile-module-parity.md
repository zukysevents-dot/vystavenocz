# Parita modulů web ↔ mobil

Stav k 2026-07-27. **Zdroj pravdy je backend** (`vystaveno-api`): `GET /me` vrací efektivní moduly
firmy (tarif + granty ∩ volba firmy), `PermissionAuthorizationHandler` je vynucuje u každého
požadavku. Web (`vystavenocz`) i mobil (`vystaveno-mobile`) jsou jen konzumenti — schovávají to, co
by server stejně odmítl.

Pravidlo platné pro obě platformy:

```
viditelnost = aktivní firma + membership + role + aktivní modul + nárok/tarif
```

Rozdíl v layoutu je povolený (levé menu vs. spodní lišta / „Více"), rozdíl v **dostupnosti** ne.

Automatická kontrola: `npm run audit:modules` (vystavenocz) porovná katalog modulů backendu, webu i
mobilu; `src/lib/module-parity.spec.ts` hlídá web; `ScreenAccessTest.kt` hlídá mobil.

## Legenda

- **ostrý** – funguje proti reálnému API v produkci.
- **web-only** – vědomě jen web, důvod uveden.
- **P1** – zbývá doplnit do mobilu, backend kontrakt existuje.

## Matice

| Modul            | Web (routy)                                                                                                                              | Mobil dnes                                                                      | Backend endpointy                                                                                   | Role                                  | Tarif/entitlement                    | Akce                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| core             | `/app`, `/app/nastaveni`, `/app/pobocky`, `/app/tym`, `/app/audit`, `/app/schvalovani`, `/app/predplatne`                                | Nastavení, Pobočky, Tým, Schvalování, přepínač firem                            | `/company`, `/locations`, `/company/members`, `/approvals`, `/company/audit`                        | company.read/manage, approvals.manage | vždy (i v `locked` režimu jen čtení) | Historie změn + Předplatné zůstávají **web-only**                                       |
| invoicing        | `/app/faktury`, `/app/nabidky`, `/app/klienti`, `/app/dph`, `/app/cashflow`, `/app/uctarna`, `/app/opakovane-faktury`                    | Faktury, Nabídky, Klienti, DPH, Opakované faktury, Dashboard                    | `/invoices/*`, `/quotes/*`, `/clients/*`, `/invoices/vat-summary`, `/recurring-invoice-templates/*` | invoices.read/write, quotes.\*        | Základ                               | Cashflow + Účtárna **web-only**                                                         |
| jobs             | `/app/zakazky`, `/app/cenik-sluzeb`                                                                                                      | Zakázky, **Ceník služeb (nové)**                                                | `/jobs/*`, `/service-items`                                                                         | jobs.read/manage                      | Růst                                 | hotovo                                                                                  |
| stock            | `/app/sklad`, `/app/zasoby`, `/app/naskladneni`, `/app/skladove-doklady`, `/app/dodavatele`, `/app/nakupni-objednavky`, `/app/kategorie` | Sklad, Pohyby, Zrcadlo, Návrhy nákupu, Sklad podle poboček, Produkty, Kategorie | `/inventory/*`, `/products`, `/categories`                                                          | inventory.read/manage, catalog.read   | Provoz                               | Dodavatelé + nákupní objednávky + skladové doklady = **P1**                             |
| pos              | `/app/pokladna`, `/app/uzaverka`                                                                                                         | Pokladna, Prodeje, Z-reporty                                                    | `/sales/*`, `/day-close`                                                                            | pos.read/operate/close_day            | Provoz                               | hotovo                                                                                  |
| gastro           | `/app/restaurace`, `/app/mapa-stolu`, `/app/modifikatory`                                                                                | Restaurace (stoly, účty, platba)                                                | `/orders/*`, `/tables`, `/floors`                                                                   | gastro.operate                        | Růst                                 | Mapa stolů + modifikátory = **web-only** (konfigurace sálu a voleb je práce u počítače) |
| gastro (kitchen) | `/app/kuchyne`                                                                                                                           | Kuchyně (KDS)                                                                   | `/kitchen/*`                                                                                        | gastro.kitchen                        | Růst                                 | hotovo                                                                                  |
| booking          | `/app/rezervace`                                                                                                                         | Rezervace, Služby, Zdroje, Připomínky                                           | `/reservations/*`, `/services`, `/resources`                                                        | booking.read/manage                   | Růst                                 | hotovo                                                                                  |
| attendance       | `/app/dochazka`, `/app/smeny`                                                                                                            | Docházka, Měsíční přehled, Zaměstnanci, Směny, Šablony směn                     | `/attendance/*`, `/shifts/*`, `/employees`                                                          | attendance.\*                         | Provoz                               | CSV export mezd **web-only**                                                            |
| reporting        | `/app/provozni-prehled`, `/app/konsolidace`                                                                                              | Statistiky, Tržby, Výkon zaměstnanců                                            | `/pos-reports/*`                                                                                    | pos.reports                           | Provoz                               | Konsolidace poboček **web-only** (široká tabulka)                                       |
| loyalty          | `/app/vernost`, `/app/akce-ceny`                                                                                                         | POS uplatnění bodů + **Věrnost (nové)**, **Akce a ceny (nové, read-only)**      | `/customers/*`, `/loyalty/settings`, `/price-levels`, `/promotions`                                 | loyalty.read/manage                   | Růst                                 | zakládání promo pravidel zůstává web-only                                               |
| crm              | `/app/crm`                                                                                                                               | **CRM (nové)** — klienti, poznámky, úkoly, timeline                             | `/crm/clients`, `/crm/clients/{id}/timeline`, `/crm/tasks`                                          | crm.read/manage                       | Růst (add-on)                        | hotovo                                                                                  |
| integrations     | `/app/import`, `/app/nastaveni/api-webhooky`, sekce Integrace                                                                            | —                                                                               | `/integrations/*`, `/api-tokens`, `/webhooks`                                                       | integrations.\*                       | Růst                                 | **web-only**: správa API tajemství a exportů nepatří na telefon                         |
| verified_signing | `/app/podpisy`                                                                                                                           | —                                                                               | `/verified-signing/*`                                                                               | verified_signing.\*                   | doplněk Podpisy                      | **P1** (přehled obálek); zakládání a trezor credentials web-only                        |
| ai               | — (nápověda v kontextu)                                                                                                                  | —                                                                               | —                                                                                                   | —                                     | Růst                                 | bez samostatné obrazovky                                                                |

## Průřezové oblasti

| Oblast                                | Web                                                | Mobil                                        | Poznámka                                               |
| ------------------------------------- | -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| Více firem                            | přepínač v sidebaru, `POST /companies/{id}/switch` | **nově** v Nastavení → Přepnout firmu        | tokeny vydá server, cache se zahodí, shell se přestaví |
| Členové a pozvánky                    | `/app/tym`                                         | Tým                                          | jednorázový odkaz pozvánky na obou                     |
| Předplatné / ceník                    | `/app/predplatne`, `/app/modul/:module`            | jen vysvětlující obrazovka bez CTA na platbu | platba a změna tarifu **web-only**                     |
| Platební terminály                    | katalog + trezor v Nastavení                       | —                                            | web-only (tajemství, smlouvy)                          |
| Public klientský portál               | `/klient/:token`                                   | —                                            | veřejný host flow, ne firemní aplikace                 |
| Veřejné menu / objednávka / rezervace | `/objednavka/:slug`, `/rezervace/:slug`            | —                                            | host bez přihlášení, patří do prohlížeče               |
| Účetní exporty (ISDOC, Pohoda XML)    | Účtárna                                            | —                                            | souborový výstup pro účetní na počítači                |

## Co se změnilo 2026-07-27

- Mobil dostal **route-level bránu** `ScreenAccess`: každá obrazovka (včetně detailů a formulářů)
  se mapuje na destinaci v `NavigationCatalog` a dědí její modul + roli + nárok. Skrytý tab už není
  jediná ochrana; zastaralá zkratka ani přežitý back stack se k modulu nedostanou.
- Mobilní `ModuleGates` je **fail-closed**: prázdný/chybějící seznam modulů = jen `core`
  (dřív se odemklo všechno). Legacy tenanti se řeší migrací na serveru, ne důvěřivostí klienta.
- `EntitlementGates` bez snapshotu nespoléhá na „povolit vše", ale na (fail-closed) seznam modulů.
- Přibylo přepínání firem v mobilu + shell klíčovaný `companyId`.
- Nové mobilní obrazovky: **CRM**, **Věrnost**, **Akce a ceny** (read-only), **Ceník služeb**.
