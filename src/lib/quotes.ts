import { calcTotals } from './invoice'
import type { Quote, QuoteStatus } from './types'

/**
 * Cenové nabídky V2 — čistá logika. Součty počítá SERVER (Quote V2 nese subtotal/vatTotal/total);
 * `quoteTotal` je preferuje a jinak dopočítá stejnou matematikou jako faktura (fallback pro mock).
 */

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Koncept',
  sent: 'Odesláno',
  accepted: 'Přijato',
  rejected: 'Odmítnuto',
  expired: 'Expirováno',
}

export function quoteStatusLabel(s: QuoteStatus): string {
  return STATUS_LABELS[s]
}

/** Součet nabídky vč. DPH: preferuje serverem spočítaný `total`, jinak dopočítá z položek. */
export function quoteTotal(quote: Quote, vatPayer: boolean): number {
  if (typeof quote.total === 'number') return quote.total
  return calcTotals(quote.items, vatPayer).total
}

export interface QuotesSummary {
  count: number
  accepted: number
  acceptedValue: number // hodnota přijatých nabídek (vč. DPH)
}

export function summarizeQuotes(quotes: Quote[], vatPayer: boolean): QuotesSummary {
  const acc = quotes.filter((q) => q.status === 'accepted')
  return {
    count: quotes.length,
    accepted: acc.length,
    acceptedValue: acc.reduce((a, q) => a + quoteTotal(q, vatPayer), 0),
  }
}
