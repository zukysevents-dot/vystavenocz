import type { RecurringInvoiceStatus } from './types'

/**
 * Opakované faktury V2 (modul invoicing) — čistá logika plánu běhů.
 *
 * `nextRunDate` (kdy se má faktura vygenerovat) počítá SERVER; tyto helpery ho zrcadlí pro mock
 * režim i zobrazení. Datumy jsou ISO `yyyy-MM-dd` řetězce — porovnávají se lexikograficky (= chronologicky),
 * skládají se ručně (žádný `toISOString`, tedy žádný posun kvůli časové zóně).
 */

const STATUS_LABELS: Record<RecurringInvoiceStatus, string> = {
  active: 'Aktivní',
  paused: 'Pozastavená',
}

export function recurringStatusLabel(status: RecurringInvoiceStatus): string {
  return STATUS_LABELS[status]
}

/** Režim vystavení: koncept ke kontrole vs. automatické vystavení. */
export function recurringModeLabel(autoIssue: boolean): string {
  return autoIssue ? 'Auto-vystavení' : 'Koncept'
}

/** Počet dní v měsíci (`month` = 1–12). Ošetřuje přestupný rok. */
export function daysInMonth(year: number, month: number): number {
  // Date má měsíce 0-indexované; `new Date(y, M, 0)` = poslední den měsíce M (1-indexovaně).
  return new Date(year, month, 0).getDate()
}

/** Sestaví ISO `yyyy-MM-dd` z požadovaného dne v měsíci a clampne ho na platný den (31. → 28./29./30.). */
export function clampToMonth(year: number, month: number, dayOfMonth: number): string {
  const day = Math.min(Math.max(1, dayOfMonth), daysInMonth(year, month))
  return `${year}-${pad(month)}-${pad(day)}`
}

/**
 * První naplánovaný běh v den `dayOfMonth` **v den `fromISO` nebo po něm**. Krok po měsíci (MVP měsíční
 * frekvence). Když `dayOfMonth` v aktuálním měsíci už uplynul, posune se na příští měsíc; den se vždy clampne.
 */
export function computeNextRunDate(fromISO: string, dayOfMonth: number): string {
  let { year, month } = parseIso(fromISO)
  // Strop 24 iterací = pojistka proti nekonečné smyčce; reálně stačí ≤ 2.
  for (let i = 0; i < 24; i++) {
    const candidate = clampToMonth(year, month, dayOfMonth)
    if (candidate >= fromISO) return candidate
    ;({ year, month } = addMonths(year, month, 1))
  }
  return clampToMonth(year, month, dayOfMonth)
}

/** Další běh po vygenerování v `currentISO`: posun o `intervalMonths` měsíců a clamp dne (konec měsíce/rok). */
export function advanceRunDate(currentISO: string, dayOfMonth: number, intervalMonths = 1): string {
  const { year, month } = parseIso(currentISO)
  const next = addMonths(year, month, Math.max(1, intervalMonths))
  return clampToMonth(next.year, next.month, dayOfMonth)
}

/** Období, za které se fakturuje (idempotence gate) — `yyyy-MM` z ISO data. */
export function periodKey(iso: string): string {
  const { year, month } = parseIso(iso)
  return `${year}-${pad(month)}`
}

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

// Posun o N měsíců s přetečením do dalšího roku (month = 1–12).
function addMonths(year: number, month: number, count: number): { year: number; month: number } {
  const zeroBased = month - 1 + count
  return { year: year + Math.floor(zeroBased / 12), month: (((zeroBased % 12) + 12) % 12) + 1 }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
