# Šarže a expirace skladu V1 (INV-16)

## Produktový tok

Šarže jsou součást existujícího modulu skladu. Produkt se v katalogu celofiremně a jednosměrně přepne na sledování šarží; starý kladný stav backend bezpečně přiřadí do systémové šarže bez změny celkového množství. Pobočkově omezený člen aktivaci nespustí.

```text
Aktivovat produkt → přijmout číslo šarže + expiraci → výdej FEFO
                                                   └→ přesný výdej/odpis vybrané šarže
```

- Příjem sledovaného produktu vyžaduje číslo šarže; expirace je volitelná.
- Výdej bez ručního výběru používá FEFO: nejbližší expirace jako první, šarže bez expirace nakonec.
- Jeden pohyb může čerpat více šarží. Backend vrací jejich rozpad v `lotAllocations`.
- Přesun zachová šarži v cílové pobočce. Prodejní storno a vrácení materiálu zakázky vrací přesně původní šarže.
- Zůstatek šarže počítá backend z append-only ledgeru; frontend ho nikdy nesčítá sám.
- Sledovaný produkt nesmí do záporného stavu ani přes POS, QR platbu, zakázku nebo výrobu; nedostatek vrací `409` a celou operaci rollbackne. Nesledovaný produkt zachovává původní chování.

## Frontend

- `SkladPage.vue`: potvrzená celofiremní jednosměrná aktivace `lotTrackingEnabled` s upozorněním na striktní stav zásoby.
- `NaskladneniPage.vue`: jeden produkt lze rozdělit do více řádků šarží; sledovaný řádek bez čísla nelze uložit.
- `PurchaseOrdersPanel.vue`: jeden objednávkový řádek lze při dílčím příjmu rozdělit do více šarží, ale součet nesmí překročit zbývající množství.
- `ProductionBatchDialog.vue`: sledovaný výstupní polotovar vyžaduje výstupní šarži.
- `ZasobyPage.vue` + `StockLotsPanel.vue`: mobilní karty zůstatků, hledání, produkt, pobočka, datum expirace, přesný odpis, ruční příjem a výběr šarže pro výdej/přesun. Přesný výběr stránkuje i přes více než 100 aktivních šarží.
- `StockLedgerPanel.vue`: filtr šarže a rozpad každého pohybu.
- `inventory-export.ts`: CSV má číslo/expiraci/změnu/ID šarže; pohyb přes více šarží vytvoří více řádků a množství rodiče je jen na prvním.

## API

| Metoda | Endpoint                                                                                               | Použití                |
| ------ | ------------------------------------------------------------------------------------------------------ | ---------------------- |
| `POST` | `/api/v1/inventory/stock-lots/products/{productId}/enable`                                             | nevratná aktivace      |
| `GET`  | `/api/v1/inventory/stock-lots?productId=&locationId=&expiresTo=&positiveOnly=&search=&page=&pageSize=` | autoritativní zůstatky |
| `GET`  | `/api/v1/inventory/movements?stockLotId=`                                                              | ledger jedné šarže     |

Zápisy přijímají `lotNumber`/`expiresOn` u příjmu a `stockLotId` u přesného výdeje, záporné korekce a přesunu. Výroba používá `outputLotNumber`/`outputExpiresOn`. Oprávnění zůstávají `inventory.read/manage`.

## UX a mobilní invarianty

- Všechny nové akce musí fungovat na šířce 390 px bez horizontálního scrollu.
- FEFO je bezpečný default; ruční výběr je volitelný a UI vždy vysvětlí jeho dopad.
- Aktivace musí před odesláním varovat, že ji nelze vypnout, platí pro celou firmu a při nedostatku už operace nepovolí záporný stav.
- Úspěch zápisu se zobrazuje odděleně od následného refreshe; síťová chyba refreshe nesmí tvrdit, že se zápis neuložil.
- U expirace se zobrazuje datum i počet dní; prošlá/dnešní expirace je destruktivní, do 30 dnů varovná.
- Přesný odpis odesílá `type=Expiration` a ID jediné šarže.

## Regrese

- Unit: `src/composables/useInventory.spec.ts`, `src/lib/inventory-export.spec.ts`.
- Mobil + a11y: `e2e/stock-lots-mobile.spec.ts`.
- Ledger/filtr/CSV + mobil: `e2e/stock-ledger-export.spec.ts`.
- Nákupní objednávky: `e2e/purchase-orders.spec.ts`.
- Výstupní šarže výroby a reset dialogu: `e2e/modifikatory.spec.ts`.
