import { ApiError, http, isApiMode } from '@/lib/http'
import type { ProductRecipe, ProductRecipeInput } from '@/lib/types'

export interface ProductRecipeRequest {
  ingredients: ProductRecipeInput[]
}

export function useProductRecipes() {
  async function get(productId: string): Promise<ProductRecipe | null> {
    if (!isApiMode()) return null
    try {
      return await http.get<ProductRecipe>(`/products/${productId}/recipe`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  }

  async function upsert(
    productId: string,
    ingredients: ProductRecipeInput[],
  ): Promise<ProductRecipe> {
    return await http.put<ProductRecipe>(`/products/${productId}/recipe`, { ingredients })
  }

  async function remove(productId: string): Promise<void> {
    if (!isApiMode()) return
    await http.del(`/products/${productId}/recipe`)
  }

  return { get, upsert, remove }
}
