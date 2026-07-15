# INV-16 — rezervované a disponibilní zásoby V1

Fyzický stav zůstává výhradně v `StockLevel`. `StockReservation` je tenantový doklad nad produktem a pobočkou se stavem `Active → Released|Fulfilled`; `reservedQuantity` je součet aktivních rezervací, `restrictedQuantity` je zůstatek neaktivních šarží a `availableQuantity = max(0, quantity - reservedQuantity - restrictedQuantity)`.

API:

- `GET/POST /api/v1/inventory/stock-reservations`
- `GET /api/v1/inventory/stock-reservations/{id}`
- `POST /api/v1/inventory/stock-reservations/{id}/release`
- `POST /api/v1/inventory/stock-reservations/{id}/fulfill`

V1 rezervuje celý produkt+pobočku, ne konkrétní šarži, a nepodporuje částečné vyřízení ani automatickou expiraci. Fulfill atomicky vytvoří ledger pohyb `ReservationFulfillment` s `RelatedStockReservationId`; sledovaný produkt použije FEFO pouze nad uvolněnými šaržemi. Všechny fyzické mutace, změny stavu šarží a rezervace sdílejí produktový advisory lock a fyzický stav nesmí klesnout pod ostatní aktivní rezervace plus omezené šarže. Používají se jen existující `inventory.read/manage`; role/oprávnění, nativní aplikace a AI/MCP jsou mimo tento řez.
