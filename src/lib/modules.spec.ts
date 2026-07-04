import { describe, expect, it } from 'vitest'
import {
  APP_MODULES,
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

    expect(BUSINESS_PROFILES.every((profile) => profile.modules.includes('core'))).toBe(true)
    expect(gastro.modules).toContain('gastro')
    expect(gastro.modules).toContain('pos')
    expect(crafts.modules).toContain('jobs')
    expect(crafts.modules).not.toContain('gastro')
  })
})
