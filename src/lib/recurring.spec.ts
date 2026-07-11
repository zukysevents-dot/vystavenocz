import { describe, expect, it } from 'vitest'
import {
  advanceRunDate,
  clampToMonth,
  computeNextRunDate,
  daysInMonth,
  periodKey,
  recurringModeLabel,
  recurringStatusLabel,
} from './recurring'

describe('daysInMonth', () => {
  it('vrací délku měsíce včetně přestupného roku', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 2)).toBe(28) // nepřestupný
    expect(daysInMonth(2028, 2)).toBe(29) // přestupný
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
  })
})

describe('clampToMonth', () => {
  it('den v rámci měsíce nechá být', () => {
    expect(clampToMonth(2026, 1, 15)).toBe('2026-01-15')
    expect(clampToMonth(2026, 7, 1)).toBe('2026-07-01')
  })

  it('den nad délku měsíce clampne na poslední den (konec měsíce)', () => {
    expect(clampToMonth(2026, 2, 31)).toBe('2026-02-28') // únor nepřestupný
    expect(clampToMonth(2028, 2, 31)).toBe('2028-02-29') // únor přestupný
    expect(clampToMonth(2026, 4, 31)).toBe('2026-04-30') // duben má 30
    expect(clampToMonth(2026, 6, 31)).toBe('2026-06-30')
  })
})

describe('computeNextRunDate', () => {
  it('den v aktuálním měsíci ještě nenastal → tento měsíc', () => {
    expect(computeNextRunDate('2026-07-11', 15)).toBe('2026-07-15')
  })

  it('den je dnes → dnes (on-or-after)', () => {
    expect(computeNextRunDate('2026-07-15', 15)).toBe('2026-07-15')
  })

  it('den v aktuálním měsíci už uplynul → příští měsíc', () => {
    expect(computeNextRunDate('2026-07-20', 15)).toBe('2026-08-15')
  })

  it('den 31 v měsíci s 31 dny', () => {
    expect(computeNextRunDate('2026-07-11', 31)).toBe('2026-07-31')
  })

  it('den 31 se v kratším měsíci clampne a stále platí on-or-after', () => {
    expect(computeNextRunDate('2026-02-10', 31)).toBe('2026-02-28')
  })

  it('přechod přes konec roku', () => {
    expect(computeNextRunDate('2026-12-20', 15)).toBe('2027-01-15')
  })
})

describe('advanceRunDate', () => {
  it('posune o měsíc a zachová den', () => {
    expect(advanceRunDate('2026-07-15', 15)).toBe('2026-08-15')
  })

  it('konec měsíce: 31 → poslední den kratšího měsíce', () => {
    expect(advanceRunDate('2026-01-31', 31)).toBe('2026-02-28')
    expect(advanceRunDate('2028-01-31', 31)).toBe('2028-02-29') // přestupný
  })

  it('přechod přes rok', () => {
    expect(advanceRunDate('2026-12-15', 15)).toBe('2027-01-15')
  })

  it('respektuje intervalMonths > 1', () => {
    expect(advanceRunDate('2026-01-15', 15, 3)).toBe('2026-04-15')
    expect(advanceRunDate('2026-11-15', 15, 3)).toBe('2027-02-15')
  })
})

describe('periodKey', () => {
  it('vytvoří yyyy-MM z ISO data', () => {
    expect(periodKey('2026-07-31')).toBe('2026-07')
    expect(periodKey('2026-01-05')).toBe('2026-01')
  })
})

describe('labely', () => {
  it('stav a režim', () => {
    expect(recurringStatusLabel('active')).toBe('Aktivní')
    expect(recurringStatusLabel('paused')).toBe('Pozastavená')
    expect(recurringModeLabel(true)).toBe('Auto-vystavení')
    expect(recurringModeLabel(false)).toBe('Koncept')
  })
})
