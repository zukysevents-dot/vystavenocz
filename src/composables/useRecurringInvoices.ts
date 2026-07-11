import { http, isApiMode, ApiError } from '@/lib/http'
import { useApi, type PagedResult } from '@/composables/useApi'
import { useCompanyStore } from '@/stores/company'
import { calcLine, calcTotals } from '@/lib/invoice'
import { advanceRunDate, computeNextRunDate, periodKey } from '@/lib/recurring'
import type {
  Invoice,
  InvoiceItem,
  RecurringInvoiceRun,
  RecurringInvoiceStatus,
  RecurringInvoiceTemplate,
  RecurringInvoiceTemplateItem,
  SupplierSnapshot,
} from '@/lib/types'

/**
 * Opakované faktury V2 (modul invoicing). Zdroj pravdy = backend; součty a datum dalšího běhu počítá server.
 * Mock-capable: v mock režimu žije vše v localStorage (`vystaveno:recurring-invoice-templates`) ve stejném
 * tvaru jako API — generování vytvoří mock koncept přes stávající fakturační pipeline, aby seznam i e2e
 * fungovaly bez serveru. Bez Pinia store — každá stránka drží vlastní stav (vzor useJobs).
 */

const STORAGE_KEY = 'vystaveno:recurring-invoice-templates'

export interface RecurringInvoiceItemInput {
  description: string
  quantity: number
  unitPrice: number
  vatRate: RecurringInvoiceTemplateItem['vatRate']
  unit: string | null
}

export interface RecurringInvoiceInput {
  clientId: string
  name: string
  dayOfMonth: number
  dueDays: number
  intervalMonths?: number
  autoIssue: boolean
  note: string | null
  startDate?: string | null
  items: RecurringInvoiceItemInput[]
}

export interface RecurringInvoiceFilter {
  status?: RecurringInvoiceStatus | null
  search?: string
}

// ---- mock localStorage vrstva ----
function readLocal(): RecurringInvoiceTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RecurringInvoiceTemplate[]) : []
  } catch {
    return []
  }
}
function writeLocal(list: RecurringInvoiceTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
function findLocal(id: string): RecurringInvoiceTemplate {
  const t = readLocal().find((x) => x.id === id)
  if (!t) throw new ApiError(404, 'Šablona nenalezena.')
  return withChildren(t)
}
// Defenzivně zaručí pole dětí (starší/neúplný záznam nespadne v UI).
function withChildren(t: RecurringInvoiceTemplate): RecurringInvoiceTemplate {
  return { ...t, items: t.items ?? [], runs: t.runs ?? [] }
}
function mutateLocal(
  id: string,
  fn: (t: RecurringInvoiceTemplate) => void,
): RecurringInvoiceTemplate {
  const list = readLocal()
  const idx = list.findIndex((x) => x.id === id)
  if (idx === -1) throw new ApiError(404, 'Šablona nenalezena.')
  const t = withChildren(list[idx])
  fn(t)
  t.updatedAt = new Date().toISOString()
  list[idx] = t
  writeLocal(list)
  return t
}

function buildQuery(filter: RecurringInvoiceFilter): string {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.status) params.set('status', filter.status)
  if (filter.search?.trim()) params.set('search', filter.search.trim())
  return params.toString()
}
function matchesFilter(t: RecurringInvoiceTemplate, filter: RecurringInvoiceFilter): boolean {
  if (filter.status && t.status !== filter.status) return false
  const q = filter.search?.trim().toLowerCase()
  if (q && !`${t.name} ${t.clientName ?? ''}`.toLowerCase().includes(q)) return false
  return true
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// Mock generování: sestaví koncept faktury ze snapshot položek (stejná matematika jako faktura) a uloží ho
// přes stávající invoices API, aby se objevil i v seznamu faktur a odkaz z detailu šablony fungoval.
function buildMockInvoice(t: RecurringInvoiceTemplate): Invoice {
  const companyStore = useCompanyStore()
  companyStore.init()
  const c = companyStore.company
  const vatPayer = c?.vatMode === 'payer'
  const supplier: SupplierSnapshot = {
    companyName: c?.companyName ?? null,
    fullName: c?.fullName ?? null,
    ico: c?.ico ?? null,
    dic: c?.dic ?? null,
    vatMode: c?.vatMode,
    street: c?.street ?? null,
    city: c?.city ?? null,
    zip: c?.zip ?? null,
    country: c?.country,
    bankAccount: c?.bankAccount ?? null,
    iban: c?.iban ?? null,
    swift: c?.swift ?? null,
    email: c?.email,
    logoUrl: c?.logoUrl ?? null,
    invoiceColor: c?.invoiceColor ?? null,
  }
  const items: InvoiceItem[] = (t.items ?? []).map((src) => {
    const line = calcLine(
      { quantity: src.quantity, unitPrice: src.unitPrice, vatRate: src.vatRate },
      vatPayer,
    )
    return {
      id: crypto.randomUUID(),
      description: src.description,
      quantity: src.quantity,
      unit: src.unit ?? 'ks',
      unitPrice: src.unitPrice,
      vatRate: src.vatRate,
      ...line,
    }
  })
  const totals = calcTotals(items, vatPayer)
  const now = new Date()
  const iso = now.toISOString()
  return {
    id: crypto.randomUUID(),
    documentType: 'invoice',
    status: t.autoIssue ? 'issued' : 'draft',
    invoiceNumber: null,
    clientId: t.clientId,
    clientSnapshot: { name: t.clientName || '' },
    supplierSnapshot: supplier,
    items,
    currency: 'CZK',
    issueDate: iso.slice(0, 10),
    dueDate: new Date(now.getTime() + t.dueDays * 86_400_000).toISOString().slice(0, 10),
    taxableDate: iso.slice(0, 10),
    paidAt: null,
    variableSymbol: null,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank',
    subtotal: totals.subtotal,
    vatTotal: totals.vatTotal,
    total: totals.total,
    notes: t.note,
    createdAt: iso,
    updatedAt: iso,
  }
}

export function useRecurringInvoices() {
  async function list(filter: RecurringInvoiceFilter = {}): Promise<RecurringInvoiceTemplate[]> {
    if (isApiMode()) {
      const res = await http.get<PagedResult<RecurringInvoiceTemplate>>(
        `/recurring-invoice-templates?${buildQuery(filter)}`,
      )
      return res.items
    }
    return readLocal()
      .filter((t) => matchesFilter(t, filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async function get(id: string): Promise<RecurringInvoiceTemplate> {
    if (isApiMode()) {
      const t = await http.get<RecurringInvoiceTemplate>(`/recurring-invoice-templates/${id}`)
      // Backend serializuje InvoiceStatus PascalCase ("Draft"); sjednotíme na FE lowercase union (parita s mockem).
      return {
        ...t,
        runs: t.runs?.map((r) => ({
          ...r,
          invoiceStatus: (r.invoiceStatus?.toLowerCase() ??
            null) as RecurringInvoiceRun['invoiceStatus'],
        })),
      }
    }
    return findLocal(id)
  }

  async function create(input: RecurringInvoiceInput): Promise<RecurringInvoiceTemplate> {
    if (isApiMode())
      return http.post<RecurringInvoiceTemplate>('/recurring-invoice-templates', input)
    const list = readLocal()
    const now = new Date().toISOString()
    const template: RecurringInvoiceTemplate = {
      id: crypto.randomUUID(),
      clientId: input.clientId,
      clientName: null,
      name: input.name,
      intervalMonths: input.intervalMonths ?? 1,
      dayOfMonth: input.dayOfMonth,
      dueDays: input.dueDays,
      autoIssue: input.autoIssue,
      status: 'active',
      note: input.note,
      nextRunDate: computeNextRunDate(input.startDate ?? todayISO(), input.dayOfMonth),
      lastRunAt: null,
      createdAt: now,
      updatedAt: now,
      items: input.items.map((it, sortOrder) => ({ id: crypto.randomUUID(), ...it, sortOrder })),
      runs: [],
    }
    writeLocal([template, ...list])
    return template
  }

  async function update(
    id: string,
    input: RecurringInvoiceInput,
  ): Promise<RecurringInvoiceTemplate> {
    if (isApiMode())
      return http.put<RecurringInvoiceTemplate>(`/recurring-invoice-templates/${id}`, input)
    return mutateLocal(id, (t) => {
      const dayChanged =
        t.dayOfMonth !== input.dayOfMonth || t.intervalMonths !== (input.intervalMonths ?? 1)
      t.clientId = input.clientId
      t.name = input.name
      t.intervalMonths = input.intervalMonths ?? 1
      t.dayOfMonth = input.dayOfMonth
      t.dueDays = input.dueDays
      t.autoIssue = input.autoIssue
      t.note = input.note
      t.items = input.items.map((it, sortOrder) => ({ id: crypto.randomUUID(), ...it, sortOrder }))
      if (dayChanged) t.nextRunDate = computeNextRunDate(todayISO(), input.dayOfMonth)
    })
  }

  async function remove(id: string): Promise<void> {
    if (isApiMode()) {
      await http.del(`/recurring-invoice-templates/${id}`)
      return
    }
    writeLocal(readLocal().filter((t) => t.id !== id))
  }

  async function pause(id: string): Promise<RecurringInvoiceTemplate> {
    if (isApiMode())
      return http.post<RecurringInvoiceTemplate>(`/recurring-invoice-templates/${id}/pause`, {})
    return mutateLocal(id, (t) => {
      t.status = 'paused'
    })
  }

  async function resume(id: string): Promise<RecurringInvoiceTemplate> {
    if (isApiMode())
      return http.post<RecurringInvoiceTemplate>(`/recurring-invoice-templates/${id}/resume`, {})
    return mutateLocal(id, (t) => {
      t.status = 'active'
      if (t.nextRunDate < todayISO()) t.nextRunDate = computeNextRunDate(todayISO(), t.dayOfMonth)
    })
  }

  // Ruční „Vygenerovat teď" → vytvoří fakturu pro aktuální období a vrátí ji (editor pak lze otevřít přes `?id=`).
  // Idempotence per období (parita s backendem): opakovaný klik za totéž období nevytvoří druhý doklad.
  async function generateNow(id: string): Promise<Invoice> {
    if (isApiMode())
      return http.post<Invoice>(`/recurring-invoice-templates/${id}/generate-now`, {})
    const invoicesApi = useApi<Invoice>('invoices')
    const t = findLocal(id)
    const period = periodKey(todayISO()) // aktuální kalendářní měsíc (ne posouvající se nextRunDate)
    const existingRun = (t.runs ?? []).find((r) => r.periodKey === period)
    if (existingRun) {
      const existingInvoice = await invoicesApi.get(existingRun.invoiceId)
      if (existingInvoice) return existingInvoice // už vygenerováno za toto období → vrať existující
    }
    const invoice = buildMockInvoice(t)
    await invoicesApi.create(invoice)
    const run: RecurringInvoiceRun = {
      id: crypto.randomUUID(),
      periodKey: period,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceStatus: invoice.status,
      autoIssued: t.autoIssue,
      generatedAt: new Date().toISOString(),
    }
    mutateLocal(id, (tpl) => {
      tpl.runs = [run, ...(tpl.runs ?? [])]
      // Plán posuň jen když ukazoval na tuto nebo dřívější periodu — nebilluj budoucí měsíce dopředu.
      if (periodKey(tpl.nextRunDate) <= period)
        tpl.nextRunDate = advanceRunDate(tpl.nextRunDate, tpl.dayOfMonth, tpl.intervalMonths)
      tpl.lastRunAt = new Date().toISOString()
    })
    return invoice
  }

  return { list, get, create, update, remove, pause, resume, generateNow }
}
