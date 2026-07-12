import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { getTokens, setTokens } from '@/lib/http'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('auth store — hasRole (role gating)', () => {
  it('neznámá role (null, mock režim) → fail-open, hasRole vrací true', () => {
    const s = useAuthStore()
    expect(s.role).toBeNull()
    expect(s.hasRole('Owner', 'Manager')).toBe(true)
  })

  it('role sedí v seznamu → true', () => {
    const s = useAuthStore()
    s.role = 'Manager'
    expect(s.hasRole('Owner', 'Manager')).toBe(true)
  })

  it('role není v seznamu → false', () => {
    const s = useAuthStore()
    s.role = 'Employee'
    expect(s.hasRole('Owner', 'Manager')).toBe(false)
  })
})

describe('auth store — module and feature gating', () => {
  it('defaultně má zapnuté všechny moduly, aby se současná aplikace nezamkla', () => {
    const s = useAuthStore()
    expect(s.hasModule('gastro')).toBe(true)
    expect(s.hasModule('invoicing')).toBe(true)
  })

  it('features jsou fail-open, dokud je backend ve starém kontraktu nevrací', () => {
    const s = useAuthStore()
    expect(s.hasFeature('pos.operate')).toBe(true)
  })
})

describe('auth store — neplatná API session', () => {
  it('zahodí cache identity a tokeny, když už účet na API neexistuje', async () => {
    window.__VYSTAVENO_API_URL__ = '/api/v1'
    setTokens({ accessToken: 'old-access', refreshToken: 'old-refresh' })
    localStorage.setItem(
      'vystaveno.auth.session.v1',
      JSON.stringify({
        user: { id: 'old-user', email: 'demo@vystaveno.cz', fullName: null },
        companyId: 'old-company',
        role: 'Owner',
        modules: ['core', 'gastro'],
        features: [],
      }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })),
    )

    const s = useAuthStore()
    await s.validateSession()

    expect(s.isAuthenticated).toBe(false)
    expect(getTokens()).toBeNull()
    expect(localStorage.getItem('vystaveno.auth.session.v1')).toBeNull()

    vi.unstubAllGlobals()
    delete window.__VYSTAVENO_API_URL__
  })
})
