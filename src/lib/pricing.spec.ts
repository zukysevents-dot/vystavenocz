import { describe, it, expect } from 'vitest'
import {
  modulesMonthly,
  bundleSavingMonthly,
  yearlyPerMonth,
  MODULAR_PRICING,
  PRICING_MODULES,
  PRICING_SEGMENTS,
} from './pricing'

const ALL_KEYS = PRICING_MODULES.map((m) => m.key)

describe('modulesMonthly', () => {
  it('součet vybraných modulů u částečné sestavy', () => {
    expect(modulesMonthly(['invoicing'])).toBe(149)
    expect(modulesMonthly(['invoicing', 'pos'])).toBe(398)
  })

  it('zvýhodněná cena balíku při všech modulech (ne součet)', () => {
    expect(modulesMonthly(ALL_KEYS)).toBe(MODULAR_PRICING.bundleAllMonthly)
    expect(modulesMonthly(ALL_KEYS)).toBe(990)
  })

  it('prázdná sestava = 0', () => {
    expect(modulesMonthly([])).toBe(0)
  })
})

describe('bundleSavingMonthly', () => {
  it('měsíční režim: úspora balíku oproti součtu všech modulů (1244 − 990)', () => {
    expect(bundleSavingMonthly()).toBe(254)
    expect(bundleSavingMonthly(false)).toBe(254)
  })

  it('roční režim: počítá z roční ceny za měsíc (1037 − 825)', () => {
    expect(bundleSavingMonthly(true)).toBe(212)
  })
})

describe('modulesMonthly — částečná sestava může převýšit balík', () => {
  it('5 modulů (1095) > cena balíku (990) → balík je výhodnější', () => {
    const five = ['pos', 'restaurant', 'inventory', 'booking', 'attendance'] as const
    expect(modulesMonthly(five)).toBeGreaterThan(MODULAR_PRICING.bundleAllMonthly)
  })
})

describe('yearlyPerMonth', () => {
  it('2 měsíce zdarma = ×10/12, zaokrouhleno', () => {
    expect(yearlyPerMonth(149)).toBe(124)
    expect(yearlyPerMonth(249)).toBe(208)
    expect(yearlyPerMonth(990)).toBe(825)
  })
})

describe('PRICING_SEGMENTS', () => {
  it('každý segment doporučuje jen existující moduly', () => {
    for (const s of PRICING_SEGMENTS) {
      for (const key of s.recommended) {
        expect(ALL_KEYS).toContain(key)
      }
    }
  })

  it('doporučená sestava „služby" má očekávanou měsíční cenu', () => {
    const services = PRICING_SEGMENTS.find((s) => s.id === 'services')!
    // invoicing 149 + booking 199 + attendance 149 = 497
    expect(modulesMonthly(services.recommended)).toBe(497)
  })
})
