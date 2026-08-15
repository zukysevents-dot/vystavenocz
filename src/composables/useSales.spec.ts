import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSales } from '@/composables/useSales'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSales — kontrakt volání', () => {
  it('create vždy posílá discountPercent (default 0) na řádku i na účtu, tipAmount 0', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create('Cash', [
      { productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 },
    ])
    expect(http.post).toHaveBeenCalledWith('/sales', {
      paymentMethod: 'Cash',
      locationId: null,
      items: [
        {
          productId: 'p1',
          description: 'Burger',
          quantity: 1,
          unitPrice: 199,
          vatRate: 12,
          discountPercent: 0,
        },
      ],
      discountPercent: 0,
      tipAmount: 0,
      cashReceived: null,
      priceLevelId: null,
      customerId: null,
      redeemPoints: 0,
      idempotencyKey: null,
    })
  })

  it('create pošle idempotency klíč — retry po timeoutu nesmí naúčtovat dvakrát', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Cash',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { idempotencyKey: 'pokus-1' },
    )
    expect(http.post).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ idempotencyKey: 'pokus-1' }),
    )
  })

  it('create pošle přijatou hotovost (cashReceived) při platbě hotově', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Cash',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { cashReceived: 500 },
    )
    expect(http.post).toHaveBeenCalledWith('/sales', expect.objectContaining({ cashReceived: 500 }))
  })

  it('create pošle zvolenou provozovnu (locationId) do těla prodeje', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Cash',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { locationId: 'loc-1' },
    )
    expect(http.post).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ locationId: 'loc-1' }),
    )
  })

  it('create s prázdným locationId ("") pošle null (klient bez provozoven)', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Cash',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { locationId: '' },
    )
    expect(http.post).toHaveBeenCalledWith('/sales', expect.objectContaining({ locationId: null }))
  })

  it('create pošle zadanou slevu na účet a spropitné', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Card',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { discountPercent: 10, tipAmount: 50 },
    )
    expect(http.post).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ discountPercent: 10, tipAmount: 50 }),
    )
  })

  it('create pošle zvolenou cenovou hladinu (priceLevelId)', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Card',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { priceLevelId: 'vip-1' },
    )
    expect(http.post).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ priceLevelId: 'vip-1' }),
    )
  })

  it('create pošle zákazníka a uplatněné body', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Card',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { customerId: 'cust-1', redeemPoints: 25 },
    )
    expect(http.post).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ customerId: 'cust-1', redeemPoints: 25 }),
    )
  })

  it('get volá GET /sales/{id}', async () => {
    vi.mocked(http.get).mockResolvedValue({ id: 's1' } as never)
    await useSales().get('s1')
    expect(http.get).toHaveBeenCalledWith('/sales/s1')
  })

  it('create s options obsahujícím jen discountPercent doplní tipAmount na 0', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Card',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { discountPercent: 15 },
    )
    expect(http.post).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ discountPercent: 15, tipAmount: 0 }),
    )
  })

  it('create s options obsahujícím jen tipAmount doplní discountPercent na 0', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create(
      'Card',
      [{ productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 }],
      { tipAmount: 30 },
    )
    expect(http.post).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ discountPercent: 0, tipAmount: 30 }),
    )
  })

  it('create vrací sale response z API (např. i s vypočtenými totals ze serveru)', async () => {
    const serverSale = { id: 's1', totalNet: 100, totalVat: 21, discountPercent: 10, tipAmount: 20 }
    vi.mocked(http.post).mockResolvedValue(serverSale as never)
    const result = await useSales().create('Cash', [
      { productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 },
    ])
    expect(result).toEqual(serverSale)
  })

  it('list volá GET /sales a rozbalí paged obálku (.items)', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [{ id: 's1' }], total: 1 } as never)
    const r = await useSales().list()
    expect(http.get).toHaveBeenCalledWith('/sales?pageSize=50')
    expect(r).toEqual([{ id: 's1' }])
  })

  it('storno volá POST /sales/{id}/storno', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)
    await useSales().storno('s1')
    expect(http.post).toHaveBeenCalledWith('/sales/s1/storno')
  })

  // Regrese produkčního nálezu (2026-08-15): pokladna baru A ukazovala v „Tržby" celofiremní čísla
  // (5 000 Kč), zatímco její vlastní uzávěrka měla 0 Kč — modal posílal dotaz BEZ locationId.
  it('summaryToday s pobočkou volá GET /sales/summary?locationId=', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await useSales().summaryToday('loc1')
    expect(http.get).toHaveBeenCalledWith('/sales/summary?locationId=loc1')
  })

  it('summaryToday bez pobočky zůstává celofiremní (firma bez provozoven)', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await useSales().summaryToday(null)
    expect(http.get).toHaveBeenCalledWith('/sales/summary')
  })

  it('list s pobočkou volá GET /sales?locationId= (obsluha nesmí stornovat účtenku jiné prodejny)', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [{ id: 's1' }], total: 1 } as never)
    await useSales().list('loc1')
    expect(http.get).toHaveBeenCalledWith('/sales?pageSize=50&locationId=loc1')
  })
})
