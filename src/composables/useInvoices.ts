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

export function useInvoices() {
  const store = useInvoicesStore()
  const { invoices } = storeToRefs(store)

  async function load(): Promise<void> {
    store.invoices = await api.list()
  }

  async function create(input: InvoiceInput, vatPayer = true): Promise<Invoice> {
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
