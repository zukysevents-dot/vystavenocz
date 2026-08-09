import { http } from '@/lib/http'
import type { ModifierGroup, ModifierSelectionType, ProductModifierGroup } from '@/lib/types'

export type ModifierOptionInput = {
  id?: string
  name: string
  priceDelta: number
  sortOrder: number
}

export type ModifierGroupInput = {
  name: string
  selectionType: ModifierSelectionType
  isRequired: boolean
  maxSelect: number | null
  sortOrder: number
  options: ModifierOptionInput[]
}

export type AssignProductModifierGroupsInput = {
  groups: {
    modifierGroupId: string
    sortOrder: number
  }[]
}

export function useModifierGroups() {
  async function list(): Promise<ModifierGroup[]> {
    // Backendový katalog je malý číselník a vrací přímo pole, ne stránkovanou odpověď.
    return http.get<ModifierGroup[]>('/modifier-groups')
  }

  function create(input: ModifierGroupInput): Promise<ModifierGroup> {
    return http.post<ModifierGroup>('/modifier-groups', input)
  }

  function update(id: string, input: ModifierGroupInput): Promise<ModifierGroup> {
    return http.put<ModifierGroup>(`/modifier-groups/${id}`, input)
  }

  function remove(id: string): Promise<void> {
    return http.del(`/modifier-groups/${id}`)
  }

  function listForProduct(productId: string): Promise<ProductModifierGroup[]> {
    return http.get<ProductModifierGroup[]>(`/products/${productId}/modifier-groups`)
  }

  function assignToProduct(
    productId: string,
    input: AssignProductModifierGroupsInput,
  ): Promise<ProductModifierGroup[]> {
    return http.put<ProductModifierGroup[]>(`/products/${productId}/modifier-groups`, input)
  }

  return { list, create, update, remove, listForProduct, assignToProduct }
}
