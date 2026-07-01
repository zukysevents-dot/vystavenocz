import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, setTokens } from '@/lib/http'

// Ověřuje, že veřejná volání (klientský portál / rezervace) NEposílají Authorization,
// i když je operátor přihlášený — jinak by JWT unikl na neautorizovaný public endpoint.
describe('http — veřejná varianta bez auth', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setTokens({ accessToken: 'ACCESS', refreshToken: 'REFRESH' })
    fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    setTokens(null)
    vi.unstubAllGlobals()
  })

  function headersOf(call: number): Record<string, string> {
    return fetchMock.mock.calls[call][1].headers as Record<string, string>
  }

  it('getPublic neposílá Authorization ani při přihlášeném uživateli', async () => {
    await http.getPublic('/public/client/tok')
    expect(headersOf(0).Authorization).toBeUndefined()
  })

  it('postPublic neposílá Authorization', async () => {
    await http.postPublic('/public/client/tok/quotes/1/approve')
    expect(headersOf(0).Authorization).toBeUndefined()
  })

  it('běžný http.get Authorization posílá (regresní kontrola)', async () => {
    await http.get('/invoices')
    expect(headersOf(0).Authorization).toBe('Bearer ACCESS')
  })
})
