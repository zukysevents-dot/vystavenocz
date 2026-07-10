import { round2 } from './invoice'
import { clampPercent } from './posCalc'
import type { Sale, Shift, Employee } from './types'

/**
 * Směny & mzdové podklady — čistá logika (Workforce V2). Ze směn napojených na zaměstnance
 * (Shift.employeeId, UTC startsAt/endsAt) počítá odpracované hodiny a plánovaný mzdový náklad.
 * Efektivní sazba = shift.hourlyRateOverride ?? employee.hourlyRate ?? 0 (shodně s backendem).
 * Provize se počítá z tržeb napojených na zaměstnance (Sale.employeeId) — viz calculateCommission.
 */

/** Délka směny v hodinách z UTC okamžiků. Neplatný nebo nekladný interval → 0. */
export function shiftHours(shift: Pick<Shift, 'startsAt' | 'endsAt'>): number {
  const a = Date.parse(shift.startsAt)
  const b = Date.parse(shift.endsAt)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0
  return round2((b - a) / 3_600_000)
}

/** Efektivní hodinová sazba: per-směna override, jinak sazba zaměstnance, jinak 0. */
export function effectiveRate(
  shift: Pick<Shift, 'hourlyRateOverride'>,
  employee?: Pick<Employee, 'hourlyRate'> | null,
): number {
  return shift.hourlyRateOverride ?? employee?.hourlyRate ?? 0
}

/** Plánovaný mzdový náklad směny (hodiny × efektivní sazba). */
export function shiftWage(
  shift: Pick<Shift, 'startsAt' | 'endsAt' | 'hourlyRateOverride'>,
  employee?: Pick<Employee, 'hourlyRate'> | null,
): number {
  return round2(shiftHours(shift) * effectiveRate(shift, employee))
}

export interface EmployeePayrollRow {
  employeeId: string
  name: string
  shifts: number
  hours: number
  wage: number
}

/**
 * Payroll náhled per zaměstnanec (počet směn, hodiny, plánovaný náklad), seřazeno podle nákladu
 * sestupně. `publishedOnly` omezí na zveřejněné směny (rota). Jméno/sazba se dohledá v `employees`.
 */
export function buildPayrollPreview(
  shifts: Shift[],
  employees: Pick<Employee, 'id' | 'fullName' | 'hourlyRate'>[],
  opts: { publishedOnly?: boolean } = {},
): EmployeePayrollRow[] {
  const byId = new Map(employees.map((e) => [e.id, e]))
  const rows = new Map<string, EmployeePayrollRow>()
  for (const s of shifts) {
    if (opts.publishedOnly && s.status !== 'Published') continue
    const emp = byId.get(s.employeeId)
    const row = rows.get(s.employeeId) ?? {
      employeeId: s.employeeId,
      name: emp?.fullName ?? 'Neznámý zaměstnanec',
      shifts: 0,
      hours: 0,
      wage: 0,
    }
    row.shifts += 1
    row.hours = round2(row.hours + shiftHours(s))
    row.wage = round2(row.wage + shiftWage(s, emp))
    rows.set(s.employeeId, row)
  }
  return [...rows.values()].sort((a, b) => b.wage - a.wage)
}

export interface ShiftsTotals {
  count: number
  hours: number
  wage: number
}

/** Souhrn všech směn (počet, hodiny, plánovaný náklad). `publishedOnly` omezí na zveřejněné. */
export function totals(
  shifts: Shift[],
  employees: Pick<Employee, 'id' | 'hourlyRate'>[],
  opts: { publishedOnly?: boolean } = {},
): ShiftsTotals {
  const byId = new Map(employees.map((e) => [e.id, e]))
  let count = 0
  let hours = 0
  let wage = 0
  for (const s of shifts) {
    if (opts.publishedOnly && s.status !== 'Published') continue
    count += 1
    hours = round2(hours + shiftHours(s))
    wage = round2(wage + shiftWage(s, byId.get(s.employeeId)))
  }
  return { count, hours, wage }
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
