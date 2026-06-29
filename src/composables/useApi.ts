/**
 * Datová abstrakce (SWAP POINT).
 *
 * Jediné místo, kde se mock localStorage vrstva přepíná na HTTP klienta proti
 * `import.meta.env.VITE_API_URL`. Volající (useClients/useInvoices/stores) se nemění.
 * Metody jsou async, takže přechod na fetch() nevyžadoval změnu signatur.
 *
 * - `VITE_API_URL` prázdné → localStorage (vývoj / e2e seed / offline demo).
 * - `VITE_API_URL` nastavené → REST přes http.ts (list čte paged obálku {items,total,…}).
 */
import { http, isApiMode, ApiError } from '@/lib/http'

const STORAGE_PREFIX = 'vystaveno:'

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

/** Paged obálka list endpointů (sjednoceno s backend-standards.md §3). */
export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ResourceApi<T extends Identifiable> {
  list(): Promise<T[]>
  get(id: string): Promise<T | null>
  create(item: T): Promise<T>
  update(id: string, patch: Partial<T>): Promise<T>
  remove(id: string): Promise<void>
}

function httpApi<T extends Identifiable>(collection: string): ResourceApi<T> {
  const base = `/${collection}`
  return {
    async list() {
      // MVP: jedna stránka (strop backendu 100). Plné stránkování přijde s UI potřebou.
      const res = await http.get<PagedResult<T>>(`${base}?pageSize=100`)
      return res.items
    },
    async get(id) {
      try {
        return await http.get<T>(`${base}/${id}`)
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },
    create(item) {
      return http.post<T>(base, item)
    },
    update(id, patch) {
      return http.put<T>(`${base}/${id}`, patch)
    },
    async remove(id) {
      await http.del(`${base}/${id}`)
    },
  }
}

function localApi<T extends Identifiable>(collection: string): ResourceApi<T> {
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

export function useApi<T extends Identifiable>(collection: string): ResourceApi<T> {
  return isApiMode() ? httpApi<T>(collection) : localApi<T>(collection)
}
