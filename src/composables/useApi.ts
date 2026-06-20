/**
 * Datová abstrakce (SWAP POINT).
 *
 * Jediné místo, kde se mock localStorage vrstva později vymění za HTTP klienta
 * na `import.meta.env.VITE_API_URL`. Volající (useClients/useInvoices/stores) se nemění.
 * Metody jsou async, aby přechod na fetch() nevyžadoval změnu signatur.
 */

const STORAGE_PREFIX = 'vystaveno:'

// Až bude VITE_API_URL nastavené, zde se přepne na fetch(API_URL). Zatím vždy localStorage.
const API_URL = import.meta.env.VITE_API_URL

function read<T>(collection: string): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + collection)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function write<T>(collection: string, items: T[]): void {
  localStorage.setItem(STORAGE_PREFIX + collection, JSON.stringify(items))
}

export interface Identifiable {
  id: string
}

export interface ResourceApi<T extends Identifiable> {
  list(): Promise<T[]>
  get(id: string): Promise<T | null>
  create(item: T): Promise<T>
  update(id: string, patch: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
}

export function useApi<T extends Identifiable>(collection: string): ResourceApi<T> {
  // Pozn.: až bude API_URL, vrátit zde implementaci postavenou na fetch(`${API_URL}/${collection}`).
  void API_URL

  return {
    async list() {
      return read<T>(collection)
    },
    async get(id) {
      return read<T>(collection).find((x) => x.id === id) ?? null
    },
    async create(item) {
      const items = read<T>(collection)
      items.push(item)
      write(collection, items)
      return item
    },
    async update(id, patch) {
      const items = read<T>(collection)
      const idx = items.findIndex((x) => x.id === id)
      if (idx === -1) throw new Error(`${collection}: záznam ${id} nenalezen`)
      const updated = { ...items[idx], ...patch }
      items[idx] = updated
      write(collection, items)
      return updated
    },
    async remove(id) {
      write(
        collection,
        read<T>(collection).filter((x) => x.id !== id),
      )
    },
  }
}
