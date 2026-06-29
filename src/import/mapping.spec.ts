import { describe, it, expect } from 'vitest'
import { applyMapping } from './mapping'
import { genericClients } from './adapters/generic-clients'
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
