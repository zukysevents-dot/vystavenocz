import { describe, it, expect } from 'vitest'
import { quoteTotal, summarizeQuotes, quoteStatusLabel } from '@/lib/quotes'
import type { Quote, QuoteItem, QuoteStatus } from '@/lib/types'

function items(): QuoteItem[] {
  return [
    { description: 'Práce', quantity: 2, unitPrice: 500, vatRate: 21, kind: 'work' },
    { description: 'Materiál', quantity: 1, unitPrice: 300, vatRate: 21, kind: 'material' },
  ]
}

function quote(over: Partial<Quote> = {}): Quote {
  return {
    id: 'q1',
    number: 'NAB-2024-0001',
    clientId: null,
    clientName: 'Novák',
    status: 'sent',
    items: items(),
    validUntil: '2024-07-31',
    note: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...over,
  }
}

describe('quoteTotal', () => {
  it('preferuje serverem spočítaný total (Quote V2)', () => {
    // Server total 9999 se použije i kdyby položky říkaly něco jiného.
    expect(quoteTotal(quote({ total: 9999 }), true)).toBe(9999)
  })
  it('plátce DPH: fallback dopočítá vč. DPH (stejná matematika jako faktura)', () => {
    // základ 1300, DPH 21 % = 273 → 1573
    expect(quoteTotal(quote(), true)).toBe(1573)
  })
  it('neplátce: fallback bez DPH', () => {
    expect(quoteTotal(quote(), false)).toBe(1300)
  })
})

describe('summarizeQuotes', () => {
  it('spočítá počet, přijaté a jejich hodnotu (server total má přednost)', () => {
    const s = summarizeQuotes(
      [
        quote({ status: 'sent' }),
        quote({ status: 'accepted' }), // fallback 1573
        quote({ status: 'accepted', total: 1210 }), // server total 1210
        quote({ status: 'rejected' }),
        quote({ status: 'expired' }),
      ],
      true,
    )
    expect(s.count).toBe(5)
    expect(s.accepted).toBe(2)
    expect(s.acceptedValue).toBe(1573 + 1210)
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
    ['expired', 'Expirováno'],
  ])('%s → %s', (s, label) => {
    expect(quoteStatusLabel(s)).toBe(label)
  })
})
