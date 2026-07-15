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
  it('movements načte všechny stránky a po dokončení ověří stabilní ledger', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `move-${String(102 - index).padStart(3, '0')}`,
      createdAt: `2026-07-14T10:${String(index % 60).padStart(2, '0')}:00Z`,
    }))
    const secondPage = [
      { id: 'move-002', createdAt: '2026-07-01T10:00:00Z' },
      { id: 'move-001', createdAt: '2026-07-01T09:00:00Z' },
    ]
    vi.mocked(http.get)
      .mockResolvedValueOnce({ items: firstPage, total: 102, page: 1, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: secondPage, total: 102, page: 2, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: firstPage, total: 102, page: 1, pageSize: 100 } as never)

    const result = await useInventory().movements({
      from: '2026-07-01',
      to: '2026-07-14',
      productId: 'prod-1',
      type: 'Receipt',
      locationId: 'loc-1',
      stockLotId: 'lot-1',
    })

    expect(result).toHaveLength(102)
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      '/inventory/movements?page=1&pageSize=100&sort=-date&from=2026-07-01&to=2026-07-14&productId=prod-1&type=Receipt&locationId=loc-1&stockLotId=lot-1',
    )
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      '/inventory/movements?page=2&pageSize=100&sort=-date&from=2026-07-01&to=2026-07-14&productId=prod-1&type=Receipt&locationId=loc-1&stockLotId=lot-1',
    )
    expect(http.get).toHaveBeenNthCalledWith(
      3,
      '/inventory/movements?page=1&pageSize=100&sort=-date&from=2026-07-01&to=2026-07-14&productId=prod-1&type=Receipt&locationId=loc-1&stockLotId=lot-1',
    )
  })

  it('movements selže zavřeně, když se ledger během stránkování změní', async () => {
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        items: [{ id: 'move-1' }],
        total: 1,
        page: 1,
        pageSize: 100,
      } as never)
      .mockResolvedValueOnce({
        items: [{ id: 'move-2' }],
        total: 2,
        page: 1,
        pageSize: 100,
      } as never)

    await expect(useInventory().movements()).rejects.toThrow('během načítání změnily')
  })

  it('movements zachová autoritativní pořadí serveru i při různé přesnosti času', async () => {
    const items = [
      { id: 'newer', createdAt: '2026-07-14T10:00:00.100Z' },
      { id: 'older', createdAt: '2026-07-14T10:00:00Z' },
    ]
    vi.mocked(http.get).mockResolvedValue({ items, total: 2, page: 1, pageSize: 100 } as never)

    const result = await useInventory().movements()

    expect(result.map((movement) => movement.id)).toEqual(['newer', 'older'])
  })

  it('levels bez filtru volá základní stránkovaný endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 } as never)

    await useInventory().levels()

    expect(http.get).toHaveBeenCalledWith('/inventory/stock-levels?page=1&pageSize=100')
  })

  it('levels posílá pobočku jako query', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 } as never)

    await useInventory().levels({ locationId: 'bar-1' })

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/stock-levels?page=1&pageSize=100&locationId=bar-1',
    )
  })

  it('levels načte všechny stránky, aby produkty nad první stovkou nedostaly falešnou nulu', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      productId: `prod-${index + 1}`,
      quantity: index + 1,
    }))
    const secondPage = [
      { productId: 'prod-101', quantity: 101 },
      { productId: 'prod-102', quantity: 102 },
    ]
    vi.mocked(http.get)
      .mockResolvedValueOnce({ items: firstPage, total: 102, page: 1, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: secondPage, total: 102, page: 2, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: firstPage, total: 102, page: 1, pageSize: 100 } as never)

    const result = await useInventory().levels()

    expect(result).toHaveLength(102)
    expect(result.at(-1)).toEqual({ productId: 'prod-102', quantity: 102 })
    expect(http.get).toHaveBeenNthCalledWith(2, '/inventory/stock-levels?page=2&pageSize=100')
  })

  it('movementFilters načte tenantový katalog filtru z ledgeru', async () => {
    vi.mocked(http.get).mockResolvedValue({ products: [], locations: [] } as never)

    await useInventory().movementFilters()

    expect(http.get).toHaveBeenCalledWith('/inventory/movement-filters')
  })

  it('receive posílá pobočku do těla příjmu', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().receive('prod-1', 5, 'bar', 'bar-1')

    expect(http.post).toHaveBeenCalledWith('/inventory/receipts', {
      productId: 'prod-1',
      quantity: 5,
      note: 'bar',
      locationId: 'bar-1',
      lotNumber: null,
      expiresOn: null,
    })
  })

  it('receive posílá číslo šarže a expiraci', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().receive('prod-1', 5, null, 'bar-1', ' LOT-2026-A ', '2026-09-30')

    expect(http.post).toHaveBeenCalledWith('/inventory/receipts', {
      productId: 'prod-1',
      quantity: 5,
      note: null,
      locationId: 'bar-1',
      lotNumber: 'LOT-2026-A',
      expiresOn: '2026-09-30',
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
      stockLotId: null,
    })
  })

  it('issue dovolí přesný výdej z jedné šarže', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().issue('prod-1', 2, null, 'Expiration', 'bar-1', 'lot-1')

    expect(http.post).toHaveBeenCalledWith('/inventory/issues', {
      productId: 'prod-1',
      quantity: 2,
      note: null,
      type: 'Expiration',
      locationId: 'bar-1',
      stockLotId: 'lot-1',
    })
  })

  it('stockLots filtruje jen uvolněné šarže pro výdej', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 } as never)

    await useInventory().stockLots({ productId: 'prod-1', status: 'Active' })

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/stock-lots?page=1&pageSize=100&positiveOnly=true&productId=prod-1&status=Active',
    )
  })

  it('změna stavu šarže posílá cílový stav a povinný důvod', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().changeStockLotStatus('lot-1', 'Blocked', 'Poškozený obal')

    expect(http.post).toHaveBeenCalledWith('/inventory/stock-lots/lot-1/status', {
      status: 'Blocked',
      reason: 'Poškozený obal',
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
      stockLotId: null,
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

  it('stockValuation posílá období, pobočku, hledání, řazení a stránku', async () => {
    vi.mocked(http.get).mockResolvedValue({ products: { items: [], total: 0 } } as never)

    await useInventory().stockValuation({
      from: '2026-07-01',
      to: '2026-07-14',
      locationId: 'loc-1',
      search: '  káva  ',
      sort: '-loss',
      page: 2,
      pageSize: 25,
    })

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/stock-valuation?page=2&pageSize=25&sort=-loss&from=2026-07-01&to=2026-07-14&locationId=loc-1&search=k%C3%A1va',
    )
  })

  it('allStockValuation načte všechny stránky a zavřeně ověří verzi výpočtu', async () => {
    const base = {
      method: 'PeriodicWeightedAverage',
      from: '2026-07-01',
      to: '2026-07-14',
      locationId: null,
      currency: 'CZK',
      dataVersion: 'stable-v1',
      summary: { isComplete: true },
    }
    const firstItems = Array.from({ length: 100 }, (_, index) => ({
      productId: `prod-${index + 1}`,
    }))
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        ...base,
        products: { items: firstItems, total: 101, page: 1, pageSize: 100 },
      } as never)
      .mockResolvedValueOnce({
        ...base,
        products: { items: [{ productId: 'prod-101' }], total: 101, page: 2, pageSize: 100 },
      } as never)
      .mockResolvedValueOnce({
        ...base,
        products: { items: firstItems, total: 101, page: 1, pageSize: 100 },
      } as never)

    const result = await useInventory().allStockValuation({ from: '2026-07-01', to: '2026-07-14' })

    expect(result.products.items).toHaveLength(101)
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      '/inventory/stock-valuation?page=2&pageSize=100&sort=-stockValue&from=2026-07-01&to=2026-07-14',
    )
  })

  it('allStockValuation odmítne export, když se data mezi stránkami změní', async () => {
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        dataVersion: 'v1',
        products: { items: [{ productId: 'prod-1' }], total: 1, page: 1, pageSize: 100 },
      } as never)
      .mockResolvedValueOnce({
        dataVersion: 'v2',
        products: { items: [{ productId: 'prod-1' }], total: 1, page: 1, pageSize: 100 },
      } as never)

    await expect(useInventory().allStockValuation()).rejects.toThrow('během exportu změnilo')
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
      stockLotId: null,
    })
  })

  it('stockLots a aktivace sledování používají samostatné endpointy', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 } as never)
    vi.mocked(http.post).mockResolvedValue({} as never)

    await useInventory().stockLots({
      productId: 'prod-1',
      locationId: 'bar-1',
      expiresTo: '2026-08-31',
      positiveOnly: true,
      search: ' lot a ',
      page: 2,
      pageSize: 25,
    })
    await useInventory().enableLotTracking('prod-1')

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/stock-lots?page=2&pageSize=25&positiveOnly=true&productId=prod-1&locationId=bar-1&expiresTo=2026-08-31&search=lot+a',
    )
    expect(http.post).toHaveBeenCalledWith('/inventory/stock-lots/products/prod-1/enable', {})
  })

  it('allStockLots načte i šarže za první stovkou a ověří stabilní počet', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `lot-${index + 1}`,
      locationId: 'bar-1',
    }))
    const secondPage = [
      { id: 'lot-101', locationId: 'bar-1' },
      { id: 'lot-102', locationId: 'bar-1' },
    ]
    vi.mocked(http.get)
      .mockResolvedValueOnce({ items: firstPage, total: 102, page: 1, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: secondPage, total: 102, page: 2, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: firstPage, total: 102, page: 1, pageSize: 100 } as never)

    const result = await useInventory().allStockLots({
      productId: 'prod-1',
      locationId: 'bar-1',
      positiveOnly: true,
    })

    expect(result).toHaveLength(102)
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      '/inventory/stock-lots?page=2&pageSize=100&positiveOnly=true&productId=prod-1&locationId=bar-1',
    )
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

  it('stockByLocation volá centrální endpoint s pageSize', async () => {
    vi.mocked(http.get).mockResolvedValue({
      locations: [],
      products: { items: [], total: 0, page: 1, pageSize: 200 },
    } as never)

    await useInventory().stockByLocation()

    expect(http.get).toHaveBeenCalledWith('/inventory/stock-by-location?pageSize=200')
  })

  it('stockByLocation posílá hledání jako query', async () => {
    vi.mocked(http.get).mockResolvedValue({
      locations: [],
      products: { items: [], total: 0, page: 1, pageSize: 200 },
    } as never)

    await useInventory().stockByLocation('  káva  ')

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/stock-by-location?pageSize=200&search=k%C3%A1va',
    )
  })

  it('stockReservations posílá stav, produkt, pobočku a hledání', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 } as never)

    await useInventory().stockReservations({
      status: 'Active',
      productId: 'prod-1',
      locationId: 'bar-1',
      search: ' zakázka 7 ',
      page: 2,
      pageSize: 25,
    })

    expect(http.get).toHaveBeenCalledWith(
      '/inventory/stock-reservations?page=2&pageSize=25&sort=-date&status=Active&productId=prod-1&locationId=bar-1&search=zak%C3%A1zka+7',
    )
  })

  it('vytvoření a vyřízení rezervace používá samostatné endpointy', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)
    const inventory = useInventory()

    await inventory.createStockReservation({
      productId: 'prod-1',
      quantity: 2.5,
      reservedFor: ' Zakázka Z-1 ',
      locationId: 'bar-1',
      note: ' připravit ',
    })
    await inventory.releaseStockReservation('res-1', ' zrušeno ')
    await inventory.fulfillStockReservation('res-2', ' předáno ')

    expect(http.post).toHaveBeenNthCalledWith(1, '/inventory/stock-reservations', {
      productId: 'prod-1',
      quantity: 2.5,
      reservedFor: 'Zakázka Z-1',
      locationId: 'bar-1',
      note: 'připravit',
    })
    expect(http.post).toHaveBeenNthCalledWith(2, '/inventory/stock-reservations/res-1/release', {
      note: 'zrušeno',
    })
    expect(http.post).toHaveBeenNthCalledWith(3, '/inventory/stock-reservations/res-2/fulfill', {
      note: 'předáno',
    })
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
