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
  StockMovementFilters,
  StockMovementType,
  StockLot,
  StockReservation,
  StockReservationStatus,
  CreateStockReservationRequest,
  EnableLotTrackingResponse,
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

export interface StockLotQuery {
  productId?: string | null
  locationId?: string | null
  expiresTo?: string | null
  positiveOnly?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export interface StockMirrorQuery {
  from?: string
  to?: string
  locationId?: string | null
  search?: string
}

export interface StockMovementQuery {
  from?: string
  to?: string
  productId?: string | null
  type?: StockMovementType | null
  locationId?: string | null
  stockLotId?: string | null
}

export interface PurchaseSuggestionsQuery {
  from?: string
  to?: string
  daysAhead?: number
  locationId?: string | null
}

export interface StockReservationQuery {
  status?: StockReservationStatus | null
  productId?: string | null
  locationId?: string | null
  search?: string
  page?: number
  pageSize?: number
}

export interface CreateProductionBatchRequest {
  semiProductId: string
  producedQuantity: number
  locationId?: string | null
  note?: string | null
  outputLotNumber?: string | null
  outputExpiresOn?: string | null
}

// Sklad / zásoby (gastro/retail). Jen API mód — nad existujícím inventory backendem.
export function useInventory() {
  const pageConcurrency = 4

  async function levels(query: StockLevelQuery = {}): Promise<StockLevel[]> {
    const levelUrl = (page: number) => {
      const params = new URLSearchParams({ page: String(page), pageSize: '100' })
      if (query.locationId) params.set('locationId', query.locationId)
      return `/inventory/stock-levels?${params}`
    }
    const first = await http.get<PagedResult<StockLevel>>(levelUrl(1))
    const expectedTotal = first.total
    const byProductId = new Map(first.items.map((level) => [level.productId, level]))
    const totalPages = Math.ceil(expectedTotal / 100)

    for (let firstPage = 2; firstPage <= totalPages; firstPage += pageConcurrency) {
      const pageNumbers = Array.from(
        { length: Math.min(pageConcurrency, totalPages - firstPage + 1) },
        (_, index) => firstPage + index,
      )
      const pages = await Promise.all(
        pageNumbers.map((page) => http.get<PagedResult<StockLevel>>(levelUrl(page))),
      )
      for (const next of pages) {
        if (next.total !== expectedTotal) {
          throw new Error('Skladové stavy se během načítání změnily. Načtěte stránku znovu.')
        }
        for (const level of next.items) byProductId.set(level.productId, level)
      }
    }

    const verification = await http.get<PagedResult<StockLevel>>(levelUrl(1))
    if (verification.total !== expectedTotal || byProductId.size !== expectedTotal) {
      throw new Error('Skladové stavy se během načítání změnily. Načtěte stránku znovu.')
    }
    return [...byProductId.values()]
  }
  function movementUrl(query: StockMovementQuery, page: number): string {
    const params = new URLSearchParams({ page: String(page), pageSize: '100', sort: '-date' })
    if (query.from) params.set('from', query.from)
    if (query.to) params.set('to', query.to)
    if (query.productId) params.set('productId', query.productId)
    if (query.type) params.set('type', query.type)
    if (query.locationId) params.set('locationId', query.locationId)
    if (query.stockLotId) params.set('stockLotId', query.stockLotId)
    return `/inventory/movements?${params}`
  }

  function movementPage(
    query: StockMovementQuery = {},
    page = 1,
  ): Promise<PagedResult<StockMovement>> {
    return http.get<PagedResult<StockMovement>>(movementUrl(query, page))
  }

  function movementFilters(): Promise<StockMovementFilters> {
    return http.get<StockMovementFilters>('/inventory/movement-filters')
  }

  async function movements(query: StockMovementQuery = {}): Promise<StockMovement[]> {
    const first = await movementPage(query, 1)
    const expectedTotal = first.total
    const byId = new Map(first.items.map((movement) => [movement.id, movement]))
    const totalPages = Math.ceil(expectedTotal / 100)

    for (let firstPage = 2; firstPage <= totalPages; firstPage += pageConcurrency) {
      const pageNumbers = Array.from(
        { length: Math.min(pageConcurrency, totalPages - firstPage + 1) },
        (_, index) => firstPage + index,
      )
      const pages = await Promise.all(pageNumbers.map((page) => movementPage(query, page)))
      for (const next of pages) {
        if (next.total !== expectedTotal) {
          throw new Error('Skladové pohyby se během načítání změnily. Načtěte výběr znovu.')
        }
        for (const movement of next.items) byId.set(movement.id, movement)
      }
    }

    // Ledger je append-only. Druhá kontrola první stránky odhalí nový pohyb, který by během stránkování
    // posunul řádky mezi stránkami; export raději selže, než aby tiše vynechal nebo zdvojil záznam.
    const verification = await movementPage(query, 1)
    if (verification.total !== expectedTotal || byId.size !== expectedTotal) {
      throw new Error('Skladové pohyby se během načítání změnily. Načtěte výběr znovu.')
    }

    // Stránky skládáme ve vzestupném pořadí a zachováme autoritativní řazení serveru
    // (CreatedAt + databázové pořadí UUID), místo dalšího klientského přerovnávání.
    return [...byId.values()]
  }
  // Centrální sklad: přehled zásob napříč pobočkami (matice produkt × provozovna).
  function stockByLocation(search = ''): Promise<StockByLocationResponse> {
    const params = new URLSearchParams({ pageSize: '200' })
    if (search.trim()) params.set('search', search.trim())
    return http.get<StockByLocationResponse>(`/inventory/stock-by-location?${params}`)
  }
  function stockReservations(
    query: StockReservationQuery = {},
  ): Promise<PagedResult<StockReservation>> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 100),
      sort: '-date',
    })
    if (query.status) params.set('status', query.status)
    if (query.productId) params.set('productId', query.productId)
    if (query.locationId) params.set('locationId', query.locationId)
    if (query.search?.trim()) params.set('search', query.search.trim())
    return http.get(`/inventory/stock-reservations?${params}`)
  }
  function createStockReservation(
    request: CreateStockReservationRequest,
  ): Promise<StockReservation> {
    return http.post('/inventory/stock-reservations', {
      ...request,
      reservedFor: request.reservedFor.trim(),
      locationId: request.locationId || null,
      note: request.note?.trim() || null,
    })
  }
  function releaseStockReservation(id: string, note?: string | null): Promise<StockReservation> {
    return http.post(`/inventory/stock-reservations/${id}/release`, {
      note: note?.trim() || null,
    })
  }
  function fulfillStockReservation(id: string, note?: string | null): Promise<StockReservation> {
    return http.post(`/inventory/stock-reservations/${id}/fulfill`, {
      note: note?.trim() || null,
    })
  }
  function receive(
    productId: string,
    quantity: number,
    note: string | null,
    locationId?: string | null,
    lotNumber?: string | null,
    expiresOn?: string | null,
  ): Promise<unknown> {
    return http.post('/inventory/receipts', {
      productId,
      quantity,
      note,
      locationId: locationId || null,
      lotNumber: lotNumber?.trim() || null,
      expiresOn: expiresOn || null,
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
    stockLotId?: string | null,
  ): Promise<StockMovement | ApprovalRequest> {
    return http.post('/inventory/issues', {
      productId,
      quantity,
      note,
      type,
      locationId: locationId || null,
      stockLotId: stockLotId || null,
    })
  }
  function correct(
    productId: string,
    delta: number,
    note: string,
    locationId?: string | null,
    stockLotId?: string | null,
  ): Promise<unknown> {
    return http.post('/inventory/corrections', {
      productId,
      delta,
      note,
      locationId: locationId || null,
      stockLotId: stockLotId || null,
    })
  }
  function transfer(
    productId: string,
    quantity: number,
    fromLocationId: string,
    toLocationId: string,
    note: string | null,
    stockLotId?: string | null,
  ): Promise<StockMovement[]> {
    return http.post('/inventory/transfers', {
      productId,
      quantity,
      fromLocationId,
      toLocationId,
      note,
      stockLotId: stockLotId || null,
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
  function stockLots(query: StockLotQuery = {}): Promise<PagedResult<StockLot>> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 100),
      positiveOnly: String(query.positiveOnly ?? true),
    })
    if (query.productId) params.set('productId', query.productId)
    if (query.locationId) params.set('locationId', query.locationId)
    if (query.expiresTo) params.set('expiresTo', query.expiresTo)
    if (query.search?.trim()) params.set('search', query.search.trim())
    return http.get(`/inventory/stock-lots?${params}`)
  }
  async function allStockLots(query: Omit<StockLotQuery, 'page' | 'pageSize'> = {}) {
    const first = await stockLots({ ...query, page: 1, pageSize: 100 })
    const expectedTotal = first.total
    const rowKey = (lot: StockLot) => `${lot.id}:${lot.locationId ?? ''}`
    const rows = new Map(first.items.map((lot) => [rowKey(lot), lot]))
    const totalPages = Math.ceil(expectedTotal / 100)

    for (let page = 2; page <= totalPages; page += 1) {
      const next = await stockLots({ ...query, page, pageSize: 100 })
      if (next.total !== expectedTotal)
        throw new Error('Šarže se během načítání změnily. Načtěte výběr znovu.')
      for (const lot of next.items) rows.set(rowKey(lot), lot)
    }

    const verification = await stockLots({ ...query, page: 1, pageSize: 100 })
    if (verification.total !== expectedTotal || rows.size !== expectedTotal)
      throw new Error('Šarže se během načítání změnily. Načtěte výběr znovu.')
    return [...rows.values()]
  }
  function enableLotTracking(productId: string): Promise<EnableLotTrackingResponse> {
    return http.post(`/inventory/stock-lots/products/${productId}/enable`, {})
  }
  return {
    levels,
    movementPage,
    movementFilters,
    movements,
    stockByLocation,
    stockReservations,
    createStockReservation,
    releaseStockReservation,
    fulfillStockReservation,
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
    stockLots,
    allStockLots,
    enableLotTracking,
  }
}
