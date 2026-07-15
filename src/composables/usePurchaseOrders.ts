import { http } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'
import type {
  InventorySupplier,
  InventorySupplierInput,
  SupplierProduct,
  SupplierProductInput,
  CreatePurchaseOrderFromSuggestionsInput,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderStatus,
  ReceivePurchaseOrderInput,
  ReceivePurchaseOrderResponse,
} from '@/lib/types'

export interface PurchaseOrderQuery {
  page?: number
  status?: PurchaseOrderStatus | null
  supplierId?: string | null
  locationId?: string | null
  search?: string
}

export function usePurchaseOrders() {
  async function suppliers(includeArchived = false): Promise<InventorySupplier[]> {
    const pageSize = 100
    const first = await http.get<PagedResult<InventorySupplier>>(
      `/inventory/suppliers?page=1&pageSize=${pageSize}&includeArchived=${includeArchived}`,
    )
    const items = [...first.items]
    for (let page = 2; page <= Math.ceil(first.total / pageSize); page++) {
      const next = await http.get<PagedResult<InventorySupplier>>(
        `/inventory/suppliers?page=${page}&pageSize=${pageSize}&includeArchived=${includeArchived}`,
      )
      items.push(...next.items)
    }
    return items
  }

  function createSupplier(input: InventorySupplierInput): Promise<InventorySupplier> {
    return http.post('/inventory/suppliers', input)
  }

  function updateSupplier(id: string, input: InventorySupplierInput): Promise<InventorySupplier> {
    return http.put(`/inventory/suppliers/${id}`, input)
  }

  function archiveSupplier(id: string): Promise<void> {
    return http.del(`/inventory/suppliers/${id}`)
  }

  function restoreSupplier(id: string): Promise<InventorySupplier> {
    return http.post(`/inventory/suppliers/${id}/restore`)
  }

  function supplierProducts(supplierId: string): Promise<SupplierProduct[]> {
    return http.get(`/inventory/suppliers/${supplierId}/products`)
  }

  function upsertSupplierProduct(
    supplierId: string,
    productId: string,
    input: SupplierProductInput,
  ): Promise<SupplierProduct> {
    return http.put(`/inventory/suppliers/${supplierId}/products/${productId}`, input)
  }

  function deleteSupplierProduct(supplierId: string, productId: string): Promise<void> {
    return http.del(`/inventory/suppliers/${supplierId}/products/${productId}`)
  }

  function orders(query: PurchaseOrderQuery = {}): Promise<PagedResult<PurchaseOrder>> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: '50',
      sort: '-date',
    })
    if (query.status) params.set('status', query.status)
    if (query.supplierId) params.set('supplierId', query.supplierId)
    if (query.locationId) params.set('locationId', query.locationId)
    if (query.search?.trim()) params.set('search', query.search.trim())
    return http.get(`/inventory/purchase-orders?${params}`)
  }

  function getOrder(id: string): Promise<PurchaseOrder> {
    return http.get(`/inventory/purchase-orders/${id}`)
  }

  function createOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
    return http.post('/inventory/purchase-orders', input)
  }

  function createOrderFromSuggestions(
    input: CreatePurchaseOrderFromSuggestionsInput,
  ): Promise<PurchaseOrder> {
    return http.post('/inventory/purchase-orders/from-suggestions', input)
  }

  function updateOrder(id: string, input: PurchaseOrderInput): Promise<PurchaseOrder> {
    return http.put(`/inventory/purchase-orders/${id}`, input)
  }

  function placeOrder(id: string): Promise<PurchaseOrder> {
    return http.post(`/inventory/purchase-orders/${id}/place`)
  }

  function cancelOrder(id: string, reason: string | null): Promise<PurchaseOrder> {
    return http.post(`/inventory/purchase-orders/${id}/cancel`, { reason })
  }

  function receiveOrder(
    id: string,
    input: ReceivePurchaseOrderInput,
  ): Promise<ReceivePurchaseOrderResponse> {
    return http.post(`/inventory/purchase-orders/${id}/receipts`, input)
  }

  return {
    suppliers,
    createSupplier,
    updateSupplier,
    archiveSupplier,
    restoreSupplier,
    supplierProducts,
    upsertSupplierProduct,
    deleteSupplierProduct,
    orders,
    getOrder,
    createOrder,
    createOrderFromSuggestions,
    updateOrder,
    placeOrder,
    cancelOrder,
    receiveOrder,
  }
}
