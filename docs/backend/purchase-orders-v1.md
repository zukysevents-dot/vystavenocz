# Nákupní objednávky a dodavatelé V1

## Produktový tok

Nákupní objednávky jsou součást existujícího modulu skladu a stránky `/app/naskladneni`; nejde o druhý sklad ani nový modul.

```text
Dodavatel → Návrh → Objednáno → Částečně přijato → Přijato
                         └──────── další příjemka ────────┘
```

- Adresář dodavatelů podporuje vytvoření, úpravu, archivaci a obnovení. Archivace nemaže historii.
- Návrh objednávky obsahuje dodavatele, pobočku, termíny, poznámku a produkty s množstvím/cenou.
- Návrh lze upravovat, objednanou nebo částečně přijatou objednávku už ne.
- Jedna objednávka může mít více dílčích příjemek. Každá zvýší existující sklad a zůstane dohledatelná v ledgeru.
- Ruční příjemka bez objednávky zůstává dostupná pro jednoduché provozy.

## Frontend kontrakt

- Typy jsou v `src/lib/types.ts`, HTTP adaptér v `src/composables/usePurchaseOrders.ts`.
- UI je `PurchaseOrdersPanel.vue` vložený do `NaskladneniPage.vue`; na mobilu používá karty a scrollovatelné dialogy.
- Katalog produktů pro příjem a objednávku se načítá celý přes `useProducts.loadAll()`, ne jen první stránka.
- Příjem objednávky generuje `crypto.randomUUID()` při otevření dialogu. Při chybě/time-outu drží stejný klíč; nový generuje až pro nový příjem.
- Po úspěšném příjmu se znovu načtou skladové stavy, poslední příjemky, doporučení a objednávky.
- Filtr pobočky omezuje seznam objednávek; samotná objednávka nese konkrétní pobočku a příjem ji nemění.

## Backend API

Vše je pod `/api/v1/inventory` a používá stávající `inventory.read/manage`:

- `GET/POST /suppliers`, `GET/PUT/DELETE /suppliers/{id}`, `POST /suppliers/{id}/restore`
- `GET/POST /purchase-orders`, `GET/PUT /purchase-orders/{id}`
- `POST /purchase-orders/{id}/place`
- `POST /purchase-orders/{id}/cancel`
- `POST /purchase-orders/{id}/receipts`

Poslední endpoint vyžaduje UUID `idempotencyKey`. Stejný klíč a tělo vrací původní výsledek, stejný klíč s jiným tělem vrací `409`. Backend v jedné transakci kontroluje zbytek, vytvoří existující `PurchaseReceipt` a skladové pohyby a aktualizuje stav objednávky.

## Navazující šarže

Sledovaný produkt lze při jednom příjmu objednávky rozdělit do více šarží. Každý odeslaný řádek nese stejné `purchaseOrderItemId`, vlastní `quantity`, `lotNumber` a volitelné `expiresOn`; součet řádků nesmí překročit zbývající množství. Úplný kontrakt je v `stock-lots-expiry-v1.md`.

Mimo V1 zůstává odesílání objednávky e-mailem/PDF, dodavatelská SKU, schvalování, vratky, OCR/EDI a více měn. Nativní Android/iOS, AI/MCP a změny oprávnění řeší samostatný vlastník; v tomto workflow je nerozšiřovat.

## Regrese

- Unit: `src/composables/usePurchaseOrders.spec.ts`
- Mobilní flow + axe: `e2e/purchase-orders.spec.ts`
- Backend transakce/souběh/tenant: `PurchaseOrderTests` v `vystaveno-api`
