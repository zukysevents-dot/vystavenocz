import { describe, expect, it } from 'vitest'
import {
  APP_MODULES,
  APP_NAV_DEFINITIONS,
  BUSINESS_PROFILES,
  DEFAULT_ENABLED_MODULES,
  isModuleEnabled,
  normalizeModules,
} from '@/lib/modules'

describe('module capabilities', () => {
  it('defaults to all modules so the current app stays available before tenant selection exists', () => {
    expect(DEFAULT_ENABLED_MODULES).toEqual([...APP_MODULES])
  })

  it('normalizes API module payload and drops unknown modules', () => {
    expect(normalizeModules(['core', 'gastro', 'unknown'])).toEqual(['core', 'gastro'])
  })

  it('keeps the core module enabled even when older payloads omit it', () => {
    expect(normalizeModules(['gastro', 'pos'])).toEqual(['core', 'gastro', 'pos'])
  })

  it('falls back to all modules when API does not return module capabilities yet', () => {
    expect(normalizeModules(undefined)).toEqual(DEFAULT_ENABLED_MODULES)
    expect(normalizeModules([])).toEqual(DEFAULT_ENABLED_MODULES)
  })

  it('checks whether a module is enabled', () => {
    expect(isModuleEnabled('gastro', ['core', 'gastro'])).toBe(true)
    expect(isModuleEnabled('stock', ['core', 'gastro'])).toBe(false)
  })

  it('business profiles always include core and keep vertical modules scoped', () => {
    const gastro = BUSINESS_PROFILES.find((profile) => profile.id === 'gastro')!
    const crafts = BUSINESS_PROFILES.find((profile) => profile.id === 'crafts')!
    const warehouse = BUSINESS_PROFILES.find((profile) => profile.id === 'warehouse')!

    expect(BUSINESS_PROFILES.every((profile) => profile.modules.includes('core'))).toBe(true)
    expect(gastro.modules).toContain('gastro')
    expect(gastro.modules).toContain('pos')
    expect(crafts.modules).toContain('jobs')
    expect(crafts.modules).not.toContain('gastro')
    expect(warehouse.modules).toContain('stock')
    expect(warehouse.modules).not.toContain('pos')
    expect(warehouse.modules).not.toContain('gastro')
  })

  it('hides the shift planner nav from staff and accountant (wage privacy)', () => {
    const smeny = APP_NAV_DEFINITIONS.find((item) => item.to === '/app/smeny')!

    expect(smeny.module).toBe('attendance')
    expect(smeny.hiddenForRoles).toEqual(['Employee', 'Accountant'])
  })

  it('keeps branch and day-close navigation aligned with their route role gates', () => {
    const branches = APP_NAV_DEFINITIONS.find((item) => item.to === '/app/pobocky')!
    const dayClose = APP_NAV_DEFINITIONS.find((item) => item.to === '/app/uzaverka')!

    expect(branches.hiddenForRoles).toEqual(['Employee', 'Accountant', 'Manager'])
    expect(dayClose.hiddenForRoles).toEqual(['Employee', 'Accountant'])
  })

  it('business profiles define actionable onboarding setup steps', () => {
    const gastro = BUSINESS_PROFILES.find((profile) => profile.id === 'gastro')!
    const warehouse = BUSINESS_PROFILES.find((profile) => profile.id === 'warehouse')!

    expect(BUSINESS_PROFILES.every((profile) => profile.setupSteps.length > 0)).toBe(true)
    expect(gastro.setupSteps[0]).toMatchObject({
      label: 'Založit provozovny',
      to: '/app/pobocky',
    })
    expect(gastro.setupSteps.map((step) => step.to)).toContain('/app/mapa-stolu')
    expect(gastro.setupSteps.map((step) => step.to)).toContain('/app/uzaverka')
    expect(warehouse.setupSteps.map((step) => step.to)).toContain('/app/sklad')
    expect(warehouse.setupSteps.map((step) => step.to)).not.toContain('/app/pokladna')
  })

  it('keeps operational stock documents visible without a POS or gastro module', () => {
    const documents = APP_NAV_DEFINITIONS.find((item) => item.to === '/app/skladove-doklady')!
    const purchaseOrders = APP_NAV_DEFINITIONS.find((item) => item.to === '/app/nakupni-objednavky')!
    const modifiers = APP_NAV_DEFINITIONS.find((item) => item.to === '/app/modifikatory')!

    expect(documents.module).toBe('stock')
    expect(purchaseOrders.module).toBe('stock')
    expect(modifiers.module).toBe('gastro')
  })
})
