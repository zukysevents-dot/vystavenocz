import { describe, it, expect } from 'vitest'
import { CalendarDate } from '@internationalized/date'
import { isoToDateValue, dateValueToIso } from './date-field'

// Převod mezi ISO řetězcem (tak se datum drží i posílá na server) a hodnotou kalendáře.
// Chyba tady znamená, že se uživateli tiše ztratí vybraný den nebo se posune o měsíc.
describe('isoToDateValue', () => {
  it('převede platné ISO datum', () => {
    const v = isoToDateValue('2026-09-05')
    expect(v?.year).toBe(2026)
    expect(v?.month).toBe(9)
    expect(v?.day).toBe(5)
  })

  it('zvládne hranice roku i přestupný den', () => {
    expect(isoToDateValue('2026-01-01')?.month).toBe(1)
    expect(isoToDateValue('2026-12-31')?.day).toBe(31)
    expect(isoToDateValue('2024-02-29')?.day).toBe(29)
  })

  it('prázdná nebo nečekaná hodnota → nic (pole zůstane prázdné, nespadne)', () => {
    expect(isoToDateValue('')).toBeUndefined()
    expect(isoToDateValue('2026-09-05T10:00:00.000Z')).toBeUndefined()
    expect(isoToDateValue('nesmysl')).toBeUndefined()
  })
})

describe('dateValueToIso', () => {
  it('doplní nuly, aby vznikl platný ISO tvar', () => {
    expect(dateValueToIso(new CalendarDate(2026, 1, 5))).toBe('2026-01-05')
    expect(dateValueToIso(new CalendarDate(2026, 12, 31))).toBe('2026-12-31')
  })

  it('bez hodnoty vrací prázdný řetězec', () => {
    expect(dateValueToIso(undefined)).toBe('')
  })

  it('převod tam a zpět zachová den', () => {
    const iso = '2026-09-05'
    expect(dateValueToIso(isoToDateValue(iso))).toBe(iso)
  })
})
