import { describe, expect, it } from 'vitest'
import { buildCsv } from '@/lib/csv-export'
import {
  buildStockMovementRows,
  buildStockValuationRows,
  STOCK_MOVEMENT_COLUMNS,
  STOCK_VALUATION_COLUMNS,
  stockMovementFilename,
  stockMovementSource,
  stockValuationFilename,
} from '@/lib/inventory-export'
import type { StockMovement, StockValuationResponse } from '@/lib/types'

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
      '',
      '',
      '',
      '',
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
    expect(csv).toContain(';3,5;;;;;8;Nákupní příjemka;receipt-1;')
    expect(csv).not.toContain(";'3,5;")
  })

  it('rozepíše více šarží do samostatných dohledatelných řádků', () => {
    const rows = buildStockMovementRows([
      {
        ...movement,
        type: 'Issue',
        quantity: -5,
        lotAllocations: [
          {
            stockLotId: 'lot-first',
            lotNumber: 'EXP-07',
            expiresOn: '2026-07-31',
            quantity: -2,
          },
          {
            stockLotId: 'lot-second',
            lotNumber: 'EXP-08',
            expiresOn: '2026-08-31',
            quantity: -3,
          },
        ],
      },
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0]?.slice(5, 11)).toEqual([-5, 'EXP-07', '2026-07-31', -2, 'lot-first', 8])
    expect(rows[1]?.slice(5, 11)).toEqual(['', 'EXP-08', '2026-08-31', -3, 'lot-second', 8])
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

describe('inventory valuation export', () => {
  const response: StockValuationResponse = {
    method: 'PeriodicWeightedAverage',
    from: '2026-07-01',
    to: '2026-07-14',
    locationId: null,
    currency: 'CZK',
    dataVersion: 'version-1',
    summary: {
      openingStockValue: 0,
      closingStockValue: 52,
      purchaseValue: 78,
      cogsValue: 26,
      consumptionValue: 0,
      lossValue: 0,
      inventoryAdjustmentValue: 0,
      missingCostProductCount: 0,
      missingPurchaseCostProductCount: 0,
      isComplete: true,
    },
    products: {
      total: 1,
      page: 1,
      pageSize: 100,
      items: [
        {
          productId: 'prod-1',
          productName: '=Nebezpečný produkt',
          productSku: 'SKU-1',
          unitCost: 26,
          costSource: 'CompanyPurchaseReceipts',
          isCostComplete: true,
          openingQuantity: 0,
          openingStockValue: 0,
          closingQuantity: 2,
          closingStockValue: 52,
          purchaseQuantity: 3,
          purchaseValue: 78,
          cogsQuantity: 1,
          cogsValue: 26,
          consumptionQuantity: 0,
          consumptionValue: 0,
          lossQuantity: 0,
          lossValue: 0,
          inventoryAdjustmentQuantity: 0,
          inventoryAdjustmentValue: 0,
        },
      ],
    },
  }

  it('exportuje produktový i součtový řádek a chrání uživatelský text', () => {
    const rows = buildStockValuationRows(response, response.products.items, '+Všechny pobočky')

    expect(rows).toHaveLength(2)
    expect(rows[0]?.slice(0, 9)).toEqual([
      '2026-07-01',
      '2026-07-14',
      "'+Všechny pobočky",
      "'=Nebezpečný produkt",
      'SKU-1',
      'Periodický vážený průměr',
      'CZK',
      'Vážený průměr příjemek firmy',
      26,
    ])
    expect(rows[1]?.[3]).toBe('CELKEM')
    expect(rows[1]?.[12]).toBe(52)
    expect(buildCsv(STOCK_VALUATION_COLUMNS, rows)).toContain(';2;52;3;78;1;26;')
  })

  it('sestaví stabilní název ocenění podle období', () => {
    expect(stockValuationFilename('2026-07-01', '2026-07-14')).toBe(
      'oceneni-skladu-2026-07-01_2026-07-14.csv',
    )
  })
})
