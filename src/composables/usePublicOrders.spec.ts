import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePublicOrders } from '@/composables/usePublicOrders'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { getPublic: vi.fn(), postPublic: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePublicOrders', () => {
  it('menu volá veřejný endpoint bez autorizace', async () => {
    vi.mocked(http.getPublic).mockResolvedValue({ categories: [], products: [] } as never)

    await usePublicOrders().menu('bistro praha')

    expect(http.getPublic).toHaveBeenCalledWith('/public/bistro%20praha/menu')
  })

  it('order odešle veřejnou objednávku na slug firmy', async () => {
    vi.mocked(http.postPublic).mockResolvedValue({
      orderId: 'order-1',
      total: 189,
      currency: 'CZK',
    } as never)

    await usePublicOrders().order('bistro', {
      items: [{ productId: 'prod-1', quantity: 2, modifierOptionIds: ['opt-large'] }],
      customerName: 'Jana',
      customerPhone: null,
      note: null,
      fulfillment: 'pickup',
      address: null,
    })

    expect(http.postPublic).toHaveBeenCalledWith('/public/bistro/orders', {
      items: [{ productId: 'prod-1', quantity: 2, modifierOptionIds: ['opt-large'] }],
      customerName: 'Jana',
      customerPhone: null,
      note: null,
      fulfillment: 'pickup',
      address: null,
    })
  })

  it('order umí odeslat QR objednávku ke stolu', async () => {
    vi.mocked(http.postPublic).mockResolvedValue({
      orderId: 'order-1',
      total: 189,
      currency: 'CZK',
    } as never)

    await usePublicOrders().order('bistro', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      customerName: 'Host',
      customerPhone: null,
      note: null,
      fulfillment: 'pickup',
      address: null,
      tableId: 'table-1',
    })

    expect(http.postPublic).toHaveBeenCalledWith('/public/bistro/orders', {
      items: [{ productId: 'prod-1', quantity: 1 }],
      customerName: 'Host',
      customerPhone: null,
      note: null,
      fulfillment: 'pickup',
      address: null,
      tableId: 'table-1',
    })
  })
})
