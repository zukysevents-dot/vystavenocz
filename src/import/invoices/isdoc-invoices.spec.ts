import { describe, it, expect } from 'vitest'
import { invoiceToIsdoc } from '@/lib/accounting-export'
import type { Invoice } from '@/lib/types'
import { parseIsdocInvoices, isIsdocXml } from './isdoc-invoices'

function invoice(over: Partial<Invoice> = {}): Invoice {
  return {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: '2024-0042',
    clientId: 'cli-1',
    clientSnapshot: {
      name: 'Odběratel s.r.o.',
      ico: '12345678',
      dic: 'CZ12345678',
      street: 'Testovací 1',
      city: 'Praha',
      zip: '11000',
      country: 'CZ',
      email: null,
    },
    supplierSnapshot: {
      companyName: 'Dodavatel s.r.o.',
      ico: '87654321',
      dic: 'CZ87654321',
      vatMode: 'payer',
      street: 'Dodavatelská 2',
      city: 'Brno',
      zip: '60200',
      country: 'CZ',
    },
    items: [
      {
        id: 'a',
        description: 'Konzultace',
        quantity: 2,
        unit: 'hod',
        unitPrice: 500,
        vatRate: 21,
        lineSubtotal: 1000,
        lineVat: 210,
        lineTotal: 1210,
      },
      {
        id: 'b',
        description: 'Kniha',
        quantity: 1,
        unit: 'ks',
        unitPrice: 300,
        vatRate: 12,
        lineSubtotal: 300,
        lineVat: 36,
        lineTotal: 336,
      },
    ],
    currency: 'CZK',
    issueDate: '2024-03-01',
    dueDate: '2024-03-15',
    taxableDate: '2024-03-01',
    paidAt: null,
    variableSymbol: '20240042',
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank',
    notes: null,
    subtotal: 1300,
    vatTotal: 246,
    total: 1546,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
    ...over,
  }
}

describe('parseIsdocInvoices — round-trip přes vlastní export', () => {
  const parsed = parseIsdocInvoices(invoiceToIsdoc(invoice()), 'FA-2024-0042.isdoc')[0]

  it('zachová číslo, datumy a měnu', () => {
    expect(parsed.input.invoiceNumber).toBe('2024-0042')
    expect(parsed.input.issueDate).toBe('2024-03-01')
    expect(parsed.input.taxableDate).toBe('2024-03-01')
    expect(parsed.input.currency).toBe('CZK')
  })

  it('nesplete si dodavatele s odběratelem', () => {
    expect(parsed.input.supplierSnapshot?.companyName).toBe('Dodavatel s.r.o.')
    expect(parsed.input.supplierSnapshot?.ico).toBe('87654321')
    expect(parsed.input.clientSnapshot.name).toBe('Odběratel s.r.o.')
    expect(parsed.input.clientSnapshot.ico).toBe('12345678')
  })

  it('zachová řádky včetně více sazeb DPH', () => {
    expect(parsed.input.items).toHaveLength(2)
    expect(parsed.input.items[0]).toMatchObject({ quantity: 2, unitPrice: 500, vatRate: 21 })
    expect(parsed.input.items[1]).toMatchObject({ quantity: 1, unitPrice: 300, vatRate: 12 })
  })

  it('součet sedí na originál a nehlásí falešné varování', () => {
    expect(parsed.previewTotal).toBe(1546)
    expect(parsed.warnings).toEqual([])
    expect(parsed.vatPayer).toBe(true)
  })

  it('nese zdroj a název souboru pro dohledání v dávce', () => {
    expect(parsed.source).toBe('isdoc')
    expect(parsed.sourceFile).toBe('FA-2024-0042.isdoc')
  })
})

describe('parseIsdocInvoices — okrajové případy', () => {
  it('pozná neplátce DPH', () => {
    const xml = invoiceToIsdoc(
      invoice({
        supplierSnapshot: {
          companyName: 'Neplátce',
          ico: '11111111',
          dic: null,
          vatMode: 'non_payer',
          street: null,
          city: null,
          zip: null,
          country: 'CZ',
        },
        items: [
          {
            id: 'a',
            description: 'Práce',
            quantity: 1,
            unit: 'ks',
            unitPrice: 1000,
            vatRate: 0,
            lineSubtotal: 1000,
            lineVat: 0,
            lineTotal: 1000,
          },
        ],
        subtotal: 1000,
        vatTotal: 0,
        total: 1000,
      }),
    )
    const p = parseIsdocInvoices(xml)[0]
    expect(p.vatPayer).toBe(false)
    expect(p.input.supplierSnapshot?.vatMode).toBe('non_payer')
    expect(p.previewTotal).toBe(1000)
  })

  it('neuloží zástupnou pomlčku jako skutečnou hodnotu', () => {
    // Export píše „—" do prázdných povinných polí, ať je ISDOC schéma-validní.
    const xml = invoiceToIsdoc(
      invoice({
        clientSnapshot: {
          name: 'Bez adresy s.r.o.',
          ico: null,
          dic: null,
          street: null,
          city: null,
          zip: null,
          country: 'CZ',
          email: null,
        },
      }),
    )
    const p = parseIsdocInvoices(xml)[0]
    expect(p.input.clientSnapshot.city).toBeNull()
    expect(p.input.clientSnapshot.ico).toBeNull()
  })

  it('odmítne XML, které není ISDOC', () => {
    expect(() => parseIsdocInvoices('<foo><bar/></foo>')).toThrow(/ISDOC/)
  })

  it('odmítne rozbité XML', () => {
    expect(() => parseIsdocInvoices('<Invoice>')).toThrow()
  })
})

describe('isIsdocXml', () => {
  it('pozná ISDOC podle namespace', () => {
    expect(isIsdocXml(invoiceToIsdoc(invoice()))).toBe(true)
  })

  it('nezamění Fakturoid export za ISDOC', () => {
    expect(isIsdocXml('<invoices><invoice><number>1</number></invoice></invoices>')).toBe(false)
  })
})
