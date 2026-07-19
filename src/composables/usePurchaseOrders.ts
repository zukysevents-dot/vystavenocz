import { http } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'
import type { StockDocument } from '@/lib/types'

export type PurchaseOrderStatus = 'Draft' | 'Sent' | 'PartiallyReceived' | 'Received' | 'Cancelled'
export interface PurchaseOrderItemInput { productId: string; quantity: number; unitCost?: number | null }
export interface PurchaseOrderItem {
  productId: string; productName: string; productSku: string; quantityOrdered: number; quantityReceived: number
  unitCost: number | null; lineCost: number | null
}
export interface PurchaseOrder {
  id: string; number: string | null; status: PurchaseOrderStatus; supplierId: string; supplierName: string
  orderedOn: string; expectedOn: string | null; destinationLocationId: string | null; externalReference: string | null; note: string | null
  sentAt: string | null; cancelledAt: string | null; createdAt: string; updatedAt: string; items: PurchaseOrderItem[]
}
export interface CreatePurchaseOrderInput {
  supplierId: string; orderedOn?: string | null; expectedOn?: string | null; destinationLocationId?: string | null
  externalReference?: string | null; note?: string | null; items: PurchaseOrderItemInput[]
}
export interface ReceiptDraftInput {
  documentDate?: string | null; destinationLocationId?: string | null; externalReference?: string | null; note?: string | null
  items?: PurchaseOrderItemInput[]
}
export interface SupplierProduct { id: string; supplierId: string; productId: string; productName: string; productSku: string; supplierSku: string | null; packQuantity: number; minimumOrderQuantity: number; unitCost: number | null; leadTimeDays: number | null }
export interface SupplierProductInput { productId: string; supplierSku?: string | null; packQuantity: number; minimumOrderQuantity: number; unitCost?: number | null; leadTimeDays?: number | null }
export interface SupplierSuggestion { productId: string; productName: string; productSku: string; supplierSku: string | null; currentQuantity: number; recommendedQuantity: number; packQuantity: number; minimumOrderQuantity: number; unitCost: number | null; estimatedCost: number | null; leadTimeDays: number | null }
export interface SupplierSuggestions { supplierId: string; supplierName: string; from: string; to: string; daysAhead: number; locationId: string | null; items: SupplierSuggestion[] }
export interface SupplierInvoice { id: string; supplierId: string; supplierName: string; purchaseOrderId: string | null; purchaseOrderNumber: string | null; invoiceNumber: string; receivedOn: string; dueOn: string | null; totalAmount: number | null; currency: string; note: string | null; confirmedReceiptTotal: number | null; amountMatchesConfirmedReceipts: boolean | null; createdAt: string }
export interface SupplierInvoiceInput { supplierId: string; purchaseOrderId?: string | null; invoiceNumber: string; receivedOn?: string | null; dueOn?: string | null; totalAmount?: number | null; currency?: string | null; note?: string | null }

export function usePurchaseOrders() {
  const list = (): Promise<PagedResult<PurchaseOrder>> => http.get('/purchase-orders?pageSize=100')
  const create = (input: CreatePurchaseOrderInput): Promise<PurchaseOrder> => http.post('/purchase-orders', input)
  const send = (id: string): Promise<PurchaseOrder> => http.post(`/purchase-orders/${id}/send`)
  const sendEmail = (id: string, input: { to?: string | null; message?: string | null }): Promise<PurchaseOrder> => http.post(`/purchase-orders/${id}/send-email`, input)
  const cancel = (id: string): Promise<PurchaseOrder> => http.post(`/purchase-orders/${id}/cancel`)
  const createReceiptDraft = (id: string, input: ReceiptDraftInput): Promise<StockDocument> => http.post(`/purchase-orders/${id}/receipt-drafts`, input)
  const supplierProducts = (supplierId: string): Promise<SupplierProduct[]> => http.get(`/purchase-orders/suppliers/${supplierId}/products`)
  const upsertSupplierProduct = (supplierId: string, input: SupplierProductInput): Promise<SupplierProduct> => http.put(`/purchase-orders/suppliers/${supplierId}/products`, input)
  const removeSupplierProduct = (supplierId: string, productId: string): Promise<void> => http.del(`/purchase-orders/suppliers/${supplierId}/products/${productId}`)
  const suggestions = (supplierId: string, locationId?: string | null): Promise<SupplierSuggestions> => {
    const params = new URLSearchParams({ supplierId, daysAhead: '7' })
    if (locationId) params.set('locationId', locationId)
    return http.get(`/purchase-orders/suggestions?${params}`)
  }
  const createSupplierInvoice = (input: SupplierInvoiceInput): Promise<SupplierInvoice> => http.post('/purchase-orders/supplier-invoices', input)
  const supplierInvoices = (purchaseOrderId?: string): Promise<PagedResult<SupplierInvoice>> => {
    const params = new URLSearchParams({ pageSize: '100' })
    if (purchaseOrderId) params.set('purchaseOrderId', purchaseOrderId)
    return http.get(`/purchase-orders/supplier-invoices?${params}`)
  }
  return { list, create, send, sendEmail, cancel, createReceiptDraft, supplierProducts, upsertSupplierProduct, removeSupplierProduct, suggestions, createSupplierInvoice, supplierInvoices }
}
