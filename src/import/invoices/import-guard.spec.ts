import { describe, it, expect } from 'vitest'
import { blockingIssues, isBlocked } from './import-guard'
import type { ParsedImportedInvoice } from './types'

function parsed(over: Partial<ParsedImportedInvoice['input']> = {}): ParsedImportedInvoice {
  return {
    input: {
      documentType: 'invoice',
      status: 'issued',
      invoiceNumber: '2024-0042',
      clientId: null,
      clientSnapshot: {
        name: 'Odběratel s.r.o.',
        ico: null,
        dic: null,
        street: null,
        city: null,
        zip: null,
        country: 'CZ',
        email: null,
      },
      supplierSnapshot: {
        companyName: 'Dodavatel s.r.o.',
        ico: null,
        dic: null,
        vatMode: 'payer',
        street: null,
        city: null,
        zip: null,
        country: 'CZ',
        bankAccount: null,
        iban: null,
        swift: null,
      },
      items: [
        {
          id: 'a',
          description: 'Práce',
          quantity: 1,
          unit: 'ks',
          unitPrice: 1000,
          vatRate: 21,
          lineSubtotal: 1000,
          lineVat: 210,
          lineTotal: 1210,
        },
      ],
      currency: 'CZK',
      issueDate: '2024-03-01',
      dueDate: '2024-03-15',
      taxableDate: '2024-03-01',
      paidAt: null,
      variableSymbol: null,
      constantSymbol: null,
      specificSymbol: null,
      paymentMethod: 'bank',
      notes: null,
      ...over,
    },
    vatPayer: true,
    previewTotal: 1210,
    warnings: [],
    source: 'pdf',
  }
}

// Server (POST /invoices/import) tahle pole vyžaduje. Bez kontroly předem by
// uživatel dostal technickou chybu z validace až po odeslání celé dávky.
describe('blockingIssues', () => {
  it('úplný doklad nic neblokuje', () => {
    expect(blockingIssues(parsed())).toEqual([])
    expect(isBlocked(parsed())).toBe(false)
  })

  it('pozná chybějící datum vystavení', () => {
    expect(blockingIssues(parsed({ issueDate: '' }))).toContain('chybí datum vystavení')
  })

  it('pozná chybějící název odběratele', () => {
    const p = parsed()
    p.input.clientSnapshot.name = ''
    expect(blockingIssues(p)).toContain('chybí název odběratele')
  })

  it('pozná chybějící číslo faktury', () => {
    expect(blockingIssues(parsed({ invoiceNumber: null }))).toContain('chybí číslo faktury')
  })

  it('pozná doklad bez položek', () => {
    expect(blockingIssues(parsed({ items: [] }))).toContain('doklad nemá žádnou položku')
  })

  it('sesbírá víc důvodů najednou', () => {
    const p = parsed({ issueDate: '', invoiceNumber: '  ' })
    expect(blockingIssues(p)).toHaveLength(2)
    expect(isBlocked(p)).toBe(true)
  })
})
