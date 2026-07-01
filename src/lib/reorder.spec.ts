import { describe, it, expect } from 'vitest'
import { reorderSuggestions, findByEan } from '@/lib/reorder'
import type { Product } from '@/lib/types'

let seq = 0
function product(over: Partial<Product> = {}): Product {
  seq += 1
  return {
    id: `p${seq}`,
    name: `Produkt ${seq}`,
    sku: `SKU${seq}`,
    ean: null,
    salePrice: 100,
    vatRate: 21,
    purchasePrice: 60,
    minQuantity: 5,
    categoryId: null,
    ...over,
  }
}

describe('reorderSuggestions', () => {
  it('navrhne jen produkty na/pod minimem, doplní na 2× minimum', () => {
    const products = [
      product({ id: 'a', minQuantity: 5 }), // stav 2 → nízko, doplnit na 10 → 8
      product({ id: 'b', minQuantity: 5 }), // stav 9 → OK, vynechat
      product({ id: 'c', minQuantity: 5 }), // stav 5 → přesně min, nízko → 5
      product({ id: 'd', minQuantity: 0 }), // bez minima, vynechat
    ]
    const levels = new Map([
      ['a', 2],
      ['b', 9],
      ['c', 5],
      ['d', 100],
    ])
    const rows = reorderSuggestions(products, levels)
    expect(rows.map((r) => r.productId)).toEqual(['a', 'c'])
    expect(rows.find((r) => r.productId === 'a')).toMatchObject({
      current: 2,
      min: 5,
      suggested: 8,
    })
    expect(rows.find((r) => r.productId === 'c')).toMatchObject({
      current: 5,
      min: 5,
      suggested: 5,
    })
  })

  it('chybějící stav = 0 → nízko', () => {
    const rows = reorderSuggestions([product({ id: 'x', minQuantity: 3 })], new Map())
    expect(rows[0]).toMatchObject({ current: 0, suggested: 6 })
  })

  it('řadí nejnaléhavější (nejhlouběji pod minimem) nahoru', () => {
    const products = [
      product({ id: 'malo', minQuantity: 10 }), // stav 8 → deficit -2
      product({ id: 'kriticke', minQuantity: 10 }), // stav 0 → deficit -10
    ]
    const levels = new Map([
      ['malo', 8],
      ['kriticke', 0],
    ])
    expect(reorderSuggestions(products, levels).map((r) => r.productId)).toEqual([
      'kriticke',
      'malo',
    ])
  })
})

describe('findByEan', () => {
  const products = [product({ id: 'a', ean: '8594001020304' }), product({ id: 'b', ean: null })]
  it('najde podle přesného EAN', () => {
    expect(findByEan(products, '8594001020304')?.id).toBe('a')
    expect(findByEan(products, ' 8594001020304 ')?.id).toBe('a') // ořízne mezery
  })
  it('nenalezený / prázdný → undefined', () => {
    expect(findByEan(products, '000')).toBeUndefined()
    expect(findByEan(products, '')).toBeUndefined()
  })
})
