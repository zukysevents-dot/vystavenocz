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
})
