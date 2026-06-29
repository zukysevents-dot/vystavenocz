import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrders } from '@/composables/useOrders'
import { http } from '@/lib/http'

// Past, kterou hlídáme: backend bere Note/Course jako celý update (default null),
// takže změna množství MUSÍ posílat i aktuální note/course, jinak je smaže.
vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useOrders — payload položek (note/course)', () => {
  it('addItem bez meta neposílá note/course (nová položka)', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)
    await useOrders().addItem('o1', 'p1', 2)
    expect(http.post).toHaveBeenCalledWith('/orders/o1/items', { productId: 'p1', quantity: 2 })
  })

  it('addItem s meta přibalí note a course', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)
    await useOrders().addItem('o1', 'p1', 1, { note: 'bez cibule', course: '1. chod' })
    expect(http.post).toHaveBeenCalledWith('/orders/o1/items', {
      productId: 'p1',
      quantity: 1,
      note: 'bez cibule',
      course: '1. chod',
    })
  })

  it('updateItem posílá quantity i meta — změna množství nesmaže poznámku/chod', async () => {
    vi.mocked(http.put).mockResolvedValue({} as never)
    await useOrders().updateItem('o1', 'i1', 3, { note: 'extra sýr', course: null })
    expect(http.put).toHaveBeenCalledWith('/orders/o1/items/i1', {
      quantity: 3,
      note: 'extra sýr',
      course: null,
    })
  })
})
