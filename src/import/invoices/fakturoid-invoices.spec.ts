import { describe, it, expect } from 'vitest'
import { parseFakturoidInvoices } from './fakturoid-invoices'

// Neplátce, 1 řádek, sedící total. (Fakturoid dává unit_price i unit_price_without_vat.)
const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<invoices>
  <invoice>
    <number>2024001</number>
    <variable_symbol>2024001</variable_symbol>
    <your_name>Jan Novák</your_name>
    <your_registration_no>08728101</your_registration_no>
    <your_vat_no></your_vat_no>
    <your_city>Praha</your_city>
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
        <unit_price_without_vat>10000.0</unit_price_without_vat>
        <unit_price_with_vat>10000.0</unit_price_with_vat>
      </line>
    </lines>
  </invoice>
</invoices>`

describe('parseFakturoidInvoices', () => {
  it('neplátce: namapuje fakturu, řádek, stav, snapshoty — bez varování', () => {
    const [inv] = parseFakturoidInvoices(SAMPLE)
    expect(inv.vatPayer).toBe(false)
    expect(inv.warnings).toEqual([])
    expect(inv.previewTotal).toBe(10000)
    expect(inv.input.invoiceNumber).toBe('2024001')
    expect(inv.input.status).toBe('paid')
    expect(inv.input.paidAt).toBe('2024-02-01')
    expect(inv.input.clientSnapshot).toMatchObject({ name: 'Alfa s.r.o.', ico: '11111111' })
    expect(inv.input.supplierSnapshot).toMatchObject({
      companyName: 'Jan Novák',
      vatMode: 'non_payer',
    })
    expect(inv.input.items[0]).toMatchObject({ unitPrice: 10000, vatRate: 0, lineTotal: 10000 })
  })

  it('plátce s cenami VČETNĚ DPH: bere unit_price_without_vat → NEpřipočte DPH podruhé', () => {
    // Fakturoid v režimu „ceny s DPH": unit_price = 12100, ale základ bez DPH = 10000.
    const xml = SAMPLE.replace(
      '<your_vat_no></your_vat_no>',
      '<your_vat_no>CZ08728101</your_vat_no>',
    )
      .replace('<unit_price>10000.0</unit_price>', '<unit_price>12100.0</unit_price>')
      .replace('<vat_rate>0</vat_rate>', '<vat_rate>21</vat_rate>')
      .replace(
        '<unit_price_with_vat>10000.0</unit_price_with_vat>',
        '<unit_price_with_vat>12100.0</unit_price_with_vat>',
      )
      .replace('<total>10000.0</total>', '<total>12100.0</total>')
    const [inv] = parseFakturoidInvoices(xml)
    expect(inv.vatPayer).toBe(true)
    expect(inv.input.items[0]).toMatchObject({
      unitPrice: 10000,
      vatRate: 21,
      lineVat: 2100,
      lineTotal: 12100,
    })
    expect(inv.warnings).toEqual([]) // 10000 + 21 % = 12100 = total → sedí
  })

  it('nesoulad vypočteného a originálního totalu → varování (ne tichý import)', () => {
    const xml = SAMPLE.replace('<total>10000.0</total>', '<total>9000.0</total>')
    const [inv] = parseFakturoidInvoices(xml)
    expect(inv.warnings.some((w) => /nesouhlasí/i.test(w))).toBe(true)
  })

  it('plátce s nepodporovanou sazbou DPH (15 %) → varování', () => {
    const xml = SAMPLE.replace(
      '<your_vat_no></your_vat_no>',
      '<your_vat_no>CZ08728101</your_vat_no>',
    ).replace('<vat_rate>0</vat_rate>', '<vat_rate>15</vat_rate>')
    const [inv] = parseFakturoidInvoices(xml)
    expect(inv.warnings.some((w) => /sazba DPH/i.test(w))).toBe(true)
  })

  it('víceřádková faktura → všechny řádky', () => {
    const twoLines = SAMPLE.replace(
      '</line>\n    </lines>',
      `</line>
      <line>
        <name>Druhá položka</name>
        <quantity>2.0</quantity>
        <unit_name>ks</unit_name>
        <unit_price>500.0</unit_price>
        <vat_rate>0</vat_rate>
        <unit_price_without_vat>500.0</unit_price_without_vat>
      </line>
    </lines>`,
    ).replace('<total>10000.0</total>', '<total>11000.0</total>')
    const [inv] = parseFakturoidInvoices(twoLines)
    expect(inv.input.items).toHaveLength(2)
    expect(inv.input.items[1]).toMatchObject({
      description: 'Druhá položka',
      quantity: 2,
      lineTotal: 1000,
    })
    expect(inv.warnings).toEqual([])
  })

  it('XML bez faktur → chyba', () => {
    expect(() => parseFakturoidInvoices('<root></root>')).toThrow(/Fakturoidu/)
  })
})
