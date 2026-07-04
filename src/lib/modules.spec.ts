import { describe, expect, it } from 'vitest'
import {
  APP_MODULES,
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
})
