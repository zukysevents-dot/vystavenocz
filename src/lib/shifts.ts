import { round2 } from './invoice'
import { clampPercent } from './posCalc'
import type { Sale, Shift, Employee } from './types'

/**
 * Směny & mzdové podklady — čistá logika. Z naplánovaných směn počítá odpracované
 * hodiny a mzdový náklad (hodiny × sazba). Provize se počítá z tržeb napojených na
 * zaměstnance (Sale.employeeId) — viz calculateCommission.
 */

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '')
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Délka směny v hodinách. Neplatný nebo nekladný interval → 0. */
export function shiftHours(s: Shift): number {
  const a = toMinutes(s.start)
  const b = toMinutes(s.end)
  if (a === null || b === null || b <= a) return 0
  return round2((b - a) / 60)
}

/** Mzdový náklad směny (hodiny × sazba). */
export function shiftWage(s: Shift): number {
  return round2(shiftHours(s) * s.hourlyRate)
}

export interface EmployeeSummary {
  name: string
  shifts: number
  hours: number
  wage: number
}

/** Souhrn po zaměstnancích (hodiny + mzdový náklad), seřazeno podle mzdy sestupně. */
export function summarizeByEmployee(shifts: Shift[]): EmployeeSummary[] {
  const map = new Map<string, EmployeeSummary>()
  for (const s of shifts) {
    const name = s.employeeName?.trim() || 'Bez jména'
    const e = map.get(name) ?? { name, shifts: 0, hours: 0, wage: 0 }
    e.shifts += 1
    e.hours = round2(e.hours + shiftHours(s))
    e.wage = round2(e.wage + shiftWage(s))
    map.set(name, e)
  }
  return [...map.values()].sort((a, b) => b.wage - a.wage)
}

export interface ShiftsTotals {
  count: number
  hours: number
  wage: number
}

export function totals(shifts: Shift[]): ShiftsTotals {
  return {
    count: shifts.length,
    hours: round2(shifts.reduce((a, s) => a + shiftHours(s), 0)),
    wage: round2(shifts.reduce((a, s) => a + shiftWage(s), 0)),
  }
}

export interface EmployeeCommission {
  employeeId: string
  name: string
  salesCount: number
  revenue: number // čistá tržba (základ provize), bez DPH a spropitného
  commission: number // revenue × ratePercent %
}

/**
 * Provize z tržeb per zaměstnanec. Základ = čistá tržba (`totalNet`) DOKONČENÝCH prodejů
 * napojených na zaměstnance přes `Sale.employeeId`. `ratePercent` = % provize (clampnuto 0–100).
 * Nepočítá se: storno, prodeje bez zaměstnance a záporné tržby (vratky/dobropisy). Jméno se
 * dohledá v `employees` (jinak „Neznámý zaměstnanec"). Řazeno podle provize sestupně.
 */
export function calculateCommission(
  sales: Sale[],
  employees: Pick<Employee, 'id' | 'fullName'>[],
  ratePercent: number,
): EmployeeCommission[] {
  const rate = clampPercent(ratePercent) // 0–100, NaN/prázdno → 0
  const nameById = new Map(employees.map((e) => [e.id, e.fullName]))
  const map = new Map<string, EmployeeCommission>()
  for (const s of sales) {
    // Jen dokončené prodeje s přiřazeným zaměstnancem; záporná tržba (vratka/dobropis
    // jako Completed prodej) do provizního podkladu nepatří.
    if (s.status !== 'Completed' || !s.employeeId || s.totalNet < 0) continue
    const e = map.get(s.employeeId) ?? {
      employeeId: s.employeeId,
      name: nameById.get(s.employeeId) ?? 'Neznámý zaměstnanec',
      salesCount: 0,
      revenue: 0,
      commission: 0,
    }
    e.salesCount += 1
    e.revenue = round2(e.revenue + s.totalNet)
    e.commission = round2((e.revenue * rate) / 100)
    map.set(s.employeeId, e)
  }
  return [...map.values()].sort((a, b) => b.commission - a.commission)
}
