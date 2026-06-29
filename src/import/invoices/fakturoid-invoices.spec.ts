import { describe, it, expect } from 'vitest'
import { parseFakturoidInvoices } from './fakturoid-invoices'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<invoices>
  <invoice>
    <number>2024001</number>
    <variable_symbol>2024001</variable_symbol>
    <your_name>Jan Novák</your_name>
    <your_registration_no>08728101</your_registration_no>
    <your_vat_no></your_vat_no>
    <your_street>Hlavní 1</your_street>
    <your_city>Praha</your_city>
    <your_zip>11000</your_zip>
    <your_country>CZ</your_country>
    <client_name>Alfa s.r.o.</client_name>
    <client_registration_no>11111111</client_registration_no>
    <client_vat_no>CZ11111111</client_vat_no>
    <client_city>Brno</client_city>
    <status>paid</status>
    <issued_on>2024-01-31</issued_on>
    <due_on>2024-02-14</due_on>
    <taxable_fulfillment_due>2024-01-31</taxable_fulfillment_due>
    <paid_on>2024-02-01</paid_on>
    <currency>CZK</currency>
    <payment_method>bank</payment_method>
    <bank_account>123/0800</bank_account>
    <iban>CZ123</iban>
    <total>10000.0</total>
    <lines>
      <line>
        <name>Konzultace</name>
        <quantity>1.0</quantity>
        <unit_name>ks</unit_name>
        <unit_price>10000.0</unit_price>
        <vat_rate>0</vat_rate>
      </line>
    </lines>
  </invoice>
</invoices>`

describe('parseFakturoidInvoices', () => {
  it('namapuje fakturu neplátce včetně řádku, stavu a snapshotů', () => {
    const [inv] = parseFakturoidInvoices(SAMPLE)
    expect(inv.vatPayer).toBe(false)
    expect(inv.previewTotal).toBe(10000)
    expect(inv.input.invoiceNumber).toBe('2024001')
    expect(inv.input.status).toBe('paid')
    expect(inv.input.paidAt).toBe('2024-02-01')
    expect(inv.input.variableSymbol).toBe('2024001')
    expect(inv.input.clientSnapshot).toMatchObject({ name: 'Alfa s.r.o.', ico: '11111111' })
    expect(inv.input.supplierSnapshot).toMatchObject({
      companyName: 'Jan Novák',
      vatMode: 'non_payer',
      iban: 'CZ123',
    })
    expect(inv.input.items).toHaveLength(1)
    expect(inv.input.items[0]).toMatchObject({
      description: 'Konzultace',
      quantity: 1,
      unitPrice: 10000,
      vatRate: 0,
      lineSubtotal: 10000,
      lineVat: 0,
      lineTotal: 10000,
    })
  })

  it('plátce DPH (vyplněné DIČ) → spočítá DPH na řádku', () => {
    const xml = SAMPLE.replace(
      '<your_vat_no></your_vat_no>',
      '<your_vat_no>CZ08728101</your_vat_no>',
    ).replace('<vat_rate>0</vat_rate>', '<vat_rate>21</vat_rate>')
    const [inv] = parseFakturoidInvoices(xml)
    expect(inv.vatPayer).toBe(true)
    expect(inv.input.supplierSnapshot.vatMode).toBe('payer')
    expect(inv.input.items[0]).toMatchObject({ vatRate: 21, lineVat: 2100, lineTotal: 12100 })
  })

  it('XML bez faktur → chyba', () => {
    expect(() => parseFakturoidInvoices('<root></root>')).toThrow(/Fakturoidu/)
  })
})
