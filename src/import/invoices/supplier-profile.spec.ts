import { describe, it, expect } from 'vitest'
import { supplierToCompanyPatch } from './supplier-profile'
import type { Company, SupplierSnapshot } from '@/lib/types'

const supplier: SupplierSnapshot = {
  companyName: 'Jan Novák',
  ico: '08728101',
  dic: null,
  vatMode: 'non_payer',
  street: 'Hlavní 1',
  city: 'Praha',
  zip: '11000',
  country: 'CZ',
  bankAccount: '123/0800',
  iban: 'CZ123',
  swift: 'AIRACZPP',
}

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: 'c1',
    companyName: null,
    fullName: null,
    email: 'a@b.cz',
    ico: null,
    dic: null,
    vatMode: 'non_payer',
    street: null,
    city: null,
    zip: null,
    country: 'CZ',
    bankAccount: null,
    iban: null,
    swift: null,
    logoUrl: null,
    invoiceColor: null,
    invoiceNumberPrefix: null,
    invoiceNumberFormat: null,
    nextInvoiceSeq: 1,
    defaultPaymentDays: 14,
    publicSlug: null,
    ...overrides,
  }
}

describe('supplierToCompanyPatch', () => {
  it('prázdný profil → doplní vše z dodavatele', () => {
    const patch = supplierToCompanyPatch(supplier, company())
    expect(patch).toMatchObject({
      companyName: 'Jan Novák',
      ico: '08728101',
      street: 'Hlavní 1',
      bankAccount: '123/0800',
      iban: 'CZ123',
      vatMode: 'non_payer',
    })
  })

  it('existující pole nepřepíše', () => {
    const patch = supplierToCompanyPatch(
      supplier,
      company({ companyName: 'Moje s.r.o.', ico: '99999999' }),
    )
    expect(patch.companyName).toBeUndefined()
    expect(patch.ico).toBeUndefined()
    // prázdné pole se ale doplní
    expect(patch.iban).toBe('CZ123')
  })

  it('vyplněný profil → prázdný patch', () => {
    const full = company({
      companyName: 'X',
      ico: '1',
      street: 'A',
      city: 'B',
      zip: 'C',
      bankAccount: 'D',
      iban: 'E',
      swift: 'F',
      dic: 'G',
    })
    expect(supplierToCompanyPatch(supplier, full)).toEqual({})
  })
})
