import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLoyalty } from '@/composables/useLoyalty'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), put: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useLoyalty - kontrakt nastavení programu', () => {
  it('getSettings volá GET /loyalty/settings', async () => {
    vi.mocked(http.get).mockResolvedValue({
      earnRateCzkPerPoint: 20,
      pointValueCzk: 1,
      maxRedeemPointsPerSale: 500,
    } as never)
    await useLoyalty().getSettings()
    expect(http.get).toHaveBeenCalledWith('/loyalty/settings')
  })

  it('updateSettings pošle celé nastavení věrnostního programu', async () => {
    const settings = {
      earnRateCzkPerPoint: 25,
      pointValueCzk: 2,
      maxRedeemPointsPerSale: 300,
    }
    vi.mocked(http.put).mockResolvedValue(settings as never)
    await useLoyalty().updateSettings(settings)
    expect(http.put).toHaveBeenCalledWith('/loyalty/settings', settings)
  })
})
