import { describe, it, expect } from 'vitest'
import {
  round2,
  calcLine,
  calcTotals,
  buildInvoiceNumber,
  variableSymbolFromInvoiceNumber,
  czAccountToIban,
  toImportRequest,
} from '@/lib/invoice'
import type { Invoice } from '@/lib/types'

describe('round2', () => {
  it('zaokrouhlí na 2 desetinná místa', () => {
    expect(round2(2.345)).toBe(2.35)
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(1.005)).toBe(1.01)
  })
})

describe('calcLine', () => {
  it('plátce DPH: spočítá DPH 21 %', () => {
    expect(calcLine({ quantity: 2, unitPrice: 100, vatRate: 21 }, true)).toEqual({
      lineSubtotal: 200,
      lineVat: 42,
      lineTotal: 242,
    })
  })

  it('neplátce: DPH je 0 bez ohledu na sazbu', () => {
    expect(calcLine({ quantity: 2, unitPrice: 100, vatRate: 21 }, false)).toEqual({
      lineSubtotal: 200,
      lineVat: 0,
      lineTotal: 200,
    })
  })
})

describe('calcTotals', () => {
  it('sečte řádky a vytvoří DPH breakdown po sazbách (plátce)', () => {
    const t = calcTotals(
      [
        { quantity: 1, unitPrice: 100, vatRate: 21 },
        { quantity: 2, unitPrice: 50, vatRate: 12 },
      ],
      true,
    )
    expect(t.subtotal).toBe(200)
    expect(t.vatTotal).toBe(33)
    expect(t.total).toBe(233)
    expect(t.vatBreakdown[21]).toEqual({ base: 100, vat: 21 })
    expect(t.vatBreakdown[12]).toEqual({ base: 100, vat: 12 })
  })

  it('neplátce: žádné DPH a prázdný breakdown', () => {
    const t = calcTotals([{ quantity: 1, unitPrice: 100, vatRate: 21 }], false)
    expect(t.vatTotal).toBe(0)
    expect(t.total).toBe(100)
    expect(t.vatBreakdown).toEqual({})
  })
})

describe('buildInvoiceNumber', () => {
  it('dosadí prefix, rok a doplní seq na 4 místa', () => {
    expect(buildInvoiceNumber('FA', '{prefix}-{year}-{seq}', 7, new Date('2026-03-15'))).toBe(
      'FA-2026-0007',
    )
  })

  it('prázdný prefix → fallback FA', () => {
    expect(buildInvoiceNumber('', '{prefix}-{year}-{seq}', 1, new Date('2026-01-01'))).toBe(
      'FA-2026-0001',
    )
  })

  it('velké pořadové číslo se neořezává', () => {
    expect(buildInvoiceNumber('X', '{prefix}{seq}', 12345, new Date('2026-01-01'))).toBe('X12345')
  })
})

describe('variableSymbolFromInvoiceNumber', () => {
  it('ponechá jen číslice, max 10 zprava', () => {
    expect(variableSymbolFromInvoiceNumber('FA-2026-0007')).toBe('20260007')
    expect(variableSymbolFromInvoiceNumber('FA-12345678901234')).toBe('5678901234')
  })
})

describe('czAccountToIban', () => {
  it('převede české číslo účtu na validní český IBAN (24 znaků)', () => {
    const iban = czAccountToIban('19-2000145399/0800')
    expect(iban).toMatch(/^CZ\d{22}$/)
  })

  it('nevalidní formát → null', () => {
    expect(czAccountToIban('nesmysl')).toBeNull()
  })
})

describe('toImportRequest', () => {
  const base: Invoice = {
    id: 'i1',
    documentType: 'invoice',
    status: 'paid',
    invoiceNumber: '2023-0042',
    clientId: 'cli-1',
    clientSnapshot: {
      name: 'Odběratel s.r.o.',
      ico: '12345678',
      dic: 'CZ12345678',
      street: 'Stará 1',
      city: 'Praha',
      zip: '11000',
      country: 'CZ',
      email: 'h@x.cz',
    },
    supplierSnapshot: {
      companyName: 'Naše firma',
      ico: '87654321',
      dic: 'CZ87654321',
      vatMode: 'payer',
      street: 'Nová 2',
      city: 'Brno',
      zip: '60200',
      country: 'CZ',
      bankAccount: '123/0100',
      iban: null,
      swift: 'GIBACZPX',
      email: 'f@x.cz',
    },
    items: [
      {
        id: 'it1',
        description: 'Položka',
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
    issueDate: '2023-06-15',
    dueDate: '2023-06-29',
    taxableDate: '2023-06-15',
    paidAt: '2023-06-20T10:30:00.000Z',
    variableSymbol: null,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank',
    subtotal: 1000,
    vatTotal: 210,
    total: 1210,
    notes: null,
    createdAt: '2023-06-15T00:00:00.000Z',
    updatedAt: '2023-06-15T00:00:00.000Z',
  }

  it('mapuje doklad JAK JE na payload importu', () => {
    const r = toImportRequest(base)
    expect(r.number).toBe('2023-0042') // číslo se nemění
    expect(r.status).toBe('Paid') // 'paid' → backend enum
    expect(r.clientId).toBe('cli-1')
    expect(r.paidDate).toBe('2023-06-20') // ISO → datum
    expect(r.isVatPayer).toBe(true) // vatMode 'payer'
    expect(r.subtotal).toBe(1000)
    expect(r.total).toBe(1210)
    // snapshot odběratele: zip → postalCode
    expect(r.client.name).toBe('Odběratel s.r.o.')
    expect(r.client.address).toEqual({
      street: 'Stará 1',
      city: 'Praha',
      postalCode: '11000',
      country: 'CZ',
    })
    // snapshot dodavatele: companyName → name, swift → bic
    expect(r.supplier.name).toBe('Naše firma')
    expect(r.supplier.bankAccount).toEqual({
      accountNumber: '123/0100',
      iban: null,
      bic: 'GIBACZPX',
    })
    // položka: lineSubtotal → lineBase (částky beze změny)
    expect(r.items[0]).toMatchObject({ lineBase: 1000, lineVat: 210, lineTotal: 1210 })
  })

  it('neuhrazená faktura → status Issued, paidDate null', () => {
    const r = toImportRequest({ ...base, status: 'issued', paidAt: null })
    expect(r.status).toBe('Issued')
    expect(r.paidDate).toBeNull()
  })
})
