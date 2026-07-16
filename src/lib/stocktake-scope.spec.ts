import { describe, expect, it } from 'vitest'
import {
  resolveStocktakeScopeProductIds,
  stocktakeRangeDescription,
  stocktakeRangeLabel,
} from './stocktake-scope'

const products = [
  { id: 'coffee', categoryId: 'drinks' },
  { id: 'tea', categoryId: 'drinks' },
  { id: 'milk', categoryId: 'dairy' },
  { id: 'bag', categoryId: null },
]

describe('stocktake scope', () => {
  it('vrátí celý katalog pro úplnou inventuru', () => {
    expect(resolveStocktakeScopeProductIds(products, 'full', [], [])).toEqual([
      'coffee',
      'tea',
      'milk',
      'bag',
    ])
  })

  it('sjednotí kategorie a jednotlivé položky pro částečnou i cyklickou inventuru', () => {
    expect(resolveStocktakeScopeProductIds(products, 'partial', ['drinks'], ['milk'])).toEqual([
      'coffee',
      'tea',
      'milk',
    ])
    expect(resolveStocktakeScopeProductIds(products, 'cycle', ['dairy'], ['bag'])).toEqual([
      'milk',
      'bag',
    ])
  })

  it('u namátkové kontroly zahrne pouze explicitně vybrané existující položky', () => {
    expect(resolveStocktakeScopeProductIds(products, 'spot', ['drinks'], ['tea', 'missing'])).toEqual([
      'tea',
    ])
  })

  it('má srozumitelné české názvy a popisy pro všechny rozsahy', () => {
    expect(stocktakeRangeLabel('cycle')).toBe('Cyklická inventura')
    expect(stocktakeRangeDescription('spot')).toContain('Rychle')
  })
})
