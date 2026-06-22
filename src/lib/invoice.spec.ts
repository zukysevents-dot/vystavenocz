import { describe, it, expect } from 'vitest'
import {
  round2,
  calcLine,
  calcTotals,
  buildInvoiceNumber,
  variableSymbolFromInvoiceNumber,
  czAccountToIban,
} from '@/lib/invoice'

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
