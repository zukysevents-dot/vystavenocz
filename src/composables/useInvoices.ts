import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useInvoicesStore } from '@/stores/invoices'
import { calcTotals } from '@/lib/invoice'
import { http, isApiMode } from '@/lib/http'
import type { Invoice } from '@/lib/types'

const api = useApi<Invoice>('invoices')

export type InvoiceInput = Omit<
  Invoice,
  'id' | 'createdAt' | 'updatedAt' | 'subtotal' | 'vatTotal' | 'total'
>

/**
 * Číslo faktury už v evidenci existuje — účetní integrita zakazuje duplicitu.
 * Pouze mock režim: na serveru čísla přiděluje atomicky `/issue` (souběh → 409).
 */
export class DuplicateInvoiceNumberError extends Error {
  readonly invoiceNumber: string
  constructor(invoiceNumber: string) {
    super(`Faktura s číslem „${invoiceNumber}" už existuje.`)
    this.name = 'DuplicateInvoiceNumberError'
    this.invoiceNumber = invoiceNumber
  }
}

export function useInvoices() {
  const store = useInvoicesStore()
  const { invoices } = storeToRefs(store)

  // Zapíše čerstvý stav faktury (typicky ze serveru) do storu — insert nebo replace dle id.
  // Tím se ve store drží serverová pravda (id, číslo, součty, stav), ne klientská kopie.
  function upsert(inv: Invoice): Invoice {
    const idx = store.invoices.findIndex((i) => i.id === inv.id)
    if (idx === -1) store.invoices.push(inv)
    else store.invoices[idx] = inv
    return inv
  }

  async function load(): Promise<void> {
    try {
      store.invoices = await api.list()
    } catch (e) {
      // Endpoint faktur ještě nemusí být dostupný → prázdný seznam místo pádu appky.
      console.warn('Načtení faktur selhalo:', e)
      store.invoices = []
    }
  }

  async function create(input: InvoiceInput, vatPayer = true): Promise<Invoice> {
    if (isApiMode()) {
      // Server-driven: POST vytvoří KONCEPT (bez čísla); id i součty přidělí/spočítá server.
      // Číslo se přidělí až při `issue()`. Ukládáme serverovou odpověď (ne klientský objekt).
      return upsert(await http.post<Invoice>('/invoices', input))
    }

    // --- Mock localStorage (vývoj / e2e): klientské id, číslo i součty ---
    // Unikátnost čísla ověř proti ČERSTVÉMU stavu úložiště (ne in-memory store) —
    // zachytí i fakturu uloženou v jiném tabu, kde má store vlastní zastaralou kopii.
    const number = (input.invoiceNumber ?? '').trim()
    if (number) {
      const existing = await api.list()
      const clash = existing.some(
        (i) => (i.invoiceNumber ?? '').trim().toLowerCase() === number.toLowerCase(),
      )
      if (clash) throw new DuplicateInvoiceNumberError(number)
    }

    const totals = calcTotals(input.items, vatPayer)
    const now = new Date().toISOString()
    const invoice: Invoice = {
      ...input,
      id: crypto.randomUUID(),
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      createdAt: now,
      updatedAt: now,
    }
    await api.create(invoice)
    store.invoices.push(invoice)
    return invoice
  }

  async function update(id: string, input: InvoiceInput, vatPayer = true): Promise<Invoice> {
    if (isApiMode()) {
      // Server přepočítá součty; PUT je povolen jen na konceptu (jinak 409).
      return upsert(await http.put<Invoice>(`/invoices/${id}`, input))
    }

    const totals = calcTotals(input.items, vatPayer)
    const updated = await api.update(id, {
      ...input,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      updatedAt: new Date().toISOString(),
    })
    const idx = store.invoices.findIndex((i) => i.id === id)
    if (idx !== -1) store.invoices[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await api.remove(id)
    store.invoices = store.invoices.filter((i) => i.id !== id)
  }

  // --- Životní cyklus: koncept → vystavená → uhrazená / stornovaná ---
  // V API režimu řídí přechody server (atomické přidělení čísla, validace stavu → 409).
  // V mock režimu přechod jen přepíše stav (číslo už koncept má z create()).

  function localTransition(id: string, patch: Partial<Invoice>): Promise<Invoice> {
    return api
      .update(id, { ...patch, updatedAt: new Date().toISOString() })
      .then((updated) => upsert(updated))
  }

  /** Vystaví fakturu — server přidělí číslo (Draft→Issued). */
  async function issue(id: string): Promise<Invoice> {
    if (isApiMode()) return upsert(await http.post<Invoice>(`/invoices/${id}/issue`))
    return localTransition(id, { status: 'issued' })
  }

  /** Označí fakturu jako uhrazenou (Issued→Paid). */
  async function pay(id: string): Promise<Invoice> {
    if (isApiMode()) return upsert(await http.post<Invoice>(`/invoices/${id}/pay`))
    return localTransition(id, {
      status: 'paid',
      paidAt: getById(id)?.paidAt ?? new Date().toISOString(),
    })
  }

  /** Stornuje fakturu (Draft/Issued→Cancelled) — číslo zůstává. */
  async function cancel(id: string): Promise<Invoice> {
    if (isApiMode()) return upsert(await http.post<Invoice>(`/invoices/${id}/cancel`))
    return localTransition(id, { status: 'cancelled' })
  }

  function getById(id: string): Invoice | null {
    return store.invoices.find((i) => i.id === id) ?? null
  }

  return { invoices, load, create, update, remove, issue, pay, cancel, getById }
}
