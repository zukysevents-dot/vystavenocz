import { http, isApiMode, ApiError } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'
import { useJobs } from '@/composables/useJobs'
import type { Job, Quote, QuoteItem, QuoteStatus } from '@/lib/types'

/**
 * Cenové nabídky V2 (modul Nabídky). Zdroj pravdy = backend; součty počítá server. Mock-capable:
 * v mock režimu žije vše v localStorage (`vystaveno:quotes`) a součty si dopočítá `quoteTotal`
 * (fallback přes calcTotals). Převod na zakázku volá server `POST /quotes/{id}/convert-to-job`;
 * v mock režimu sestaví zakázku přes `useJobs` (idempotentně dle `sourceQuoteId`).
 */

const STORAGE_KEY = 'vystaveno:quotes'

export interface QuoteInput {
  number: string
  clientId: string | null
  clientName: string | null
  status: QuoteStatus
  items: QuoteItem[]
  validUntil: string | null
  note: string | null
}

function readLocal(): Quote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Quote[]) : []
  } catch {
    return []
  }
}
function writeLocal(list: Quote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function useQuotes() {
  async function list(): Promise<Quote[]> {
    if (isApiMode()) {
      const res = await http.get<PagedResult<Quote>>('/quotes?pageSize=100')
      return res.items
    }
    return readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async function get(id: string): Promise<Quote> {
    if (isApiMode()) return http.get<Quote>(`/quotes/${id}`)
    const found = readLocal().find((q) => q.id === id)
    if (!found) throw new ApiError(404, 'Nabídka nenalezena.')
    return found
  }

  async function create(input: QuoteInput): Promise<Quote> {
    if (isApiMode()) return http.post<Quote>('/quotes', input)
    const now = new Date().toISOString()
    // Součty v mock režimu nedopočítáváme na objekt — `quoteTotal` je dopočítá přes calcTotals.
    const quote: Quote = {
      id: crypto.randomUUID(),
      number: input.number,
      clientId: input.clientId,
      clientName: input.clientName,
      status: input.status,
      items: input.items,
      validUntil: input.validUntil,
      note: input.note,
      createdAt: now,
      updatedAt: now,
    }
    writeLocal([quote, ...readLocal()])
    return quote
  }

  async function update(id: string, input: QuoteInput): Promise<Quote> {
    if (isApiMode()) return http.put<Quote>(`/quotes/${id}`, input)
    const listData = readLocal()
    const idx = listData.findIndex((q) => q.id === id)
    if (idx === -1) throw new ApiError(404, 'Nabídka nenalezena.')
    const updated: Quote = {
      ...listData[idx],
      number: input.number,
      clientId: input.clientId,
      clientName: input.clientName,
      status: input.status,
      items: input.items,
      validUntil: input.validUntil,
      note: input.note,
      updatedAt: new Date().toISOString(),
    }
    listData[idx] = updated
    writeLocal(listData)
    return updated
  }

  async function remove(id: string): Promise<void> {
    if (isApiMode()) {
      await http.del(`/quotes/${id}`)
      return
    }
    writeLocal(readLocal().filter((q) => q.id !== id))
  }

  async function setStatus(id: string, status: QuoteStatus): Promise<Quote> {
    if (isApiMode()) return http.post<Quote>(`/quotes/${id}/status`, { status })
    const listData = readLocal()
    const idx = listData.findIndex((q) => q.id === id)
    if (idx === -1) throw new ApiError(404, 'Nabídka nenalezena.')
    const updated: Quote = { ...listData[idx], status, updatedAt: new Date().toISOString() }
    listData[idx] = updated
    writeLocal(listData)
    return updated
  }

  async function sendEmail(id: string, input: { to?: string | null; message?: string | null } = {}): Promise<Quote> {
    if (isApiMode()) return http.post<Quote>(`/quotes/${id}/send-email`, input)
    // Náhled nemá SMTP. Stav se proto nesmí změnit na „odesláno“ jen kvůli demonstraci.
    throw new ApiError(503, 'Odesílání e-mailů je dostupné až v připojené aplikaci se SMTP nastavením.')
  }

  /**
   * Převede nabídku na zakázku. API: server namapuje položky a vrátí Job (idempotence dle sourceQuoteId).
   * Mock: sestaví zakázku přes useJobs (položky nabídky → práce), idempotentně dle `sourceQuoteId`.
   */
  async function convertToJob(id: string): Promise<Job> {
    if (isApiMode()) return http.post<Job>(`/quotes/${id}/convert-to-job`, {})
    const quote = await get(id)
    const jobs = useJobs()
    // Idempotence: druhý převod vrátí existující zakázku místo duplicitní.
    const existing = (await jobs.list()).find((j) => j.sourceQuoteId === quote.id)
    if (existing) return jobs.get(existing.id)

    const job = await jobs.create({
      name: `Zakázka z nabídky ${quote.number}`,
      clientId: quote.clientId,
      clientName: quote.clientName,
      siteAddress: null,
      status: 'scheduled',
      priority: 'normal',
      scheduledAt: null,
      assignedEmployeeId: null,
      locationId: null,
      sourceQuoteId: quote.id,
      note: quote.note,
    })
    // Položky nabídky mapujeme na PRÁCI (ne materiál) — nabídkové řádky nemají productId (nevážou se
    // na skladovou položku), takže je nelze naskladově odečíst. Parita s backend convert-to-job;
    // materiál si obsluha doplní v detailu přes výběr produktu ze skladu.
    for (const it of quote.items) {
      await jobs.addWorkItem(job.id, {
        serviceItemId: null,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate,
      })
    }
    // Přijetí nabídky je best-effort — zakázka už existuje, stav lze doopravit ručně.
    if (quote.status !== 'accepted') {
      try {
        await setStatus(quote.id, 'accepted')
      } catch {
        /* ignorováno */
      }
    }
    return jobs.get(job.id)
  }

  return { list, get, create, update, remove, setStatus, sendEmail, convertToJob }
}
