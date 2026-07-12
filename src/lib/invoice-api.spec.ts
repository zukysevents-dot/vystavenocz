import { describe, it, expect } from 'vitest'
import {
  invoiceFromApi,
  invoiceToCreateRequest,
  invoiceToUpdateRequest,
  mapInvoiceStatus,
  mapDocumentType,
  type InvoiceApiResponse,
} from '@/lib/invoice-api'
import type { InvoiceInput } from '@/composables/useInvoices'

// Plný detail (InvoiceResponse) — má lines, snapshoty, součty.
function fullDto(over: Partial<InvoiceApiResponse> = {}): InvoiceApiResponse {
  return {
    id: 'inv-1',
    number: 'FA-2026-0007',
    status: 'Issued',
    documentType: 'Invoice',
    parentInvoiceId: null,
    clientId: 'cli-1',
    clientName: 'Odběratel s.r.o.',
    clientIco: '12345678',
    clientDic: 'CZ12345678',
    clientEmail: 'klient@x.cz',
    clientAddress: { street: 'Stará 1', city: 'Praha', postalCode: '11000', country: 'CZ' },
    supplierName: 'Naše firma s.r.o.',
    supplierIco: '87654321',
    supplierDic: 'CZ87654321',
    supplierEmail: 'faktury@nase.cz',
    supplierPhone: '+420123456789',
    supplierAddress: { street: 'Nová 2', city: 'Brno', postalCode: '60200', country: 'CZ' },
    supplierBankAccount: { accountNumber: '123-456/0100', iban: 'CZ1234', bic: 'GIBACZPX' },
    currency: 'CZK',
    isVatPayer: true,
    issueDate: '2026-07-01',
    dueDate: '2026-07-15',
    taxableSupplyDate: '2026-07-01',
    paidDate: null,
    subtotal: 2000,
    vatTotal: 420,
    total: 2420,
    paidAmount: 0,
    outstandingAmount: 2420,
    note: 'Poznámka',
    lines: [
      {
        id: 'ln-1',
        description: 'Práce',
        unit: 'h',
        quantity: 2,
        unitPrice: 1000,
        vatRate: 21,
        sortOrder: 0,
        lineBase: 2000,
        lineVat: 420,
        lineTotal: 2420,
      },
    ],
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T09:00:00.000Z',
    ...over,
  }
}

// List summary (InvoiceSummaryResponse) — BEZ lines/snapshotů/součtů kromě total.
function summaryDto(over: Partial<InvoiceApiResponse> = {}): InvoiceApiResponse {
  return {
    id: 'inv-2',
    number: 'FA-2026-0008',
    status: 'Paid',
    documentType: 'Invoice',
    parentInvoiceId: null,
    clientId: 'cli-2',
    clientName: 'Jiný klient',
    issueDate: '2026-07-05',
    dueDate: '2026-07-19',
    total: 5000,
    outstandingAmount: 0,
    currency: 'CZK',
    ...over,
  }
}

describe('mapInvoiceStatus', () => {
  it('mapuje PascalCase backend enum na FE lowercase', () => {
    expect(mapInvoiceStatus('Draft')).toBe('draft')
    expect(mapInvoiceStatus('Issued')).toBe('issued')
    expect(mapInvoiceStatus('Paid')).toBe('paid')
    expect(mapInvoiceStatus('Cancelled')).toBe('cancelled')
    expect(mapInvoiceStatus('Overdue')).toBe('overdue')
  })

  it('Sent → issued, Archived → cancelled (aliasy)', () => {
    expect(mapInvoiceStatus('Sent')).toBe('issued')
    expect(mapInvoiceStatus('Archived')).toBe('cancelled')
  })

  it('je idempotentní k už-lowercase hodnotám', () => {
    expect(mapInvoiceStatus('issued')).toBe('issued')
    expect(mapInvoiceStatus('paid')).toBe('paid')
    expect(mapInvoiceStatus('sent')).toBe('issued')
    expect(mapInvoiceStatus('archived')).toBe('cancelled')
  })

  it('prázdné/neznámé → draft (fallback)', () => {
    expect(mapInvoiceStatus(null)).toBe('draft')
    expect(mapInvoiceStatus(undefined)).toBe('draft')
    expect(mapInvoiceStatus('Nonsense')).toBe('draft')
  })
})

describe('mapDocumentType', () => {
  it('mapuje backend enum na FE typ', () => {
    expect(mapDocumentType('Invoice')).toBe('invoice')
    expect(mapDocumentType('Proforma')).toBe('proforma')
    expect(mapDocumentType('CreditNote')).toBe('credit_note')
  })

  it('je idempotentní / robustní k lowercase', () => {
    expect(mapDocumentType('invoice')).toBe('invoice')
    expect(mapDocumentType('proforma')).toBe('proforma')
    expect(mapDocumentType('credit_note')).toBe('credit_note')
    expect(mapDocumentType(null)).toBe('invoice')
  })
})

describe('invoiceFromApi — plný detail', () => {
  it('mapuje hlavičku, snapshoty, položky a součty', () => {
    const inv = invoiceFromApi(fullDto())
    expect(inv.id).toBe('inv-1')
    expect(inv.invoiceNumber).toBe('FA-2026-0007') // number → invoiceNumber
    expect(inv.status).toBe('issued') // Issued → issued
    expect(inv.documentType).toBe('invoice') // Invoice → invoice
    expect(inv.taxableDate).toBe('2026-07-01') // taxableSupplyDate → taxableDate
    expect(inv.notes).toBe('Poznámka') // note → notes
    // Součty jsou serverová pravda — jen přemapované, ne přepočítané.
    expect(inv.subtotal).toBe(2000)
    expect(inv.vatTotal).toBe(420)
    expect(inv.total).toBe(2420)
  })

  it('client snapshot: adresa postalCode → zip', () => {
    const inv = invoiceFromApi(fullDto())
    expect(inv.clientSnapshot).toMatchObject({
      name: 'Odběratel s.r.o.',
      ico: '12345678',
      dic: 'CZ12345678',
      email: 'klient@x.cz',
      street: 'Stará 1',
      city: 'Praha',
      zip: '11000',
      country: 'CZ',
    })
  })

  it('supplier snapshot: supplierName → companyName, bic → swift, isVatPayer → vatMode', () => {
    const inv = invoiceFromApi(fullDto())
    expect(inv.supplierSnapshot).toMatchObject({
      companyName: 'Naše firma s.r.o.',
      ico: '87654321',
      dic: 'CZ87654321',
      vatMode: 'payer',
      zip: '60200',
      bankAccount: '123-456/0100',
      iban: 'CZ1234',
      swift: 'GIBACZPX',
      email: 'faktury@nase.cz',
    })
  })

  it('neplátce DPH: isVatPayer=false → vatMode non_payer', () => {
    const inv = invoiceFromApi(fullDto({ isVatPayer: false }))
    expect(inv.supplierSnapshot.vatMode).toBe('non_payer')
  })

  it('položky: lineBase → lineSubtotal (částky beze změny)', () => {
    const inv = invoiceFromApi(fullDto())
    expect(inv.items).toHaveLength(1)
    expect(inv.items[0]).toMatchObject({
      id: 'ln-1',
      description: 'Práce',
      quantity: 2,
      unit: 'h',
      unitPrice: 1000,
      vatRate: 21,
      lineSubtotal: 2000,
      lineVat: 420,
      lineTotal: 2420,
    })
  })
})

describe('invoiceFromApi — list summary (bez lines/snapshotů)', () => {
  it('robustně doplní items:[] a clientSnapshot jen se jménem', () => {
    const inv = invoiceFromApi(summaryDto())
    expect(inv.items).toEqual([])
    expect(inv.clientSnapshot.name).toBe('Jiný klient')
    expect(inv.clientSnapshot.ico).toBeNull()
    // Summary nemá subtotal/vatTotal → 0; total je pravda z listu.
    expect(inv.subtotal).toBe(0)
    expect(inv.vatTotal).toBe(0)
    expect(inv.total).toBe(5000)
    // Chybějící snapshot dodavatele → prázdný (companyName null), vatMode neznámý.
    expect(inv.supplierSnapshot.companyName).toBeNull()
    expect(inv.supplierSnapshot.vatMode).toBeUndefined()
  })

  it('mapuje status/documentType i u summary', () => {
    const inv = invoiceFromApi(summaryDto())
    expect(inv.status).toBe('paid')
    expect(inv.documentType).toBe('invoice')
  })
})

describe('invoiceFromApi — dobropis (credit note)', () => {
  it('zachová záporná serverová znaménka, quantity zůstává kladné', () => {
    const dto = fullDto({
      id: 'cn-1',
      number: 'DOB-2026-0001',
      documentType: 'CreditNote',
      parentInvoiceId: 'inv-1',
      parentInvoiceNumber: 'FA-2026-0007',
      status: 'Issued',
      subtotal: -2000,
      vatTotal: -420,
      total: -2420,
      lines: [
        {
          id: 'cn-ln-1',
          description: 'Práce',
          unit: 'h',
          quantity: 2, // KLADNÉ množství (backend validator > 0)
          unitPrice: 1000,
          vatRate: 21,
          lineBase: -2000,
          lineVat: -420,
          lineTotal: -2420,
        },
      ],
    })
    const inv = invoiceFromApi(dto)
    expect(inv.documentType).toBe('credit_note')
    expect(inv.parentInvoiceId).toBe('inv-1')
    expect(inv.total).toBe(-2420)
    expect(inv.subtotal).toBe(-2000)
    expect(inv.vatTotal).toBe(-420)
    expect(inv.items[0].quantity).toBe(2)
    expect(inv.items[0].lineSubtotal).toBe(-2000)
    expect(inv.items[0].lineVat).toBe(-420)
    expect(inv.items[0].lineTotal).toBe(-2420)
  })
})

describe('invoiceFromApi — proforma', () => {
  it('mapuje Proforma → proforma', () => {
    const inv = invoiceFromApi(fullDto({ documentType: 'Proforma', number: 'ZAL-2026-0001' }))
    expect(inv.documentType).toBe('proforma')
    expect(inv.invoiceNumber).toBe('ZAL-2026-0001')
  })
})

// --- Odchozí požadavky (FE → backend) ---

function input(over: Partial<InvoiceInput> = {}): InvoiceInput {
  return {
    documentType: 'invoice',
    status: 'draft',
    invoiceNumber: '',
    clientId: 'cli-1',
    clientSnapshot: { name: 'Odběratel' },
    supplierSnapshot: {
      companyName: 'Naše firma',
      ico: null,
      dic: null,
      vatMode: 'payer',
      street: null,
      city: null,
      zip: null,
    },
    items: [
      {
        id: 'it-1',
        description: 'Práce',
        quantity: 2,
        unit: 'h',
        unitPrice: 1000,
        vatRate: 21,
        lineSubtotal: 2000,
        lineVat: 420,
        lineTotal: 2420,
      },
    ],
    currency: 'CZK',
    issueDate: '2026-07-01',
    dueDate: '2026-07-15',
    taxableDate: '2026-07-01',
    paidAt: null,
    variableSymbol: null,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank_transfer',
    notes: 'Pozn.',
    ...over,
  }
}

describe('invoiceToCreateRequest', () => {
  it('posílá jen backendem přijímaná pole (clientId, splatnost, DUZP, poznámka, typ, řádky NET)', () => {
    const req = invoiceToCreateRequest(input())
    expect(req.clientId).toBe('cli-1')
    expect(req.dueDate).toBe('2026-07-15')
    expect(req.taxableSupplyDate).toBe('2026-07-01') // taxableDate → taxableSupplyDate
    expect(req.note).toBe('Pozn.')
    expect(req.documentType).toBe('invoice')
    expect(req.lines).toEqual([
      { description: 'Práce', quantity: 2, unitPrice: 1000, vatRate: 21, unit: 'h' },
    ])
  })

  it('NEposílá spočítané řádkové částky (DPH/součty počítá server)', () => {
    const req = invoiceToCreateRequest(input())
    expect(req.lines[0]).not.toHaveProperty('lineSubtotal')
    expect(req.lines[0]).not.toHaveProperty('lineVat')
    expect(req.lines[0]).not.toHaveProperty('lineTotal')
  })

  it('proforma zůstává proforma; credit_note se degraduje na invoice (backend jiné nepřijímá)', () => {
    expect(invoiceToCreateRequest(input({ documentType: 'proforma' })).documentType).toBe(
      'proforma',
    )
    expect(invoiceToCreateRequest(input({ documentType: 'credit_note' })).documentType).toBe(
      'invoice',
    )
  })

  it('prázdná splatnost/DUZP → null', () => {
    const req = invoiceToCreateRequest(input({ dueDate: '', taxableDate: '' }))
    expect(req.dueDate).toBeNull()
    expect(req.taxableSupplyDate).toBeNull()
  })
})

describe('invoiceToUpdateRequest', () => {
  it('posílá jen hlavičku — žádné řádky (backend PUT je nemění)', () => {
    const req = invoiceToUpdateRequest(input())
    expect(req).toEqual({
      clientId: 'cli-1',
      dueDate: '2026-07-15',
      taxableSupplyDate: '2026-07-01',
      note: 'Pozn.',
      documentType: 'invoice',
    })
    expect(req).not.toHaveProperty('lines')
  })
})
