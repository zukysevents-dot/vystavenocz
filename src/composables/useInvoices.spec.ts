import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { http, isApiMode } from '@/lib/http'
import { useInvoices } from '@/composables/useInvoices'

// `useInvoices` si drží `useApi('invoices')` v modulovém scope a `useApi` se rozhoduje
// mezi HTTP a localStorage UŽ PŘI VYTVOŘENÍ — proto musí `isApiMode` vracet true hned
// při importu modulu, ne až v beforeEach.
vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
  isApiMode: vi.fn(() => true),
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super(`ApiError ${status}`)
    }
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isApiMode).mockReturnValue(true)
  localStorage.clear()
  setActivePinia(createPinia())
})

function page(items: unknown[], total: number, p: number) {
  return { items, total, page: p, pageSize: 100 }
}

describe('useInvoices.load — účetní agregace potřebuje VŠECHNY doklady', () => {
  it('projde všechny stránky, ne jen prvních 100', async () => {
    vi.mocked(isApiMode).mockReturnValue(true)
    // 148 dokladů = 2 stránky. Prvních 100 jsou koncepty (Účtárna je odfiltruje),
    // teprve na 2. stránce jsou vystavené doklady, ze kterých se export skládá.
    const drafts = Array.from({ length: 100 }, (_, i) => ({
      id: `draft-${i}`,
      status: 'Draft',
      documentType: 'Invoice',
    }))
    const issued = Array.from({ length: 48 }, (_, i) => ({
      id: `issued-${i}`,
      status: 'Issued',
      documentType: 'Invoice',
      issueDate: '2026-08-01',
    }))
    vi.mocked(http.get)
      .mockResolvedValueOnce(page(drafts, 148, 1) as never)
      .mockResolvedValueOnce(page(issued, 148, 2) as never)

    const { invoices, load } = useInvoices()
    await load()

    expect(http.get).toHaveBeenCalledTimes(2)
    expect(invoices.value).toHaveLength(148)
    // Bez 2. stránky by Účtárna tvrdila „Žádné doklady k exportu" a export by nešel spustit.
    expect(invoices.value.filter((i) => i.status === 'issued')).toHaveLength(48)
  })

  it('výpadek serveru nastaví loadError a nenechá zavádějící prázdný seznam bez příznaku', async () => {
    vi.mocked(isApiMode).mockReturnValue(true)
    vi.mocked(http.get).mockRejectedValue(new Error('network'))

    const { invoices, loadError, load } = useInvoices()
    await load()

    expect(invoices.value).toEqual([])
    expect(loadError.value).toBe(true)
  })
})
