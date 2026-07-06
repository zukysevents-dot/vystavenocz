import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInventory } from '@/composables/useInventory'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useInventory', () => {
  it('levels bez filtru volá základní stránkovaný endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [] } as never)

    await useInventory().levels()

    expect(http.get).toHaveBeenCalledWith('/inventory/stock-levels?pageSize=200')
  })

  it('levels posílá pobočku jako query', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [] } as never)

    await useInventory().levels({ locationId: 'bar-1' })

    expect(http.get).toHaveBeenCalledWith('/inventory/stock-levels?pageSize=200&locationId=bar-1')
  })

  it('receive posílá pobočku do těla příjmu', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().receive('prod-1', 5, 'bar', 'bar-1')

    expect(http.post).toHaveBeenCalledWith('/inventory/receipts', {
      productId: 'prod-1',
      quantity: 5,
      note: 'bar',
      locationId: 'bar-1',
    })
  })

  it('issue posílá pobočku do těla výdeje', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().issue('prod-1', 2, 'rozbito', 'Breakage', 'bar-1')

    expect(http.post).toHaveBeenCalledWith('/inventory/issues', {
      productId: 'prod-1',
      quantity: 2,
      note: 'rozbito',
      type: 'Breakage',
      locationId: 'bar-1',
    })
  })

  it('correct posílá pobočku do těla korekce', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().correct('prod-1', -1, 'kontrola', 'bar-1')

    expect(http.post).toHaveBeenCalledWith('/inventory/corrections', {
      productId: 'prod-1',
      delta: -1,
      note: 'kontrola',
      locationId: 'bar-1',
    })
  })

  it('stocktake posílá pobočku do těla inventury', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().stocktake(
      [{ productId: 'prod-1', countedQuantity: 3 }],
      'inventura',
      'bar-1',
    )

    expect(http.post).toHaveBeenCalledWith('/inventory/stocktake', {
      items: [{ productId: 'prod-1', countedQuantity: 3 }],
      note: 'inventura',
      locationId: 'bar-1',
    })
  })

  it('stockMirror bez filtru volá základní endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [] } as never)

    await useInventory().stockMirror()

    expect(http.get).toHaveBeenCalledWith('/inventory/stock-mirror')
  })

  it('stockMirror posílá datum, pobočku a hledání jako query', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [] } as never)

    await useInventory().stockMirror({
      from: '2026-07-01',
      to: '2026-07-05',
      locationId: 'loc-1',
      search: '  káva  ',
    })

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/stock-mirror?from=2026-07-01&to=2026-07-05&locationId=loc-1&search=k%C3%A1va',
    )
  })

  it('transfer pošle přesun mezi pobočkami na backend', async () => {
    vi.mocked(http.post).mockResolvedValue([] as never)

    await useInventory().transfer('prod-1', 3, 'bar-1', 'kitchen-1', 'doplnění kuchyně')

    expect(http.post).toHaveBeenCalledWith('/inventory/transfers', {
      productId: 'prod-1',
      quantity: 3,
      fromLocationId: 'bar-1',
      toLocationId: 'kitchen-1',
      note: 'doplnění kuchyně',
    })
  })

  it('purchaseSuggestions posílá období, horizont a pobočku jako query', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [] } as never)

    await useInventory().purchaseSuggestions({
      from: '2026-07-01',
      to: '2026-07-05',
      daysAhead: 14,
      locationId: 'bar-1',
    })

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/purchase-suggestions?from=2026-07-01&to=2026-07-05&daysAhead=14&locationId=bar-1',
    )
  })

  it('purchaseReceipts bez filtru volá základní stránkovaný endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [] } as never)

    await useInventory().purchaseReceipts()

    expect(http.get).toHaveBeenCalledWith('/inventory/purchase-receipts?pageSize=50')
  })

  it('purchaseReceipts posílá pobočku jako query', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [] } as never)

    await useInventory().purchaseReceipts({ locationId: 'bar-1' })

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/purchase-receipts?pageSize=50&locationId=bar-1',
    )
  })

  it('createPurchaseReceipt pošle pobočku v těle dokladu', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().createPurchaseReceipt({
      supplierName: 'Makro',
      documentNumber: 'DL-1',
      receivedOn: '2026-07-06',
      note: null,
      locationId: 'bar-1',
      items: [{ productId: 'prod-1', quantity: 4, unitCost: 12 }],
    })

    expect(http.post).toHaveBeenCalledWith('/inventory/purchase-receipts', {
      supplierName: 'Makro',
      documentNumber: 'DL-1',
      receivedOn: '2026-07-06',
      note: null,
      locationId: 'bar-1',
      items: [{ productId: 'prod-1', quantity: 4, unitCost: 12 }],
    })
  })
})
