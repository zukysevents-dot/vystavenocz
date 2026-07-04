import { describe, it, expect } from 'vitest'
import {
  summarizeSales,
  buildVatBreakdown,
  buildTopProducts,
  buildRevenueByCategory,
} from '@/lib/salesReport'
import type { Sale, SaleItemLine } from '@/lib/types'

function line(over: Partial<SaleItemLine> = {}): SaleItemLine {
  return {
    id: crypto.randomUUID(),
    description: null,
    productId: null,
    quantity: 1,
    unitPrice: 100,
    vatRate: 21,
    discountPercent: 0,
    lineNet: 100,
    lineVat: 21,
    lineTotal: 121,
    ...over,
  }
}

function sale(over: Partial<Sale> = {}): Sale {
  return {
    id: crypto.randomUUID(),
    locationId: null,
    employeeId: null,
    paymentMethod: 'Cash',
    status: 'Completed',
    discountPercent: 0,
    tipAmount: 0,
    totalNet: 100,
    totalVat: 21,
    total: 121,
    soldAt: '2026-07-04T10:00:00.000Z',
    items: [line()],
    ...over,
  }
}

describe('summarizeSales', () => {
  it('prázdný vstup nedělí nulou a vrací nuly', () => {
    const s = summarizeSales([])
    expect(s.count).toBe(0)
    expect(s.total).toBe(0)
    expect(s.avgSale).toBe(0)
    expect(s.cancelledCount).toBe(0)
  })

  it('sečte tržby jen z Completed, rozdělí hotovost/kartu a spropitné', () => {
    const s = summarizeSales([
      sale({ paymentMethod: 'Cash', total: 121, totalNet: 100, totalVat: 21, tipAmount: 10 }),
      sale({ paymentMethod: 'Card', total: 242, totalNet: 200, totalVat: 42 }),
    ])
    expect(s.count).toBe(2)
    expect(s.total).toBe(363)
    expect(s.cashTotal).toBe(121)
    expect(s.cardTotal).toBe(242)
    expect(s.tipTotal).toBe(10)
    expect(s.avgSale).toBe(181.5)
  })

  it('storno se nepočítá do tržby, ale do cancelled', () => {
    const s = summarizeSales([
      sale({ total: 121 }),
      sale({ status: 'Cancelled', total: 300 }),
      sale({ status: 'Cancelled', total: 50 }),
    ])
    expect(s.count).toBe(1)
    expect(s.total).toBe(121)
    expect(s.cancelledCount).toBe(2)
    expect(s.cancelledTotal).toBe(350)
    // storno neovlivní hotovost/kartu
    expect(s.cashTotal).toBe(121)
  })

  it('dopočítá slevu na účet v Kč z řádků po slevě', () => {
    // řádky po 50% slevě dají 121; před slevou 242 → sleva 121
    const s = summarizeSales([sale({ discountPercent: 50, items: [line({ lineTotal: 121 })] })])
    expect(s.discountTotal).toBe(121)
  })
})

describe('buildVatBreakdown', () => {
  it('seskupí míchané sazby (12 + 21), seřadí sestupně a součty sedí', () => {
    const rows = buildVatBreakdown([
      sale({
        items: [
          line({ vatRate: 21, lineNet: 100, lineVat: 21, lineTotal: 121 }),
          line({ vatRate: 12, lineNet: 100, lineVat: 12, lineTotal: 112 }),
        ],
      }),
      sale({ items: [line({ vatRate: 12, lineNet: 50, lineVat: 6, lineTotal: 56 })] }),
    ])
    expect(rows).toHaveLength(2)
    // sestupně dle sazby → 21 první
    expect(rows[0].vatRate).toBe(21)
    expect(rows[1].vatRate).toBe(12)
    // net + vat = gross po každé sazbě
    for (const r of rows) expect(round(r.net + r.vat)).toBe(r.gross)
    expect(rows[1].net).toBe(150)
    expect(rows[1].vat).toBe(18)
    expect(rows[1].gross).toBe(168)
  })

  it('ignoruje stornované prodeje', () => {
    const rows = buildVatBreakdown([sale({ status: 'Cancelled' })])
    expect(rows).toHaveLength(0)
  })
})

describe('buildTopProducts', () => {
  it('seskupí po productId, sečte, seřadí dle tržby a respektuje limit', () => {
    const names = new Map([
      ['p1', 'Káva'],
      ['p2', 'Čaj'],
    ])
    const rows = buildTopProducts(
      [
        sale({ items: [line({ productId: 'p1', quantity: 1, lineTotal: 50 })] }),
        sale({ items: [line({ productId: 'p1', quantity: 2, lineTotal: 100 })] }),
        sale({ items: [line({ productId: 'p2', quantity: 5, lineTotal: 300 })] }),
      ],
      names,
    )
    expect(rows[0].name).toBe('Čaj')
    expect(rows[0].revenueGross).toBe(300)
    expect(rows[1].name).toBe('Káva')
    expect(rows[1].quantity).toBe(3)
    expect(rows[1].revenueGross).toBe(150)
  })

  it('neznámé productId → „(neznámý)"', () => {
    const rows = buildTopProducts(
      [sale({ items: [line({ productId: 'ghost', lineTotal: 10 })] })],
      new Map(),
    )
    expect(rows[0].name).toBe('(neznámý)')
  })
})

describe('buildRevenueByCategory', () => {
  it('mapuje productId na kategorii, neznámé → „Bez kategorie", řadí sestupně', () => {
    const catByProduct = new Map([
      ['p1', 'Nápoje'],
      ['p2', 'Jídlo'],
    ])
    const rows = buildRevenueByCategory(
      [
        sale({ items: [line({ productId: 'p1', quantity: 1, lineTotal: 100 })] }),
        sale({ items: [line({ productId: 'p2', quantity: 2, lineTotal: 400 })] }),
        sale({ items: [line({ productId: null, quantity: 1, lineTotal: 30 })] }),
      ],
      catByProduct,
    )
    expect(rows[0].categoryName).toBe('Jídlo')
    expect(rows[0].revenueGross).toBe(400)
    expect(rows[1].categoryName).toBe('Nápoje')
    expect(rows[2].categoryName).toBe('Bez kategorie')
    expect(rows[2].revenueGross).toBe(30)
  })
})

function round(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
