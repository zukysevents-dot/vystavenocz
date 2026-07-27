import { describe, expect, it } from 'vitest'
import { APP_MODULES } from '@/lib/modules'
import {
  ENTITLEMENT_REASONS,
  MODULE_UPSELL,
  daysUntil,
  permissiveSnapshot,
  upsellFor,
} from '@/lib/entitlements'

describe('entitlements — upsell texty', () => {
  it('každý modul má upsell text (jinak by zamčená obrazovka byla prázdná)', () => {
    for (const module of APP_MODULES) expect(MODULE_UPSELL[module]).toBeDefined()
  })

  it('upsell mluví o přínosu, ne o technickém názvu ani chybě', () => {
    for (const module of APP_MODULES) {
      const upsell = MODULE_UPSELL[module]
      expect(upsell.title.length).toBeGreaterThan(2)
      expect(upsell.benefit.length).toBeGreaterThan(20)
      expect(upsell.plan.length).toBeGreaterThan(2)

      // Zakázané jsou interní pojmy a chybové kódy. Běžné produktové názvy (CRM, API u propojení
      // pro vývojáře) jsou v pořádku — zákazník je z aplikace i ceníku zná.
      const text = `${upsell.title} ${upsell.benefit} ${upsell.plan} ${upsell.points.join(' ')}`
      for (const forbidden of [
        '403',
        'feature flag',
        'module_not_in_plan',
        'entitlement',
        'billing event',
        'endpoint',
        'backend',
      ]) {
        expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase())
      }
    }
  })

  it('neznámý modul dostane bezpečný fallback, nikoli výjimku', () => {
    const upsell = upsellFor('nesmyslny_modul')
    expect(upsell.title.length).toBeGreaterThan(0)
    expect(upsell.points).toEqual([])
  })
})

describe('entitlements — pomocné funkce', () => {
  it('daysUntil vrací null bez data a nikdy zápor', () => {
    expect(daysUntil(null)).toBeNull()
    expect(daysUntil('nedatum')).toBeNull()

    const now = Date.parse('2026-07-26T12:00:00Z')
    expect(daysUntil('2026-07-31T12:00:00Z', now)).toBe(5)
    expect(daysUntil('2026-07-20T12:00:00Z', now)).toBe(0)
  })

  it('fallback snapshot je povolující, aby chybějící odpověď neblokovala UI', () => {
    const snapshot = permissiveSnapshot(['core', 'pos'])
    expect(snapshot.accessMode).toBe('full')
    expect(snapshot.modules).toEqual(['core', 'pos'])
    expect(snapshot.lockedModules).toEqual([])
  })

  it('strojové důvody odpovídají backend kontraktu', () => {
    expect(ENTITLEMENT_REASONS).toEqual({
      moduleNotInPlan: 'module_not_in_plan',
      readOnly: 'subscription_read_only',
      locked: 'subscription_locked',
    })
  })
})
