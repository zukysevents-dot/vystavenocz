import { describe, it, expect } from 'vitest'
import { parseFakturoidClientsXml } from './fakturoid-xml'

// Anonymizovaný vzorek se strukturou Fakturoid invoice exportu (3 faktury, 2 klienti).
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<invoices>
  <invoice>
    <number>2024001</number>
    <client_name>Alfa s.r.o.</client_name>
    <client_registration_no>11111111</client_registration_no>
    <client_vat_no>CZ11111111</client_vat_no>
    <client_street>Testovací 1</client_street>
    <client_city>Praha</client_city>
    <client_zip>11000</client_zip>
    <client_country>CZ</client_country>
  </invoice>
  <invoice>
    <number>2024002</number>
    <client_name>Beta s.r.o.</client_name>
    <client_registration_no>22222222</client_registration_no>
    <client_vat_no></client_vat_no>
    <client_street>Beta 2</client_street>
    <client_city>Brno</client_city>
    <client_zip>60200</client_zip>
    <client_country>CZ</client_country>
  </invoice>
  <invoice>
    <number>2024003</number>
    <client_name>Alfa s.r.o.</client_name>
    <client_registration_no>11111111</client_registration_no>
    <client_vat_no>CZ11111111</client_vat_no>
    <client_street>Testovací 1</client_street>
    <client_city>Praha</client_city>
    <client_zip>11000</client_zip>
    <client_country>CZ</client_country>
  </invoice>
</invoices>`

describe('parseFakturoidClientsXml', () => {
  it('vytáhne unikátní klienty (dedup podle IČO)', () => {
    const t = parseFakturoidClientsXml(SAMPLE)
    expect(t.headers).toEqual(['name', 'ico', 'dic', 'street', 'city', 'zip', 'country'])
    expect(t.rows).toHaveLength(2) // Alfa se opakuje → jen jednou
    expect(t.rows[0]).toMatchObject({
      name: 'Alfa s.r.o.',
      ico: '11111111',
      dic: 'CZ11111111',
      city: 'Praha',
    })
    expect(t.rows[1]).toMatchObject({ name: 'Beta s.r.o.', ico: '22222222', dic: '' })
  })

  it('XML bez faktur → srozumitelná chyba', () => {
    expect(() => parseFakturoidClientsXml('<root></root>')).toThrow(/Fakturoidu/)
  })
})
