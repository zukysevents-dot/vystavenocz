import { http } from '@/lib/http'
import type { DiningTable, TableShape } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

export type TableInput = {
  floorId: string
  name: string
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  seats?: number
  shape?: TableShape
}

export type TableLayoutItem = Pick<DiningTable, 'id' | 'x' | 'y' | 'width' | 'height' | 'rotation'>

// Stoly na mapě (gastro). Jen API mód.
export function useTables() {
  async function listByFloor(floorId: string): Promise<DiningTable[]> {
    const pageSize = 100
    const first = await http.get<PagedResult<DiningTable>>(
      `/tables?floorId=${floorId}&page=1&pageSize=${pageSize}`,
    )
    const tables = [...first.items]
    const totalPages = Math.ceil(first.total / Math.max(first.pageSize, 1))

    for (let page = 2; page <= totalPages; page++) {
      const next = await http.get<PagedResult<DiningTable>>(
        `/tables?floorId=${floorId}&page=${page}&pageSize=${pageSize}`,
      )
      tables.push(...next.items)
    }

    return tables
  }
  function create(input: TableInput): Promise<DiningTable> {
    return http.post<DiningTable>('/tables', input)
  }
  function update(id: string, input: TableInput): Promise<DiningTable> {
    return http.put<DiningTable>(`/tables/${id}`, input)
  }
  function remove(id: string): Promise<void> {
    return http.del(`/tables/${id}`)
  }
  // Hromadné uložení rozložení po drag&drop.
  function saveLayout(tables: TableLayoutItem[]): Promise<void> {
    return http.put('/tables/layout', { tables })
  }
  return { listByFloor, create, update, remove, saveLayout }
}
