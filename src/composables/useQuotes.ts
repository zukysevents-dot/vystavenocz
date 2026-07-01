import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useQuotesStore } from '@/stores/quotes'
import type { Quote } from '@/lib/types'

const api = useApi<Quote>('quotes')

export type QuoteInput = Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>

export function useQuotes() {
  const store = useQuotesStore()
  const { quotes } = storeToRefs(store)

  async function load(): Promise<void> {
    try {
      store.quotes = await api.list()
    } catch (e) {
      console.warn('Načtení nabídek selhalo:', e)
      store.quotes = []
    }
  }

  async function create(input: QuoteInput): Promise<Quote> {
    const now = new Date().toISOString()
    const created = await api.create({
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as Quote)
    store.quotes.push(created)
    return created
  }

  async function update(id: string, input: QuoteInput): Promise<Quote> {
    const updated = await api.update(id, { ...input, updatedAt: new Date().toISOString() })
    const idx = store.quotes.findIndex((q) => q.id === id)
    if (idx !== -1) store.quotes[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await api.remove(id)
    store.quotes = store.quotes.filter((q) => q.id !== id)
  }

  return { quotes, load, create, update, remove }
}
