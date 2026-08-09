import type { VatRate } from '@/lib/types'

/** Bezpečný převod na číslo (nečíselný vstup → 0). */
export function num(s: string | null | undefined): number {
  const n = parseFloat(String(s ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Namapuje procento DPH na sazbu, kterou aplikace zná (jinak 0). */
export function toVatRate(value: string | number | null | undefined): VatRate {
  const n = Math.round(typeof value === 'number' ? value : num(value))
  return n === 12 ? 12 : n === 21 ? 21 : 0
}

/**
 * Částka z českého textu na číslo: „12 345,67 Kč" → 12345.67.
 * Zvládne mezery i pevné mezery jako oddělovač tisíců a obě desetinné konvence
 * — účetní programy tisknou obojí a špatně přečtená částka je ta nejdražší chyba.
 */
export function parseCzechAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/[\s  ]/g, '')
    .replace(/(Kč|CZK|EUR|€)/gi, '')
    .trim()
  if (!cleaned) return null

  // Poslední oddělovač rozhoduje: „1.234,56" → čárka je desetinná, „1,234.56" → tečka.
  // Rozhodující je ale délka zbytku: za desetinným oddělovačem stojí jedna nebo
  // dvě číslice, takže „1.234" jsou tisíce, ne 1,234 Kč.
  const lastSep = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'))
  const decimals = lastSep > -1 ? cleaned.length - lastSep - 1 : -1
  const normalized =
    decimals === 1 || decimals === 2
      ? cleaned.slice(0, lastSep).replace(/[.,]/g, '') + '.' + cleaned.slice(lastSep + 1)
      : cleaned.replace(/[.,]/g, '')

  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

const MONTHS_CS = [
  'ledna',
  'února',
  'března',
  'dubna',
  'května',
  'června',
  'července',
  'srpna',
  'září',
  'října',
  'listopadu',
  'prosince',
]

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const y = year < 100 ? 2000 + year : year
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Datum z českého textu na ISO (YYYY-MM-DD). Zvládne „1. 3. 2024", „01.03.2024",
 * „1.3.24", „2024-03-01" i „1. března 2024". Nerozpoznané → null.
 */
export function parseCzechDate(raw: string): string | null {
  const s = raw.trim()

  const isoMatch = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (isoMatch) return iso(+isoMatch[1], +isoMatch[2], +isoMatch[3])

  const dotted = /(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{2,4})/.exec(s)
  if (dotted) return iso(+dotted[3], +dotted[2], +dotted[1])

  const named = new RegExp(`(\\d{1,2})\\s*\\.?\\s*(${MONTHS_CS.join('|')})\\s+(\\d{4})`, 'i').exec(
    s,
  )
  if (named) {
    const month = MONTHS_CS.findIndex((m) => m.toLowerCase() === named[2].toLowerCase()) + 1
    return iso(+named[3], month, +named[1])
  }

  return null
}

/** Normalizuje IČO/DIČ z textu (odstraní mezery a oddělovače). */
export function normalizeRegistrationId(raw: string): string {
  return raw.replace(/[\s ./-]/g, '').toUpperCase()
}
