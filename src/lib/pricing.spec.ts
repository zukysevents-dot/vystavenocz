import { describe, it, expect } from 'vitest'
import {
  modulesMonthly,
  modulesYearly,
  bundleSavingMonthly,
  yearlyPerMonth,
  yearlyTotal,
  withVat,
  MODULAR_PRICING,
  PRICING_MODULES,
  PRICING_BUNDLES,
  PRICING_SEGMENTS,
  FOUNDING_OFFER,
} from './pricing'

const ALL_KEYS = PRICING_MODULES.map((m) => m.key)
const GASTRO = PRICING_BUNDLES.find((b) => b.key === 'gastro')!
const ALL_BUNDLE = PRICING_BUNDLES.find((b) => b.key === 'all')!

describe('ceník odpovídá schválenému seznamu cen', () => {
  it.each([
    ['invoicing', 0, 0],
    ['plus', 99, 990],
    ['pos', 199, 1990],
    ['restaurant', 249, 2490],
    ['inventory', 149, 1490],
    ['booking', 99, 990],
    ['attendance', 99, 990],
    ['jobs', 149, 1490],
  ])('%s: %i Kč/měs, %i Kč/rok', (key, monthly, yearly) => {
    const m = PRICING_MODULES.find((x) => x.key === key)!
    expect(m.monthly).toBe(monthly)
    expect(m.yearly).toBe(yearly)
  })

  it('roční cena je u každého modulu přesně 10× měsíční (2 měsíce zdarma)', () => {
    for (const m of PRICING_MODULES) expect(m.yearly).toBe(yearlyTotal(m.monthly))
  })

  it('balíky mají ceny z ceníku', () => {
    expect(GASTRO.monthly).toBe(399)
    expect(GASTRO.yearly).toBe(3990)
    expect(ALL_BUNDLE.monthly).toBe(499)
    expect(ALL_BUNDLE.yearly).toBe(4990)
    expect(FOUNDING_OFFER).toEqual({ companies: 500, monthly: 399 })
  })

  it('balík VŠECHNO obsahuje všechny placené moduly', () => {
    const placene = PRICING_MODULES.filter((m) => !m.free).map((m) => m.key)
    expect([...ALL_BUNDLE.modules].sort()).toEqual([...placene].sort())
  })

  it('balík GASTRO je pokladna, restaurace, sklad a docházka', () => {
    expect([...GASTRO.modules]).toEqual(['pos', 'restaurant', 'inventory', 'attendance'])
  })
})

describe('modulesMonthly', () => {
  it('fakturace je zdarma — sama o sobě i vedle placeného modulu', () => {
    expect(modulesMonthly(['invoicing'])).toBe(0)
    expect(modulesMonthly(['invoicing', 'pos'])).toBe(199)
  })

  it('součet vybraných modulů u částečné sestavy', () => {
    expect(modulesMonthly(['pos', 'inventory'])).toBe(348)
  })

  it('výběr pokrývající GASTRO dostane cenu balíku, ne součet', () => {
    // 199 + 249 + 149 + 99 = 696 samostatně
    expect(modulesMonthly(GASTRO.modules)).toBe(399)
  })

  it('GASTRO + modul navíc = cena balíku plus ten modul', () => {
    expect(modulesMonthly([...GASTRO.modules, 'booking'])).toBe(399 + 99)
  })

  it('všechny moduly = cena kompletního balíku', () => {
    expect(modulesMonthly(ALL_KEYS)).toBe(499)
    expect(modulesMonthly(ALL_KEYS)).toBe(MODULAR_PRICING.bundleAllMonthly)
  })

  it('prázdná sestava = 0', () => {
    expect(modulesMonthly([])).toBe(0)
  })
})

describe('modulesYearly', () => {
  it('roční cena sestavy = 10× měsíční', () => {
    expect(modulesYearly(ALL_KEYS)).toBe(4990)
    expect(modulesYearly(GASTRO.modules)).toBe(3990)
    expect(modulesYearly(['invoicing'])).toBe(0)
  })
})

describe('bundleSavingMonthly', () => {
  it('měsíčně: součet všech modulů (1043) − balík (499)', () => {
    expect(bundleSavingMonthly()).toBe(544)
  })

  it('ročně: počítá z roční ceny za měsíc', () => {
    expect(bundleSavingMonthly(true)).toBe(yearlyPerMonth(1043) - yearlyPerMonth(499))
  })
})

describe('yearlyPerMonth', () => {
  it('2 měsíce zdarma = ×10/12, zaokrouhleno', () => {
    expect(yearlyPerMonth(99)).toBe(83)
    expect(yearlyPerMonth(199)).toBe(166)
    expect(yearlyPerMonth(499)).toBe(416)
  })
})

describe('withVat', () => {
  it('připočte 21 % DPH (ceník je bez DPH)', () => {
    expect(withVat(100)).toBe(121)
    expect(withVat(499)).toBe(604)
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
    // fakturace 0 + rezervace 99 + docházka 99 = 198
    expect(modulesMonthly(services.recommended)).toBe(198)
  })
})
