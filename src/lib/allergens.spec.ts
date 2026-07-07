import { describe, it, expect } from 'vitest'
import { ALLERGENS, normalizeAllergens, formatAllergenCodes, formatAllergens } from './allergens'

// Alergeny (EU 1169/2011) — čistý číselník + normalizace/formátování. Chrání zobrazení v menu/QR
// i budoucí export před tichou regresí (duplicity, špatné pořadí, kódy mimo 1–14).
describe('allergens', () => {
  it('obsahuje 14 zákonných EU alergenů v pořadí 1–14', () => {
    expect(ALLERGENS).toHaveLength(14)
    expect(ALLERGENS[0]).toEqual({ code: 1, label: 'Lepek' })
    expect(ALLERGENS[6]).toEqual({ code: 7, label: 'Mléko' })
    expect(ALLERGENS.map((a) => a.code)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
  })

  describe('normalizeAllergens', () => {
    it('odstraní duplicity, seřadí vzestupně a zahodí kódy mimo 1–14', () => {
      expect(normalizeAllergens([7, 1, 7, 3])).toEqual([1, 3, 7])
      expect(normalizeAllergens([0, 15, 1, 14, -2])).toEqual([1, 14])
    })

    it('zvládne null/undefined/prázdné', () => {
      expect(normalizeAllergens(null)).toEqual([])
      expect(normalizeAllergens(undefined)).toEqual([])
      expect(normalizeAllergens([])).toEqual([])
    })

    it('zahodí neceločíselné kódy', () => {
      expect(normalizeAllergens([1.5, 2, 3])).toEqual([2, 3])
    })
  })

  describe('formatAllergenCodes', () => {
    it('spojí normalizované kódy čárkou', () => {
      expect(formatAllergenCodes([7, 1, 1])).toBe('1, 7')
      expect(formatAllergenCodes(null)).toBe('')
    })
  })

  describe('formatAllergens', () => {
    it('vypíše kód + český název v normalizovaném pořadí', () => {
      expect(formatAllergens([1, 7])).toBe('1 Lepek, 7 Mléko')
      expect(formatAllergens([7, 1])).toBe('1 Lepek, 7 Mléko')
    })

    it('je prázdné, když produkt nemá alergeny', () => {
      expect(formatAllergens([])).toBe('')
      expect(formatAllergens(null)).toBe('')
    })
  })
})
