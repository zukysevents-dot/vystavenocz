import { describe, it, expect } from 'vitest'
import { shiftHours, shiftWage, summarizeByEmployee, totals } from '@/lib/shifts'
import type { Shift } from '@/lib/types'

let seq = 0
function shift(over: Partial<Shift> = {}): Shift {
  seq += 1
  return {
    id: `s${seq}`,
    employeeName: 'Anna',
    date: '2024-06-03',
    start: '08:00',
    end: '16:30',
    hourlyRate: 200,
    note: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...over,
  }
}

describe('shiftHours', () => {
  it('spočítá délku směny v hodinách', () => {
    expect(shiftHours(shift({ start: '08:00', end: '16:30' }))).toBe(8.5)
  })
  it('nekladný nebo neplatný interval → 0', () => {
    expect(shiftHours(shift({ start: '16:00', end: '08:00' }))).toBe(0)
    expect(shiftHours(shift({ start: '08:00', end: '08:00' }))).toBe(0)
    expect(shiftHours(shift({ start: 'xx', end: '16:00' }))).toBe(0)
    expect(shiftHours(shift({ start: '25:00', end: '26:00' }))).toBe(0)
  })
})

describe('shiftWage', () => {
  it('mzda = hodiny × sazba', () => {
    expect(shiftWage(shift({ start: '08:00', end: '16:00', hourlyRate: 200 }))).toBe(1600)
  })
})

describe('summarizeByEmployee', () => {
  it('sečte hodiny a mzdu po zaměstnancích, seřadí podle mzdy', () => {
    const s = summarizeByEmployee([
      shift({ employeeName: 'Anna', start: '08:00', end: '12:00', hourlyRate: 200 }), // 4 h, 800
      shift({ employeeName: 'Anna', start: '13:00', end: '17:00', hourlyRate: 200 }), // 4 h, 800
      shift({ employeeName: 'Bob', start: '08:00', end: '20:00', hourlyRate: 250 }), // 12 h, 3000
    ])
    expect(s).toHaveLength(2)
    expect(s[0]).toEqual({ name: 'Bob', shifts: 1, hours: 12, wage: 3000 })
    expect(s[1]).toEqual({ name: 'Anna', shifts: 2, hours: 8, wage: 1600 })
  })

  it('prázdné jméno → „Bez jména"', () => {
    expect(summarizeByEmployee([shift({ employeeName: '  ' })])[0].name).toBe('Bez jména')
  })
})

describe('totals', () => {
  it('celkové hodiny a mzdový náklad', () => {
    const t = totals([
      shift({ start: '08:00', end: '12:00', hourlyRate: 200 }), // 4 h, 800
      shift({ start: '08:00', end: '10:00', hourlyRate: 300 }), // 2 h, 600
    ])
    expect(t).toEqual({ count: 2, hours: 6, wage: 1400 })
  })
  it('prázdný seznam → nuly', () => {
    expect(totals([])).toEqual({ count: 0, hours: 0, wage: 0 })
    expect(summarizeByEmployee([])).toEqual([])
  })
})

describe('hraniční případy', () => {
  it('nulová sazba → mzda 0', () => {
    expect(shiftWage(shift({ start: '08:00', end: '16:00', hourlyRate: 0 }))).toBe(0)
  })
  it('téměř celý den 00:00–23:59 → 23.98 h', () => {
    expect(shiftHours(shift({ start: '00:00', end: '23:59' }))).toBe(23.98)
  })
  it('přechod přes půlnoc není podporován → 0 (vědomé omezení)', () => {
    expect(shiftHours(shift({ start: '22:00', end: '02:00' }))).toBe(0)
  })
})
