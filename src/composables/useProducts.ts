import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useProductsStore } from '@/stores/products'
import type { Product } from '@/lib/types'

const api = useApi<Product>('products')

export type ProductInput = Omit<Product, 'id'>

export function useProducts() {
  const store = useProductsStore()
  const { products } = storeToRefs(store)

  async function load(): Promise<void> {
    try {
      store.products = await api.list()
    } catch (e) {
      // Endpoint nedostupný / modul vypnutý → prázdný katalog místo pádu appky.
      console.warn('Načtení produktů selhalo:', e)
      store.products = []
    }
  }

  async function create(input: ProductInput): Promise<Product> {
    // V API módu vrací server entitu se SERVEROVÝM id — to je zdroj pravdy (POS na něj odkazuje).
    const created = await api.create({ ...input, id: crypto.randomUUID() } as Product)
    store.products.push(created)
    return created
  }

  async function update(id: string, input: ProductInput): Promise<Product> {
    const updated = await api.update(id, input)
    const idx = store.products.findIndex((p) => p.id === id)
    if (idx !== -1) store.products[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await api.remove(id)
    store.products = store.products.filter((p) => p.id !== id)
  }

  return { products, load, create, update, remove }
}
