# Dodavatelský katalog a objednávka z návrhů V1 (INV-16)

## Účel

Tento řez rozšiřuje existující dodavatele, nákupní doporučení a nákupní objednávky. Nevytváří nový sklad ani nový modul. Cílem je převést aktuální doporučení doobjednání do skutečného konceptu objednávky v celých dodavatelských baleních, použitelně i na mobilním webu/PWA.

Nativní Android/iOS, AI/MCP a změny rolí či oprávnění jsou mimo tento řez. API dál používá pouze `inventory.read` a `inventory.manage`.

## Dodavatelský katalog

Vazba `SupplierProduct` patří jedné firmě, jednomu aktivnímu dodavateli a jednomu aktivnímu produktu. Ukládá:

- volitelné SKU a EAN produktu u dodavatele,
- `packageQuantity`: počet základních skladových jednotek v jednom objednacím balení,
- `minimumOrderQuantity`: minimální odběr v základních skladových jednotkách,
- volitelnou obvyklou nákupní cenu za jednu základní skladovou jednotku.

Jedna dvojice dodavatel + produkt má nejvýše jednu vazbu. Neprázdné dodavatelské SKU je u daného dodavatele unikátní. Vazby jsou tenantově izolované; cizí dodavatel nebo produkt se navenek chová jako nenalezený.

API:

- `GET /api/v1/inventory/suppliers/{supplierId}/products`
- `PUT /api/v1/inventory/suppliers/{supplierId}/products/{productId}`
- `DELETE /api/v1/inventory/suppliers/{supplierId}/products/{productId}`

## Návrhy a zaokrouhlení

`GET /api/v1/inventory/purchase-suggestions` zůstává serverovým zdrojem doporučeného množství. Každý řádek navíc vrací `supplierOptions` pro aktivní dodavatelské vazby. Pro každou možnost server spočítá:

```text
minimum = max(recommendedOrderQuantity, minimumOrderQuantity)
packageCount = ceil(minimum / packageQuantity)
roundedOrderQuantity = packageCount * packageQuantity
estimatedCost = roundedOrderQuantity * usualUnitCost
```

Pokud obvyklá cena chybí, může server použít nákupní cenu produktu; bez ceny zůstává odhad `null`, ne nula. Veškerá množství objednávky jsou dál v základní skladové jednotce.

## Převod do objednávky

`POST /api/v1/inventory/purchase-orders/from-suggestions` přijímá dodavatele, kontext období a pobočky, vybrané produkty, volitelné očekávané dodání a poznámku a povinný UUID `idempotencyKey`.

Server při každém prvním zpracování:

1. znovu spočítá aktuální nákupní návrhy; nevěří množství ani ceně z klienta,
2. ověří, že každý vybraný produkt stále potřebuje objednat a má vazbu na vybraného dodavatele,
3. množství zaokrouhlí nahoru na celé balení a respektuje minimální odběr,
4. vytvoří běžnou objednávku ve stavu `Draft`,
5. do položek uloží snapshot dodavatelského SKU, EAN, velikosti balení a počtu balení.

Změna dodavatelského katalogu později nesmí přepsat historický snapshot objednávky.

Stejný idempotency klíč se stejným významovým payloadem vrátí původní objednávku. Stejný klíč s jiným payloadem vrací 409. Zámek i unikátní index jsou scoped firmou, takže souběžné opakování nevytvoří dvě objednávky.

## Frontend

Workflow je součástí `/app/naskladneni`:

- v dialogu Dodavatelé lze u konkrétního dodavatele spravovat jeho produkty, kódy, balení, minimum a obvyklou cenu,
- akce `Z návrhů` nabídne jen dodavatele a produkty s platnou vazbou,
- před vytvořením ukáže doporučené a zaokrouhlené množství, počet balení a známý odhad ceny,
- po chybě drží stejný idempotency klíč, takže uživatel může bezpečně akci zopakovat,
- vytvořený koncept ukazuje snapshot dodavatelského SKU a balení.

## Regrese

- Backend unit: `PurchaseOrderValidatorTests`
- Backend integrace: `SupplierProductCatalogTests`
- Frontend composable: `src/composables/usePurchaseOrders.spec.ts`
- Mobilní workflow + axe: `e2e/purchase-orders.spec.ts`
