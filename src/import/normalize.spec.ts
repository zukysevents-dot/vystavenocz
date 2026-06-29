import { describe, it, expect } from 'vitest'
import {
  normalizeIco,
  isValidIco,
  normalizeDic,
  normalizePhone,
  trimOrNull,
  parsePrice,
} from './normalize'

describe('normalizeIco', () => {
  it('ponechá jen číslice', () => {
    expect(normalizeIco(' 270 824 40 ')).toBe('27082440')
    expect(normalizeIco('CZ27082440')).toBe('27082440')
  })
  it('prázdné → null', () => {
    expect(normalizeIco('')).toBeNull()
    expect(normalizeIco(null)).toBeNull()
    expect(normalizeIco('---')).toBeNull()
  })
})

describe('isValidIco', () => {
  it('platné české IČO projde (mod-11)', () => {
    expect(isValidIco('27082440')).toBe(true) // Alza
  })
  it('neplatná kontrolní číslice neprojde', () => {
    expect(isValidIco('27082441')).toBe(false)
  })
  it('nesprávná délka neprojde', () => {
    expect(isValidIco('1234567')).toBe(false)
    expect(isValidIco('123456789')).toBe(false)
  })
})

describe('normalizeDic', () => {
  it('odstraní mezery a převede na velká písmena', () => {
    expect(normalizeDic('cz 27082440')).toBe('CZ27082440')
  })
  it('prázdné → null', () => {
    expect(normalizeDic('  ')).toBeNull()
  })
})

describe('normalizePhone', () => {
  it('české 9místné číslo doplní +420', () => {
    expect(normalizePhone('777123456')).toBe('+420777123456')
    expect(normalizePhone('777 123 456')).toBe('+420777123456')
  })
  it('00420… převede na +420…', () => {
    expect(normalizePhone('00420777123456')).toBe('+420777123456')
  })
  it('mezinárodní tvar ponechá', () => {
    expect(normalizePhone('+421900111222')).toBe('+421900111222')
  })
  it('prázdné → null', () => {
    expect(normalizePhone('')).toBeNull()
  })
})

describe('trimOrNull', () => {
  it('ořízne nebo vrátí null', () => {
    expect(trimOrNull('  x ')).toBe('x')
    expect(trimOrNull('   ')).toBeNull()
    expect(trimOrNull(undefined)).toBeNull()
  })
})

describe('parsePrice', () => {
  it('CZ formát s měnou a mezerami', () => {
    expect(parsePrice('1 290,50 Kč')).toBe(1290.5)
  })
  it('tečka jako oddělovač tisíců + desetinná čárka', () => {
    expect(parsePrice('1.290,50')).toBe(1290.5)
  })
  it('anglický formát s tečkou', () => {
    expect(parsePrice('1290.50')).toBe(1290.5)
  })
  it('celé číslo', () => {
    expect(parsePrice('349')).toBe(349)
  })
  it('prázdné / nečíselné → 0', () => {
    expect(parsePrice('')).toBe(0)
    expect(parsePrice(null)).toBe(0)
    expect(parsePrice('N/A')).toBe(0)
  })
})
