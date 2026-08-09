import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTables } from '@/composables/useTables'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useTables — stránkování stolů', () => {
  it('načte a spojí všechny stránky stolů vybraného patra', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `t${index + 1}` }))
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        items: firstPage,
        total: 101,
        page: 1,
        pageSize: 100,
      } as never)
      .mockResolvedValueOnce({
        items: [{ id: 't101' }],
        total: 101,
        page: 2,
        pageSize: 100,
      } as never)

    const result = await useTables().listByFloor('floor-1')

    expect(result).toHaveLength(101)
    expect(result.at(-1)?.id).toBe('t101')
    expect(http.get).toHaveBeenNthCalledWith(1, '/tables?floorId=floor-1&page=1&pageSize=100')
    expect(http.get).toHaveBeenNthCalledWith(2, '/tables?floorId=floor-1&page=2&pageSize=100')
  })
})
