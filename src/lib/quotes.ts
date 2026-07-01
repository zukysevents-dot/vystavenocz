import { calcTotals } from './invoice'
import type { Quote, QuoteStatus } from './types'

/**
 * Cenové nabídky — čistá logika. Součty se počítají stejnou matematikou jako faktura
 * (calcTotals nad položkami), aby po převodu nabídky na fakturu částky seděly.
 */

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Koncept',
  sent: 'Odesláno',
  accepted: 'Přijato',
  rejected: 'Odmítnuto',
}

export function quoteStatusLabel(s: QuoteStatus): string {
  return STATUS_LABELS[s]
}

/** Součet nabídky včetně DPH (u neplátce bez DPH). */
export function quoteTotal(quote: Quote, vatPayer: boolean): number {
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
