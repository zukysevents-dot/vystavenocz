# Backend zadání: Import historických faktur (F9)

**Frontend hotový** — `src/import/invoices/` (wizard nad Fakturoid XML) + `useInvoices.importInvoice()`
volají `POST /invoices/import`. Endpoint zatím **neexistuje** → v produkci import faktur nejede.

## Endpoint

`POST /invoices/import`

Přijme **historickou fakturu „jak je"** a uloží ji BEZ přepočtu/přečíslování:

- **zachovat** `number`, `status` (`Issued`/`Paid`), `paidDate`, `subtotal`/`vatTotal`/`total`
  (NEpřidělovat nové číslo, NEpřepočítávat),
- **idempotence dle čísla:** existující číslo → vrátit existující fakturu (ne `409`),
- vrátit kompletní `Invoice` s `id`, `createdAt`, `updatedAt`.

## Payload (přesně z FE — `toImportRequest()` v `src/lib/invoice.ts`)

```jsonc
{
  "number": "2024-0042",
  "status": "Issued",           // nebo "Paid"
  "clientId": "…|null",
  "issueDate": "2024-03-01",
  "dueDate": "2024-03-15|null",
  "taxableSupplyDate": "2024-03-01|null",
  "paidDate": "2024-03-10|null",
  "currency": "CZK",
  "isVatPayer": true,
  "note": "…|null",
  "client":   { "name", "ico|null", "dic|null", "email|null", "address": { "street","city","postalCode","country" } | null },
  "supplier": { "name","ico","dic","email|null","phone|null","address": {…}|null, "bankAccount": { "accountNumber","iban","bic" } | null },
  "subtotal": 1000, "vatTotal": 210, "total": 1210,
  "items": [ { "description","unit","quantity","unitPrice","vatRate","lineBase","lineVat","lineTotal" } ]
}
```

## Pozn.

- DPH sazby řádků jsou už ve payloadu — server je má převzít, ne dopočítávat.
- Duplicity FE řeší i sám (dedup ve wizardu), ale idempotence na serveru je pojistka.
