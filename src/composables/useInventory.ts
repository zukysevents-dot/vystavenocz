import { http } from '@/lib/http'
import type {
  ApprovalRequest,
  CreatePurchaseReceiptRequest,
  PurchaseReceipt,
  PurchaseSuggestionsResponse,
  StockByLocationResponse,
  StockLevel,
  StockMirror,
  StockMovement,
  StockMovementType,
  Stocktake,
  ProductionBatch,
} from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

export interface StocktakeItemInput {
  productId: string
  countedQuantity: number
}

export interface StockLevelQuery {
  locationId?: string | null
}

export interface StockMirrorQuery {
  from?: string
  to?: string
  locationId?: string | null
  search?: string
}

export interface PurchaseSuggestionsQuery {
  from?: string
  to?: string
  daysAhead?: number
  locationId?: string | null
}

export interface CreateProductionBatchRequest {
  semiProductId: string
  producedQuantity: number
  locationId?: string | null
  note?: string | null
}

// Sklad / zásoby (gastro/retail). Jen API mód — nad existujícím inventory backendem.
export function useInventory() {
  async function levels(query: StockLevelQuery = {}): Promise<StockLevel[]> {
    const params = new URLSearchParams({ pageSize: '200' })
    if (query.locationId) params.set('locationId', query.locationId)
    return (await http.get<PagedResult<StockLevel>>(`/inventory/stock-levels?${params}`)).items
  }
  async function movements(): Promise<StockMovement[]> {
    return (await http.get<PagedResult<StockMovement>>('/inventory/movements?pageSize=100')).items
  }
  // Centrální sklad: přehled zásob napříč pobočkami (matice produkt × provozovna).
  function stockByLocation(search = ''): Promise<StockByLocationResponse> {
    const params = new URLSearchParams({ pageSize: '200' })
    if (search.trim()) params.set('search', search.trim())
    return http.get<StockByLocationResponse>(`/inventory/stock-by-location?${params}`)
  }
  function receive(
    productId: string,
    quantity: number,
    note: string | null,
    locationId?: string | null,
  ): Promise<unknown> {
    return http.post('/inventory/receipts', {
      productId,
      quantity,
      note,
      locationId: locationId || null,
    })
  }
  function purchaseReceipts(query: StockLevelQuery = {}): Promise<PurchaseReceipt[]> {
    const params = new URLSearchParams({ pageSize: '50' })
    if (query.locationId) params.set('locationId', query.locationId)
    return http
      .get<PagedResult<PurchaseReceipt>>(`/inventory/purchase-receipts?${params}`)
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
    locationId?: string | null,
  ): Promise<StockMovement | ApprovalRequest> {
    return http.post('/inventory/issues', {
      productId,
      quantity,
      note,
      type,
      locationId: locationId || null,
    })
  }
  function correct(
    productId: string,
    delta: number,
    note: string,
    locationId?: string | null,
  ): Promise<unknown> {
    return http.post('/inventory/corrections', {
      productId,
      delta,
      note,
      locationId: locationId || null,
    })
  }
  function transfer(
    productId: string,
    quantity: number,
    fromLocationId: string,
    toLocationId: string,
    note: string | null,
  ): Promise<StockMovement[]> {
    return http.post('/inventory/transfers', {
      productId,
      quantity,
      fromLocationId,
      toLocationId,
      note,
    })
  }
  function stocktake(
    items: StocktakeItemInput[],
    note: string | null,
    locationId?: string | null,
  ): Promise<Stocktake | ApprovalRequest> {
    return http.post('/inventory/stocktake', { items, note, locationId: locationId || null })
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
  function purchaseSuggestions(
    query: PurchaseSuggestionsQuery = {},
  ): Promise<PurchaseSuggestionsResponse> {
    const params = new URLSearchParams()
    if (query.from) params.set('from', query.from)
    if (query.to) params.set('to', query.to)
    if (query.daysAhead != null) params.set('daysAhead', String(query.daysAhead))
    if (query.locationId) params.set('locationId', query.locationId)
    const qs = params.toString()
    return http.get(`/inventory/purchase-suggestions${qs ? `?${qs}` : ''}`)
  }
  function createProductionBatch(request: CreateProductionBatchRequest): Promise<ProductionBatch> {
    return http.post('/production-batches', request)
  }
  return {
    levels,
    movements,
    stockByLocation,
    receive,
    purchaseReceipts,
    createPurchaseReceipt,
    issue,
    correct,
    transfer,
    stocktake,
    stockMirror,
    purchaseSuggestions,
    createProductionBatch,
  }
}
