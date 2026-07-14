import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INVOICE_EXPORT_FILTERS,
  filterInvoiceExport,
  invoiceExportClientOptions,
  summarizeInvoiceExport,
  type InvoiceExportFilters,
} from '@/lib/invoice-export'
import type { Invoice } from '@/lib/types'

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    id: 'inv-1',
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: 'FA-1',
    clientId: 'client-1',
    clientSnapshot: { name: 'Alfa s.r.o.' },
    supplierSnapshot: {
      companyName: 'Dodavatel',
      ico: null,
      dic: null,
      street: null,
      city: null,
      zip: null,
    },
    items: [],
    currency: 'CZK',
    issueDate: '2026-07-10',
    dueDate: '2026-07-24',
    taxableDate: '2026-07-10',
    paidAt: null,
    variableSymbol: null,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank_transfer',
    subtotal: 100,
    vatTotal: 21,
    total: 121,
    notes: null,
    createdAt: '2026-07-10T08:00:00.000Z',
    updatedAt: '2026-07-10T08:00:00.000Z',
    ...overrides,
  }
}

function filters(overrides: Partial<InvoiceExportFilters> = {}): InvoiceExportFilters {
  return {
    ...DEFAULT_INVOICE_EXPORT_FILTERS,
    documentTypes: [...DEFAULT_INVOICE_EXPORT_FILTERS.documentTypes],
    statuses: [...DEFAULT_INVOICE_EXPORT_FILTERS.statuses],
    ...overrides,
  }
}

describe('filterInvoiceExport', () => {
  const invoices = [
    invoice({ id: 'invoice', invoiceNumber: 'FA-10' }),
    invoice({
      id: 'credit',
      invoiceNumber: 'DOB-2',
      documentType: 'credit_note',
      issueDate: '2026-07-11',
      subtotal: -50,
      vatTotal: -10.5,
      total: -60.5,
    }),
    invoice({
      id: 'proforma',
      invoiceNumber: 'ZF-1',
      documentType: 'proforma',
      status: 'draft',
      currency: 'EUR',
      issueDate: '2026-06-30',
      clientId: null,
      clientSnapshot: { name: 'Beta OSVČ' },
    }),
  ]

  it('defaultně zachová daňové doklady a deterministicky je seřadí', () => {
    expect(filterInvoiceExport(invoices, filters()).map((item) => item.id)).toEqual([
      'credit',
      'invoice',
    ])
  })

  it('filtruje inkluzivní období, typ, stav, klienta a měnu', () => {
    const result = filterInvoiceExport(
      invoices,
      filters({
        from: '2026-06-30',
        to: '2026-06-30',
        documentTypes: ['proforma'],
        statuses: ['draft'],
        clientKey: 'name:beta osvč',
        currency: 'eur',
      }),
    )
    expect(result.map((item) => item.id)).toEqual(['proforma'])
  })

  const individualFilterCases: Array<[string, Partial<Invoice>, Partial<InvoiceExportFilters>]> = [
    ['datum vystavení', { issueDate: '2026-07-09' }, { from: '2026-07-10', to: '2026-07-10' }],
    ['typ dokladu', { documentType: 'credit_note' }, { documentTypes: ['invoice'] }],
    ['stav', { status: 'paid' }, { statuses: ['issued'] }],
    [
      'odběratele',
      { clientId: 'client-2', clientSnapshot: { name: 'Beta s.r.o.' } },
      { clientKey: 'id:client-1' },
    ],
    ['měnu', { currency: 'EUR' }, { currency: 'CZK' }],
  ]

  it.each(individualFilterCases)('samostatně uplatní filtr pro %s', (_, otherInvoice, selected) => {
    const result = filterInvoiceExport(
      [invoice({ id: 'selected' }), invoice({ id: 'other', ...otherInvoice })],
      filters(selected),
    )
    expect(result.map((item) => item.id)).toEqual(['selected'])
  })

  it('prázdný výběr typů nebo stavů nevrátí žádný doklad', () => {
    expect(filterInvoiceExport(invoices, filters({ documentTypes: [] }))).toEqual([])
    expect(filterInvoiceExport(invoices, filters({ statuses: [] }))).toEqual([])
  })
})

describe('summarizeInvoiceExport', () => {
  it('dobropis nettuje záporně a různé měny nikdy nesčítá dohromady', () => {
    const summary = summarizeInvoiceExport([
      invoice({ id: 'invoice', total: 121, subtotal: 100, vatTotal: 21 }),
      invoice({
        id: 'credit',
        documentType: 'credit_note',
        total: -60.5,
        subtotal: -50,
        vatTotal: -10.5,
      }),
      invoice({ id: 'eur', currency: 'EUR', total: 50, subtotal: 50, vatTotal: 0 }),
    ])

    expect(summary.count).toBe(3)
    expect(summary.currencies).toEqual([
      { currency: 'CZK', count: 2, subtotal: 50, vatTotal: 10.5, total: 60.5, averageTotal: 30.25 },
      { currency: 'EUR', count: 1, subtotal: 50, vatTotal: 0, total: 50, averageTotal: 50 },
    ])
  })
})

describe('invoiceExportClientOptions', () => {
  it('sjednotí uloženého klienta podle id a ad-hoc odběratele podle názvu', () => {
    const options = invoiceExportClientOptions([
      invoice({ id: 'a' }),
      invoice({ id: 'b', clientSnapshot: { name: 'Alfa přejmenovaná' } }),
      invoice({ id: 'c', clientId: null, clientSnapshot: { name: 'Beta OSVČ' } }),
    ])
    expect(options).toEqual([
      { key: 'id:client-1', label: 'Alfa s.r.o.' },
      { key: 'name:beta osvč', label: 'Beta OSVČ' },
    ])
  })
})
