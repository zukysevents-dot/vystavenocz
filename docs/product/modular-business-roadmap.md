# Vystaveno modular business roadmap

Last updated: 2026-07-05

## Implementation status

- Started: runtime module/capability foundation.
- Backend `/me` exposes `modules` and `features`.
- Frontend auth store persists capabilities and the app shell filters navigation/routes through a typed module manifest.
- Current default is intentionally all modules enabled, so existing tenants keep the same app surface until tenant-specific module selection is added.

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
- restaurant table map with open bills, moving items, merging bills, and splitting bills
- kitchen/bar tickets by category or station
- receipt creation with VAT breakdown and payment history
- shift opening and closing with cash balance, card summary, storno summary, and user ownership
- day close with Z-report, receipts, sales, payment methods, VAT, storno, discounts, and sold products
- basic stock item linking so selected sales create stock movements
- role restrictions for dangerous actions
- audit log for storno, discounts, price changes, day close, and cash corrections

### Gastro V1

Must make the restaurant paperless:

- recipes linked to menu items
- stock deduction by recipes, including portions, variants, semi-products, waste, and yield
- suppliers, purchase receipts, purchase prices, average cost, and price history
- stock movements: receive, issue, transfer, adjust, write-off, staff meal, breakage, expiration
- inventory count by warehouse/category/product, with expected vs counted amount
- stock mirror for bars and kitchens: opening state + purchases - theoretical sales - write-offs = expected closing state
- variance report in units and CZK
- food cost and margin per item
- monthly close and accounting export

### Gastro V2

Must make Vystaveno smarter than a classic POS:

- manager dashboards for revenue, margin, food cost, dead items, losses, and suspicious actions
- staff performance: revenue per hour, storno rate, discount rate, cash differences
- stock purchase suggestions from sales, recipes, minimum levels, and seasonality
- QR table ordering, payment, tip, review, and loyalty without installing an app
- kitchen display with preparation time, SLA colors, station filters, and history
- multi-location central stock, shared price lists, and branch comparisons
- approval workflows for inventory corrections, large write-offs, and manager storno

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
- mobile waiter/tablet flow
- kitchen/bar ticketing
- receipt, storno, discount, tip, split payment
- stock cards, suppliers, purchase receipts, inventory, recipes, and stock mirror
- shifts, cash movements, attendance, and user roles
- day close, Z-report, VAT, payment summaries, sold products, and exports
- multi-branch support
- payment terminal integration
- accounting exports to systems such as POHODA and Flexi
- EET 2.0 readiness once the technical specification is final
- import path from existing POS systems

## Differentiators

Vystaveno should win through:

- POS + invoicing + stock + light ERP in one product
- clean module selection for each business type
- live profitability: recipe cost, purchase price, waste, margin, recommended sale price
- smarter stock mirror with variance explanations
- AI assistant that explains losses, anomalies, and next actions
- modern onboarding templates for cafe, bistro, restaurant, bar, food truck, salon, plumber, shop
- readable integration status for accounting and payment systems
- no paper as source of truth; paper is only an export or printout

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

## Implementation order

1. Stabilize module capability resolver, permissions, and navigation rules.
2. Make Gastro MVP reliable: POS, tables, kitchen, receipts, shifts, day close.
3. Add stock movements from sales and protect financial/POS audit integrity.
4. Build recipes and purchase receipts.
5. Build inventory and stock mirror.
6. Add food cost, margin, variance, and manager reports.
7. Add modular onboarding and templates per business type.
8. Add services and jobs as the next non-gastro verticals.
9. Add accounting and payment integrations.
10. Add AI insights after the underlying data is reliable.
11. Add EET 2.0 when final technical requirements are published.

## Acceptance criteria

Vystaveno is ready to compete in gastro when:

- a restaurant can run a day without paper as source of truth
- owner can explain every CZK in revenue, cash, card, storno, discount, VAT, and tips
- stock state changes automatically from real sales and manual stock operations
- inventory and stock mirror show quantity and money differences
- every critical action has user, time, reason, and audit trail
- a non-gastro customer can disable gastro and see only their relevant modules
- API rejects disabled modules and missing permissions even if the UI is bypassed
