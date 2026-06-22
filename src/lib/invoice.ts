/**
 * Fakturační utility: výpočty DPH, generování čísla faktury a variabilního symbolu.
 * Přeneseno ze staré React appky (Prod:src/lib/invoice.ts), camelCase.
 * (IBAN/SPAYD QR utility přijdou s PDF taskem F6-48.)
 */
import type { InvoiceItem } from '@/lib/types'

type LineInput = Pick<InvoiceItem, 'quantity' | 'unitPrice' | 'vatRate'>

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export interface LineCalc {
  lineSubtotal: number
  lineVat: number
  lineTotal: number
}

export function calcLine(item: LineInput, vatPayer: boolean): LineCalc {
  const subtotal = round2(item.quantity * item.unitPrice)
  const vat = vatPayer ? round2((subtotal * item.vatRate) / 100) : 0
  return { lineSubtotal: subtotal, lineVat: vat, lineTotal: round2(subtotal + vat) }
}

export interface InvoiceTotals {
  subtotal: number
  vatTotal: number
  total: number
  vatBreakdown: Record<number, { base: number; vat: number }>
}

export function calcTotals(items: LineInput[], vatPayer: boolean): InvoiceTotals {
  const breakdown: Record<number, { base: number; vat: number }> = {}
  let subtotal = 0
  let vatTotal = 0

  for (const it of items) {
    const { lineSubtotal, lineVat } = calcLine(it, vatPayer)
    subtotal += lineSubtotal
    vatTotal += lineVat
    if (vatPayer) {
      const k = it.vatRate
      if (!breakdown[k]) breakdown[k] = { base: 0, vat: 0 }
      breakdown[k].base += lineSubtotal
      breakdown[k].vat += lineVat
    }
  }

  for (const k of Object.keys(breakdown)) {
    const key = Number(k)
    breakdown[key].base = round2(breakdown[key].base)
    breakdown[key].vat = round2(breakdown[key].vat)
  }

  subtotal = round2(subtotal)
  vatTotal = round2(vatTotal)
  return { subtotal, vatTotal, total: round2(subtotal + vatTotal), vatBreakdown: breakdown }
}

/** Vygeneruje variabilní symbol z čísla faktury (jen číslice, max 10). */
export function variableSymbolFromInvoiceNumber(num: string): string {
  return num.replace(/\D/g, '').slice(-10)
}

/** Generování čísla faktury podle profilu firmy (formát s {prefix}/{year}/{seq}). */
export function buildInvoiceNumber(
  prefix: string,
  format: string,
  seq: number,
  date = new Date(),
): string {
  const year = String(date.getFullYear())
  const seqStr = String(seq).padStart(4, '0')
  return format
    .replace('{prefix}', prefix || 'FA')
    .replace('{year}', year)
    .replace('{seq}', seqStr)
}

/** Formátuje částku jako české koruny (např. „12 100,00 Kč"). */
export function formatCZK(n: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 2,
  }).format(n)
}

/** Formátuje ISO datum do českého formátu (např. „20. 6. 2026"). Prázdné datum → „—". */
export function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('cs-CZ')
}

/** Převod českého čísla účtu (prefix-number/bank) na IBAN. Nevalidní formát → null. */
export function czAccountToIban(account: string): string | null {
  if (!account) return null
  const cleaned = account.replace(/\s/g, '')
  const match = cleaned.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/)
  if (!match) return null
  const [, prefix = '', number, bank] = match
  const bban = `${bank}${prefix.padStart(6, '0')}${number.padStart(10, '0')}` // 20 znaků
  // mod-97 dle ISO 13616: BBAN + „CZ" jako „1235" + „00"
  const check = String(98 - mod97(`${bban}123500`)).padStart(2, '0')
  return `CZ${check}${bban}`
}

function mod97(num: string): number {
  let rem = 0
  for (const c of num) {
    rem = (rem * 10 + Number(c)) % 97
  }
  return rem
}

/**
 * SPAYD řetězec (Short Payment Descriptor) — ČBA standard pro QR platby.
 * Příklad: SPD*1.0*ACC:CZ65...*AM:480.55*CC:CZK*X-VS:20260005
 */
export function buildSpayd(opts: {
  iban: string
  amount: number
  currency?: string
  variableSymbol?: string
  message?: string
  swift?: string | null
}): string {
  const parts: string[] = [
    'SPD*1.0',
    `ACC:${opts.iban.replace(/\s/g, '')}${opts.swift ? '+' + opts.swift : ''}`,
    `AM:${opts.amount.toFixed(2)}`,
    `CC:${opts.currency || 'CZK'}`,
  ]
  if (opts.variableSymbol) parts.push(`X-VS:${opts.variableSymbol.replace(/\D/g, '')}`)
  if (opts.message) {
    const msg = opts.message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9 .,:_-]/g, '')
      .slice(0, 60)
    if (msg) parts.push(`MSG:${msg}`)
  }
  return parts.join('*')
}
