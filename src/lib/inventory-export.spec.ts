import { describe, expect, it } from 'vitest'
import { buildCsv } from '@/lib/csv-export'
import {
  buildStockMovementRows,
  STOCK_MOVEMENT_COLUMNS,
  stockMovementFilename,
  stockMovementSource,
} from '@/lib/inventory-export'
import type { StockMovement } from '@/lib/types'

const movement: StockMovement = {
  id: 'move-1',
  productId: 'prod-1',
  locationId: 'loc-1',
  type: 'Receipt',
  quantity: 3.5,
  quantityAfter: 8,
  note: '=HYPERLINK("https://example.test")',
  relatedSaleId: null,
  relatedStocktakeId: null,
  relatedPurchaseReceiptId: 'receipt-1',
  relatedProductionBatchId: null,
  relatedJobId: null,
  createdAt: '2026-07-14T10:00:00Z',
  productName: '+Nebezpečný název',
  productSku: 'SKU-1',
  locationName: 'Hlavní sklad',
  createdBy: 'user-1',
}

describe('inventory movement export', () => {
  it('vytvoří dohledatelný řádek a zachová množství jako čísla', () => {
    const rows = buildStockMovementRows([movement])

    expect(rows[0]).toEqual([
      '2026-07-14T10:00:00Z',
      "'+Nebezpečný název",
      'SKU-1',
      'Hlavní sklad',
      'Příjem',
      3.5,
      8,
      'Nákupní příjemka',
      'receipt-1',
      `'=HYPERLINK("https://example.test")`,
      'move-1',
      'prod-1',
      'loc-1',
      'user-1',
    ])

    const csv = buildCsv(STOCK_MOVEMENT_COLUMNS, rows)
    expect(csv).toContain(';3,5;8;Nákupní příjemka;receipt-1;')
    expect(csv).not.toContain(";'3,5;")
  })

  it('určí zdroj podle pevné priority vazeb', () => {
    expect(stockMovementSource(movement)).toEqual({
      label: 'Nákupní příjemka',
      id: 'receipt-1',
    })
    expect(
      stockMovementSource({
        ...movement,
        relatedPurchaseReceiptId: null,
        relatedProductionBatchId: 'batch-1',
      }),
    ).toEqual({ label: 'Výrobní dávka', id: 'batch-1' })
  })

  it('sestaví stabilní název souboru z období', () => {
    expect(stockMovementFilename('2026-07-01', '2026-07-14')).toBe(
      'skladove-pohyby-2026-07-01_2026-07-14.csv',
    )
  })
})
