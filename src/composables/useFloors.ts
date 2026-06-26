import { http } from '@/lib/http'
import type { Floor } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

export type FloorInput = { name: string; sortOrder?: number; locationId?: string | null }

// Místnosti pro mapu stolů (gastro). Jen API mód (admin editor proti reálnému backendu).
export function useFloors() {
  async function list(): Promise<Floor[]> {
    return (await http.get<PagedResult<Floor>>('/floors?pageSize=100')).items
  }
  function create(input: FloorInput): Promise<Floor> {
    return http.post<Floor>('/floors', input)
  }
  function update(id: string, input: FloorInput): Promise<Floor> {
    return http.put<Floor>(`/floors/${id}`, input)
  }
  function remove(id: string): Promise<void> {
    return http.del(`/floors/${id}`)
  }
  return { list, create, update, remove }
}
