import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useInvoicesStore } from '@/stores/invoices'
import { calcTotals } from '@/lib/invoice'
import type { Invoice } from '@/lib/types'

const api = useApi<Invoice>('invoices')

export type InvoiceInput = Omit<
  Invoice,
  'id' | 'createdAt' | 'updatedAt' | 'subtotal' | 'vatTotal' | 'total'
>

/** Číslo faktury už v evidenci existuje — účetní integrita zakazuje duplicitu. */
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

  async function load(): Promise<void> {
    try {
      store.invoices = await api.list()
    } catch (e) {
      // Endpoint faktur ještě nemusí v backendu existovat → prázdný seznam místo pádu appky.
      console.warn('Načtení faktur selhalo:', e)
      store.invoices = []
    }
  }

  async function create(input: InvoiceInput, vatPayer = true): Promise<Invoice> {
    // Unikátnost čísla ověř proti ČERSTVÉMU stavu úložiště (ne in-memory store) —
    // zachytí i fakturu uloženou v jiném tabu, kde má store vlastní zastaralou kopii.
    const number = input.invoiceNumber.trim()
    if (number) {
      const existing = await api.list()
      const clash = existing.some(
        (i) => i.invoiceNumber.trim().toLowerCase() === number.toLowerCase(),
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

  function getById(id: string): Invoice | null {
    return store.invoices.find((i) => i.id === id) ?? null
  }

  return { invoices, load, create, update, remove, getById }
}
