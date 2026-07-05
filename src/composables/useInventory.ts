import { http } from '@/lib/http'
import type {
  CreatePurchaseReceiptRequest,
  PurchaseReceipt,
  StockLevel,
  StockMirror,
  StockMovement,
  StockMovementType,
} from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

export interface StocktakeItemInput {
  productId: string
  countedQuantity: number
}

export interface StockMirrorQuery {
  from?: string
  to?: string
  locationId?: string | null
  search?: string
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
  function purchaseReceipts(): Promise<PurchaseReceipt[]> {
    return http
      .get<PagedResult<PurchaseReceipt>>('/inventory/purchase-receipts?pageSize=50')
      .then((r) => r.items)
  }
  function createPurchaseReceipt(request: CreatePurchaseReceiptRequest): Promise<PurchaseReceipt> {
    return http.post('/inventory/purchase-receipts', request)
  }
  function issue(
    productId: string,
    quantity: number,
    note: string | null,
    type: StockMovementType = 'Issue',
  ): Promise<unknown> {
    return http.post('/inventory/issues', { productId, quantity, note, type })
  }
  function correct(productId: string, delta: number, note: string): Promise<unknown> {
    return http.post('/inventory/corrections', { productId, delta, note })
  }
  function stocktake(items: StocktakeItemInput[], note: string | null): Promise<unknown> {
    return http.post('/inventory/stocktake', { items, note })
  }
  function stockMirror(query: StockMirrorQuery = {}): Promise<StockMirror> {
    const params = new URLSearchParams()
    if (query.from) params.set('from', query.from)
    if (query.to) params.set('to', query.to)
    if (query.locationId) params.set('locationId', query.locationId)
    if (query.search?.trim()) params.set('search', query.search.trim())
    const qs = params.toString()
    return http.get(`/inventory/stock-mirror${qs ? `?${qs}` : ''}`)
  }
  return {
    levels,
    movements,
    receive,
    purchaseReceipts,
    createPurchaseReceipt,
    issue,
    correct,
    stocktake,
    stockMirror,
  }
}
