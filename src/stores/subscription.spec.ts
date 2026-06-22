import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('subscription store — přístupová logika', () => {
  it('aktivní Pro → isPaid, ne trial', () => {
    const s = useSubscriptionStore()
    s.activatePro()
    expect(s.isPaid).toBe(true)
    expect(s.isTrial).toBe(false)
  })

  it('běžící trial → isTrial a trialDaysLeft > 0, ne isPaid', () => {
    const s = useSubscriptionStore()
    s.subscription = {
      active: true,
      plan: 'trial',
      trialEndsAt: isoDaysFromNow(10),
      subscriptionUntil: null,
    }
    expect(s.isTrial).toBe(true)
    expect(s.trialDaysLeft).toBeGreaterThan(0)
    expect(s.isPaid).toBe(false)
  })

  it('expirovaný trial → trialDaysLeft 0 a není isTrial ani isPaid', () => {
    const s = useSubscriptionStore()
    s.subscription = {
      active: true,
      plan: 'trial',
      trialEndsAt: isoDaysFromNow(-1),
      subscriptionUntil: null,
    }
    expect(s.trialDaysLeft).toBe(0)
    expect(s.isTrial).toBe(false)
    expect(s.isPaid).toBe(false)
  })

  it('init bez uložených dat založí 14denní trial', () => {
    const s = useSubscriptionStore()
    s.init()
    expect(s.subscription?.plan).toBe('trial')
    expect(s.trialDaysLeft).toBeGreaterThan(0)
    expect(s.trialDaysLeft).toBeLessThanOrEqual(14)
  })
})
