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
  it('create vždy posílá discountPercent (default 0)', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 's1' } as never)
    await useSales().create('Cash', [
      { productId: 'p1', description: 'Burger', quantity: 1, unitPrice: 199, vatRate: 12 },
    ])
    expect(http.post).toHaveBeenCalledWith('/sales', {
      paymentMethod: 'Cash',
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
    })
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
})
