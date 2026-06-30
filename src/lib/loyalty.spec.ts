import { describe, it, expect } from 'vitest'
import {
  buildCustomerStats,
  summarize,
  winBack,
  topCustomers,
  buildWinBackEmail,
  outreachMailto,
  segmentLabel,
} from '@/lib/loyalty'
import type { Invoice } from '@/lib/types'

const TODAY = new Date('2024-07-01T12:00:00.000Z')

let seq = 0
function inv(over: Partial<Invoice> = {}): Invoice {
  seq += 1
  return {
    id: `i${seq}`,
    documentType: 'invoice',
    status: 'paid',
    invoiceNumber: `2024-${String(seq).padStart(4, '0')}`,
    clientId: 'cli-1',
    clientSnapshot: { name: 'Zákazník s.r.o.', email: 'z@x.cz' },
    supplierSnapshot: {
      companyName: 'Naše firma',
      ico: '1',
      dic: null,
      vatMode: 'payer',
      street: null,
      city: null,
      zip: null,
    },
    items: [],
    currency: 'CZK',
    issueDate: '2024-06-01',
    dueDate: '2024-06-15',
    taxableDate: '2024-06-01',
    paidAt: null,
    variableSymbol: null,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank',
    subtotal: 1000,
    vatTotal: 0,
    total: 1000,
    notes: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...over,
  }
}

describe('buildCustomerStats', () => {
  it('seskupí faktury podle clientId a sečte obrat', () => {
    const stats = buildCustomerStats(
      [
        inv({ clientId: 'a', total: 1000, issueDate: '2024-06-01' }),
        inv({ clientId: 'a', total: 500, issueDate: '2024-05-01' }),
        inv({ clientId: 'b', total: 2000, issueDate: '2024-06-10' }),
      ],
      TODAY,
    )
    expect(stats).toHaveLength(2)
    // seřazeno podle obratu sestupně
    expect(stats[0]).toMatchObject({ key: 'b', revenue: 2000, invoiceCount: 1 })
    expect(stats[1]).toMatchObject({ key: 'a', revenue: 1500, invoiceCount: 2 })
    // poslední nákup = nejnovější faktura
    expect(stats[1].lastPurchase).toBe('2024-06-01')
  })

  it('nezapočítá koncept, storno ani dobropis', () => {
    const stats = buildCustomerStats(
      [
        inv({ total: 1000 }),
        inv({ status: 'draft', total: 999 }),
        inv({ status: 'cancelled', total: 999 }),
        inv({ documentType: 'credit_note', total: -500 }),
      ],
      TODAY,
    )
    expect(stats).toHaveLength(1)
    expect(stats[0].revenue).toBe(1000)
  })

  it('segmentuje podle dnů od posledního nákupu', () => {
    const stats = buildCustomerStats(
      [
        inv({ clientId: 'a', issueDate: '2024-06-01' }), // 30 dní → active
        inv({ clientId: 'b', issueDate: '2024-03-01' }), // 122 dní → at_risk
        inv({ clientId: 'c', issueDate: '2023-12-01' }), // 213 dní → dormant
      ],
      TODAY,
    )
    const byKey = Object.fromEntries(stats.map((s) => [s.key, s.segment]))
    expect(byKey['a']).toBe('active')
    expect(byKey['b']).toBe('at_risk')
    expect(byKey['c']).toBe('dormant')
  })

  it('hranice 90 a 180 dní', () => {
    const at = (iso: string) => buildCustomerStats([inv({ issueDate: iso })], TODAY)[0]
    expect(at('2024-04-02').segment).toBe('active') // přesně 90 dní
    expect(at('2024-04-01').segment).toBe('at_risk') // 91 dní
    expect(at('2024-01-03').segment).toBe('at_risk') // 180 dní
    expect(at('2024-01-02').segment).toBe('dormant') // 181 dní
  })
})

describe('summarize', () => {
  it('spočítá počty segmentů a celkový obrat', () => {
    const stats = buildCustomerStats(
      [
        inv({ clientId: 'a', total: 1000, issueDate: '2024-06-01' }),
        inv({ clientId: 'b', total: 2000, issueDate: '2023-12-01' }),
      ],
      TODAY,
    )
    const s = summarize(stats)
    expect(s).toMatchObject({ customers: 2, active: 1, dormant: 1, totalRevenue: 3000 })
  })
})

describe('winBack a topCustomers', () => {
  it('winBack vrací jen spící, seřazené podle obratu', () => {
    const stats = buildCustomerStats(
      [
        inv({ clientId: 'a', total: 500, issueDate: '2023-12-01' }), // dormant
        inv({ clientId: 'b', total: 3000, issueDate: '2023-11-01' }), // dormant
        inv({ clientId: 'c', total: 9000, issueDate: '2024-06-01' }), // active
      ],
      TODAY,
    )
    const wb = winBack(stats)
    expect(wb.map((s) => s.key)).toEqual(['b', 'a'])
  })

  it('topCustomers omezí počet', () => {
    const stats = buildCustomerStats(
      [
        inv({ clientId: 'a', total: 100 }),
        inv({ clientId: 'b', total: 200 }),
        inv({ clientId: 'c', total: 300 }),
      ],
      TODAY,
    )
    expect(topCustomers(stats, 2).map((s) => s.key)).toEqual(['c', 'b'])
  })
})

describe('buildWinBackEmail + outreachMailto', () => {
  it('sestaví mailto s předmětem a tělem', () => {
    const stats = buildCustomerStats(
      [inv({ clientSnapshot: { name: 'Béta', email: 'b@x.cz' } })],
      TODAY,
    )
    const url = outreachMailto(buildWinBackEmail(stats[0]))
    expect(url.startsWith('mailto:b@x.cz?')).toBe(true)
    expect(url).toContain('subject=R')
  })

  it('bez e-mailu → mailto bez adresy', () => {
    const stats = buildCustomerStats([inv({ clientSnapshot: { name: 'X', email: null } })], TODAY)
    expect(outreachMailto(buildWinBackEmail(stats[0])).startsWith('mailto:?')).toBe(true)
  })
})

describe('segmentLabel', () => {
  it('lokalizuje segmenty', () => {
    expect(segmentLabel('active')).toBe('Aktivní')
    expect(segmentLabel('dormant')).toBe('Spící')
  })
})
