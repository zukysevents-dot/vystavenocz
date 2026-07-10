import { describe, it, expect } from 'vitest'
import {
  shiftHours,
  shiftWage,
  effectiveRate,
  buildPayrollPreview,
  totals,
  calculateCommission,
} from '@/lib/shifts'
import type { Sale, Shift } from '@/lib/types'

let seq = 0
/** ISO UTC pro daný celý+půl hodiny den 2024-06-03 (rozdíly jsou nezávislé na TZ). */
function iso(h: number, m = 0): string {
  return `2024-06-03T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`
}
function shift(over: Partial<Shift> = {}): Shift {
  seq += 1
  return {
    id: `s${seq}`,
    employeeId: 'e1',
    locationId: null,
    startsAt: iso(8),
    endsAt: iso(16, 30),
    status: 'Draft',
    position: null,
    hourlyRateOverride: null,
    note: null,
    ...over,
  }
}

describe('shiftHours', () => {
  it('spočítá délku směny v hodinách z UTC okamžiků', () => {
    expect(shiftHours(shift({ startsAt: iso(8), endsAt: iso(16, 30) }))).toBe(8.5)
  })
  it('nekladný nebo neplatný interval → 0', () => {
    expect(shiftHours(shift({ startsAt: iso(16), endsAt: iso(8) }))).toBe(0)
    expect(shiftHours(shift({ startsAt: iso(8), endsAt: iso(8) }))).toBe(0)
    expect(shiftHours({ startsAt: 'xx', endsAt: iso(16) })).toBe(0)
  })
  it('směna přes půlnoc funguje (UTC rozdíl)', () => {
    expect(
      shiftHours({ startsAt: '2024-06-03T22:00:00.000Z', endsAt: '2024-06-04T02:00:00.000Z' }),
    ).toBe(4)
  })
})

describe('effectiveRate', () => {
  it('override má přednost před sazbou zaměstnance', () => {
    expect(effectiveRate({ hourlyRateOverride: 300 }, { hourlyRate: 200 })).toBe(300)
  })
  it('bez override → sazba zaměstnance', () => {
    expect(effectiveRate({ hourlyRateOverride: null }, { hourlyRate: 200 })).toBe(200)
  })
  it('bez override i bez sazby → 0', () => {
    expect(effectiveRate({ hourlyRateOverride: null }, { hourlyRate: null })).toBe(0)
    expect(effectiveRate({ hourlyRateOverride: null }, null)).toBe(0)
    expect(effectiveRate({ hourlyRateOverride: null })).toBe(0)
  })
})

describe('shiftWage', () => {
  it('mzda = hodiny × efektivní sazba (sazba zaměstnance)', () => {
    expect(shiftWage(shift({ startsAt: iso(8), endsAt: iso(16) }), { hourlyRate: 200 })).toBe(1600)
  })
  it('override sazby přebije zaměstnance', () => {
    expect(
      shiftWage(shift({ startsAt: iso(8), endsAt: iso(16), hourlyRateOverride: 250 }), {
        hourlyRate: 200,
      }),
    ).toBe(2000)
  })
  it('bez známé sazby → 0', () => {
    expect(shiftWage(shift({ startsAt: iso(8), endsAt: iso(16) }))).toBe(0)
  })
})

describe('buildPayrollPreview', () => {
  const emps = [
    { id: 'e1', fullName: 'Anna', hourlyRate: 200 },
    { id: 'e2', fullName: 'Bob', hourlyRate: 250 },
  ]

  it('sečte hodiny a náklad per zaměstnanec, seřadí podle nákladu sestupně', () => {
    const rows = buildPayrollPreview(
      [
        shift({ employeeId: 'e1', startsAt: iso(8), endsAt: iso(12) }), // 4 h, 800
        shift({ employeeId: 'e1', startsAt: iso(13), endsAt: iso(17) }), // 4 h, 800
        shift({ employeeId: 'e2', startsAt: iso(8), endsAt: iso(20) }), // 12 h, 3000
      ],
      emps,
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ employeeId: 'e2', name: 'Bob', shifts: 1, hours: 12, wage: 3000 })
    expect(rows[1]).toEqual({ employeeId: 'e1', name: 'Anna', shifts: 2, hours: 8, wage: 1600 })
  })

  it('publishedOnly ignoruje rozpracované směny', () => {
    const rows = buildPayrollPreview(
      [
        shift({ employeeId: 'e1', status: 'Published', startsAt: iso(8), endsAt: iso(12) }),
        shift({ employeeId: 'e1', status: 'Draft', startsAt: iso(13), endsAt: iso(17) }),
      ],
      emps,
      { publishedOnly: true },
    )
    expect(rows[0]).toMatchObject({ shifts: 1, hours: 4, wage: 800 })
  })

  it('zaměstnanec mimo seznam → „Neznámý zaměstnanec", náklad 0 bez sazby', () => {
    const rows = buildPayrollPreview(
      [shift({ employeeId: 'x9', startsAt: iso(8), endsAt: iso(16) })],
      emps,
    )
    expect(rows[0]).toMatchObject({ name: 'Neznámý zaměstnanec', wage: 0 })
  })
})

describe('totals', () => {
  const emps = [
    { id: 'e1', hourlyRate: 200 },
    { id: 'e2', hourlyRate: 250 },
  ]
  it('celkové hodiny a plánovaný náklad', () => {
    const t = totals(
      [
        shift({ employeeId: 'e1', startsAt: iso(8), endsAt: iso(12) }), // 4 h, 800
        shift({ employeeId: 'e2', startsAt: iso(8), endsAt: iso(10) }), // 2 h, 500
      ],
      emps,
    )
    expect(t).toEqual({ count: 2, hours: 6, wage: 1300 })
  })
  it('prázdný seznam → nuly', () => {
    expect(totals([], [])).toEqual({ count: 0, hours: 0, wage: 0 })
  })
})

function sale(over: Partial<Sale> = {}): Sale {
  seq += 1
  return {
    id: `sale${seq}`,
    locationId: null,
    employeeId: null,
    paymentMethod: 'Card',
    status: 'Completed',
    discountPercent: 0,
    tipAmount: 0,
    totalNet: 1000,
    totalVat: 210,
    total: 1210,
    soldAt: '2024-06-03T10:00:00.000Z',
    items: [],
    ...over,
  }
}

describe('calculateCommission', () => {
  const emps = [
    { id: 'e1', fullName: 'Anna' },
    { id: 'e2', fullName: 'Bob' },
  ]

  it('sečte čisté tržby per zaměstnanec a spočítá provizi, seřadí sestupně', () => {
    const r = calculateCommission(
      [
        sale({ employeeId: 'e1', totalNet: 1000 }),
        sale({ employeeId: 'e1', totalNet: 500 }),
        sale({ employeeId: 'e2', totalNet: 2000 }),
      ],
      emps,
      10,
    )
    expect(r).toEqual([
      { employeeId: 'e2', name: 'Bob', salesCount: 1, revenue: 2000, commission: 200 },
      { employeeId: 'e1', name: 'Anna', salesCount: 2, revenue: 1500, commission: 150 },
    ])
  })

  it('storno a prodeje bez zaměstnance se nepočítají', () => {
    const r = calculateCommission(
      [
        sale({ employeeId: 'e1', totalNet: 1000 }),
        sale({ employeeId: 'e1', totalNet: 999, status: 'Cancelled' }),
        sale({ employeeId: null, totalNet: 5000 }),
      ],
      emps,
      10,
    )
    expect(r).toEqual([
      { employeeId: 'e1', name: 'Anna', salesCount: 1, revenue: 1000, commission: 100 },
    ])
  })

  it('sazba nad 100 % se zastropuje na 100 %', () => {
    const r = calculateCommission([sale({ employeeId: 'e1', totalNet: 1000 })], emps, 150)
    expect(r[0].commission).toBe(1000)
  })

  it('záporná tržba (vratka jako Completed prodej) se do provize nepočítá', () => {
    const r = calculateCommission(
      [sale({ employeeId: 'e1', totalNet: 1000 }), sale({ employeeId: 'e1', totalNet: -400 })],
      emps,
      10,
    )
    expect(r[0]).toMatchObject({ salesCount: 1, revenue: 1000, commission: 100 })
  })

  it('prázdný vstup → prázdný výstup', () => {
    expect(calculateCommission([], emps, 10)).toEqual([])
  })
})
