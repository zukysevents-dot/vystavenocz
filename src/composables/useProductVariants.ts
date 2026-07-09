import { ApiError, http, isApiMode } from '@/lib/http'
import type { ProductVariant, ProductVariantInput } from '@/lib/types'

export function useProductVariants() {
  async function get(productId: string): Promise<ProductVariant[] | null> {
    if (!isApiMode()) return null
    try {
      return await http.get<ProductVariant[]>(`/products/${productId}/variants`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  }

  function upsert(productId: string, variants: ProductVariantInput[]): Promise<ProductVariant[]> {
    return http.put(`/products/${productId}/variants`, { variants })
  }

  async function remove(productId: string): Promise<void> {
    if (isApiMode()) await http.del(`/products/${productId}/variants`)
  }

  return { get, upsert, remove }
}
