import { http, isApiMode, ApiError } from '@/lib/http'
import { useApi, type PagedResult } from '@/composables/useApi'
import { useCompanyStore } from '@/stores/company'
import { calcLine, calcTotals } from '@/lib/invoice'
import type {
  Invoice,
  InvoiceItem,
  Job,
  JobChecklistItem,
  JobEvent,
  JobHandover,
  JobHandoverItem,
  JobMaterialItem,
  JobStatus,
  JobWorkItem,
  SupplierSnapshot,
} from '@/lib/types'

/**
 * Zakázky V2 (modul jobs). Zdroj pravdy = backend; po každé mutaci se znovu načte detail zakázky
 * (work/material/checklist/events/handover/totals). Mock-capable: v mock režimu žije vše v localStorage
 * (`vystaveno:jobs`) ve stejném tvaru jako API — materiál (odečet skladu) i faktura mají v mocku stub,
 * aby plánovač i e2e fungovaly bez serveru. Bez Pinia store — každá stránka drží vlastní stav.
 */

const STORAGE_KEY = 'vystaveno:jobs'

export interface JobInput {
  name: string
  clientId: string | null
  clientName: string | null
  siteAddress: string | null
  status?: JobStatus
  priority: Job['priority']
  scheduledAt: string | null
  assignedEmployeeId: string | null
  locationId: string | null
  sourceQuoteId?: string | null
  note: string | null
}

export interface JobFilter {
  status?: JobStatus | null
  assignedEmployeeId?: string | null
  locationId?: string | null
  search?: string
}

export interface JobWorkItemInput {
  serviceItemId: string | null
  description: string
  quantity: number
  unitPrice: number
  vatRate: JobWorkItem['vatRate']
}

export interface JobMaterialItemInput {
  productId: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: JobMaterialItem['vatRate']
}

// ---- mock localStorage vrstva ----
function readLocal(): Job[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Job[]) : []
  } catch {
    return []
  }
}
function writeLocal(list: Job[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
function findLocal(id: string): Job {
  const job = readLocal().find((j) => j.id === id)
  if (!job) throw new ApiError(404, 'Zakázka nenalezena.')
  return withChildren(job)
}
// Defenzivně zaručí, že detail nese pole dětí (starší/neúplný záznam nespadne v UI).
function withChildren(job: Job): Job {
  return {
    ...job,
    workItems: job.workItems ?? [],
    materialItems: job.materialItems ?? [],
    checklist: job.checklist ?? [],
    events: job.events ?? [],
    handover: job.handover ?? null,
  }
}
function event(kind: string, detail: string | null): JobEvent {
  return {
    id: crypto.randomUUID(),
    kind,
    detail,
    userId: null,
    createdAt: new Date().toISOString(),
  }
}
// Přečte, upraví a uloží jednu zakázku; vrátí čerstvý detail (vzor „re-fetch po mutaci").
function mutateLocal(id: string, fn: (job: Job) => void): Job {
  const list = readLocal()
  const idx = list.findIndex((j) => j.id === id)
  if (idx === -1) throw new ApiError(404, 'Zakázka nenalezena.')
  const job = withChildren(list[idx])
  fn(job)
  job.updatedAt = new Date().toISOString()
  list[idx] = job
  writeLocal(list)
  return job
}

function buildQuery(filter: JobFilter): string {
  const params = new URLSearchParams({ pageSize: '100' })
  if (filter.status) params.set('status', filter.status)
  if (filter.assignedEmployeeId) params.set('assignedEmployeeId', filter.assignedEmployeeId)
  if (filter.locationId) params.set('locationId', filter.locationId)
  if (filter.search?.trim()) params.set('search', filter.search.trim())
  return params.toString()
}
function matchesFilter(job: Job, filter: JobFilter): boolean {
  if (filter.status && job.status !== filter.status) return false
  if (filter.assignedEmployeeId && job.assignedEmployeeId !== filter.assignedEmployeeId)
    return false
  if (filter.locationId && job.locationId !== filter.locationId) return false
  const q = filter.search?.trim().toLowerCase()
  if (q) {
    const hay =
      `${job.number} ${job.name} ${job.clientName ?? ''} ${job.siteAddress ?? ''}`.toLowerCase()
    if (!hay.includes(q)) return false
  }
  return true
}

export function useJobs() {
  async function list(filter: JobFilter = {}): Promise<Job[]> {
    if (isApiMode()) {
      const res = await http.get<PagedResult<Job>>(`/jobs?${buildQuery(filter)}`)
      return res.items
    }
    return readLocal()
      .filter((j) => matchesFilter(j, filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  // Detail vč. dětí a součtů (v API režimu je zdroj pravdy serverem vrácený totals).
  async function get(id: string): Promise<Job> {
    if (isApiMode()) return http.get<Job>(`/jobs/${id}`)
    return findLocal(id)
  }

  async function create(input: JobInput): Promise<Job> {
    if (isApiMode()) return http.post<Job>('/jobs', input)
    const list = readLocal()
    const now = new Date().toISOString()
    const year = new Date().getFullYear()
    const job: Job = {
      id: crypto.randomUUID(),
      number: `ZAK-${year}-${String(list.length + 1).padStart(4, '0')}`,
      name: input.name,
      clientId: input.clientId,
      clientName: input.clientName,
      siteAddress: input.siteAddress,
      status: input.status ?? 'scheduled',
      priority: input.priority,
      scheduledAt: input.scheduledAt,
      assignedEmployeeId: input.assignedEmployeeId,
      locationId: input.locationId,
      sourceQuoteId: input.sourceQuoteId ?? null,
      invoiceId: null,
      note: input.note,
      createdAt: now,
      updatedAt: now,
      workItems: [],
      materialItems: [],
      checklist: [],
      events: [event('created', 'Zakázka vytvořena')],
      handover: null,
    }
    writeLocal([job, ...list])
    return job
  }

  async function update(id: string, input: JobInput): Promise<Job> {
    if (isApiMode()) return http.put<Job>(`/jobs/${id}`, input)
    return mutateLocal(id, (job) => {
      job.name = input.name
      job.clientId = input.clientId
      job.clientName = input.clientName
      job.siteAddress = input.siteAddress
      job.priority = input.priority
      job.scheduledAt = input.scheduledAt
      job.assignedEmployeeId = input.assignedEmployeeId
      job.locationId = input.locationId
      job.note = input.note
    })
  }

  async function remove(id: string): Promise<void> {
    if (isApiMode()) {
      await http.del(`/jobs/${id}`)
      return
    }
    writeLocal(readLocal().filter((j) => j.id !== id))
  }

  async function setStatus(id: string, status: JobStatus): Promise<Job> {
    if (isApiMode()) {
      await http.post(`/jobs/${id}/status`, { status })
      return get(id)
    }
    return mutateLocal(id, (job) => {
      job.status = status
      job.events = [...(job.events ?? []), event('status', status)]
    })
  }

  // --- pracovní list: práce ---
  async function addWorkItem(id: string, input: JobWorkItemInput): Promise<Job> {
    if (isApiMode()) {
      await http.post(`/jobs/${id}/work-items`, input)
      return get(id)
    }
    return mutateLocal(id, (job) => {
      const items = job.workItems ?? []
      const item: JobWorkItem = { id: crypto.randomUUID(), ...input, sortOrder: items.length }
      job.workItems = [...items, item]
      job.events = [...(job.events ?? []), event('work_added', input.description)]
    })
  }
  async function removeWorkItem(id: string, itemId: string): Promise<Job> {
    if (isApiMode()) {
      await http.del(`/jobs/${id}/work-items/${itemId}`)
      return get(id)
    }
    return mutateLocal(id, (job) => {
      job.workItems = (job.workItems ?? []).filter((w) => w.id !== itemId)
    })
  }

  // --- pracovní list: materiál (v API režimu odečítá/vrací sklad) ---
  async function addMaterial(id: string, input: JobMaterialItemInput): Promise<Job> {
    if (isApiMode()) {
      await http.post(`/jobs/${id}/material-items`, input)
      return get(id)
    }
    return mutateLocal(id, (job) => {
      const items = job.materialItems ?? []
      const item: JobMaterialItem = { id: crypto.randomUUID(), ...input, sortOrder: items.length }
      job.materialItems = [...items, item]
      job.events = [...(job.events ?? []), event('material_added', input.description)]
    })
  }
  async function removeMaterial(id: string, itemId: string): Promise<Job> {
    if (isApiMode()) {
      await http.del(`/jobs/${id}/material-items/${itemId}`)
      return get(id)
    }
    return mutateLocal(id, (job) => {
      job.materialItems = (job.materialItems ?? []).filter((m) => m.id !== itemId)
    })
  }

  // --- checklist ---
  async function addChecklistItem(id: string, label: string): Promise<Job> {
    if (isApiMode()) {
      await http.post(`/jobs/${id}/checklist`, { label })
      return get(id)
    }
    return mutateLocal(id, (job) => {
      const items = job.checklist ?? []
      const item: JobChecklistItem = {
        id: crypto.randomUUID(),
        label,
        isDone: false,
        sortOrder: items.length,
      }
      job.checklist = [...items, item]
    })
  }
  async function toggleChecklistItem(id: string, itemId: string, isDone: boolean): Promise<Job> {
    if (isApiMode()) {
      await http.put(`/jobs/${id}/checklist/${itemId}`, { isDone })
      return get(id)
    }
    return mutateLocal(id, (job) => {
      job.checklist = (job.checklist ?? []).map((c) => (c.id === itemId ? { ...c, isDone } : c))
    })
  }
  async function removeChecklistItem(id: string, itemId: string): Promise<Job> {
    if (isApiMode()) {
      await http.del(`/jobs/${id}/checklist/${itemId}`)
      return get(id)
    }
    return mutateLocal(id, (job) => {
      job.checklist = (job.checklist ?? []).filter((c) => c.id !== itemId)
    })
  }

  // --- předání (handover) + podpis (seam) ---
  async function createHandover(id: string): Promise<Job> {
    if (isApiMode()) {
      await http.post(`/jobs/${id}/handover`, {})
      return get(id)
    }
    return mutateLocal(id, (job) => {
      const items: JobHandoverItem[] = [
        ...(job.workItems ?? []).map((w) => ({
          description: w.description,
          quantity: w.quantity,
          unitPrice: w.unitPrice,
          vatRate: w.vatRate,
          kind: 'work' as const,
        })),
        ...(job.materialItems ?? []).map((m) => ({
          description: m.description,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
          vatRate: m.vatRate,
          kind: 'material' as const,
        })),
      ]
      const handover: JobHandover = {
        id: crypto.randomUUID(),
        jobId: job.id,
        state: 'draft',
        note: null,
        signingEnvelopeId: null,
        items,
        createdAt: new Date().toISOString(),
      }
      job.handover = handover
      job.events = [...(job.events ?? []), event('handover_created', 'Předávací protokol vytvořen')]
    })
  }
  async function signHandover(id: string, providerConnectionId?: string | null): Promise<Job> {
    if (isApiMode()) {
      await http.post(
        `/jobs/${id}/handover/sign`,
        providerConnectionId ? { providerConnectionId } : {},
      )
      return get(id)
    }
    return mutateLocal(id, (job) => {
      if (!job.handover) throw new ApiError(422, 'Předávací protokol neexistuje.')
      job.handover = {
        ...job.handover,
        state: 'signed',
        signingEnvelopeId: job.handover.signingEnvelopeId ?? crypto.randomUUID(),
      }
      job.events = [...(job.events ?? []), event('handover_signed', 'Předání odesláno k podpisu')]
    })
  }

  /**
   * Vytvoří KONCEPT faktury ze zakázky a vrátí její id (editor pak otevře `?id=`).
   * API: `POST /jobs/{id}/invoice` (idempotentní — 409, pokud už vyfakturováno; 422 bez klienta).
   * Mock: sestaví koncept z pracovního listu (stejná matematika jako faktura) a naváže `Job.invoiceId`.
   */
  async function invoice(id: string): Promise<string> {
    if (isApiMode()) {
      const inv = await http.post<Invoice>(`/jobs/${id}/invoice`, {})
      return inv.id
    }
    const job = findLocal(id)
    if (!job.clientId && !job.clientName) throw new ApiError(422, 'Zakázka nemá zákazníka.')
    if (job.invoiceId) throw new ApiError(409, 'Zakázka už je vyfakturovaná.')

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
    const items: InvoiceItem[] = [
      ...(job.workItems ?? []).map((w) => ({ ...w, unit: 'h' })),
      ...(job.materialItems ?? []).map((m) => ({ ...m, unit: 'ks' })),
    ].map((src) => {
      const line = calcLine(src, vatPayer)
      return {
        id: crypto.randomUUID(),
        description: src.description,
        quantity: src.quantity,
        unit: src.unit,
        unitPrice: src.unitPrice,
        vatRate: src.vatRate,
        ...line,
      }
    })
    const totals = calcTotals(items, vatPayer)
    const now = new Date()
    const iso = now.toISOString()
    const created: Invoice = {
      id: crypto.randomUUID(),
      documentType: 'invoice',
      status: 'draft',
      invoiceNumber: '',
      clientId: job.clientId,
      clientSnapshot: { name: job.clientName || '' },
      supplierSnapshot: supplier,
      items,
      currency: 'CZK',
      issueDate: iso.slice(0, 10),
      dueDate: new Date(now.getTime() + 14 * 86_400_000).toISOString().slice(0, 10),
      taxableDate: iso.slice(0, 10),
      paidAt: null,
      variableSymbol: null,
      constantSymbol: null,
      specificSymbol: null,
      paymentMethod: 'bank',
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      notes: job.note,
      createdAt: iso,
      updatedAt: iso,
    }
    await useApi<Invoice>('invoices').create(created)
    mutateLocal(id, (j) => {
      j.invoiceId = created.id
      j.events = [...(j.events ?? []), event('invoiced', `Faktura vytvořena`)]
    })
    return created.id
  }

  return {
    list,
    get,
    create,
    update,
    remove,
    setStatus,
    addWorkItem,
    removeWorkItem,
    addMaterial,
    removeMaterial,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    createHandover,
    signHandover,
    invoice,
  }
}
