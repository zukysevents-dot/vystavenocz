import { describe, expect, it } from 'vitest'
import { buildSalesImportPreview } from './sales-import'

describe('buildSalesImportPreview', () => {
  it('seskupí více řádků do jedné účtenky podle externalId', () => {
    const preview = buildSalesImportPreview(
      {
        headers: ['uctenka', 'datum', 'platba', 'polozka', 'mnozstvi', 'cena', 'dph'],
        rows: [
          {
            uctenka: 'R-1',
            datum: '07.07.2026 18:30',
            platba: 'kartou',
            polozka: 'Burger',
            mnozstvi: '2',
            cena: '199',
            dph: '12',
          },
          {
            uctenka: 'R-1',
            datum: '07.07.2026 18:30',
            platba: 'kartou',
            polozka: 'Limonáda',
            mnozstvi: '1',
            cena: '59',
            dph: '21',
          },
        ],
      },
      'dotykacka',
    )

    expect(preview.errors).toEqual([])
    expect(preview.sales).toHaveLength(1)
    expect(preview.sales[0]).toMatchObject({
      externalId: 'R-1',
      paymentMethod: 'Card',
      total: 457,
    })
    expect(preview.sales[0].items).toHaveLength(2)
  })

  it('použije explicitní total účtenky a českou desetinnou čárku', () => {
    const preview = buildSalesImportPreview(
      {
        headers: ['receipt', 'date', 'payment', 'product', 'quantity', 'lineTotal', 'saleTotal'],
        rows: [
          {
            receipt: 'R-2',
            date: '2026-07-07T10:00:00.000Z',
            payment: 'cash',
            product: 'Espresso',
            quantity: '1',
            lineTotal: '55,50',
            saleTotal: '60,50',
          },
        ],
      },
      'generic-pos',
    )

    expect(preview.sales[0].paymentMethod).toBe('Cash')
    expect(preview.sales[0].items[0].lineTotal).toBe(55.5)
    expect(preview.sales[0].total).toBe(60.5)
  })

  it('vrátí chybu pro řádek bez čísla účtenky', () => {
    const preview = buildSalesImportPreview(
      {
        headers: ['uctenka', 'datum', 'polozka'],
        rows: [{ uctenka: '', datum: '07.07.2026 18:30', polozka: 'Burger' }],
      },
      'dotykacka',
    )

    expect(preview.sales).toHaveLength(0)
    expect(preview.errors[0]).toMatchObject({ rowIndex: 2 })
  })
})
