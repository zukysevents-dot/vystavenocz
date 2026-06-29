import { describe, it, expect } from 'vitest'
import { applyMapping } from './mapping'
import { genericClients } from './adapters/generic-clients'
import { genericProducts } from './adapters/generic-products'
import type { RawTable } from './types'

describe('applyMapping (generic-clients)', () => {
  it('namapuje a vyčistí řádky na ClientInput', () => {
    const table: RawTable = {
      headers: ['name', 'ico', 'email', 'phone'],
      rows: [
        { name: 'Acme s.r.o.', ico: 'CZ27082440', email: 'INFO@ACME.CZ', phone: '777 123 456' },
      ],
    }
    const drafts = applyMapping(table, genericClients.defaultMapping, genericClients)
    expect(drafts).toHaveLength(1)
    expect(drafts[0].value).toMatchObject({
      name: 'Acme s.r.o.',
      ico: '27082440',
      email: 'info@acme.cz',
      phone: '+420777123456',
      country: 'CZ',
      defaultPaymentDays: 14,
    })
    expect(drafts[0].rowIndex).toBe(0)
    expect(drafts[0].decision).toBe('create')
  })

  it('chybějící sloupce → null / výchozí hodnoty', () => {
    const table: RawTable = { headers: ['name'], rows: [{ name: 'Beta' }] }
    const drafts = applyMapping(table, genericClients.defaultMapping, genericClients)
    expect(drafts[0].value).toMatchObject({ name: 'Beta', ico: null, country: 'CZ' })
  })
})

describe('applyMapping (generic-products)', () => {
  it('namapuje a vyčistí produkty (cena + DPH)', () => {
    const table: RawTable = {
      headers: ['name', 'sku', 'salePrice', 'vatRate'],
      rows: [{ name: 'Espresso', sku: 'ESP', salePrice: '1 290,50 Kč', vatRate: '21%' }],
    }
    const drafts = applyMapping(table, genericProducts.defaultMapping, genericProducts)
    expect(drafts[0].value).toMatchObject({
      name: 'Espresso',
      sku: 'ESP',
      salePrice: 1290.5,
      vatRate: 21,
      purchasePrice: null,
    })
  })

  it('nulová sazba DPH zůstane 0, prázdná → default 21', () => {
    const t: RawTable = { headers: ['name', 'vatRate'], rows: [{ name: 'A', vatRate: '0' }] }
    expect(applyMapping(t, genericProducts.defaultMapping, genericProducts)[0].value).toMatchObject(
      {
        vatRate: 0,
      },
    )
    const t2: RawTable = { headers: ['name'], rows: [{ name: 'B' }] }
    expect(
      applyMapping(t2, genericProducts.defaultMapping, genericProducts)[0].value,
    ).toMatchObject({ vatRate: 21 })
  })
})
