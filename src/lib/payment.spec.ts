import { describe, expect, it } from 'vitest'
import { cashChange, suggestedCashAmounts } from './payment'

describe('cashChange', () => {
  it('vrací rozdíl přijato − k úhradě', () => {
    expect(cashChange(267, 500)).toBe(233)
    expect(cashChange(121, 121)).toBe(0)
  })

  it('záporný výsledek = nedoplaceno', () => {
    expect(cashChange(267, 200)).toBe(-67)
  })

  it('zaokrouhluje na haléře', () => {
    expect(cashChange(120.5, 200)).toBe(79.5)
    expect(cashChange(0.1 + 0.2, 1)).toBe(0.7)
  })
})

describe('suggestedCashAmounts', () => {
  it('nabízí přesnou částku a zaokrouhlení na bankovky bez duplicit', () => {
    expect(suggestedCashAmounts(267)).toEqual([267, 300, 500, 1000])
  })

  it('kulatá částka se nenabízí dvakrát', () => {
    expect(suggestedCashAmounts(500)).toEqual([500, 1000, 2000])
  })

  it('velký účet zaokrouhluje na tisíce', () => {
    expect(suggestedCashAmounts(1350)).toEqual([1350, 1400, 1500, 2000])
  })

  it('haléřová částka se zaokrouhlí nahoru na celé Kč (kryje i haléřový rozdíl vs. server)', () => {
    expect(suggestedCashAmounts(133.33)).toEqual([134, 200, 500, 1000])
  })

  it('nulová nebo záporná částka nic nenabízí', () => {
    expect(suggestedCashAmounts(0)).toEqual([])
    expect(suggestedCashAmounts(-5)).toEqual([])
  })
})
