import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

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
