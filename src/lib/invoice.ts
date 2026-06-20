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

/** Formátuje ISO datum do českého formátu (např. „20. 6. 2026"). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ')
}
