import { describe, it, expect } from 'vitest'
import {
  isOutstanding,
  daysOverdue,
  buildOutstanding,
  summarize,
  agingBuckets,
  debtors,
  buildReminder,
  reminderMailto,
  otherCurrencyCount,
} from '@/lib/cashflow'
import type { Invoice, InvoiceStatus } from '@/lib/types'

const TODAY = new Date('2024-03-01T12:00:00.000Z')

let seq = 0
function inv(over: Partial<Invoice> = {}): Invoice {
  seq += 1
  return {
    id: `i${seq}`,
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: `2024-${String(seq).padStart(4, '0')}`,
    clientId: 'cli-1',
    clientSnapshot: { name: 'Odběratel s.r.o.', email: 'klient@x.cz' },
    supplierSnapshot: {
      companyName: 'Naše firma',
      ico: '87654321',
      dic: 'CZ87654321',
      vatMode: 'payer',
      street: null,
      city: null,
      zip: null,
    },
    items: [],
    currency: 'CZK',
    issueDate: '2024-01-01',
    dueDate: '2024-02-01',
    taxableDate: '2024-01-01',
    paidAt: null,
    variableSymbol: null,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank',
    subtotal: 1000,
    vatTotal: 0,
    total: 1000,
    notes: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('isOutstanding', () => {
  it.each<[InvoiceStatus, boolean]>([
    ['issued', true],
    ['overdue', true],
    ['paid', false],
    ['draft', false],
    ['cancelled', false],
  ])('status %s → %s', (status, expected) => {
    expect(isOutstanding(inv({ status }))).toBe(expected)
  })

  it('dobropis (credit_note) se nepočítá ani ve stavu issued', () => {
    expect(isOutstanding(inv({ documentType: 'credit_note', status: 'issued' }))).toBe(false)
  })
})

describe('daysOverdue', () => {
  it('po splatnosti vrátí počet dní', () => {
    expect(daysOverdue(inv({ dueDate: '2024-02-01' }), TODAY)).toBe(29)
  })
  it('ještě nedospělá → 0', () => {
    expect(daysOverdue(inv({ dueDate: '2024-03-15' }), TODAY)).toBe(0)
  })
  it('dnešní splatnost → 0', () => {
    expect(daysOverdue(inv({ dueDate: '2024-03-01' }), TODAY)).toBe(0)
  })
  it('bez data splatnosti → 0', () => {
    expect(daysOverdue(inv({ dueDate: '' }), TODAY)).toBe(0)
  })
})

describe('buildOutstanding', () => {
  it('vyfiltruje jen nezaplacené a seřadí od nejstaršího dluhu', () => {
    const list = [
      inv({ status: 'paid', dueDate: '2024-01-01' }),
      inv({ status: 'issued', dueDate: '2024-02-20' }), // 10 dní
      inv({ status: 'issued', dueDate: '2023-12-01' }), // 91 dní
      inv({ status: 'cancelled' }),
    ]
    const out = buildOutstanding(list, TODAY)
    expect(out).toHaveLength(2)
    expect(out[0].daysOverdue).toBe(91)
    expect(out[1].daysOverdue).toBe(10)
  })
})

describe('summarize', () => {
  it('sečte pohledávky a zvlášť ty po splatnosti', () => {
    const out = buildOutstanding(
      [
        inv({ total: 1000, dueDate: '2024-02-01' }), // po splatnosti
        inv({ total: 500, dueDate: '2024-04-01' }), // do splatnosti
      ],
      TODAY,
    )
    const s = summarize(out)
    expect(s.totalOutstanding).toBe(1500)
    expect(s.overdueAmount).toBe(1000)
    expect(s.outstandingCount).toBe(2)
    expect(s.overdueCount).toBe(1)
  })
})

describe('agingBuckets', () => {
  it('zařadí faktury do správných kategorií a vrátí všech 5', () => {
    const out = buildOutstanding(
      [
        inv({ total: 100, dueDate: '2024-04-01' }), // current
        inv({ total: 200, dueDate: '2024-02-15' }), // 15 dní → d1_30
        inv({ total: 400, dueDate: '2024-01-15' }), // 46 dní → d31_60
        inv({ total: 800, dueDate: '2023-12-15' }), // 77 dní → d61_90
        inv({ total: 1600, dueDate: '2023-10-01' }), // 152 dní → d90plus
      ],
      TODAY,
    )
    const buckets = agingBuckets(out)
    expect(buckets.map((b) => b.key)).toEqual(['current', 'd1_30', 'd31_60', 'd61_90', 'd90plus'])
    expect(buckets.map((b) => b.amount)).toEqual([100, 200, 400, 800, 1600])
    expect(buckets.every((b) => b.count === 1)).toBe(true)
  })
})

describe('debtors', () => {
  it('seskupí podle odběratele a seřadí podle dlužné částky', () => {
    const out = buildOutstanding(
      [
        inv({
          clientId: 'a',
          clientSnapshot: { name: 'Alfa', email: 'a@x.cz' },
          total: 300,
          dueDate: '2024-02-01',
        }),
        inv({
          clientId: 'b',
          clientSnapshot: { name: 'Beta', email: 'b@x.cz' },
          total: 1000,
          dueDate: '2024-02-10',
        }),
        inv({
          clientId: 'a',
          clientSnapshot: { name: 'Alfa', email: 'a@x.cz' },
          total: 200,
          dueDate: '2024-04-01',
        }),
      ],
      TODAY,
    )
    const d = debtors(out)
    expect(d).toHaveLength(2)
    expect(d[0]).toMatchObject({ name: 'Beta', amount: 1000, count: 1 })
    expect(d[1]).toMatchObject({ name: 'Alfa', amount: 500, count: 2 })
    expect(d[1].maxDaysOverdue).toBe(29) // nejstarší z Alfa faktur
  })

  it('dva různí klienti se stejným názvem se neslijí (klíč je clientId)', () => {
    const out = buildOutstanding(
      [
        inv({
          clientId: 'x',
          clientSnapshot: { name: 'Shodné s.r.o.', email: 'x@x.cz' },
          total: 100,
        }),
        inv({
          clientId: 'y',
          clientSnapshot: { name: 'Shodné s.r.o.', email: 'y@x.cz' },
          total: 100,
        }),
      ],
      TODAY,
    )
    expect(debtors(out)).toHaveLength(2)
  })

  it('prázdné jméno → „Neznámý odběratel"', () => {
    const out = buildOutstanding([inv({ clientSnapshot: { name: '   ', email: null } })], TODAY)
    expect(debtors(out)[0].name).toBe('Neznámý odběratel')
  })
})

describe('aging — přesné hranice 30/31/60/61/90/91 dní', () => {
  it.each([
    ['2024-01-31', 30, 'd1_30'],
    ['2024-01-30', 31, 'd31_60'],
    ['2024-01-01', 60, 'd31_60'],
    ['2023-12-31', 61, 'd61_90'],
    ['2023-12-02', 90, 'd61_90'],
    ['2023-12-01', 91, 'd90plus'],
  ])('splatnost %s → %i dní → bucket %s', (dueDate, days, bucket) => {
    const out = buildOutstanding([inv({ dueDate })], TODAY)
    expect(out[0].daysOverdue).toBe(days)
    expect(out[0].bucket).toBe(bucket)
  })
})

describe('měny', () => {
  it('faktury v cizí měně se nezahrnují do CZK pohledávek', () => {
    const out = buildOutstanding(
      [
        inv({ currency: 'CZK', total: 1000 }),
        inv({ currency: 'EUR', total: 1000 }),
        inv({ currency: '', total: 500 }), // legacy bez měny = CZK
      ],
      TODAY,
    )
    expect(out).toHaveLength(2)
    expect(summarize(out).totalOutstanding).toBe(1500)
  })

  it('otherCurrencyCount spočítá nezaplacené faktury v cizí měně', () => {
    const list = [
      inv({ currency: 'EUR' }),
      inv({ currency: 'USD' }),
      inv({ currency: 'EUR', status: 'paid' }), // zaplacená se nepočítá
      inv({ currency: 'CZK' }),
    ]
    expect(otherCurrencyCount(list)).toBe(2)
  })
})

describe('buildReminder + reminderMailto', () => {
  it('upomínka obsahuje číslo, částku a počet dní po splatnosti', () => {
    const r = buildReminder(
      inv({ invoiceNumber: '2024-0042', total: 1210, dueDate: '2024-02-01' }),
      TODAY,
    )
    expect(r.subject).toBe('Upomínka: faktura č. 2024-0042')
    expect(r.body).toContain('2024-0042')
    expect(r.body).toContain('29 dní')
    expect(r.to).toBe('klient@x.cz')
  })

  it('reminderMailto správně zakóduje předmět i tělo', () => {
    const r = buildReminder(inv({ invoiceNumber: '2024-0042' }), TODAY)
    const url = reminderMailto(r)
    expect(url.startsWith('mailto:klient@x.cz?')).toBe(true)
    expect(url).toContain('subject=Upom')
    expect(url).toContain('faktura')
  })

  it('bez e-mailu klienta → to je null a mailto bez adresy', () => {
    const r = buildReminder(inv({ clientSnapshot: { name: 'X', email: null } }), TODAY)
    expect(r.to).toBeNull()
    expect(reminderMailto(r).startsWith('mailto:?')).toBe(true)
  })
})
