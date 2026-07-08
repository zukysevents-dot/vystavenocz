import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from '@/lib/http'
import { usePromotions } from './usePromotions'

vi.mock('@/lib/http', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
  isApiMode: () => true,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePromotions', () => {
  it('načte cenové hladiny a promo pravidla z backendu', async () => {
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        items: [{ id: 'level-1', name: 'VIP', adjustmentPercent: -10 }],
        total: 1,
        page: 1,
        pageSize: 100,
      } as never)
      .mockResolvedValueOnce({
        items: [
          {
            id: 'rule-1',
            name: 'Happy hour',
            type: 'Percent',
            scope: 'Categories',
            percent: 20,
            amount: null,
            productIds: [],
            categoryIds: ['cat-1'],
            daysOfWeek: [3],
            startTime: '16:00',
            endTime: '18:00',
            minSubtotal: null,
            priority: 10,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 100,
      } as never)

    const api = usePromotions()

    await expect(api.listPriceLevels()).resolves.toEqual([
      { id: 'level-1', name: 'VIP', adjustmentPercent: -10 },
    ])
    await expect(api.listPromotions()).resolves.toEqual([
      {
        id: 'rule-1',
        name: 'Happy hour',
        type: 'percent',
        scope: 'categories',
        percent: 20,
        amount: undefined,
        productIds: [],
        categoryIds: ['cat-1'],
        daysOfWeek: [3],
        startTime: '16:00',
        endTime: '18:00',
        minSubtotal: undefined,
        priority: 10,
      },
    ])

    expect(http.get).toHaveBeenNthCalledWith(1, '/price-levels?pageSize=100')
    expect(http.get).toHaveBeenNthCalledWith(2, '/promotions?pageSize=100')
  })

  it('vytvoří promo pravidlo v backend kontraktu', async () => {
    vi.mocked(http.post).mockResolvedValue({
      id: 'rule-1',
      name: 'Burger week',
      type: 'Percent',
      scope: 'Products',
      percent: 15,
      amount: null,
      productIds: ['product-1'],
      categoryIds: [],
      daysOfWeek: [],
      startTime: null,
      endTime: null,
      minSubtotal: null,
      priority: 5,
    } as never)

    await usePromotions().createPromotion({
      name: 'Burger week',
      type: 'percent',
      scope: 'products',
      percent: 15,
      productIds: ['product-1'],
      priority: 5,
    })

    expect(http.post).toHaveBeenCalledWith('/promotions', {
      name: 'Burger week',
      type: 'Percent',
      scope: 'Products',
      percent: 15,
      amount: null,
      productIds: ['product-1'],
      categoryIds: [],
      daysOfWeek: [],
      startTime: null,
      endTime: null,
      minSubtotal: null,
      priority: 5,
    })
  })

  it('počítá náhled přes serverový endpoint', async () => {
    vi.mocked(http.post).mockResolvedValue({ total: 100, lines: [] } as never)

    await usePromotions().calculate(
      [{ productId: null, categoryId: null, name: 'Espresso', quantity: 1, unitPrice: 100 }],
      'level-1',
      [],
      null,
    )

    expect(http.post).toHaveBeenCalledWith('/promotions/calculate', {
      priceLevelId: 'level-1',
      lines: [{ productId: null, categoryId: null, name: 'Espresso', quantity: 1, unitPrice: 100 }],
    })
  })
})
