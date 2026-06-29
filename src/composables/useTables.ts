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
    return (await http.get<PagedResult<DiningTable>>(`/tables?floorId=${floorId}&pageSize=200`))
      .items
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
