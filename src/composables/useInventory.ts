import { http } from '@/lib/http'
import type { StockLevel, StockMovement } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

export interface StocktakeItemInput {
  productId: string
  countedQuantity: number
}

// Sklad / zásoby (gastro/retail). Jen API mód — nad existujícím inventory backendem.
export function useInventory() {
  async function levels(): Promise<StockLevel[]> {
    return (await http.get<PagedResult<StockLevel>>('/inventory/stock-levels?pageSize=200')).items
  }
  async function movements(): Promise<StockMovement[]> {
    return (await http.get<PagedResult<StockMovement>>('/inventory/movements?pageSize=100')).items
  }
  function receive(productId: string, quantity: number, note: string | null): Promise<unknown> {
    return http.post('/inventory/receipts', { productId, quantity, note })
  }
  function issue(productId: string, quantity: number, note: string | null): Promise<unknown> {
    return http.post('/inventory/issues', { productId, quantity, note })
  }
  function correct(productId: string, delta: number, note: string): Promise<unknown> {
    return http.post('/inventory/corrections', { productId, delta, note })
  }
  function stocktake(items: StocktakeItemInput[], note: string | null): Promise<unknown> {
    return http.post('/inventory/stocktake', { items, note })
  }
  return { levels, movements, receive, issue, correct, stocktake }
}
