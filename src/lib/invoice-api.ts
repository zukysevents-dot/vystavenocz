/**
 * Mapovací adapter mezi frontend `Invoice` typem a backend invoice DTO (vystaveno-api).
 *
 * Frontend fakturace byla původně psaná proti mock/localStorage tvaru; backend vrací jiný
 * (camelCase JSON, enumy PascalCase, adresy vnořené, součty jako serverová pravda). Tenhle
 * modul překlápí obě strany. Aplikuje se VÝHRADNĚ v API režimu (viz `useInvoices`); mock
 * (localStorage / e2e) běží dál na FE tvaru beze změny.
 *
 * Zdroj kontraktu: `vystaveno-api/src/Vystaveno.Application/Invoices/InvoiceDtos.cs`.
 *
 * Pravidlo: peníze/DPH NIKDY nepočítá frontend — jen přemapuje serverem spočítaná čísla
 * (`subtotal`/`vatTotal`/`total`, `lineBase`/`lineVat`/`lineTotal`). U dobropisu jsou záporná —
 * znaménka se zachovávají.
 */
import type {
  DocumentType,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  SupplierSnapshot,
  VatMode,
  VatRate,
} from '@/lib/types'
import type { InvoiceInput } from '@/composables/useInvoices'

// --- Backend DTO tvary (defenzivně: vše volitelné, `InvoiceResponse` i `InvoiceSummaryResponse`
//     sdílí jeden interface — summary z listu je jen podmnožina bez lines/snapshotů/součtů). ---

export interface InvoiceApiAddress {
  street?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
}

export interface InvoiceApiBankAccount {
  accountNumber?: string | null
  iban?: string | null
  bic?: string | null
}

export interface InvoiceApiLine {
  id?: string
  description?: string | null
  unit?: string | null
  quantity?: number
  unitPrice?: number
  vatRate?: number
  discountType?: string | null
  discountValue?: number | null
  sortOrder?: number
  lineBase?: number
  lineVat?: number
  lineTotal?: number
}

export interface InvoiceApiVatSummaryRow {
  rate: number
  base: number
  vat: number
}

/**
 * Sjednocený tvar `InvoiceResponse` (detail) i `InvoiceSummaryResponse` (list). Summary nese
 * jen id/number/status/documentType/parentInvoiceId/clientId/clientName/issueDate/dueDate/total/
 * outstandingAmount/currency — zbytek je u něj `undefined`, proto je vše volitelné.
 */
export interface InvoiceApiResponse {
  id: string
  number?: string | null
  status?: string | null
  documentType?: string | null
  parentInvoiceId?: string | null
  parentInvoiceNumber?: string | null
  clientId?: string | null
  clientName?: string | null
  clientIco?: string | null
  clientDic?: string | null
  clientEmail?: string | null
  clientAddress?: InvoiceApiAddress | null
  supplierName?: string | null
  supplierIco?: string | null
  supplierDic?: string | null
  supplierEmail?: string | null
  supplierPhone?: string | null
  supplierAddress?: InvoiceApiAddress | null
  supplierBankAccount?: InvoiceApiBankAccount | null
  currency?: string | null
  isVatPayer?: boolean | null
  issueDate?: string | null
  dueDate?: string | null
  taxableSupplyDate?: string | null
  paidDate?: string | null
  sentAt?: string | null
  sentTo?: string | null
  cancelledAt?: string | null
  cancelReason?: string | null
  subtotal?: number | null
  vatTotal?: number | null
  total?: number | null
  paidAmount?: number | null
  outstandingAmount?: number | null
  note?: string | null
  lines?: InvoiceApiLine[] | null
  vatSummary?: InvoiceApiVatSummaryRow[] | null
  payments?: unknown[] | null
  pdfSha256?: string | null
  pdfGeneratedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

// --- Odchozí požadavky (FE → backend) ---

export interface CreateInvoiceLineRequest {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  unit?: string | null
}

export interface CreateInvoiceRequest {
  clientId: string | null
  dueDate?: string | null
  taxableSupplyDate?: string | null
  note?: string | null
  documentType?: 'invoice' | 'proforma'
  lines: CreateInvoiceLineRequest[]
}

export interface UpdateInvoiceRequest {
  clientId: string | null
  dueDate?: string | null
  taxableSupplyDate?: string | null
  note?: string | null
  documentType?: 'invoice' | 'proforma'
}

// --- Enum mapy (backend PascalCase → FE lowercase; idempotentní k už-lowercase hodnotám) ---

const STATUS_MAP: Record<string, InvoiceStatus> = {
  Draft: 'draft',
  Issued: 'issued',
  Paid: 'paid',
  Cancelled: 'cancelled',
  Sent: 'issued', // odeslaná faktura je pro FE „vystavená"
  Overdue: 'overdue',
  Archived: 'cancelled',
}

const FE_STATUSES: readonly InvoiceStatus[] = ['draft', 'issued', 'paid', 'overdue', 'cancelled']

export function mapInvoiceStatus(raw?: string | null): InvoiceStatus {
  if (!raw) return 'draft'
  const s = String(raw)
  if (STATUS_MAP[s]) return STATUS_MAP[s]
  const lower = s.toLowerCase()
  if ((FE_STATUSES as readonly string[]).includes(lower)) return lower as InvoiceStatus
  // idempotence i pro už-lowercase serverové aliasy
  if (lower === 'sent') return 'issued'
  if (lower === 'archived') return 'cancelled'
  return 'draft'
}

const DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  Invoice: 'invoice',
  Proforma: 'proforma',
  CreditNote: 'credit_note',
}

export function mapDocumentType(raw?: string | null): DocumentType {
  if (!raw) return 'invoice'
  const s = String(raw)
  if (DOCUMENT_TYPE_MAP[s]) return DOCUMENT_TYPE_MAP[s]
  const lower = s.toLowerCase()
  if (lower === 'proforma') return 'proforma'
  if (lower === 'credit_note' || lower === 'creditnote') return 'credit_note'
  return 'invoice'
}

function mapVatMode(isVatPayer?: boolean | null): VatMode | undefined {
  if (typeof isVatPayer !== 'boolean') return undefined
  return isVatPayer ? 'payer' : 'non_payer'
}

function mapLine(line: InvoiceApiLine, index: number, invoiceId: string): InvoiceItem {
  return {
    id: line.id ?? `${invoiceId}-line-${index}`,
    description: line.description ?? '',
    quantity: line.quantity ?? 0,
    unit: line.unit ?? '',
    unitPrice: line.unitPrice ?? 0,
    vatRate: (line.vatRate ?? 0) as VatRate,
    // Serverem spočítané částky (u dobropisu záporné) — jen přemapovat, znaménka zachovat.
    lineSubtotal: line.lineBase ?? 0,
    lineVat: line.lineVat ?? 0,
    lineTotal: line.lineTotal ?? 0,
  }
}

/**
 * Backend DTO (detail `InvoiceResponse` NEBO list `InvoiceSummaryResponse`) → frontend `Invoice`.
 * Defenzivní k null/undefined: summary z listu nemá lines/snapshoty/součty → `items: []`,
 * `clientSnapshot` jen se jménem, `subtotal`/`vatTotal` = 0 (neznámé), `total` z listu je pravda.
 */
export function invoiceFromApi(dto: InvoiceApiResponse): Invoice {
  const supplierSnapshot: SupplierSnapshot = {
    companyName: dto.supplierName ?? null,
    ico: dto.supplierIco ?? null,
    dic: dto.supplierDic ?? null,
    vatMode: mapVatMode(dto.isVatPayer),
    street: dto.supplierAddress?.street ?? null,
    city: dto.supplierAddress?.city ?? null,
    zip: dto.supplierAddress?.postalCode ?? null,
    country: dto.supplierAddress?.country ?? undefined,
    bankAccount: dto.supplierBankAccount?.accountNumber ?? null,
    iban: dto.supplierBankAccount?.iban ?? null,
    swift: dto.supplierBankAccount?.bic ?? null,
    email: dto.supplierEmail ?? null,
  }

  return {
    id: dto.id,
    documentType: mapDocumentType(dto.documentType),
    parentInvoiceId: dto.parentInvoiceId ?? null,
    status: mapInvoiceStatus(dto.status),
    invoiceNumber: dto.number ?? null,
    clientId: dto.clientId ?? null,
    clientSnapshot: {
      name: dto.clientName ?? '',
      ico: dto.clientIco ?? null,
      dic: dto.clientDic ?? null,
      email: dto.clientEmail ?? null,
      street: dto.clientAddress?.street ?? null,
      city: dto.clientAddress?.city ?? null,
      zip: dto.clientAddress?.postalCode ?? null,
      country: dto.clientAddress?.country ?? undefined,
    },
    supplierSnapshot,
    items: (dto.lines ?? []).map((line, index) => mapLine(line, index, dto.id)),
    currency: dto.currency ?? 'CZK',
    issueDate: dto.issueDate ?? '',
    dueDate: dto.dueDate ?? '',
    taxableDate: dto.taxableSupplyDate ?? '',
    paidAt: dto.paidDate ?? null,
    // Backend tyto symboly (zatím) nevrací — frontend je needituje, doplníme null.
    variableSymbol: null,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank_transfer',
    // Součty jsou serverová pravda; list-summary teď nese subtotal/vatTotal (Účtárna CSV je čte),
    // starší/neúplná odpověď je nemusí mít → fallback 0.
    subtotal: dto.subtotal ?? 0,
    vatTotal: dto.vatTotal ?? 0,
    total: dto.total ?? 0,
    notes: dto.note ?? null,
    createdAt: dto.createdAt ?? '',
    updatedAt: dto.updatedAt ?? '',
  }
}

/** FE typ dokladu → backend create/update enum (backend přijímá jen invoice|proforma). */
function outgoingDocumentType(documentType: DocumentType): 'invoice' | 'proforma' {
  return documentType === 'proforma' ? 'proforma' : 'invoice'
}

/**
 * Frontend vstup → `POST /invoices` (koncept). Posílá jen to, co backend přijímá: clientId
 * (backend ho vyžaduje), splatnost, DUZP, poznámku, typ dokladu a řádky (NET unitPrice + sazba).
 * DPH a součty dopočítá server; FE je neposílá.
 */
export function invoiceToCreateRequest(input: InvoiceInput): CreateInvoiceRequest {
  return {
    clientId: input.clientId,
    dueDate: input.dueDate || null,
    taxableSupplyDate: input.taxableDate || null,
    note: input.notes,
    documentType: outgoingDocumentType(input.documentType),
    lines: input.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      unit: item.unit || null,
    })),
  }
}

/**
 * Frontend vstup → `PUT /invoices/{id}`. Backend PUT mění JEN hlavičku dokladu; řádky konceptu se
 * synchronizují zvlášť přes `/items` endpointy (viz `diffInvoiceLines` + `useInvoices.update`).
 */
export function invoiceToUpdateRequest(input: InvoiceInput): UpdateInvoiceRequest {
  return {
    clientId: input.clientId,
    dueDate: input.dueDate || null,
    taxableSupplyDate: input.taxableDate || null,
    note: input.notes,
    documentType: outgoingDocumentType(input.documentType),
  }
}

// --- Synchronizace řádků rozpracovaného konceptu přes /items (GAP 1, jen API režim) ---

/** Podmnožina `InvoiceItem` potřebná k sestavení `/items` payloadu a diffu (usnadní unit test). */
export type InvoiceLineInput = Pick<
  InvoiceItem,
  'id' | 'description' | 'quantity' | 'unit' | 'unitPrice' | 'vatRate'
>

/** Tělo `POST /invoices/{id}/items` i `PUT /invoices/{id}/items/{itemId}` (backend `InvoiceLineDto`). */
export type InvoiceLinePayload = CreateInvoiceLineRequest

/** Nový řádek (klientské uuid → server id doplní orchestrátor z POST odpovědi). */
export interface InvoiceLineCreate {
  clientId: string
  line: InvoiceLinePayload
}

/** Úprava existujícího serverového řádku (id je server id). */
export interface InvoiceLineUpdate {
  id: string
  line: InvoiceLinePayload
}

/**
 * Plán synchronizace řádků: co přidat (POST), upravit (PUT), smazat (DELETE) a v jakém pořadí
 * (`order` = id řádků v pořadí editoru — server id existujících NEBO klientské uuid nových).
 */
export interface InvoiceLineSyncPlan {
  creates: InvoiceLineCreate[]
  updates: InvoiceLineUpdate[]
  deletes: string[]
  order: string[]
}

function itemToLinePayload(item: InvoiceLineInput): InvoiceLinePayload {
  return {
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    vatRate: item.vatRate,
    unit: item.unit || null,
  }
}

/**
 * Čistá diff logika (GAP 1) — bez side-effektů, přímo unit-testovatelná. Vstup:
 *  - `serverItemIds`: id řádků, které backend aktuálně eviduje na konceptu,
 *  - `editorItems`: řádky z editoru; `id` je buď server id (existující řádek), nebo klientské uuid
 *    (nový řádek přidaný v editoru).
 * Výstup je seznam operací + cílové pořadí. Orchestrátor (`useInvoices.update`) je provede v
 * bezpečném pořadí (nové PŘED mazáním, ať draft nikdy nespadne na 0 řádků) a doplní mapování
 * klientské uuid → přidělené server id, aby finální reorder nesl správná id.
 */
export function diffInvoiceLines(
  serverItemIds: string[],
  editorItems: InvoiceLineInput[],
): InvoiceLineSyncPlan {
  const serverSet = new Set(serverItemIds)
  const editorIdSet = new Set(editorItems.map((it) => it.id))
  const creates: InvoiceLineCreate[] = []
  const updates: InvoiceLineUpdate[] = []
  for (const it of editorItems) {
    const line = itemToLinePayload(it)
    if (serverSet.has(it.id)) updates.push({ id: it.id, line })
    else creates.push({ clientId: it.id, line })
  }
  // Serverové řádky, které v editoru už nejsou → smazat.
  const deletes = serverItemIds.filter((sid) => !editorIdSet.has(sid))
  const order = editorItems.map((it) => it.id)
  return { creates, updates, deletes, order }
}
