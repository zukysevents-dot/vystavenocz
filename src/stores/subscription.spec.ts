import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'
import type { AccessMode, EntitlementSnapshot, PlanStatus } from '@/lib/entitlements'

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function snapshot(
  status: PlanStatus,
  accessMode: AccessMode,
  renewsAt: string | null,
  graceEndsAt: string | null = null,
): EntitlementSnapshot {
  return {
    companyId: 'c1',
    plan: {
      id: 'growth',
      name: 'Růst',
      status,
      renewsAt,
      graceEndsAt,
      canManageSubscription: true,
    },
    modules: ['core', 'invoicing'],
    features: [],
    limits: {},
    accessMode,
    lockedModules: ['gastro'],
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

// Stav předplatného MUSÍ pocházet ze serveru. Dřív si ho store uděloval sám v localStorage
// (včetně `activatePro()`), takže se dal z prohlížeče zfalšovat.
describe('subscription store — derivovaný ze serveru', () => {
  it('zkušební doba: isTrial a zbývající dny podle data ze serveru', () => {
    useAuthStore().entitlement = snapshot('trial', 'full', isoDaysFromNow(10))
    const s = useSubscriptionStore()

    expect(s.isTrial).toBe(true)
    expect(s.isPaid).toBe(false)
    expect(s.trialDaysLeft).toBeGreaterThan(0)
    expect(s.trialDaysLeft).toBeLessThanOrEqual(10)
  })

  it('aktivní zaplacený tarif: isPaid, ne zkušební doba', () => {
    useAuthStore().entitlement = snapshot('active', 'full', isoDaysFromNow(30))
    const s = useSubscriptionStore()

    expect(s.isPaid).toBe(true)
    expect(s.isTrial).toBe(false)
    expect(s.trialDaysLeft).toBeNull()
  })

  it('ochranná lhůta: přístup je pořád plný, ale hlásí se jako grace', () => {
    useAuthStore().entitlement = snapshot(
      'grace_period',
      'full',
      isoDaysFromNow(-2),
      isoDaysFromNow(12),
    )
    const s = useSubscriptionStore()

    expect(s.isGracePeriod).toBe(true)
    expect(s.isPaid).toBe(true) // provoz nesmí stát
  })

  it('po expiraci není isPaid ani isTrial (jen ke čtení)', () => {
    useAuthStore().entitlement = snapshot('expired', 'read_only', isoDaysFromNow(-40))
    const s = useSubscriptionStore()

    expect(s.isPaid).toBe(false)
    expect(s.isTrial).toBe(false)
  })

  it('pozastavený přístup není isPaid', () => {
    useAuthStore().entitlement = snapshot('suspended', 'locked', null)
    const s = useSubscriptionStore()

    expect(s.isPaid).toBe(false)
    expect(s.isTrial).toBe(false)
  })

  it('store nemá žádnou cestu, jak tarif lokálně aktivovat', () => {
    const s = useSubscriptionStore() as unknown as Record<string, unknown>
    expect(s.activatePro).toBeUndefined()
  })
})
