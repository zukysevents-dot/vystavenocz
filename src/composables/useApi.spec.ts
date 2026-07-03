import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, isApiMode } from '@/lib/http'
import { useApi } from '@/composables/useApi'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
  isApiMode: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number) {
      super(`ApiError ${status}`)
    }
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('useApi.listAll', () => {
  it('API režim: projde všechny stránky podle total a spojí je', async () => {
    vi.mocked(isApiMode).mockReturnValue(true)
    vi.mocked(http.get)
      .mockResolvedValueOnce({ items: [{ id: '1' }], total: 250, page: 1, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: [{ id: '2' }], total: 250, page: 2, pageSize: 100 } as never)
      .mockResolvedValueOnce({ items: [{ id: '3' }], total: 250, page: 3, pageSize: 100 } as never)

    const r = await useApi<{ id: string }>('sales').listAll()

    expect(http.get).toHaveBeenCalledTimes(3)
    expect(http.get).toHaveBeenNthCalledWith(1, '/sales?page=1&pageSize=100')
    expect(http.get).toHaveBeenNthCalledWith(3, '/sales?page=3&pageSize=100')
    expect(r.map((x) => x.id)).toEqual(['1', '2', '3'])
  })

  it('API režim: total ≤ pageSize → jen jedna stránka', async () => {
    vi.mocked(isApiMode).mockReturnValue(true)
    vi.mocked(http.get).mockResolvedValue({
      items: [{ id: '1' }, { id: '2' }],
      total: 2,
      page: 1,
      pageSize: 100,
    } as never)

    const r = await useApi<{ id: string }>('sales').listAll()

    expect(http.get).toHaveBeenCalledTimes(1)
    expect(r.map((x) => x.id)).toEqual(['1', '2'])
  })

  it('API režim: deduplikuje podle id (kdyby backend ignoroval page)', async () => {
    vi.mocked(isApiMode).mockReturnValue(true)
    // Backend „zapomene" na page a vrací pořád stejnou stránku → nesmí vzniknout duplicity.
    vi.mocked(http.get).mockResolvedValue({
      items: [{ id: '1' }, { id: '2' }],
      total: 250,
      page: 1,
      pageSize: 100,
    } as never)

    const r = await useApi<{ id: string }>('sales').listAll()

    expect(r.map((x) => x.id).sort()).toEqual(['1', '2'])
  })

  it('mock režim: listAll čte vše z localStorage', async () => {
    vi.mocked(isApiMode).mockReturnValue(false)
    localStorage.setItem('vystaveno:sales', JSON.stringify([{ id: 'a' }, { id: 'b' }]))

    const r = await useApi<{ id: string }>('sales').listAll()

    expect(http.get).not.toHaveBeenCalled()
    expect(r.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('API režim: total 0 → jeden request, prázdné pole', async () => {
    vi.mocked(isApiMode).mockReturnValue(true)
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 } as never)

    const r = await useApi<{ id: string }>('sales').listAll()

    expect(http.get).toHaveBeenCalledTimes(1)
    expect(r).toEqual([])
  })

  it('API režim: nad strop načte jen 50 stránek a zavaruje (ne 60)', async () => {
    vi.mocked(isApiMode).mockReturnValue(true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let n = 0
    vi.mocked(http.get).mockImplementation(
      async () => ({ items: [{ id: `id-${++n}` }], total: 6000, page: n, pageSize: 100 }) as never,
    )

    const r = await useApi<{ id: string }>('sales').listAll()

    expect(http.get).toHaveBeenCalledTimes(50) // strop LIST_ALL_MAX_PAGES, ne ceil(6000/100)=60
    expect(warn).toHaveBeenCalledOnce()
    expect(r).toHaveLength(50)
    warn.mockRestore()
  })
})
