import { http, isApiMode } from '@/lib/http'
import type { ModifierGroup, ModifierGroupInput } from '@/lib/types'

// Přiřazení skupiny k produktu (pořadí skupin u produktu). Vzor UpsertProductModifierGroupsRequest.
export interface ProductModifierGroupAssignment {
  modifierGroupId: string
  sortOrder: number
}

// CRUD skupin modifikátorů + přiřazení k produktu. Backend: /api/v1/modifier-groups a
// /api/v1/products/{productId}/modifier-groups (Inventory.Read/Manage). Vzor useProductRecipes.
export function useModifierGroups() {
  async function list(): Promise<ModifierGroup[]> {
    if (!isApiMode()) return []
    return await http.get<ModifierGroup[]>('/modifier-groups')
  }

  async function create(data: ModifierGroupInput): Promise<ModifierGroup> {
    return await http.post<ModifierGroup>('/modifier-groups', data)
  }

  async function update(id: string, data: ModifierGroupInput): Promise<ModifierGroup> {
    return await http.put<ModifierGroup>(`/modifier-groups/${id}`, data)
  }

  async function remove(id: string): Promise<void> {
    if (!isApiMode()) return
    await http.del(`/modifier-groups/${id}`)
  }

  async function listForProduct(productId: string): Promise<ModifierGroup[]> {
    if (!isApiMode()) return []
    return await http.get<ModifierGroup[]>(`/products/${productId}/modifier-groups`)
  }

  async function assignToProduct(
    productId: string,
    groups: ProductModifierGroupAssignment[],
  ): Promise<void> {
    await http.put(`/products/${productId}/modifier-groups`, { groups })
  }

  return { list, create, update, remove, listForProduct, assignToProduct }
}
