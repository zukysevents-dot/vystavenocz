import { describe, it, expect } from 'vitest'
import { quoteTotal, summarizeQuotes, quoteStatusLabel } from '@/lib/quotes'
import type { Quote, QuoteStatus } from '@/lib/types'

function quote(over: Partial<Quote> = {}): Quote {
  return {
    id: 'q1',
    number: 'NAB-2024-0001',
    clientName: 'Novák',
    status: 'sent',
    items: [
      { description: 'Práce', quantity: 2, unitPrice: 500, vatRate: 21 },
      { description: 'Materiál', quantity: 1, unitPrice: 300, vatRate: 21 },
    ],
    validUntil: '2024-07-31',
    note: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...over,
  }
}

describe('quoteTotal', () => {
  it('plátce DPH: součet vč. DPH (stejná matematika jako faktura)', () => {
    // základ 1300, DPH 21 % = 273 → 1573
    expect(quoteTotal(quote(), true)).toBe(1573)
  })
  it('neplátce: bez DPH', () => {
    expect(quoteTotal(quote(), false)).toBe(1300)
  })
})

describe('summarizeQuotes', () => {
  it('spočítá počet, přijaté a jejich hodnotu', () => {
    const s = summarizeQuotes(
      [
        quote({ status: 'sent' }),
        quote({ status: 'accepted' }),
        quote({
          status: 'accepted',
          items: [{ description: 'X', quantity: 1, unitPrice: 1000, vatRate: 21 }],
        }),
        quote({ status: 'rejected' }),
      ],
      true,
    )
    expect(s.count).toBe(4)
    expect(s.accepted).toBe(2)
    // 1573 (přijatá standardní) + 1210 (1000 + 21 %) = 2783
    expect(s.acceptedValue).toBe(2783)
  })
  it('prázdný seznam → nuly', () => {
    expect(summarizeQuotes([], true)).toEqual({ count: 0, accepted: 0, acceptedValue: 0 })
  })
})

describe('quoteStatusLabel', () => {
  it.each<[QuoteStatus, string]>([
    ['draft', 'Koncept'],
    ['sent', 'Odesláno'],
    ['accepted', 'Přijato'],
    ['rejected', 'Odmítnuto'],
  ])('%s → %s', (s, label) => {
    expect(quoteStatusLabel(s)).toBe(label)
  })
})
