import { describe, expect, it } from 'vitest'
import { applyMapping } from '../mapping'
import { detectAdapter } from '.'
import type { RawTable } from '../types'

describe('POS product adapters', () => {
  it('rozpozná Dotykačka export a namapuje katalog produktu', () => {
    const table: RawTable = {
      headers: ['PLU', 'Název', 'Kategorie', 'Cena s DPH', 'DPH', 'Skladem'],
      rows: [
        {
          PLU: 'ESP',
          Název: 'Espresso',
          Kategorie: 'Káva',
          'Cena s DPH': '59,00',
          DPH: '21%',
          Skladem: '12',
        },
      ],
    }
    const adapter = detectAdapter(table.headers, 'products')
    expect(adapter?.id).toBe('dotykacka-products')

    const drafts = applyMapping(
      table,
      {
        name: 'Název',
        sku: 'PLU',
        salePrice: 'Cena s DPH',
        vatRate: 'DPH',
        category: 'Kategorie',
        quantity: 'Skladem',
      },
      adapter!,
      ['category', 'quantity'],
    )

    expect(drafts[0].value).toMatchObject({
      name: 'Espresso',
      sku: 'ESP',
      salePrice: 59,
      vatRate: 21,
      purchasePrice: null,
      minQuantity: 0,
      categoryId: null,
    })
    expect(drafts[0].extras).toEqual({ category: 'Káva', quantity: '12' })
  })

  it('rozpozná Storyous/Teya export podle názvu položky a prodejní ceny', () => {
    const headers = ['ID položky', 'Název položky', 'Kategorie', 'Prodejní cena', 'DPH']
    const adapter = detectAdapter(headers, 'products')
    expect(adapter?.id).toBe('storyous-products')
  })

  it('rozpozná iKelp export se slovenskými hlavičkami', () => {
    const headers = ['PLU', 'Názov', 'Skupina', 'Predajná cena', 'DPH', 'Množstvo']
    const adapter = detectAdapter(headers, 'products')
    expect(adapter?.id).toBe('ikelp-products')
  })
})
