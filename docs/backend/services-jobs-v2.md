# Services & Jobs V2 — řemeslná vertikála (FE↔BE kontrakt)

**Vlastnictví:** oba PR (backend `vystaveno-api`, frontend `vystavenocz`) staví Claude Code v rámci milníku Services & Jobs V2. Tento soubor je **jediný zdroj pravdy** pro seam; obě strany ho drží v souladu a zrcadlí klíčové body do `AGENTS.md`.

**Rozsah:** rozšíření existujícího modulu `jobs` (default-on) na plnou vertikálu pro řemeslníky/servis (instalatér, elektrikář): katalog služeb → nabídka → zakázka → pracovní list (práce + materiál ze skladu) → předání → faktura. **Žádný nový modul.** JSON camelCase; enumy jako string; **DPH a součty počítá VÝHRADNĚ backend** (sdílená kalkulace jako faktura), frontend je jen zobrazuje. Reuse: `InvoiceService.CreateDraftAsync`, `StockService` ambient ledger, `SigningEnvelope`, `Client` FK, `InvoiceCalculator`, `LocationScope`, `IAuditRecorder`.

---

## 1. Doménový model

- **`ServiceItem`** (nový katalog fakturovatelných prací): `{ id, name, unit?, unitPrice (NET/bez DPH), vatRate (0|12|21), isActive, createdAt, updatedAt }`. Samostatná entita — booking `Service` je rezervační (trvání), `Product` je fyzický sklad; tohle je řemeslný úkon. Soft-delete.
- **`Job` V2** (rozšíření): staré agregát sloupce (`materialCost/materialPrice/hours/hourlyRate`) ponechány (default 0, V2 nepoužívá — nedestruktivní). Nové: `number` (server `ZAK-{yyyy}-{seq}`), `clientId?` (FK Client), `clientName?` (volný text fallback), `siteAddress?`, `scheduledAt?` (UTC), `assignedEmployeeId?` (FK Employee), `priority` (`Low|Normal|High|Urgent`, default Normal), `locationId?` (FK), `sourceQuoteId?`, `invoiceId?` (FK Invoice — idempotence).
- **`JobStatus`** nový set: `scheduled | in_progress | waiting | done | cancelled` (přechody guarded state machine). Migrace mapuje staré: `quote→scheduled`, `invoiced→done`.
- **Pracovní list (child tabulky, FK cascade, ITenantOwned+softdelete):** `JobWorkItem` (práce; `serviceItemId?` odkaz na katalog, `description`, `quantity`, `unitPrice` NET, `vatRate`, `sortOrder`), `JobMaterialItem` (materiál; `productId`, snapshot `description`, `quantity`, `unitPrice` NET, `vatRate` — **vytvoření odečítá sklad, smazání vrací**), `JobChecklistItem` (`label`, `isDone`), `JobEvent` (append-only časová osa: `kind`, `detail`, `userId`, `createdAt`), `JobHandover` (1/zakázka: `state`, `note?`, `signingEnvelopeId?`, `createdAt`).
- **`Quote` V2**: `QuoteItem` +`kind` (`work|material`). Součty počítá **server**. Stavy +`expired`.

## 2. Katalog služeb — `/api/v1/service-items`

CRUD: `GET` list (`?search&activeOnly&page&pageSize&sort`) / `GET {id}` = `jobs.read`; `POST`/`PUT`/`DELETE` = `jobs.manage`. Request `{ name, unit?, unitPrice, vatRate, isActive? }`.

## 3. Nabídky V2 — `/api/v1/quotes`

- `GET` list / `GET {id}` (`quotes.read`), `POST`/`PUT`/`DELETE` (`quotes.manage`). `QuoteItemDto{ description, quantity, unitPrice, vatRate, kind? (default work) }`. Response položky nesou serverem spočtené `lineNet/lineVat/lineTotal`; nabídka `subtotal/vatTotal/total`. PUT nahrazuje celý seznam položek.
- `POST /quotes/{id}/status` (`quotes.manage`) — `{ status }`, guarded `QuoteStatusStateMachine` (`draft→sent→accepted|rejected|expired`; nelegální → 422). Audit `QuoteStatusChanged`.
- `POST /quotes/{id}/convert-to-job` (`jobs.manage`) → vytvoří `Job` (`sourceQuoteId`). **Idempotence:** 2. pokus vrátí existující / 409. Audit `JobCreatedFromQuote`.

## 4. Zakázky V2 — `/api/v1/jobs`

- `GET` list (`jobs.read`, filtry `status/assignedEmployeeId/locationId/search`, **location-scoped** — Manager svá pobočka) → `JobListItemResponse`. `GET {id}` (`jobs.read`) → **`JobDetailResponse`** (hlavička + `workItems` + `materialItems` + `checklist` + `events` + `handover` + serverem spočtené `subtotal/vatTotal/total`).
- `POST`/`PUT` (`jobs.manage`) — `JobRequest{ name, clientId?, clientName?, siteAddress?, scheduledAt?, assignedEmployeeId?, priority, locationId?, note? }`. `number`/`status` server-controlled. `DELETE` soft (`jobs.manage`).
- `POST /jobs/{id}/status` (`jobs.manage`) — guarded `JobStatusStateMachine`; append `JobEvent` + audit `JobStatusChanged`.

## 5. Pracovní list — child routes (vše `jobs.manage`)

- `POST /jobs/{id}/work-items` / `DELETE /jobs/{id}/work-items/{itemId}`.
- `POST /jobs/{id}/material-items` (`{ productId, quantity, description?, unitPrice?, vatRate? }`) → **odečet skladu** ambient job-consumption (StockMovement + `relatedJobId`), audit `JobMaterialConsumed`. `DELETE /jobs/{id}/material-items/{itemId}` → **vrácení skladu**, audit `JobMaterialReturned`.
- `POST /jobs/{id}/checklist` / `PUT /jobs/{id}/checklist/{itemId}` (toggle/label) / `DELETE /jobs/{id}/checklist/{itemId}`.

## 6. Předání + podpis (seam)

- `POST /jobs/{id}/handover` (`jobs.manage`) — vytvoří datový záznam předání (snapshot). `GET /jobs/{id}/handover` (`jobs.read`).
- `POST /jobs/{id}/handover/sign` (`jobs.manage`) — jen při modulu `verified_signing`: založí `SigningEnvelope` (`documentType=handover`, link přes `documentId`/`externalReference`, jen hash+metadata). **Netvrdí ostrý BankID** — seam přes mock providera.

## 7. Faktura ze zakázky — `POST /jobs/{id}/invoice`

- Policy **`invoices.write`** (Owner/Admin/Manager/Účetní — **technik `Employee` NE**). Vyžaduje `Job.ClientId` (jinak 422). Mapuje `workItems`+`materialItems` → `CreateInvoiceRequest.Lines` → **`InvoiceService.CreateDraftAsync`** (žádná duplikace cen/DPH). Nastaví `Job.InvoiceId`. **Idempotence:** pokud `invoiceId` už set a faktura není stornovaná → 409 / vrátí existující. Audit `JobInvoiced`. FE pak přejde do editoru faktury `?id=`.

## 8. Oprávnění / role / location

| Schopnost                                             | Owner/Admin | Manager          | Employee (technik)         | Účetní         |
| ----------------------------------------------------- | ----------- | ---------------- | -------------------------- | -------------- |
| Katalog služeb CRUD                                   | ✅          | ✅               | ✅ (`jobs.manage`)         | ❌             |
| Zakázka + pracovní list + materiál + status + předání | ✅          | ✅ (svá pobočka) | ✅                         | ❌ (jen čtení) |
| Nabídky CRUD / stav                                   | ✅          | ✅               | čtení                      | ✅             |
| Převod nabídky na zakázku                             | ✅          | ✅               | ✅                         | ❌             |
| **Faktura ze zakázky**                                | ✅          | ✅               | ❌ (nemá `invoices.write`) | ✅             |

Location scope přes `Job.LocationId` (Manager svá pobočka read+write; materiál odečet přes `LocationScope`). Tenant izolace: všechny entity `ITenantOwned+ISoftDelete` → global query filter; cross-tenant → 404.

## 9. Migrace `ServicesJobsV2` (forward-only, aditivní)

+`ServiceItem`, +`Job` sloupce, +`JobWorkItem/JobMaterialItem/JobChecklistItem/JobEvent/JobHandover`, +`StockMovement.RelatedJobId`, +`QuoteItem.Kind`, +`StockMovementType.JobConsumption`/`StornoJobConsumption`. Status backfill `quote→scheduled`, `invoiced→done`. Bez pending model changes.

## 10. Frontend

- Typy + composables `useJobs` (mock-capable CRUD/detail/work/checklist/status/handover/events; materiál+faktura API-real s mock stubem pro e2e), `useServiceItems` (mock+API), `useQuotes` (server totals + přechody + převod).
- Stránky: `ZakazkyPage` (přehled), **`ZakazkaDetailPage` `/app/zakazky/:id`** (pracovní list, materiál s product-pickerem, checklist, časová osa, předání+podpis seam, „Vytvořit fakturu" gate rolí), `NabidkyPage` V2, `ServiceCatalogPage` `/app/cenik-sluzeb`.
- Nav: `Zakázky` viditelné i pro technika (`Employee`); `Ceník služeb` skryté `Employee`/`Accountant`. Součty jsou serverové — FE je jen zobrazuje.

## 11. Vědomě mimo milník (zalogováno)

- **Fotky / upload souborů**: backend nemá žádné file/blob úložiště → **externí závislost** (object store). Nezaváděno jako placeholder. Předání je datový záznam + hash pro podpis.
- **Ostrý podpis (BankID)**: jen seam přes `verified_signing` + mock provider; do UI ani textů netvrdit právní účinek, dokud není reálný adapter + wording.
