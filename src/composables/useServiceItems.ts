import { http, isApiMode } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'
import type { ServiceItem, ServiceItemInput } from '@/lib/types'

/**
 * Katalog služeb/práce (Services & Jobs V2, modul jobs) — ceník labor položek pro pracovní list zakázky.
 * Mock-capable jako `useShiftTemplates`: v mock režimu localStorage (`vystaveno:service-items`),
 * v API režimu `/service-items`. UnitPrice je NET (bez DPH), stejně jako u faktury/nabídky.
 */

const STORAGE_KEY = 'vystaveno:service-items'

function readLocal(): ServiceItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ServiceItem[]) : []
  } catch {
    return []
  }
}
function writeLocal(list: ServiceItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function useServiceItems() {
  async function list(): Promise<ServiceItem[]> {
    if (isApiMode()) {
      const res = await http.get<PagedResult<ServiceItem>>('/service-items?pageSize=100')
      return res.items
    }
    return readLocal().sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  }

  async function create(input: ServiceItemInput): Promise<ServiceItem> {
    if (isApiMode()) return http.post<ServiceItem>('/service-items', input)
    const item: ServiceItem = { id: crypto.randomUUID(), ...input }
    writeLocal([...readLocal(), item])
    return item
  }

  async function update(id: string, input: ServiceItemInput): Promise<ServiceItem> {
    if (isApiMode()) return http.put<ServiceItem>(`/service-items/${id}`, input)
    const listData = readLocal()
    const idx = listData.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`service-item ${id} nenalezen`)
    const updated: ServiceItem = { ...listData[idx], ...input }
    listData[idx] = updated
    writeLocal(listData)
    return updated
  }

  async function remove(id: string): Promise<void> {
    if (isApiMode()) {
      await http.del(`/service-items/${id}`)
      return
    }
    writeLocal(readLocal().filter((i) => i.id !== id))
  }

  return { list, create, update, remove }
}
