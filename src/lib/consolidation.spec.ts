import { describe, it, expect } from 'vitest'
import {
  availablePeriods,
  buildLocationOperationalComparison,
  buildLocationRevenue,
  consolidationSummary,
  consolidationReportRange,
  UNASSIGNED_LABEL,
} from '@/lib/consolidation'
import type { Sale, Location } from '@/lib/types'
import type {
  PosCostSummary,
  PosDeadItems,
  PosLossSummary,
  PosSalesSummary,
} from '@/lib/posReports'

function sale(over: Partial<Sale> = {}): Sale {
  return {
    id: crypto.randomUUID(),
    locationId: null,
    paymentMethod: 'Cash',
    status: 'Completed',
    discountPercent: 0,
    tipAmount: 0,
    totalNet: 100,
    totalVat: 21,
    total: 121,
    soldAt: '2026-06-15T10:00:00.000Z',
    items: [],
    ...over,
  }
}

function loc(id: string, name: string): Location {
  return { id, name, address: null, isActive: true, createdAt: '', updatedAt: '' }
}

const LOCATIONS = [loc('l1', 'Praha'), loc('l2', 'Brno')]

function posSummary(over: Partial<PosSalesSummary> = {}): PosSalesSummary {
  return {
    from: '2026-06-01',
    to: '2026-06-30',
    currency: 'CZK',
    saleCount: 0,
    total: 0,
    totalNet: 0,
    totalVat: 0,
    cashTotal: 0,
    cardTotal: 0,
    tipTotal: 0,
    discountTotal: 0,
    cancelledCount: 0,
    cancelledTotal: 0,
    averageSale: 0,
    vatBreakdown: [],
    topProducts: [],
    ...over,
  }
}

function posCosts(over: Partial<PosCostSummary> = {}): PosCostSummary {
  return {
    from: '2026-06-01',
    to: '2026-06-30',
    currency: 'CZK',
    productRevenueGross: 0,
    unlinkedRevenueGross: 0,
    estimatedCost: 0,
    grossMargin: 0,
    grossMarginPercent: 0,
    foodCostPercent: 0,
    missingCostProductCount: 0,
    products: [],
    ...over,
  }
}

function posLosses(over: Partial<PosLossSummary> = {}): PosLossSummary {
  return {
    from: '2026-06-01',
    to: '2026-06-30',
    currency: 'CZK',
    operationalLossValue: 0,
    inventoryLossValue: 0,
    inventoryGainValue: 0,
    totalLossValue: 0,
    missingCostProductCount: 0,
    reasons: [],
    products: [],
    ...over,
  }
}

function posDeadItems(over: Partial<PosDeadItems> = {}): PosDeadItems {
  return {
    from: '2026-06-01',
    to: '2026-06-30',
    currency: 'CZK',
    productCount: 0,
    knownStockValue: 0,
    missingCostProductCount: 0,
    products: [],
    ...over,
  }
}

describe('buildLocationRevenue', () => {
  it('seskupí tržby po pobočkách, dopočítá průměr a podíl', () => {
    const sales = [
      sale({ locationId: 'l1', total: 100 }),
      sale({ locationId: 'l1', total: 300 }),
      sale({ locationId: 'l2', total: 100 }),
    ]
    const rows = buildLocationRevenue(sales, LOCATIONS)
    expect(rows).toHaveLength(2)
    // řazeno sestupně dle tržby → Praha první
    expect(rows[0].locationName).toBe('Praha')
    expect(rows[0].revenue).toBe(400)
    expect(rows[0].saleCount).toBe(2)
    expect(rows[0].avgSale).toBe(200)
    expect(rows[0].sharePercent).toBe(80) // 400 z 500
    expect(rows[1].locationName).toBe('Brno')
    expect(rows[1].sharePercent).toBe(20)
  })

  it('spropitné se odečítá z tržby a vykazuje zvlášť (tip není tržba provozovny)', () => {
    // total = net + vat + tip; revenue musí být bez tipu.
    const rows = buildLocationRevenue(
      [
        sale({ locationId: 'l1', total: 1100, tipAmount: 100 }), // tržba 1000
        sale({ locationId: 'l1', total: 605, tipAmount: 55 }), // tržba 550
      ],
      LOCATIONS,
    )
    expect(rows[0].revenue).toBe(1550)
    expect(rows[0].tips).toBe(155)
    expect(rows[0].avgSale).toBe(775) // průměr z tržby bez tipu
    expect(consolidationSummary(rows).totalTips).toBe(155)
    expect(consolidationSummary(rows).totalRevenue).toBe(1550)
  })

  it('stornované prodeje se do tržeb nepočítají', () => {
    const sales = [
      sale({ locationId: 'l1', total: 200, status: 'Completed' }),
      sale({ locationId: 'l1', total: 999, status: 'Cancelled' }),
    ]
    const rows = buildLocationRevenue(sales, LOCATIONS)
    expect(rows).toHaveLength(1)
    expect(rows[0].revenue).toBe(200)
    expect(rows[0].saleCount).toBe(1)
  })

  it('prodej bez pobočky spadne do „Nepřiřazeno" a je vždy poslední', () => {
    const sales = [
      sale({ locationId: null, total: 500 }), // víc než Praha, ale musí být poslední
      sale({ locationId: 'l1', total: 100 }),
    ]
    const rows = buildLocationRevenue(sales, LOCATIONS)
    expect(rows).toHaveLength(2)
    expect(rows[0].locationName).toBe('Praha')
    expect(rows[1].locationName).toBe(UNASSIGNED_LABEL)
    expect(rows[1].locationId).toBeNull()
  })

  it('locationId bez odpovídající pobočky → „Neznámá pobočka"', () => {
    const rows = buildLocationRevenue([sale({ locationId: 'smazana', total: 50 })], LOCATIONS)
    expect(rows[0].locationName).toBe('Neznámá pobočka')
  })

  it('filtr období bere jen prodeje daného měsíce (dle soldAt)', () => {
    const sales = [
      sale({ locationId: 'l1', total: 100, soldAt: '2026-06-10T10:00:00Z' }),
      sale({ locationId: 'l1', total: 200, soldAt: '2026-05-10T10:00:00Z' }),
    ]
    const june = buildLocationRevenue(sales, LOCATIONS, '2026-06')
    expect(june[0].revenue).toBe(100)
    const all = buildLocationRevenue(sales, LOCATIONS, 'all')
    expect(all[0].revenue).toBe(300)
  })

  it('prázdný vstup → prázdný výsledek', () => {
    expect(buildLocationRevenue([], LOCATIONS)).toEqual([])
  })

  it('podíly dají dohromady 100 % (v rámci zaokrouhlení)', () => {
    const sales = [sale({ locationId: 'l1', total: 100 }), sale({ locationId: 'l2', total: 100 })]
    const rows = buildLocationRevenue(sales, LOCATIONS)
    expect(rows.reduce((a, r) => a + r.sharePercent, 0)).toBe(100)
  })

  it('podíly tří stejných poboček driftují ze zaokrouhlení (99.99, ne přesně 100)', () => {
    // Realistický případ: 3× 1/3 → round2(33.333…) = 33.33, součet 99.99.
    // Dokumentuje známé chování round2 — UI se na "přesně 100" nesmí spoléhat.
    const locations = [...LOCATIONS, loc('l3', 'Ostrava')]
    const sales = [
      sale({ locationId: 'l1', total: 100 }),
      sale({ locationId: 'l2', total: 100 }),
      sale({ locationId: 'l3', total: 100 }),
    ]
    const rows = buildLocationRevenue(sales, locations)
    expect(rows.map((r) => r.sharePercent)).toEqual([33.33, 33.33, 33.33])
    const sum = rows.reduce((a, r) => a + r.sharePercent, 0)
    expect(sum).toBeCloseTo(99.99, 5)
    expect(sum).not.toBe(100)
  })

  it('avgSale se zaokrouhluje na 2 desetinná místa (nedělitelný průměr)', () => {
    const rows = buildLocationRevenue(
      [
        sale({ locationId: 'l1', total: 100 }),
        sale({ locationId: 'l1', total: 100 }),
        sale({ locationId: 'l1', total: 100 }),
      ],
      LOCATIONS,
    )
    // 300 / 3 = 100 přesně, ale revenue 100/3 průměr ověříme jiným rozdělením:
    expect(rows[0].revenue).toBe(300)
    expect(rows[0].avgSale).toBe(100)
  })

  it('avgSale u nedělitelné částky → round2', () => {
    const rows = buildLocationRevenue(
      [
        sale({ locationId: 'l1', total: 10 }),
        sale({ locationId: 'l1', total: 10 }),
        sale({ locationId: 'l1', total: 10.01 }),
      ],
      LOCATIONS,
    )
    // (10 + 10 + 10.01) / 3 = 10.0033… → 10
    expect(rows[0].revenue).toBe(30.01)
    expect(rows[0].avgSale).toBe(10)
  })

  it('prodej s total = 0 se započítá do saleCount, revenue zůstává 0', () => {
    const rows = buildLocationRevenue(
      [sale({ locationId: 'l1', total: 0 }), sale({ locationId: 'l1', total: 0 })],
      LOCATIONS,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].revenue).toBe(0)
    expect(rows[0].saleCount).toBe(2)
    expect(rows[0].avgSale).toBe(0)
    // total celku je 0 → share nesmí dělit nulou (NaN)
    expect(rows[0].sharePercent).toBe(0)
  })

  it('všechny prodeje total = 0 → sharePercent 0, ne NaN', () => {
    const rows = buildLocationRevenue(
      [sale({ locationId: 'l1', total: 0 }), sale({ locationId: 'l2', total: 0 })],
      LOCATIONS,
    )
    expect(rows.every((r) => r.sharePercent === 0)).toBe(true)
    expect(rows.every((r) => !Number.isNaN(r.sharePercent))).toBe(true)
  })

  it('stabilní řazení: dvě pobočky se stejnou tržbou drží pořadí vstupu', () => {
    const rows = buildLocationRevenue(
      [sale({ locationId: 'l1', total: 100 }), sale({ locationId: 'l2', total: 100 })],
      LOCATIONS,
    )
    expect(rows.map((r) => r.locationName)).toEqual(['Praha', 'Brno'])
  })

  it('prodej bez soldAt: při filtru období vypadne, při „all" se započítá', () => {
    const sales = [
      sale({ locationId: 'l1', total: 100, soldAt: '' }),
      sale({ locationId: 'l1', total: 200, soldAt: '2026-06-10T10:00:00Z' }),
    ]
    // filtr měsíce: prázdný soldAt nezačíná '2026-06' → jen 200
    const june = buildLocationRevenue(sales, LOCATIONS, '2026-06')
    expect(june[0].revenue).toBe(200)
    // 'all': bere oba
    const all = buildLocationRevenue(sales, LOCATIONS, 'all')
    expect(all[0].revenue).toBe(300)
  })

  it('neznámá pobočka v kombinaci s filtrem období', () => {
    const sales = [
      sale({ locationId: 'smazana', total: 50, soldAt: '2026-06-10T10:00:00Z' }),
      sale({ locationId: 'smazana', total: 80, soldAt: '2026-05-10T10:00:00Z' }),
    ]
    const june = buildLocationRevenue(sales, LOCATIONS, '2026-06')
    expect(june).toHaveLength(1)
    expect(june[0].locationName).toBe('Neznámá pobočka')
    expect(june[0].revenue).toBe(50)
    expect(june[0].sharePercent).toBe(100)
  })

  it('velmi velké částky se sečtou přesně (round2 nedrolí)', () => {
    const rows = buildLocationRevenue(
      [sale({ locationId: 'l1', total: 9999999.99 }), sale({ locationId: 'l1', total: 0.01 })],
      LOCATIONS,
    )
    expect(rows[0].revenue).toBe(10000000)
    expect(rows[0].saleCount).toBe(2)
  })

  it('velmi malé částky (haléře) se agregují bez ztráty přesnosti', () => {
    const rows = buildLocationRevenue(
      [sale({ locationId: 'l1', total: 0.1 }), sale({ locationId: 'l1', total: 0.2 })],
      LOCATIONS,
    )
    // 0.1 + 0.2 = 0.30000000000000004 v IEEE754 → round2 sráží na 0.3
    expect(rows[0].revenue).toBe(0.3)
  })
})

describe('consolidationSummary', () => {
  it('sečte tržby, prodeje a spočítá počet poboček + top pobočku', () => {
    const rows = buildLocationRevenue(
      [sale({ locationId: 'l1', total: 400 }), sale({ locationId: 'l2', total: 100 })],
      LOCATIONS,
    )
    const s = consolidationSummary(rows)
    expect(s.totalRevenue).toBe(500)
    expect(s.totalSales).toBe(2)
    expect(s.locationCount).toBe(2)
    expect(s.topLocationName).toBe('Praha')
  })

  it('Nepřiřazeno se nepočítá do počtu poboček ani jako top', () => {
    const rows = buildLocationRevenue(
      [sale({ locationId: null, total: 900 }), sale({ locationId: 'l2', total: 100 })],
      LOCATIONS,
    )
    const s = consolidationSummary(rows)
    expect(s.totalRevenue).toBe(1000) // Nepřiřazeno se do CELKOVÝCH tržeb počítá
    expect(s.locationCount).toBe(1) // ale ne do počtu poboček
    expect(s.topLocationName).toBe('Brno') // top jen ze skutečných poboček
  })

  it('prázdné řádky → nuly a top null', () => {
    const s = consolidationSummary([])
    expect(s).toEqual({
      totalRevenue: 0,
      totalTips: 0,
      totalSales: 0,
      locationCount: 0,
      topLocationName: null,
    })
  })
})

describe('availablePeriods', () => {
  it('vrátí měsíce dokončených prodejů sestupně, bez duplicit', () => {
    const sales = [
      sale({ soldAt: '2026-06-10T10:00:00Z' }),
      sale({ soldAt: '2026-06-20T10:00:00Z' }),
      sale({ soldAt: '2026-05-01T10:00:00Z' }),
      sale({ soldAt: '2026-04-01T10:00:00Z', status: 'Cancelled' }), // storno se nezapočítá
    ]
    expect(availablePeriods(sales)).toEqual(['2026-06', '2026-05'])
  })

  it('prodej s prázdným soldAt se nezapočítá do období', () => {
    const sales = [sale({ soldAt: '2026-06-10T10:00:00Z' }), sale({ soldAt: '' })]
    expect(availablePeriods(sales)).toEqual(['2026-06'])
  })

  it('žádné dokončené prodeje → prázdné pole', () => {
    expect(availablePeriods([])).toEqual([])
    expect(availablePeriods([sale({ status: 'Cancelled' })])).toEqual([])
  })
})

describe('consolidationReportRange', () => {
  it('pro konkrétní měsíc vrátí první a poslední den měsíce', () => {
    expect(consolidationReportRange([], '2026-02')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    })
    expect(consolidationReportRange([], '2028-02')).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    })
  })

  it('pro all vezme rozsah dokončených prodejů', () => {
    const sales = [
      sale({ soldAt: '2026-06-10T10:00:00Z' }),
      sale({ soldAt: '2026-05-01T10:00:00Z' }),
      sale({ soldAt: '2026-04-01T10:00:00Z', status: 'Cancelled' }),
    ]
    expect(consolidationReportRange(sales, 'all')).toEqual({
      from: '2026-05-01',
      to: '2026-06-10',
    })
  })

  it('bez dokončených prodejů pro all vrátí null', () => {
    expect(consolidationReportRange([sale({ status: 'Cancelled' })], 'all')).toBeNull()
  })
})

describe('buildLocationOperationalComparison', () => {
  it('spojí reporty poboček do provozního srovnání a seřadí podle tržby', () => {
    const rows = buildLocationOperationalComparison([
      {
        locationId: 'l2',
        locationName: 'Brno',
        summary: posSummary({ total: 500, saleCount: 5, averageSale: 100 }),
        costs: posCosts({
          grossMargin: 220,
          grossMarginPercent: 44,
          foodCostPercent: 56,
          missingCostProductCount: 1,
        }),
        losses: posLosses({ totalLossValue: 20, missingCostProductCount: 2 }),
        deadItems: posDeadItems({ knownStockValue: 90, missingCostProductCount: 3 }),
      },
      {
        locationId: 'l1',
        locationName: 'Praha',
        summary: posSummary({ total: 1000, saleCount: 4, averageSale: 250 }),
        costs: posCosts({ grossMargin: 650, grossMarginPercent: 65, foodCostPercent: 35 }),
        losses: posLosses({ totalLossValue: 50 }),
        deadItems: posDeadItems({ knownStockValue: 120 }),
      },
    ])

    expect(rows.map((r) => r.locationName)).toEqual(['Praha', 'Brno'])
    expect(rows[0]).toMatchObject({
      revenue: 1000,
      saleCount: 4,
      averageSale: 250,
      grossMargin: 650,
      grossMarginPercent: 65,
      foodCostPercent: 35,
      lossValue: 50,
      deadStockValue: 120,
      marginAfterLoss: 600,
      missingCostProductCount: 0,
    })
    expect(rows[1].marginAfterLoss).toBe(200)
    expect(rows[1].missingCostProductCount).toBe(6)
  })

  it('při stejné tržbě rozhodne marže po ztrátách', () => {
    const rows = buildLocationOperationalComparison([
      {
        locationId: 'a',
        locationName: 'A',
        summary: posSummary({ total: 100 }),
        costs: posCosts({ grossMargin: 20 }),
        losses: posLosses({ totalLossValue: 5 }),
        deadItems: posDeadItems(),
      },
      {
        locationId: 'b',
        locationName: 'B',
        summary: posSummary({ total: 100 }),
        costs: posCosts({ grossMargin: 40 }),
        losses: posLosses({ totalLossValue: 10 }),
        deadItems: posDeadItems(),
      },
    ])

    expect(rows.map((r) => r.locationName)).toEqual(['B', 'A'])
  })
})
