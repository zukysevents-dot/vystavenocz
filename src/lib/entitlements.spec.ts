import { describe, expect, it } from 'vitest'
import { APP_MODULES } from '@/lib/modules'
import { PRICING_MODULES } from '@/lib/pricing'
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

describe('entitlements — upsell sedí na ceník', () => {
  // Dřív byly v upsellu natvrdo napsané tarify „Základ / Provoz / Růst". Ceník je od schváleného
  // sazebníku modulární, takže zákazník četl název, který si na ceníku nenajde.
  it('každý placený modul nabízí modul, který ceník opravdu prodává, a jeho cenu', () => {
    const podleNazvu = new Map(PRICING_MODULES.map((m) => [`modul ${m.name}`, m]))

    for (const module of APP_MODULES) {
      const upsell = MODULE_UPSELL[module]
      if (upsell.priceMonthly === 0) continue // jádro a fakturace jsou v ceně

      const cenikovyModul = podleNazvu.get(upsell.plan)
      expect(cenikovyModul, `${module} nabízí „${upsell.plan}", to ceník neprodává`).toBeDefined()
      expect(upsell.priceMonthly).toBe(cenikovyModul!.monthly)
    }
  })

  it('fakturace a jádro se neprodávají — podle ceníku jsou zdarma navždy', () => {
    expect(MODULE_UPSELL.invoicing.priceMonthly).toBe(0)
    expect(MODULE_UPSELL.core.priceMonthly).toBe(0)
  })

  it('nadstavby vedení míří na jeden modul Plus, ne každá zvlášť', () => {
    for (const module of [
      'reporting',
      'loyalty',
      'crm',
      'integrations',
      'verified_signing',
    ] as const)
      expect(MODULE_UPSELL[module].plan).toBe('modul Plus')
  })

  it('upsell nikde neslibuje cenu s DPH — ceník je bez DPH', () => {
    for (const module of APP_MODULES) {
      const text = `${MODULE_UPSELL[module].benefit} ${MODULE_UPSELL[module].plan}`
      expect(text).not.toContain('s DPH')
    }
  })
})
