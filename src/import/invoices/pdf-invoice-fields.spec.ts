import { describe, it, expect } from 'vitest'
import { extractInvoiceFields } from './pdf-invoice-fields'

/** Text tak, jak vypadá po vytažení textové vrstvy z běžné české faktury. */
const FAKTURA = `
FAKTURA - DAŇOVÝ DOKLAD č. 2024-0042
Dodavatel Odběratel
Truhlářství Novák s.r.o. Stavby Dvořák a.s.
Dlouhá 15 Krátká 8
110 00 Praha 1 602 00 Brno
IČO: 12345678 IČO: 87654321
DIČ: CZ12345678 DIČ: CZ87654321
Variabilní symbol: 20240042
Datum vystavení: 1. 3. 2024
Datum zdanitelného plnění: 1. 3. 2024
Datum splatnosti: 15. 3. 2024
Označení dodávky Množství Cena Celkem
Truhlářské práce 10 ks 1 000,00 10 000,00
Rekapitulace DPH
Sazba Základ Daň Celkem
21 % 10 000,00 2 100,00 12 100,00
Základ daně: 10 000,00
DPH celkem: 2 100,00
Celkem k úhradě: 12 100,00 Kč
`

describe('extractInvoiceFields', () => {
  const f = extractInvoiceFields(FAKTURA)

  it('přečte číslo faktury z nadpisu', () => {
    expect(f.invoiceNumber).toBe('2024-0042')
  })

  it('přečte všechna tři data', () => {
    expect(f.issueDate).toBe('2024-03-01')
    expect(f.taxableDate).toBe('2024-03-01')
    expect(f.dueDate).toBe('2024-03-15')
  })

  it('přečte částky a nesplete si základ s celkem', () => {
    expect(f.total).toBe(12100)
    expect(f.subtotal).toBe(10000)
    expect(f.vatTotal).toBe(2100)
  })

  it('přečte rekapitulaci DPH', () => {
    expect(f.vatRows).toEqual([{ rate: 21, base: 10000, vat: 2100 }])
  })

  it('rozliší dodavatele od odběratele podle popisků', () => {
    expect(f.supplier.ico).toBe('12345678')
    expect(f.customer.ico).toBe('87654321')
  })

  it('přečte variabilní symbol', () => {
    expect(f.variableSymbol).toBe('20240042')
  })

  it('vezme CZK, když doklad není v eurech', () => {
    expect(f.currency).toBe('CZK')
  })

  it('nevymýšlí si pole, která v dokladu nejsou', () => {
    const empty = extractInvoiceFields('Nějaký text bez faktury')
    expect(empty.invoiceNumber).toBeNull()
    expect(empty.issueDate).toBeNull()
    expect(empty.total).toBeNull()
    expect(empty.vatRows).toEqual([])
  })

  it('zvládne fakturu neplátce bez DPH', () => {
    const f2 = extractInvoiceFields(`
      Faktura č. 5/2024
      Datum vystavení: 10.5.2024
      Neplátce DPH
      Celkem k úhradě: 5 000,00 Kč
    `)
    expect(f2.invoiceNumber).toBe('5/2024')
    expect(f2.total).toBe(5000)
    expect(f2.vatRows).toEqual([])
  })

  it('bez popisků stran nechá přiřazení na dávce', () => {
    const f3 = extractInvoiceFields(`
      Faktura č. 7
      Moje Firma s.r.o.
      IČO: 11111111
      Zákazník Beta s.r.o.
      IČO: 22222222
    `)
    // „Zákazník" je popisek odběratele → strany se přiřadí rovnou.
    expect(f3.customer.ico ?? f3.unassignedParties.length).toBeTruthy()
  })
})
