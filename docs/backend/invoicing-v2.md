# Invoicing V2 — dobropisy + zálohové (proforma) faktury (FE↔BE kontrakt)

**Vlastnictví:** backend staví Codex (`vystaveno-api`), frontend Claude Code (`vystavenocz`). Tento soubor je **jediný zdroj pravdy** pro seam; obě strany ho drží v souladu a zrcadlí klíčové body do `AGENTS.md`.

**Rozsah:** rozšíření existujícího modulu `invoicing` o tři typy dokladu a dvě odvozené akce. Žádný nový modul, žádný nový business model. **DPH a součty počítá výhradně backend**, frontend je jen zobrazuje.

---

## 1. Doménový model (rozšíření `Invoice`)

- `Invoice.DocumentType` (enum): `Invoice` | `Proforma` | `CreditNote`. Default `Invoice`. JSON camelCase: `documentType` = `invoice | proforma | credit_note` (frontend už tento tvar má, dnes jen `invoice|credit_note`).
- `Invoice.ParentInvoiceId` (`Guid?`, nullable): u **dobropisu** ukazuje na fakturu, kterou opravuje; u **faktury vzniklé konverzí** ze zálohové ukazuje na proformu. JSON `parentInvoiceId`.
- **Oddělené číselné řady per typ:** proforma i dobropis mají vlastní sekvenci/prefix (ne sdílenou s fakturami) — účetní požadavek, ať čísla nekolidují. Číslo přiděluje server při `issue` (jako dnes).

## 2. Nové endpointy

### `POST /api/v1/invoices/{id}/credit-note` → vystaví dobropis

- `{id}` musí být `documentType=Invoice` ve stavu `Issued` nebo `Paid`, jinak **409**.
- **Frontend NEposílá žádné položky ani nepočítá DPH.** Plný dobropis = prázdné tělo. (Volitelný částečný dobropis smí poslat jen podmnožinu položek s **KLADNÝM** `quantity` — validator vyžaduje `Quantity > 0`; nikdy záporné množství.)
- **Server** z původní faktury vytvoří navázaný dobropis: zkopíruje `clientSnapshot`/`supplierSnapshot`, zrcadlí položky s **kladným množstvím**, ale **záporné částky a DPH** (`subtotal/vatTotal/total < 0`) spočítá **server** (zápornost je v částkách, ne v `quantity`), přidělí číslo z řady dobropisů, `parentInvoiceId = {id}`, stav `Issued` (rovnou finalizovaný opravný daňový doklad → vstoupí do Účtárny i DPH; needituje se).
- Response `200`: `Invoice` (dobropis) se zápornými součty + `documentType=credit_note` + `parentInvoiceId`. **Frontend odpověď jen zobrazí jako zápornou** — sám znaménka ani DPH neřeší.

### `POST /api/v1/invoices/{id}/convert-to-invoice` → z proformy daňový doklad

- `{id}` musí být `documentType=Proforma`, jinak **409/422**.
- Server: vytvoří **NOVÝ** `Invoice` (`documentType=Invoice`) se stejnými položkami/snapshoty, `parentInvoiceId = {id}`, číslo z řady faktur. Proforma zůstává v evidenci (volitelně flag „převedeno").
- Response `200`: nová faktura.

## 3. Změny existujících endpointů

- `POST /invoices`, `PUT /invoices/{id}`: přijmou `documentType` ∈ `invoice|proforma` (default `invoice`). **`credit_note` nelze vytvořit přímo** — jen přes `/credit-note`.
- `GET /invoices`: vrací `documentType` + `parentInvoiceId`; podporuje filtr `?documentType=invoice|proforma|credit_note`.
- **Všechny** invoice response objekty: přidat `parentInvoiceId` (a `documentType`, které už existuje).

## 4. Pravidla a edge-cases

- Součty/DPH **jen backend** (frontend je nikdy nepočítá ani nefabrikuje znaménka). Dobropis = **kladné `quantity`, záporné částky/DPH** dodá server. Proforma = kladné jako faktura, ale **nedaňový doklad** (nezapočítává se do DPH přiznání).
- **Agregace tržeb vyloučí proformu:** `/dashboard/summary`, `/dashboard/revenue` a jakýkoli obrat/přehled počítají jen daňové doklady (`Invoice` + `CreditNote`, dobropis záporně), `Proforma` NE — stejně jako to už dělají frontendové report-liby.
- Tenant isolation + `Permissions.Invoices.Read/Write` + modul `invoicing` gate (stejně jako dnešní faktury).
- Proforma má stejný stavový automat jako faktura (`draft→issued→paid/cancelled`). **Dobropis vzniká rovnou `Issued`** (finalizovaný opravný doklad) a needituje se.
- Idempotence `/credit-note`: povolit i více dobropisů k jedné faktuře (částečné); tvrdou validaci „součet dobropisů ≤ parent" lze odložit za V2.

## 5. Chování reportů dle typu dokladu (backend musí dodržet i server-side)

Frontendové report-liby už rozlišují typ; backend má stejnou logiku:

- **Pohledávky** (`cashflow.ts`) a **věrnostní obrat** (`loyalty.ts`): jen `documentType==='invoice'` → vylučují proformu i dobropis.
- **DPH přehled** (`dph.ts`): `invoice` + `credit_note` → dobropis nese **záporné `lineVat`** a daň na výstupu **nettuje**; **proforma NE**.
- **Účetní export** (`accounting-export.ts`, `UctarnaPage.vue`): `invoice` + `credit_note` (Pohoda `DocumentType` `1`/`2`; `canExportIsdoc` vylučuje proformu); **proforma NE**.
- **Dashboard/obrat**: jen daňové doklady (faktura kladně, dobropis záporně), proforma NE.
- Backend jen vrací `documentType` + `parentInvoiceId` a u dobropisu záporné částky/DPH; FE nic nepočítá.

## 6. FE flow (proti čemu frontend staví)

- Editor (`FakturyEditorPage.vue`): výběr typu **Faktura / Zálohová (proforma)**; dobropis se z editoru netvoří.
- Seznam (`FakturyPage.vue`): filtr + badge dle typu; akce **„Vystavit dobropis"** (na Issued/Paid faktuře) a **„Převést na fakturu"** (na proformě).
- Akce jen zavolají endpoint a **zobrazí serverovou odpověď** (u dobropisu zápornou); FE nevytváří položky ani nepočítá DPH.
- Frontend staví **mock-first** proti tomuto kontraktu (localStorage), po nasazení backendu přepne na API beze změny UI.

## 7. Testy (backend DoD)

- Unit: znaménko DPH u dobropisu; oddělené číslování řad; konverze proformy.
- Integrační: proforma → `convert-to-invoice` → faktura (nová řada, `parentInvoiceId`); issued faktura → `credit-note` (záporné součty, `parentInvoiceId`); guardy (`credit-note` na draftu → 409; `convert` na ne-proformě → 409; tenant isolation; modul/permission gate).

## 8. Dokončení fakturace v API režimu (FE spotřebovává — GAP 1 + 2)

Frontend byl doveden do plného API režimu (dřív jen mock-first). Backend seam, proti kterému FE staví:

### 8.1 Editace řádků rozpracovaného konceptu — `/items` (GAP 1)

`PUT /invoices/{id}` mění **jen hlavičku** dokladu (nadále). Řádky konceptu se synchronizují zvlášť (FE `useInvoices.update()` v API režimu, čistý diff `diffInvoiceLines`):

- `POST /invoices/{id}/items` — tělo `InvoiceLineDto` = `{ description, quantity, unitPrice, vatRate, unit? }`, vrací `InvoiceResponse` (plný, se všemi řádky vč. nově vzniklého se server id).
- `PUT /invoices/{id}/items/{itemId}` — tělo `InvoiceLineDto`, vrací `InvoiceResponse`.
- `DELETE /invoices/{id}/items/{itemId}` — smaže řádek (204 nebo `InvoiceResponse`).
- `PUT /invoices/{id}/items/reorder` — tělo `{ itemIds: [guid,…] }` = **přesná** množina server-id v cílovém pořadí.

FE pořadí operací (drží invariant „draft nikdy 0 řádků" a zachovává pořadí editoru): update existujících → **create nové PŘED delete** → delete chybějících → reorder. Vše jen na konceptu (jinak 409). DPH/součty počítá server.

### 8.2 DPH přehled — `GET /invoices/vat-summary` (GAP 2)

- Query `from`, `to` (`YYYY-MM-DD`, obojí volitelné; bez nich = celá historie).
- Response: `{ rows: [{ rate, base, vat }], totalBase, totalVat, count }` — sečteno **po sazbách** za období dle DUZP. **Proforma vyloučena, dobropis nettuje záporně** (shodně s `dph.ts`). Server počítá; FE jen zobrazí.

### 8.3 List-summary součty (GAP 2)

`GET /invoices` (summary) nese navíc `subtotal` a `vatTotal` (vedle `total`) — Účtárna z nich skládá CSV bez dotahování řádků. ISDOC (řádky) si FE dotáhne přes `GET /invoices/{id}`.
