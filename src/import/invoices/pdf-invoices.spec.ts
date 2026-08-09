import { describe, it, expect } from 'vitest'
import { parsePdfInvoices, isScannedPdf } from './pdf-invoices'

const PLATCE = `
FAKTURA - DAŇOVÝ DOKLAD č. 2024-0042
Dodavatel Odběratel
Truhlářství Novák s.r.o. Stavby Dvořák a.s.
IČO: 12345678 IČO: 87654321
DIČ: CZ12345678 DIČ: CZ87654321
Datum vystavení: 1. 3. 2024
Datum splatnosti: 15. 3. 2024
Rekapitulace DPH
21 % 10 000,00 2 100,00 12 100,00
Celkem k úhradě: 12 100,00 Kč
`

const NEPLATCE = `
Faktura č. 2024-0043
Dodavatel Odběratel
Jan Malý Firma Beta s.r.o.
IČO: 12345678 IČO: 99999999
Datum vystavení: 5. 3. 2024
Neplátce DPH
Celkem k úhradě: 5 000,00 Kč
`

function parse(texts: string[]) {
  let n = 0
  return parsePdfInvoices(
    texts.map((text, i) => ({ fileName: `faktura-${i + 1}.pdf`, text })),
    () => `AUTO-${++n}`,
  )
}

describe('parsePdfInvoices', () => {
  it('složí fakturu plátce tak, aby součet seděl na originál', () => {
    const [p] = parse([PLATCE])
    expect(p.input.invoiceNumber).toBe('2024-0042')
    expect(p.vatPayer).toBe(true)
    expect(p.previewTotal).toBe(12100)
    expect(p.input.items).toHaveLength(1)
    expect(p.input.items[0]).toMatchObject({ unitPrice: 10000, vatRate: 21, lineTotal: 12100 })
  })

  it('nehlásí nesoulad, když součet sedí', () => {
    const [p] = parse([PLATCE])
    expect(p.warnings.filter((w) => w.includes('nesouhlasí'))).toEqual([])
  })

  it('u neplátce nepřipočte DPH', () => {
    const [, p] = parse([PLATCE, NEPLATCE])
    expect(p.vatPayer).toBe(false)
    expect(p.input.items[0]).toMatchObject({ unitPrice: 5000, vatRate: 0, lineTotal: 5000 })
  })

  it('rozliší dodavatele od odběratele', () => {
    const [p] = parse([PLATCE])
    expect(p.input.supplierSnapshot?.ico).toBe('12345678')
    expect(p.input.clientSnapshot.ico).toBe('87654321')
  })

  it('přidělí číslo z řady, když v PDF žádné není', () => {
    const [p] = parse(['Nějaký text bez čísla\nCelkem k úhradě: 100,00 Kč'])
    expect(p.input.invoiceNumber).toBe('AUTO-1')
    expect(p.warnings.some((w) => w.includes('číslo faktury'))).toBe(true)
    expect(p.needsReview).toBe(true)
  })

  it('označí k ruční kontrole, když chybí rozpad DPH', () => {
    const [p] = parse([
      'Faktura č. 9/2024\nDIČ: CZ12345678\nDatum vystavení: 1.4.2024\nCelkem k úhradě: 1 210,00 Kč',
    ])
    expect(p.warnings.some((w) => w.includes('rozpad DPH'))).toBe(true)
    expect(p.needsReview).toBe(true)
  })

  it('nese zdrojový soubor, ať jde chyba dohledat v dávce', () => {
    const [a, b] = parse([PLATCE, NEPLATCE])
    expect(a.sourceFile).toBe('faktura-1.pdf')
    expect(b.sourceFile).toBe('faktura-2.pdf')
    expect(a.source).toBe('pdf')
  })

  it('čistá faktura nepotřebuje kontrolu', () => {
    const [p] = parse([PLATCE])
    expect(p.warnings).toEqual([])
    expect(p.needsReview).toBe(false)
  })
})

describe('rozpoznání dodavatele napříč dávkou', () => {
  // Bez popisků „Dodavatel/Odběratel" nejde z jednoho souboru poznat, kdo je kdo.
  // Napříč dávkou ano: dodavatel se opakuje, odběratelé se mění.
  const A = `Faktura č. 1/2024
Moje Firma s.r.o.
IČO: 11111111
Zákazník Alfa s.r.o.
IČO: 22222222
Celkem k úhradě: 1 000,00 Kč`
  const B = `Faktura č. 2/2024
Zákazník Beta s.r.o.
IČO: 33333333
Moje Firma s.r.o.
IČO: 11111111
Celkem k úhradě: 2 000,00 Kč`

  it('opakující se IČO označí za dodavatele i v obráceném pořadí', () => {
    const [a, b] = parse([A, B])
    expect(a.input.supplierSnapshot?.ico).toBe('11111111')
    expect(b.input.supplierSnapshot?.ico).toBe('11111111')
    expect(a.input.clientSnapshot.ico).toBe('22222222')
    expect(b.input.clientSnapshot.ico).toBe('33333333')
  })
})

describe('isScannedPdf', () => {
  it('pozná sken bez textové vrstvy', () => {
    expect(isScannedPdf('')).toBe(true)
    expect(isScannedPdf('   \n  ')).toBe(true)
  })

  it('běžnou fakturu za sken nepovažuje', () => {
    expect(isScannedPdf(PLATCE)).toBe(false)
  })
})
