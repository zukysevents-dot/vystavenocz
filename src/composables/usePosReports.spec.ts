import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePosReports } from '@/composables/usePosReports'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

const range = { from: '2026-07-01', to: '2026-07-05' }

describe('usePosReports', () => {
  it('summary volá GET /pos-reports/summary s rozsahem období', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await usePosReports().summary(range)
    expect(http.get).toHaveBeenCalledWith('/pos-reports/summary?from=2026-07-01&to=2026-07-05')
  })

  it('summary přibalí locationId, když je zadané', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await usePosReports().summary(range, 'loc1')
    expect(http.get).toHaveBeenCalledWith(
      '/pos-reports/summary?from=2026-07-01&to=2026-07-05&locationId=loc1',
    )
  })

  it('revenue volá GET /pos-reports/revenue s granularitou Day defaultně', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await usePosReports().revenue(range)
    expect(http.get).toHaveBeenCalledWith(
      '/pos-reports/revenue?from=2026-07-01&to=2026-07-05&granularity=Day',
    )
  })

  it('revenue respektuje granularitu i locationId', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await usePosReports().revenue(range, 'Month', 'loc1')
    expect(http.get).toHaveBeenCalledWith(
      '/pos-reports/revenue?from=2026-07-01&to=2026-07-05&granularity=Month&locationId=loc1',
    )
  })

  it('costs volá GET /pos-reports/costs a přibalí locationId', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await usePosReports().costs(range, 'loc1')
    expect(http.get).toHaveBeenCalledWith(
      '/pos-reports/costs?from=2026-07-01&to=2026-07-05&locationId=loc1',
    )
  })

  it('staff volá GET /pos-reports/staff a přibalí locationId', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await usePosReports().staff(range, 'loc1')
    expect(http.get).toHaveBeenCalledWith(
      '/pos-reports/staff?from=2026-07-01&to=2026-07-05&locationId=loc1',
    )
  })

  it('losses volá GET /pos-reports/losses a přibalí locationId', async () => {
    vi.mocked(http.get).mockResolvedValue({} as never)
    await usePosReports().losses(range, 'loc1')
    expect(http.get).toHaveBeenCalledWith(
      '/pos-reports/losses?from=2026-07-01&to=2026-07-05&locationId=loc1',
    )
  })
})
