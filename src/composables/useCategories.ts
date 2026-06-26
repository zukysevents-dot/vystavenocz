import { http } from '@/lib/http'
import type { Category, CategoryKitchenSection } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

export type CategoryInput = {
  name: string
  color?: string | null
  sortOrder?: number
  kitchenSection?: CategoryKitchenSection
}

// Kategorie produktů (gastro). Jen API mód.
export function useCategories() {
  async function list(): Promise<Category[]> {
    return (await http.get<PagedResult<Category>>('/categories?pageSize=100')).items
  }
  function create(input: CategoryInput): Promise<Category> {
    return http.post<Category>('/categories', input)
  }
  function update(id: string, input: CategoryInput): Promise<Category> {
    return http.put<Category>(`/categories/${id}`, input)
  }
  function remove(id: string): Promise<void> {
    return http.del(`/categories/${id}`)
  }
  return { list, create, update, remove }
}
