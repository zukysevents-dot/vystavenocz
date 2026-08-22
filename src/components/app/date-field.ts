import { CalendarDate, type DateValue } from '@internationalized/date'

/**
 * Převod mezi ISO datem (`YYYY-MM-DD`), ve kterém se datum drží i posílá na server, a hodnotou
 * kalendáře. Odděleno od komponenty, aby šel převod testovat bez vykreslování.
 */

/** Nečekaný tvar (prázdno, plné ISO s časem, nesmysl) → nic; pole zůstane prázdné místo pádu. */
export function isoToDateValue(iso: string): DateValue | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return undefined
  return new CalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

export function dateValueToIso(value: DateValue | undefined): string {
  if (!value) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.year}-${pad(value.month)}-${pad(value.day)}`
}
