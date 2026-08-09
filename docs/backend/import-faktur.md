# Import historických faktur (F9)

**Stav: HOTOVO na obou stranách.** Frontend `src/import/invoices/` volá `POST /invoices/import`
přes `useInvoices.importInvoice()`; backend endpoint je implementovaný v `vystaveno-api`
(`InvoicesController.Import` → `InvoiceService.ImportAsync`) včetně validátoru a integračních testů.

> Dřívější verze tohohle dokumentu tvrdila, že endpoint neexistuje. **Byla zastaralá** —
> ověřeno 2026-08-09 přímo v backendovém repu.

## Endpoint

`POST /api/v1/invoices/import` — oprávnění `Invoices.Write` (employee dostane 403).

Přijme historickou fakturu „jak je" a uloží ji BEZ přepočtu a BEZ přečíslování:

- **zachová** `number`, `status` (`Issued`/`Paid`), `paidDate`, `subtotal`/`vatTotal`/`total`
  i řádkové částky — server nic nedopočítává,
- **idempotence dle (companyId, number):** existující číslo → `200 OK` s existující fakturou
  (ne `409`, ne duplicita). Souběžný import téhož čísla je ošetřený i na úrovni unique indexu,
- `Paid` faktura navíc zaeviduje platbu na celou částku, aby outstanding a dashboard seděly,
- zapíše audit `InvoiceImported`.

### Odpovědi

| Kód   | Kdy                                                   |
| ----- | ----------------------------------------------------- |
| `201` | Faktura naimportována.                                |
| `200` | Číslo už existuje → vrácena beze změny (idempotence). |
| `403` | Nedostatečná role (employee).                         |
| `404` | Zadaný `clientId` neexistuje nebo patří jiné firmě.   |
| `422` | Neplatná data (viz povinná pole níž).                 |

## Payload

Frontend ho staví v `toImportRequest()` (`src/lib/invoice.ts`) a tvar **sedí 1:1** na backendový
`ImportInvoiceRequest`:

```jsonc
{
  "number": "2024-0042",
  "status": "Issued",           // nebo "Paid"
  "clientId": "…|null",         // null = doklad jen se snapshotem (import nezakládá klienty)
  "issueDate": "2024-03-01",
  "dueDate": "2024-03-15|null",
  "taxableSupplyDate": "2024-03-01|null",
  "paidDate": "2024-03-10|null", // povinné při status = Paid
  "currency": "CZK",
  "isVatPayer": true,
  "note": "…|null",
  "client":   { "name", "ico|null", "dic|null", "email|null", "address": { "street","city","postalCode","country" } | null },
  "supplier": { "name","ico","dic","email|null","phone|null","address": {…}|null, "bankAccount": { "accountNumber","iban","bic" } | null },
  "subtotal": 1000, "vatTotal": 210, "total": 1210,
  "items": [ { "description","unit","quantity","unitPrice","vatRate","lineBase","lineVat","lineTotal" } ]
}
```

## Povinná pole (jinak 422)

Tohle je důvod, proč frontend kontroluje doklad **předem** (`import-guard.ts`) — z PDF se některé
pole přečíst nemusí a uživatel by jinak dostal technickou chybu až po odeslání celé dávky:

- `number` neprázdné, max 64 znaků,
- `status` jen `Issued` nebo `Paid`; u `Paid` je povinné `paidDate`,
- `issueDate` neprázdné,
- `client.name` neprázdné,
- `currency` právě 3 znaky,
- aspoň jedna položka, nejvýš 500,
- částky nejvýš na 2 desetinná místa (množství na 3) — jinak by uložená hodnota neodpovídala
  zaslané kvůli `numeric(18,2)`.

## Pozn.

- DPH sazby řádků jsou už v payloadu — server je přebírá, nedopočítává. VAT rozpad je jen
  seskupení zaslaných řádků po sazbě.
- Duplicity řeší i frontend (dedup v náhledu), idempotence na serveru je pojistka.
- Backend testy: `tests/Vystaveno.IntegrationTests/InvoiceImportHttpTests.cs` a
  `tests/Vystaveno.UnitTests/ImportInvoiceRequestValidatorTests.cs`.
