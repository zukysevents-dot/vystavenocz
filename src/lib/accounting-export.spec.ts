import { describe, it, expect } from 'vitest'
import {
  invoiceToIsdoc,
  invoicesToCsv,
  isdocFilename,
  canExportIsdoc,
  canExportIsdocHeader,
} from '@/lib/accounting-export'
import type { Invoice } from '@/lib/types'

let seq = 0
function inv(over: Partial<Invoice> = {}): Invoice {
  seq += 1
  return {
    id: `3f2504e0-4f89-41d3-9a0c-0305e82c33${String(seq).padStart(2, '0')}`,
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: `2024-${String(seq).padStart(4, '0')}`,
    clientId: 'cli-1',
    clientSnapshot: {
      name: 'Odběratel s.r.o.',
      ico: '12345678',
      dic: 'CZ12345678',
      street: 'Testovací 1',
      city: 'Praha',
      zip: '11000',
      country: 'CZ',
      email: 'k@x.cz',
    },
    supplierSnapshot: {
      companyName: 'Dodavatel s.r.o.',
      ico: '87654321',
      dic: 'CZ87654321',
      vatMode: 'payer',
      street: 'Dodavatelská 2',
      city: 'Brno',
      zip: '60200',
      country: 'CZ',
    },
    items: [
      {
        id: 'a',
        description: 'Konzultace',
        quantity: 2,
        unit: 'hod',
        unitPrice: 500,
        vatRate: 21,
        lineSubtotal: 1000,
        lineVat: 210,
        lineTotal: 1210,
      },
      {
        id: 'b',
        description: 'Kniha',
        quantity: 1,
        unit: 'ks',
        unitPrice: 300,
        vatRate: 12,
        lineSubtotal: 300,
        lineVat: 36,
        lineTotal: 336,
      },
    ],
    currency: 'CZK',
    issueDate: '2024-03-01',
    dueDate: '2024-03-15',
    taxableDate: '2024-03-01',
    paidAt: null,
    variableSymbol: '20240042',
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank',
    subtotal: 1300,
    vatTotal: 246,
    total: 1546,
    notes: null,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
    ...over,
  }
}

describe('invoiceToIsdoc', () => {
  it('má kořen Invoice 6.0.1 se správným namespace a UUID', () => {
    const xml = invoiceToIsdoc(inv({ id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }))
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.1">')
    expect(xml).toContain('<UUID>3f2504e0-4f89-41d3-9a0c-0305e82c3301</UUID>')
    expect(xml).toContain('<ID>2024-0001</ID>')
  })

  it('plátce DPH → VATApplicable true a jeden TaxSubTotal na sazbu', () => {
    const xml = invoiceToIsdoc(inv())
    expect(xml).toContain('<VATApplicable>true</VATApplicable>')
    // dvě různé sazby (21 % a 12 %) → dva subtotaly
    expect(xml.match(/<TaxSubTotal>/g)).toHaveLength(2)
    expect(xml).toContain('<TaxAmount>246.00</TaxAmount>')
    expect(xml).toContain('<PayableAmount>1546.00</PayableAmount>')
  })

  it('neplátce DPH → VATApplicable false, sazba 0, jeden subtotal', () => {
    const xml = invoiceToIsdoc(
      inv({
        supplierSnapshot: {
          companyName: 'OSVČ',
          ico: '11111111',
          dic: null,
          vatMode: 'non_payer',
          street: 'Hlavní 5',
          city: 'Brno',
          zip: '60200',
          country: 'CZ',
        },
        items: [
          {
            id: 'a',
            description: 'Služba',
            quantity: 1,
            unit: 'ks',
            unitPrice: 5000,
            vatRate: 0,
            lineSubtotal: 5000,
            lineVat: 0,
            lineTotal: 5000,
          },
        ],
        subtotal: 5000,
        vatTotal: 0,
        total: 5000,
      }),
    )
    expect(xml).toContain('<VATApplicable>false</VATApplicable>')
    expect(xml.match(/<TaxSubTotal>/g)).toHaveLength(1)
    expect(xml).toContain('<TaxExclusiveAmount>5000.00</TaxExclusiveAmount>')
    expect(xml).toContain('<TaxInclusiveAmount>5000.00</TaxInclusiveAmount>')
  })

  it('dobropis → DocumentType 2', () => {
    expect(invoiceToIsdoc(inv({ documentType: 'credit_note' }))).toContain(
      '<DocumentType>2</DocumentType>',
    )
  })

  it('neplátce s nenulovým lineVat (importovaný doklad) → DPH se vynuluje, ne propíše', () => {
    // Simulace importu: neplátce, ale položka nese nenulové lineVat/lineTotal.
    const xml = invoiceToIsdoc(
      inv({
        supplierSnapshot: {
          companyName: 'OSVČ',
          ico: '11111111',
          dic: null,
          vatMode: 'non_payer',
          street: 'Hlavní 5',
          city: 'Brno',
          zip: '60200',
          country: 'CZ',
        },
        items: [
          {
            id: 'a',
            description: 'S',
            quantity: 1,
            unit: 'ks',
            unitPrice: 1000,
            vatRate: 21,
            lineSubtotal: 1000,
            lineVat: 210,
            lineTotal: 1210,
          },
        ],
        subtotal: 1000,
        vatTotal: 210,
        total: 1210,
      }),
    )
    expect(xml).toContain('<LineExtensionTaxAmount>0.00</LineExtensionTaxAmount>')
    expect(xml).toContain(
      '<TaxTotal><TaxSubTotal><TaxableAmount>1000.00</TaxableAmount><TaxAmount>0.00</TaxAmount>',
    )
    expect(xml).toContain('<PayableAmount>1000.00</PayableAmount>') // bez DPH
    expect(xml).not.toContain('210.00')
  })

  it('dobropis se zápornými částkami → součty sedí a zůstanou záporné', () => {
    const xml = invoiceToIsdoc(
      inv({
        documentType: 'credit_note',
        items: [
          {
            id: 'a',
            description: 'Vratka',
            quantity: 1,
            unit: 'ks',
            unitPrice: -100,
            vatRate: 21,
            lineSubtotal: -100,
            lineVat: -21,
            lineTotal: -121,
          },
        ],
        subtotal: -100,
        vatTotal: -21,
        total: -121,
      }),
    )
    expect(xml).toContain('<TaxExclusiveAmount>-100.00</TaxExclusiveAmount>')
    expect(xml).toContain('<PayableAmount>-121.00</PayableAmount>')
  })

  it('XML-escapuje speciální znaky v popisu položky', () => {
    const xml = invoiceToIsdoc(
      inv({
        items: [
          {
            id: 'a',
            description: 'Servis & údržba <měřáku>',
            quantity: 1,
            unit: 'ks',
            unitPrice: 100,
            vatRate: 21,
            lineSubtotal: 100,
            lineVat: 21,
            lineTotal: 121,
          },
        ],
        subtotal: 100,
        vatTotal: 21,
        total: 121,
      }),
    )
    expect(xml).toContain('Servis &amp; údržba &lt;měřáku&gt;')
    expect(xml).not.toContain('Servis & údržba')
  })
})

describe('canExportIsdoc', () => {
  it('CZK faktura s položkami → true', () => {
    expect(canExportIsdoc(inv())).toBe(true)
  })
  it('cizí měna → false (chybí kurz na CZK)', () => {
    expect(canExportIsdoc(inv({ currency: 'EUR' }))).toBe(false)
  })
  it('faktura bez položek → false (ISDOC vyžaduje aspoň řádek)', () => {
    expect(canExportIsdoc(inv({ items: [] }))).toBe(false)
  })
  it('proforma, koncept a stornovaný doklad → false', () => {
    expect(canExportIsdoc(inv({ documentType: 'proforma' }))).toBe(false)
    expect(canExportIsdoc(inv({ status: 'draft' }))).toBe(false)
    expect(canExportIsdoc(inv({ status: 'cancelled' }))).toBe(false)
  })
  it('summary hlavička může nabídnout ISDOC před dotažením řádků', () => {
    expect(canExportIsdocHeader(inv({ items: [] }))).toBe(true)
    expect(canExportIsdocHeader(inv({ items: [], currency: 'EUR' }))).toBe(false)
  })
})

describe('isdocFilename', () => {
  it('vytvoří bezpečný název z čísla faktury', () => {
    expect(isdocFilename(inv({ invoiceNumber: '2024/0042' }))).toBe('2024_0042.isdoc')
  })
})

describe('invoicesToCsv', () => {
  it('má hlavičku se středníky a řádek s desetinnou čárkou', () => {
    const i = inv()
    const lines = invoicesToCsv([i]).split('\r\n')
    expect(lines[0]).toBe(
      'Číslo;Typ dokladu;Vystaveno;DUZP;Splatnost;Odběratel;IČO;DIČ;Základ;DPH;Celkem;Měna;Stav;VS;Uhrazeno',
    )
    expect(lines[1]).toContain(i.invoiceNumber!)
    expect(lines[1]).toContain('1300,00') // čárka, ne tečka
    expect(lines[1]).toContain('Vystaveno') // lokalizovaný stav
    expect(lines[1]).toContain('Faktura')
  })

  it('obalí buňku s oddělovačem do uvozovek', () => {
    const csv = invoicesToCsv([inv({ clientSnapshot: { name: 'Firma; a.s.', email: null } })])
    expect(csv).toContain('"Firma; a.s."')
  })

  it('zneškodní vzorec v textu a zachová záporné částky dobropisu jako čísla', () => {
    const csv = invoicesToCsv([
      inv({
        documentType: 'credit_note',
        invoiceNumber: '=1+1',
        clientSnapshot: { name: '  +SUM(A1:A2)', ico: '@IMPORT', dic: '-10' },
        variableSymbol: '\t=1+1',
        subtotal: -100,
        vatTotal: -21,
        total: -121,
      }),
    ])
    const row = csv.split('\r\n')[1].split(';')
    expect(row[0]).toBe("'=1+1")
    expect(row[5]).toBe("'  +SUM(A1:A2)")
    expect(row[6]).toBe("'@IMPORT")
    expect(row[7]).toBe("'-10")
    expect(row[8]).toBe('-100,00')
    expect(row[9]).toBe('-21,00')
    expect(row[10]).toBe('-121,00')
    expect(row[13]).toBe("'\t=1+1")
  })

  it('uzavře samostatný carriage return do jedné chráněné CSV buňky', () => {
    const csv = invoicesToCsv([inv({ variableSymbol: '\r=1+1' })])
    expect(csv).toContain(`;"'\r=1+1";`)
    expect(csv.split('\r\n')).toHaveLength(2)
  })

  it('zaplacená faktura má datum úhrady', () => {
    const csv = invoicesToCsv([inv({ status: 'paid', paidAt: '2024-03-10T08:00:00.000Z' })])
    expect(csv.split('\r\n')[1].endsWith('2024-03-10')).toBe(true)
  })
})
