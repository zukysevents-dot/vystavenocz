import { http } from '@/lib/http'
import type { PublicMenuResponse, PublicOrderConfirmation, PublicOrderRequest } from '@/lib/types'

/**
 * Veřejný objednávkový kanál (bez přihlášení).
 * Volá public endpointy bez Authorization; ceny a dostupné položky jsou vždy ze serveru.
 */
export function usePublicOrders() {
  function menu(slug: string): Promise<PublicMenuResponse> {
    return http.getPublic(`/public/${encodeURIComponent(slug)}/menu`)
  }

  function order(slug: string, request: PublicOrderRequest): Promise<PublicOrderConfirmation> {
    return http.postPublic(`/public/${encodeURIComponent(slug)}/orders`, request)
  }

  return { menu, order }
}
