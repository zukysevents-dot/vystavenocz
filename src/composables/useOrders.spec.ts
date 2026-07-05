import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOrders } from '@/composables/useOrders'
import { http } from '@/lib/http'

// Past, kterou hlídáme: backend bere Note/Course jako celý update (default null),
// takže změna množství MUSÍ posílat i aktuální note/course, jinak je smaže.
vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() },
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

  it('move volá POST /orders/{id}/move s tělem { tableId }', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)
    await useOrders().move('o1', 't2')
    expect(http.post).toHaveBeenCalledWith('/orders/o1/move', { tableId: 't2' })
  })

  it('merge volá POST /orders/{targetId}/merge s tělem { sourceOrderId } (položky jdou ze zdroje do cíle)', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)
    await useOrders().merge('target', 'source')
    expect(http.post).toHaveBeenCalledWith('/orders/target/merge', { sourceOrderId: 'source' })
  })

  it('merge vrací aktualizovaný cílový Order z API (se sloučenými položkami)', async () => {
    const mergedTarget = { id: 'target', status: 'Open', splitGroups: [], items: [{ id: 'i1' }] }
    vi.mocked(http.post).mockResolvedValue(mergedTarget as never)
    const result = await useOrders().merge('target', 'source')
    expect(result).toEqual(mergedTarget)
  })

  it('updateDiscount volá PATCH /orders/{id}/discount s discountPercent a tipAmount', async () => {
    vi.mocked(http.patch).mockResolvedValue({} as never)
    await useOrders().updateDiscount('o1', { discountPercent: 10, tipAmount: 50 })
    expect(http.patch).toHaveBeenCalledWith('/orders/o1/discount', {
      discountPercent: 10,
      tipAmount: 50,
    })
  })

  it('updateDiscount posílá jen zadaná pole beze změny (nepřidává default 0 za volajícího)', async () => {
    vi.mocked(http.patch).mockResolvedValue({} as never)
    await useOrders().updateDiscount('o1', { discountPercent: 10 })
    expect(http.patch).toHaveBeenCalledWith('/orders/o1/discount', { discountPercent: 10 })
  })

  it('updateDiscount vrací Order response z API (aktuální serverový stav)', async () => {
    const serverOrder = {
      id: 'o1',
      discountPercent: 10,
      tipAmount: 50,
      totalNet: 900,
      totalVat: 189,
    }
    vi.mocked(http.patch).mockResolvedValue(serverOrder as never)
    const result = await useOrders().updateDiscount('o1', { discountPercent: 10, tipAmount: 50 })
    expect(result).toEqual(serverOrder)
  })

  it('pay neposílá discountPercent/tipAmount — bere se z persistovaného stavu Order', async () => {
    vi.mocked(http.post).mockResolvedValue({} as never)
    await useOrders().pay('o1', 'Cash')
    expect(http.post).toHaveBeenCalledWith('/orders/o1/pay', { paymentMethod: 'Cash' })
  })

  it('updateSplit volá PUT /orders/{id}/split s celým polem splitGroups (idempotentní nahrazení)', async () => {
    vi.mocked(http.put).mockResolvedValue({} as never)
    const splitGroups = [
      { id: 'g1', label: 'Petr', items: [{ itemId: 'i1', fraction: 1 }] },
      { id: 'g2', label: 'Jana', items: [{ itemId: 'i2', fraction: 0.5 }] },
    ]
    await useOrders().updateSplit('o1', splitGroups)
    expect(http.put).toHaveBeenCalledWith('/orders/o1/split', { splitGroups })
  })
})
