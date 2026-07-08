# Vystaveno modular business roadmap

Last updated: 2026-07-08

## Implementation status

- Started: runtime module/capability foundation.
- Backend `/me` exposes `modules` and `features`.
- Backend persists tenant-selected modules in `company_modules`; tenants without rows still fall back to all default modules.
- Frontend auth store persists capabilities and the app shell filters navigation/routes through a typed module manifest.
- Onboarding lets the company choose a business profile: Gastro, Services, Crafts/Jobs, or Shop. The selected profile saves the first enabled module bundle, shows a profile-specific setup checklist, and routes the company to the first recommended setup step after save.
- Company settings lets owners adjust enabled modules after onboarding through `/company/modules`; the mandatory `core` module is always kept enabled by normalization.

## Product goal

Vystaveno is a modular business operating system for Czech freelancers and companies. Each tenant chooses only the modules they need, and the UI, API capabilities, permissions, onboarding, reports, and billing adapt to that selection.

The first deep vertical is **Gastro**. It must become strong enough that a restaurant can run daily operations digitally without paper as the source of truth.

## Core principle

Every company gets a tailored application on one shared platform:

- a restaurant sees POS, tables, kitchen, warehouse, recipes, inventory, day close, shifts, and attendance
- a plumber sees jobs, materials, site visits, photos, handover protocol, invoicing, and payments
- a salon sees bookings, staff, services, customers, payments, and attendance
- a shop sees products, EAN, stock, labels, returns, sales, and accounting exports

Modules must be hidden when disabled, enforced by the backend when unavailable, and explained during onboarding when useful.

## Shared core

The shared core is mandatory for all verticals:

- tenants, companies, branches, and locations
- users, memberships, roles, permissions, and PIN access where needed
- customers, suppliers, contacts, notes, tasks, documents, and attachments
- products, services, tax profiles, numbering series, and payment methods
- invoices, receipts, credit notes, exports, and accounting-ready document history
- verified document signing as an optional add-on module, with BankID/provider adapters and legal/compliance review before launch
- audit log for critical business actions
- notifications and reminders
- subscription, enabled modules, feature flags, limits, and runtime capabilities
- public API, webhooks, integration connections, and sync jobs
- AI assistant with strict permission and tenant isolation

## Module architecture

Use three separate layers:

1. **Subscription/license**: what the customer pays for.
2. **Feature flags**: what is technically rolled out.
3. **Runtime capabilities**: what this company and user can do right now.

The frontend must not guess access only from local flags. The API should return a resolved capability payload:

```json
{
  "modules": ["gastro", "stock", "attendance"],
  "features": ["pos.sell", "stock.count", "attendance.clockIn"],
  "navigation": [],
  "limits": {}
}
```

Every module needs a manifest:

- id and name
- dependencies
- permissions
- navigation items
- routes and API namespaces
- onboarding steps
- event handlers
- migrations
- limits

## Priority vertical: Gastro

Gastro is the hardest workflow and the best proof that Vystaveno can beat legacy POS systems.

### Gastro MVP

Must support a real service day:

- POS sale with products, categories, notes, discounts, tips, cash/card payments, and storno
- restaurant table map with open bills, moving items, merging bills, splitting bills, and partial group payments (foundation: `Restaurace` map opens/moves accounts, merges bills through backend PR #165, splits items among guests, and pays a selected split group through backend PR #168 `POST /orders/{id}/pay-items`; paid quantities become normal Sales, the unpaid remainder stays open, and split is reset for the remaining bill)
- kitchen/bar tickets by category or station (foundation: `Kuchyně` KDS groups sent order items into station tickets, filters Kitchen/Bar, supports print, preparation timer/SLA colors, public pickup/delivery labels, QR table order table names, the Sent → Preparing → Ready → Served workflow, and a read-only Served history from backend PR #172)
- receipt creation with VAT breakdown and payment history
- shift handover with cash/card/storno summary and user handoff fields (foundation: `Uzávěrka` has a `Provozní předávka` block for open and closed days plus `Export předávky CSV`; persisted shift ownership can build on this later)
- day close with Z-report, receipts, sales, payment methods, VAT, storno, discounts, sold products, and a guard that blocks closing while gastro accounts are still open
- basic stock item linking so selected sales create stock movements
- role restrictions for dangerous actions
- audit log for storno, discounts, price changes, day close, and cash corrections (foundation: backend PR #169 writes append-only audit rows for sale storno, open gastro order discount/tip changes, and day close/Z-report; backend PR #170 adds product sale/purchase price and VAT changes; backend PR #173 adds action filtering; `/app/audit` shows the paged, filterable audit log to Owner/Admin; cash pay-ins/pay-outs/drop/difference are covered through the audited day-close cash fields)

### Gastro V1

Must make the restaurant paperless:

- recipes linked to menu items (product recipe API in `vystaveno-api`, editor in `Sklad / katalog`, and backend PR #153 sale-time ingredient deduction for POS/restaurant payments)
- advanced stock deduction by recipes, including portions, variants, semi-products, waste, and yield (foundation: recipe rows support `wastePercent` and show effective stock consumption in the recipe dialog)
- suppliers, purchase receipts, purchase prices, average cost, and price history (foundation: backend PR #156 and `Naskladnění` UI create auditable purchase receipt documents)
- stock movements: receive, issue, adjust, write-off, staff meal, breakage, expiration, and transfer between warehouses/locations (foundation: backend PR #160 and `Zásoby` issue dialog categorize operational issue reasons; `Zásoby` transfer dialog records paired backend `TransferOut`/`TransferIn` movements for stock mirror by location; backend location-stock foundation stores stock levels per `locationId`, transfer validates the source location balance, low-stock can be evaluated per branch, and `Zásoby` sends `locationId` for receipt/issue/correction/stocktake)
- inventory count by warehouse/category/product, with expected vs counted amount (foundation: `Zásoby` inventory dialog shows `Stav má být`, `Realita`, and `Rozdíl` before saving; multi-branch tenants must choose a concrete branch before stocktake)
- stock mirror for bars and kitchens (V1: ledger-based expected vs variance report via backend PR #154 and `Zásoby` tab; frontend filters by date, branch/location, and product search; row detail explains the expected-state formula and why the variance comes from corrections/inventory counts)
- variance report in units and CZK (foundation: backend PR #157 returns varianceValue, backend PR #158 uses weighted receipt cost with product-price fallback, and `Zásoby` shows it)
- food cost and margin per item (foundation: backend PR #159 adds recipe margin metrics and the recipe dialog shows live cost, sale price, margin, and food cost)
- product allergens for Czech/EU gastro menus (foundation: backend PR #208 stores normalized allergen codes 1–14 on products and public menus return them; `Sklad / katalog` lets staff maintain them and `/objednavka/:slug` shows them to guests in online/QR ordering)
- monthly close and accounting export (foundation: closed-day `Uzávěrka` exports readable Z-report CSV and accounting CSV rows; `Export měsíc účetní CSV` uses closed Z-reports from `GET /api/v1/day-close?from=&to=&locationId=`, and `Export měsíc souhrn CSV` gives accountants a one-row-per-Z-report monthly control sheet with totals)

### Gastro V2

Must make Vystaveno smarter than a classic POS:

- manager dashboards for revenue, margin, food cost, staff performance, losses, dead items, and suspicious actions (foundation: `Provozní přehled` page + backend `GET /api/v1/pos-reports/summary`, `/revenue`, `/costs`, `/staff`, `/losses`, and `/dead-items` aggregate completed sales and stock-ledger inventory signals for a period/location — revenue, average check, payment split, discounts, tips, cancellations, top products, revenue-by-day chart, estimated cost, gross margin, food-cost product lines, staff revenue/check/payment/storno rows, stock losses/gains by reason/product in CZK, and stocked products with no completed sale in the selected period; gated by the `pos.reports` permission for Owner/Admin/Manager)
- staff performance: revenue per hour, storno rate, discount rate, cash differences (foundation: `/staff` and `Výkon obsluhy` show revenue, check count, average check, payment split, tips, discounts, storno totals, discount rate, and storno rate per employee)
- stock purchase suggestions from sales, recipes, minimum levels, and seasonality (foundation: backend `GET /api/v1/inventory/purchase-suggestions` combines current stock, product minimums, sales/recipe consumption, and days-ahead planning; `Naskladnění` shows recommended quantity, daily usage, days of stock remaining, estimated cost, and can add the suggestion to a receipt. Seasonality remains a later enhancement.)
- simple user-facing gastro manual that stays updated with each workflow so restaurants can train staff without paper notes
- QR/public ordering, payment, tip, review, and loyalty without installing an app (foundation: `/objednavka/:slug` public menu + pickup/delivery order submission into KDS; QR table links from `Mapa stolů` use `/objednavka/:slug?table=<tableId>&name=<tableName>` and backend PR #182 appends items to the open dine-in table order; mobile public ordering shows a sticky cart shortcut after items are added; e2e covers the guest table link flow and verifies `tableId` is submitted without pickup/delivery UI; pricing foundation now has backend CRUD for price levels/promotions plus `POST /api/v1/promotions/calculate`, and `/app/akce-ceny` manages rules with server-calculated preview. Remaining work: enforce the same backend pricing in POS/Restaurace/QR checkout.)
- kitchen display with preparation time, SLA colors, station filters, and history (foundation: preparation timer, SLA color thresholds, station filters, ticket printing, Preparing/Ready/Served actions, and persistent Served history via `GET /api/v1/kitchen/history`)
- multi-location central stock, shared price lists, and branch comparisons (foundation: locations exist, POS/manager reports accept `locationId`, `/app/konsolidace` compares branch revenue and adds per-branch operational comparison for gross margin, food cost, stock losses, dead stock value, and margin after losses; stock mirror filters by location, backend location-stock balances add location-specific stock balances, stock levels can be filtered by branch in `Zásoby`, `Naskladnění` (purchase receipts, suggestions) is location-scoped, and the `Podle poboček` tab in `Zásoby` shows a first-class cross-branch stock overview (product × location matrix with totals and an "Nezařazeno" column for unassigned stock) via `GET /api/v1/inventory/stock-by-location`. Remaining work: shared price lists and deeper branch trends.)
- approval workflows for inventory corrections, large write-offs, and manager storno (foundation: backend `feat/approval-workflow` adds approval limits and `/api/v1/approvals`; frontend `Schvalování` shows pending/approved/rejected requests, manages limits, and POS storno / stock issue / stocktake show `čeká na schválení` when backend returns `202 Accepted`)

## Competitor benchmark

Use these competitors as the practical benchmark:

- Dotykacka: broad Czech POS standard with POS, tables, mobile waiter, stock, attendance, reports, integrations, and EET 2.0 communication.
- Storyous/Teya: restaurant-focused POS, mobile waiter, table payments, kitchen modifiers, daily menus, stock, suppliers, attendance, rights, reports, and accounting exports.
- iKelp: price-aggressive POS with gastro workflows, QR table, online orders, stock, kiosk, loyalty, remote management, reports, and EET 2.0.
- POHODA and Flexi: not direct gastro POS competitors, but important accounting/export benchmarks.

To beat them, Vystaveno must not only have feature parity. It must make workflows faster, clearer, and more connected.

## Must-have parity

These are non-negotiable before claiming serious gastro readiness:

- fast POS sale
- table map and open bills
- mobile waiter/tablet flow (foundation: `Restaurace` keeps the visual table map on desktop and adds a compact mobile/tablet table list plus a sticky waiter action bar on open orders with table name, item count, total, send-to-kitchen, and pay actions; handheld e2e covers table selection, item add, sticky actions, and send-to-kitchen. Remaining work: optional native/mobile app shell.)
- kitchen/bar ticketing
- receipt, storno, discount, tip, split payment, fast product search, and EAN checkout scan (foundation: `Pokladna` supports product tile filtering by name/SKU/EAN plus exact product EAN through HW/Bluetooth scanner input and camera scan; unknown/duplicate codes are blocked with operator feedback)
- stock cards, suppliers, purchase receipts, inventory, recipes, and stock mirror
- shifts, cash movements, attendance, and user roles
- day close, Z-report, VAT, payment summaries, sold products, and exports
- multi-branch support
- payment terminal integration (foundation: shared PaymentDialog gives one payment flow for POS/tables/split — cash with received amount + change via `cashReceived`/`cashChange`, card through a manual-confirmation terminal step that a real terminal integration will replace; no fake payments are stored before confirmation)
- accounting exports to systems such as POHODA and Flexi
- EET 2.0 readiness once the technical specification is final
- import path from existing POS systems (foundation: frontend import wizard recognizes product/menu CSV/XLSX exports from Dotykacka, Storyous/Teya, and iKelp, maps product name, PLU/SKU, EAN, sale price, VAT, purchase price, category, and stock quantity, then commits through existing product/category/stock flows. Remaining work: sales history, receipts, table maps, modifiers, allergens, multi-price levels, and live POS sync.)

## Differentiators

Vystaveno should win through:

- POS + invoicing + stock + light ERP in one product
- clean module selection for each business type
- live profitability: recipe cost, purchase price, waste, margin, recommended sale price
- smarter stock mirror with variance explanations (foundation: `Zásoby > Zrcadlo` row detail explains opening + receipt + storno - sale - issue = expected state, and correction + stocktake = variance)
- AI assistant that explains losses, anomalies, and next actions
- modern onboarding templates for cafe, bistro, restaurant, bar, food truck, salon, plumber, shop (foundation: business profiles define `setupSteps`; onboarding shows the recommended start and sends Gastro users first to `Pobočky`, then guides them through tables/QR, stock/menu, modifiers, and day close)
- readable integration status for accounting, payments, printing, and API systems (foundation: `src/lib/integration-readiness.ts` drives `Nastavení firmy > Integrace a exporty`, showing operationally usable items, ready exports, connector backlog, manual terminal/printing steps, Generic CSV/Pohoda XML export mode, and planned partner API without claiming direct sync before connectors exist)
- no paper as source of truth; paper is only an export or printout
- simple Czech user guidance inside `docs/product/gastro-user-manual.md`, kept in sync as features land

## Non-gastro modules

### Services

- bookings, calendar, staff, rooms/resources, customer history, packages, deposits, no-show handling
- examples: salon, wellness, consultant, cleaning service

### Crafts and jobs

- jobs, estimates, materials, work orders, site visits, photos, checklists, handover protocol, signature, invoice
- examples: plumber, electrician, construction, service company

### Shop

- products, EAN, price lists, labels, stock, purchase orders, returns, POS, customer groups

### Invoicing

- invoices, proformas, credit notes, recurring invoices, payment tracking, VAT, numbering, exports

### Stock

- reusable module used by gastro, shop, and jobs
- warehouses, stock items, movements, inventory counts, batches, reorder rules

### Attendance

- clock-in, clock-out, breaks, timesheets, shifts, approvals, payroll export

### AI

- horizontal helper, never a data silo
- must respect tenant, modules, permissions, audit, limits, and explicit confirmation for important changes

### Integrations

- accounting, payments, terminals, bank imports, e-shops, calendars, food delivery, public API, webhooks

### Verified Signing

- optional add-on module for companies that need verified document signing
- use cases: contracts, handover protocols, offers, order confirmations, employee documents, client approvals, and service/job protocols
- planned provider path: BankID-style verified identity/signature adapter first, with provider-specific contracts isolated behind an integration interface
- must store a signing envelope/audit trail per document: signer identity metadata allowed by the provider, timestamps, document hash, status, provider reference, and immutable evidence
- must stay separate from ordinary invoice sending; invoices do not require a handwritten signature, while verified signing is a premium workflow for documents where proof of identity/consent matters
- legal/compliance wording must be reviewed before public launch; the UI must not overstate legal effect beyond the selected provider contract

## Implementation order

1. Stabilize module capability resolver, permissions, navigation rules, and module settings.
2. Make Gastro MVP reliable: POS, tables, kitchen, receipts, shifts, day close.
3. Add stock movements from sales and protect financial/POS audit integrity.
4. Extend recipes with portions, variants, and semi-products on top of the existing ingredient stock deduction and waste/yield foundation.
5. Build purchase receipts, enrich inventory counts, and extend stock mirror with warehouses/CZK variance.
6. Add food cost, margin, variance, and manager reports.
7. Add modular onboarding and templates per business type (foundation: profile-specific onboarding checklist and first-step routing).
8. Add services and jobs as the next non-gastro verticals.
9. Add accounting and payment integrations.
10. Add verified document signing as a standalone module after the document model and provider contract are designed.
11. Add AI insights after the underlying data is reliable.
12. Add EET 2.0 when final technical requirements are published.

## Acceptance criteria

Vystaveno is ready to compete in gastro when:

- a restaurant can run a day without paper as source of truth
- owner can explain every CZK in revenue, cash, card, storno, discount, VAT, and tips
- stock state changes automatically from real sales and manual stock operations
- inventory and stock mirror show quantity and money differences
- every critical action has user, time, reason, and audit trail
- a non-gastro customer can disable gastro and see only their relevant modules
- API rejects disabled modules and missing permissions even if the UI is bypassed
