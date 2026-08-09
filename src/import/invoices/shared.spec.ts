import { describe, it, expect } from 'vitest'
import { parseCzechAmount, parseCzechDate, toVatRate, normalizeRegistrationId } from './shared'

describe('parseCzechAmount', () => {
  it('přečte českou částku s mezerami a čárkou', () => {
    expect(parseCzechAmount('12 345,67 Kč')).toBe(12345.67)
    expect(parseCzechAmount('1 000,00')).toBe(1000)
  })

  it('přečte i pevnou mezeru jako oddělovač tisíců', () => {
    expect(parseCzechAmount('12 345,67')).toBe(12345.67)
  })

  it('rozliší desetinnou tečku od oddělovače tisíců', () => {
    expect(parseCzechAmount('1.234,56')).toBe(1234.56)
    expect(parseCzechAmount('1,234.56')).toBe(1234.56)
  })

  it('bere tečku i čárku jako oddělovač tisíců, když nejde o desetiny', () => {
    expect(parseCzechAmount('1.234')).toBe(1234)
  })

  it('zvládne záporné částky a prázdný vstup', () => {
    expect(parseCzechAmount('-500,50')).toBe(-500.5)
    expect(parseCzechAmount('   ')).toBeNull()
    expect(parseCzechAmount('Kč')).toBeNull()
  })
})

describe('parseCzechDate', () => {
  it('přečte tečkový formát s mezerami i bez', () => {
    expect(parseCzechDate('1. 3. 2024')).toBe('2024-03-01')
    expect(parseCzechDate('01.03.2024')).toBe('2024-03-01')
  })

  it('doplní století u dvouciferného roku', () => {
    expect(parseCzechDate('1.3.24')).toBe('2024-03-01')
  })

  it('přečte ISO i slovní měsíc', () => {
    expect(parseCzechDate('2024-03-01')).toBe('2024-03-01')
    expect(parseCzechDate('1. března 2024')).toBe('2024-03-01')
  })

  it('vrátí null u nesmyslu', () => {
    expect(parseCzechDate('někdy')).toBeNull()
    expect(parseCzechDate('45.13.2024')).toBeNull()
  })
})

describe('toVatRate', () => {
  it('mapuje jen sazby, které aplikace zná', () => {
    expect(toVatRate(21)).toBe(21)
    expect(toVatRate(12)).toBe(12)
    expect(toVatRate('21,00')).toBe(21)
    expect(toVatRate(15)).toBe(0) // zrušená sazba → 0, ne tichý překlep
    expect(toVatRate(null)).toBe(0)
  })
})

describe('normalizeRegistrationId', () => {
  it('odstraní mezery a oddělovače', () => {
    expect(normalizeRegistrationId('123 45 678')).toBe('12345678')
    expect(normalizeRegistrationId('cz12345678')).toBe('CZ12345678')
  })
})
