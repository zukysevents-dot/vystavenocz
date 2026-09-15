import { describe, expect, it } from 'vitest'
import { isValidIco, normalizeIco } from './ico'

describe('normalizeIco', () => {
  it('očistí zápis a doplní vedoucí nuly na 8 míst', () => {
    expect(normalizeIco(' 270 824 40 ')).toBe('27082440')
    expect(normalizeIco('6947')).toBe('00006947')
  })

  it('vrátí null pro tvar, který IČO být nemůže', () => {
    expect(normalizeIco('')).toBeNull()
    expect(normalizeIco('123456789')).toBeNull()
    expect(normalizeIco(null)).toBeNull()
  })
})

describe('isValidIco', () => {
  it('projde reálná IČO včetně zápisu s mezerami a bez vedoucích nul', () => {
    expect(isValidIco('27082440')).toBe(true) // Alza.cz a.s.
    expect(isValidIco('26168685')).toBe(true) // Seznam.cz a.s.
    expect(isValidIco(' 270 824 40 ')).toBe(true)
    expect(isValidIco('6947')).toBe(true) // 00006947
  })

  it('odmítne vymyšlená čísla, se kterými šla registrace proklikat', () => {
    expect(isValidIco('1234567')).toBe(false)
    expect(isValidIco('0000000')).toBe(false)
    expect(isValidIco('00000000')).toBe(false)
    expect(isValidIco('12345678')).toBe(false) // platný tvar, špatná kontrolní číslice
    expect(isValidIco('abcdefgh')).toBe(false)
    expect(isValidIco('')).toBe(false)
  })
})
