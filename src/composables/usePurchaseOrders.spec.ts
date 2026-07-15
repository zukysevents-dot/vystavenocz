import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePurchaseOrders } from '@/composables/usePurchaseOrders'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

beforeEach(() => vi.clearAllMocks())

describe('usePurchaseOrders', () => {
  it('načte celý adresář dodavatelů včetně archivovaných', async () => {
    const first = Array.from({ length: 100 }, (_, index) => ({ id: `supplier-${index}` }))
    vi.mocked(http.get)
      .mockResolvedValueOnce({ items: first, total: 101, page: 1, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: [{ id: 'supplier-100' }], total: 101 } as never)

    const result = await usePurchaseOrders().suppliers(true)

    expect(result).toHaveLength(101)
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      '/inventory/suppliers?page=1&pageSize=100&includeArchived=true',
    )
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      '/inventory/suppliers?page=2&pageSize=100&includeArchived=true',
    )
  })

  it('pošle filtry objednávek jako jednoznačné query', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0 } as never)

    await usePurchaseOrders().orders({
      status: 'PartiallyReceived',
      supplierId: 'supplier-1',
      locationId: 'loc-1',
      search: '  OBJ  ',
    })

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/purchase-orders?page=1&pageSize=50&sort=-date&status=PartiallyReceived&supplierId=supplier-1&locationId=loc-1&search=OBJ',
    )
  })

  it('příjem objednávky zachová idempotency klíč i přesná množství', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)
    const input = {
      idempotencyKey: '4c350ea3-37a7-4ca8-b8e1-2ef3c535cd37',
      documentNumber: 'DL-2026-1',
      receivedOn: '2026-07-14',
      note: null,
      items: [
        { purchaseOrderItemId: 'item-1', quantity: 2.5, unitCost: 19.9 },
        { purchaseOrderItemId: 'item-2', quantity: 1, unitCost: null },
      ],
    }

    await usePurchaseOrders().receiveOrder('order-1', input)

    expect(http.post).toHaveBeenCalledWith('/inventory/purchase-orders/order-1/receipts', input)
  })

  it('adresář používá samostatné endpointy pro úpravu, archivaci a obnovu', async () => {
    vi.mocked(http.put).mockResolvedValue({} as never)
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    vi.mocked(http.post).mockResolvedValue({} as never)
    const input = {
      name: 'Makro',
      ico: null,
      dic: null,
      email: null,
      phone: null,
      contactPerson: null,
      note: null,
    }
    const api = usePurchaseOrders()

    await api.updateSupplier('supplier-1', input)
    await api.archiveSupplier('supplier-1')
    await api.restoreSupplier('supplier-1')

    expect(http.put).toHaveBeenCalledWith('/inventory/suppliers/supplier-1', input)
    expect(http.del).toHaveBeenCalledWith('/inventory/suppliers/supplier-1')
    expect(http.post).toHaveBeenCalledWith('/inventory/suppliers/supplier-1/restore')
  })

  it('spravuje dodavatelský katalog a vytvoří objednávku z návrhů', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    vi.mocked(http.put).mockResolvedValue({} as never)
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    vi.mocked(http.post).mockResolvedValue({} as never)
    const api = usePurchaseOrders()
    const mapping = {
      supplierSku: 'SUP-1',
      supplierEan: '8590001',
      packageQuantity: 12,
      minimumOrderQuantity: 24,
      usualUnitCost: 8.5,
    }
    const conversion = {
      idempotencyKey: '4c350ea3-37a7-4ca8-b8e1-2ef3c535cd37',
      supplierId: 'supplier-1',
      locationId: 'loc-1',
      from: '2026-06-15',
      to: '2026-07-14',
      daysAhead: 7,
      expectedOn: null,
      note: null,
      productIds: ['product-1'],
    }

    await api.supplierProducts('supplier-1')
    await api.upsertSupplierProduct('supplier-1', 'product-1', mapping)
    await api.deleteSupplierProduct('supplier-1', 'product-1')
    await api.createOrderFromSuggestions(conversion)

    expect(http.get).toHaveBeenCalledWith('/inventory/suppliers/supplier-1/products')
    expect(http.put).toHaveBeenCalledWith(
      '/inventory/suppliers/supplier-1/products/product-1',
      mapping,
    )
    expect(http.del).toHaveBeenCalledWith('/inventory/suppliers/supplier-1/products/product-1')
    expect(http.post).toHaveBeenCalledWith(
      '/inventory/purchase-orders/from-suggestions',
      conversion,
    )
  })
})
