import { describe, it, expect } from 'vitest'
import { vatSummary, availablePeriods } from '@/lib/dph'
import type { Invoice, InvoiceItem } from '@/lib/types'

let seq = 0
function item(over: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: `it${++seq}`,
    description: 'X',
    quantity: 1,
    unit: 'ks',
    unitPrice: 1000,
    vatRate: 21,
    lineSubtotal: 1000,
    lineVat: 210,
    lineTotal: 1210,
    ...over,
  }
}
function inv(over: Partial<Invoice> = {}): Invoice {
  return {
    id: `i${++seq}`,
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: '2024-0001',
    clientId: null,
    clientSnapshot: { name: 'K' },
    supplierSnapshot: {
      companyName: 'F',
      ico: '1',
      dic: 'CZ1',
      vatMode: 'payer',
      street: null,
      city: null,
      zip: null,
    },
    items: [item()],
    currency: 'CZK',
    issueDate: '2024-03-01',
    dueDate: '2024-03-15',
    taxableDate: '2024-03-01',
    paidAt: null,
    variableSymbol: null,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank',
    subtotal: 1000,
    vatTotal: 210,
    total: 1210,
    notes: null,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
    ...over,
  }
}

describe('vatSummary', () => {
  it('sečte základ a daň po sazbách', () => {
    const s = vatSummary(
      [
        inv({ items: [item({ vatRate: 21, lineSubtotal: 1000, lineVat: 210 })] }),
        inv({ items: [item({ vatRate: 12, lineSubtotal: 500, lineVat: 60 })] }),
        inv({ items: [item({ vatRate: 21, lineSubtotal: 2000, lineVat: 420 })] }),
      ],
      'all',
    )
    expect(s.rows).toEqual([
      { rate: 21, base: 3000, vat: 630 },
      { rate: 12, base: 500, vat: 60 },
    ])
    expect(s.totalBase).toBe(3500)
    expect(s.totalVat).toBe(690)
    expect(s.count).toBe(3)
  })

  it('nezahrne koncept, storno, proformu ani cizí měnu', () => {
    const s = vatSummary(
      [
        inv({ items: [item({ lineSubtotal: 1000, lineVat: 210 })] }),
        inv({ status: 'draft' }),
        inv({ status: 'cancelled' }),
        inv({ documentType: 'proforma' }),
        inv({ currency: 'EUR' }),
      ],
      'all',
    )
    expect(s.totalBase).toBe(1000)
    expect(s.count).toBe(1)
  })

  it('dobropis (credit_note) snižuje daň na výstupu (netto)', () => {
    const s = vatSummary(
      [
        inv({ items: [item({ lineSubtotal: 1000, lineVat: 210 })] }),
        inv({
          documentType: 'credit_note',
          items: [item({ lineSubtotal: -1000, lineVat: -210 })],
        }),
      ],
      'all',
    )
    expect(s.totalBase).toBe(0)
    expect(s.totalVat).toBe(0)
    expect(s.count).toBe(2)
  })

  it('filtruje podle období (DUZP)', () => {
    const s = vatSummary(
      [
        inv({ taxableDate: '2024-03-10', items: [item({ lineSubtotal: 1000, lineVat: 210 })] }),
        inv({ taxableDate: '2024-04-05', items: [item({ lineSubtotal: 5000, lineVat: 1050 })] }),
      ],
      '2024-03',
    )
    expect(s.totalBase).toBe(1000)
    expect(s.count).toBe(1)
  })

  it('neplátce (lineVat 0) → daň 0', () => {
    const s = vatSummary(
      [inv({ items: [item({ vatRate: 0, lineSubtotal: 5000, lineVat: 0, lineTotal: 5000 })] })],
      'all',
    )
    expect(s.totalVat).toBe(0)
    expect(s.rows[0]).toEqual({ rate: 0, base: 5000, vat: 0 })
  })

  it('neplátce s NENULOVÝM lineVat (importovaný doklad) → daň 0, ne nafouknutá', () => {
    const nonPayer = {
      companyName: 'OSVČ',
      ico: '1',
      dic: null,
      vatMode: 'non_payer' as const,
      street: null,
      city: null,
      zip: null,
    }
    const s = vatSummary(
      [
        inv({
          supplierSnapshot: nonPayer,
          items: [item({ vatRate: 21, lineSubtotal: 1000, lineVat: 210 })],
        }),
      ],
      'all',
    )
    expect(s.totalBase).toBe(1000)
    expect(s.totalVat).toBe(0) // DPH se neplátci nepřičte
  })

  it('faktura bez DUZP se nezapočítá ani v „all"', () => {
    const s = vatSummary([inv({ taxableDate: '' })], 'all')
    expect(s.count).toBe(0)
    expect(s.totalBase).toBe(0)
  })
})

describe('availablePeriods', () => {
  it('vrátí unikátní období sestupně', () => {
    const p = availablePeriods([
      inv({ taxableDate: '2024-03-01' }),
      inv({ taxableDate: '2024-04-15' }),
      inv({ taxableDate: '2024-03-20' }),
      inv({ status: 'draft', taxableDate: '2024-01-01' }), // koncept se nepočítá
    ])
    expect(p).toEqual(['2024-04', '2024-03'])
  })
})
