import { describe, expect, it } from 'vitest'
import {
  buildDayCloseAccountingRows,
  buildDayCloseAccountingRowsForReports,
  buildDayCloseMonthlySummaryRows,
  buildShiftHandoverRowsFromDayClose,
  buildShiftHandoverRowsFromSummary,
  DAY_CLOSE_ACCOUNTING_COLUMNS,
  DAY_CLOSE_MONTHLY_SUMMARY_COLUMNS,
  SHIFT_HANDOVER_COLUMNS,
} from '@/lib/day-close-export'
import type { DayCloseResponse } from '@/lib/types'

const CLOSED_REPORT: DayCloseResponse = {
  status: 'Closed',
  date: '2026-07-05',
  locationId: 'loc-1',
  zReportNumber: 12,
  closedAt: '2026-07-05T21:00:00Z',
  saleCount: 3,
  totalNet: 1000,
  totalVat: 210,
  total: 1210,
  cashTotal: 500,
  cardTotal: 710,
  tipTotal: 40,
  discountTotal: 25,
  cancelledCount: 1,
  cancelledTotal: 99,
  vatBreakdown: [{ vatRate: 21, net: 1000, vat: 210, gross: 1210 }],
  productBreakdown: [{ productId: 'prod-1', name: 'Espresso', quantity: 2, revenueGross: 120 }],
  cashOpening: 1000,
  cashPayIns: 200,
  cashPayOuts: 50,
  cashExpectedClosing: 1500,
  cashCountedClosing: 1490,
  cashDrop: 400,
  cashDifference: -10,
}

describe('day-close accounting export', () => {
  it('má účetní CSV hlavičky se stabilním pořadím', () => {
    expect(DAY_CLOSE_ACCOUNTING_COLUMNS).toEqual([
      'Datum',
      'Pobočka',
      'Z-report',
      'Sekce',
      'Položka',
      'Sazba DPH',
      'Množství',
      'Základ',
      'DPH',
      'Celkem',
      'Měna',
      'Poznámka',
    ])
  })

  it('sestaví řádky pro DPH, platby, korekce, produkty a hotovost', () => {
    const rows = buildDayCloseAccountingRows(CLOSED_REPORT, 'Bistro Praha')

    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      'Tržba',
      'DPH 21 %',
      21,
      '',
      1000,
      210,
      1210,
      'CZK',
      '',
    ])
    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      'Platby',
      'Hotovost',
      '',
      '',
      '',
      '',
      500,
      'CZK',
      '',
    ])
    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      'Korekce tržeb',
      'Slevy na účet',
      '',
      '',
      '',
      '',
      -25,
      'CZK',
      '',
    ])
    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      'Prodané produkty',
      'Espresso',
      '',
      2,
      '',
      '',
      120,
      'CZK',
      'prod-1',
    ])
    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      'Hotovostní uzávěrka',
      'Vklady do pokladny',
      '',
      '',
      '',
      '',
      200,
      'CZK',
      '',
    ])
    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      'Hotovostní uzávěrka',
      'Výběry z pokladny',
      '',
      '',
      '',
      '',
      50,
      'CZK',
      '',
    ])
    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      'Hotovostní uzávěrka',
      'Rozdíl hotovosti',
      '',
      '',
      '',
      '',
      -10,
      'CZK',
      '',
    ])
  })

  it('sestaví účetní řádky pro více Z-reportů', () => {
    const rows = buildDayCloseAccountingRowsForReports(
      [
        CLOSED_REPORT,
        { ...CLOSED_REPORT, date: '2026-07-06', locationId: 'loc-2', zReportNumber: 13 },
      ],
      (locationId) => (locationId === 'loc-1' ? 'Bistro Praha' : 'Bar zahrada'),
    )

    expect(rows.some((r) => r[0] === '2026-07-05' && r[1] === 'Bistro Praha')).toBe(true)
    expect(rows.some((r) => r[0] === '2026-07-06' && r[1] === 'Bar zahrada')).toBe(true)
  })

  it('má stabilní hlavičky pro měsíční souhrn uzávěrek', () => {
    expect(DAY_CLOSE_MONTHLY_SUMMARY_COLUMNS).toEqual([
      'Datum',
      'Pobočka',
      'Z-report',
      'Účtenek',
      'Základ',
      'DPH',
      'Celkem',
      'Hotovost',
      'Karta',
      'Spropitné',
      'Slevy',
      'Storna počet',
      'Storna celkem',
      'Rozdíl hotovosti',
      'Měna',
      'Poznámka',
    ])
  })

  it('sestaví měsíční souhrn uzávěrek včetně součtového řádku', () => {
    const rows = buildDayCloseMonthlySummaryRows(
      [
        CLOSED_REPORT,
        {
          ...CLOSED_REPORT,
          date: '2026-07-06',
          locationId: 'loc-2',
          zReportNumber: 13,
          saleCount: 2,
          totalNet: 500,
          totalVat: 105,
          total: 605,
          cashTotal: 100,
          cardTotal: 505,
          tipTotal: 0,
          discountTotal: 10,
          cancelledCount: 0,
          cancelledTotal: 0,
          cashDifference: 5,
        },
      ],
      (locationId) => (locationId === 'loc-1' ? 'Bistro Praha' : 'Bar zahrada'),
    )

    expect(rows[0]).toEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      3,
      1000,
      210,
      1210,
      500,
      710,
      40,
      25,
      1,
      99,
      -10,
      'CZK',
      'Uzavřeno 2026-07-05T21:00:00Z',
    ])
    expect(rows.at(-1)).toEqual([
      'CELKEM',
      '',
      '',
      5,
      1500,
      315,
      1815,
      600,
      1215,
      40,
      35,
      1,
      99,
      -5,
      'CZK',
      'Součet vybraných Z-reportů',
    ])
  })
})

describe('shift handover export', () => {
  it('má stabilní hlavičky pro předávku směny', () => {
    expect(SHIFT_HANDOVER_COLUMNS).toEqual([
      'Datum',
      'Pobočka',
      'Z-report',
      'Sekce',
      'Položka',
      'Hodnota',
      'Poznámka',
    ])
  })

  it('sestaví předávku z živého souhrnu otevřeného dne', () => {
    const rows = buildShiftHandoverRowsFromSummary('2026-07-05', 'Bistro Praha', {
      count: 2,
      avgSale: 605,
      totalNet: 1000,
      totalVat: 210,
      total: 1210,
      cashTotal: 500,
      cardTotal: 710,
      tipTotal: 40,
      discountTotal: 25,
      cancelledCount: 1,
      cancelledTotal: 99,
    })

    expect(rows).toContainEqual(['2026-07-05', 'Bistro Praha', '', 'Tržby', 'Účtenek', 2, ''])
    expect(rows).toContainEqual(['2026-07-05', 'Bistro Praha', '', 'Platby', 'Hotovost', 500, ''])
    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      '',
      'Checklist',
      'Otevřené účty doplaceny nebo zrušeny',
      '',
      'OK / ne',
    ])
  })

  it('sestaví předávku ze zavřeného Z-reportu včetně hotovosti', () => {
    const rows = buildShiftHandoverRowsFromDayClose(CLOSED_REPORT, 'Bistro Praha')

    expect(rows).toContainEqual([
      '2026-07-05',
      'Bistro Praha',
      12,
      'Hotovost',
      'Rozdíl hotovosti',
      -10,
      '',
    ])
    expect(rows).toContainEqual(['2026-07-05', 'Bistro Praha', 12, 'Předání', 'Převzal', '', ''])
  })
})
