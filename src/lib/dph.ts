import { round2 } from './invoice'
import type { Invoice } from './types'

/**
 * Přehled DPH (podklad k přiznání) — daň na výstupu z vystavených faktur, sečtená
 * po sazbách za období. Bere se datum uskutečnění plnění (DUZP = taxableDate), jak
 * DPH vyžaduje. Počítá se z uložených částek řádků (lineSubtotal/lineVat) — u neplátce
 * je DPH nula, takže přehled přirozeně vyjde 0.
 */

const RATES = [21, 12, 0]

export interface VatRateRow {
  rate: number
  base: number // základ daně
  vat: number // daň
}

export interface VatSummary {
  rows: VatRateRow[]
  totalBase: number
  totalVat: number
  count: number // počet zahrnutých dokladů
}

/**
 * Doklad relevantní pro DPH: vystavená CZK faktura s DUZP (koncept/storno/dobropis/
 * cizí měna ne). Bez taxableDate by doklad tiše spadl jen do 'all', ale ne do žádného
 * konkrétního období → vyloučíme, ať 'all' == součet období.
 */
function isVatRelevant(inv: Invoice): boolean {
  const czk = !inv.currency || inv.currency === 'CZK'
  return (
    czk &&
    !!inv.taxableDate &&
    inv.documentType === 'invoice' &&
    (inv.status === 'issued' || inv.status === 'paid' || inv.status === 'overdue')
  )
}

/** Dostupná období (YYYY-MM dle DUZP relevantních faktur), sestupně. */
export function availablePeriods(invoices: Invoice[]): string[] {
  const set = new Set<string>()
  for (const inv of invoices) {
    if (isVatRelevant(inv) && inv.taxableDate) set.add(inv.taxableDate.slice(0, 7))
  }
  return [...set].sort().reverse()
}

/** Souhrn DPH za období ('all' = vše). Řádky po sazbách + celkové součty. */
export function vatSummary(invoices: Invoice[], period: string): VatSummary {
  const relevant = invoices.filter(
    (inv) => isVatRelevant(inv) && (period === 'all' || (inv.taxableDate || '').startsWith(period)),
  )

  const map = new Map<number, { base: number; vat: number }>()
  for (const inv of relevant) {
    // DPH gate-ujeme dle dodavatele: neplátce nemá daň na výstupu i kdyby importovaný
    // doklad nesl nenulové lineVat (stejná ochrana jako ISDOC export).
    const payer = inv.supplierSnapshot?.vatMode === 'payer'
    for (const it of inv.items) {
      const g = map.get(it.vatRate) ?? { base: 0, vat: 0 }
      g.base += it.lineSubtotal
      g.vat += payer ? it.lineVat : 0
      map.set(it.vatRate, g)
    }
  }

  // Standardní sazby ve fixním pořadí, pak případné nestandardní.
  const orderedRates = [
    ...RATES.filter((r) => map.has(r)),
    ...[...map.keys()].filter((r) => !RATES.includes(r)).sort((a, b) => b - a),
  ]
  const rows: VatRateRow[] = orderedRates.map((rate) => {
    const g = map.get(rate)!
    return { rate, base: round2(g.base), vat: round2(g.vat) }
  })

  return {
    rows,
    totalBase: round2(rows.reduce((a, r) => a + r.base, 0)),
    totalVat: round2(rows.reduce((a, r) => a + r.vat, 0)),
    count: relevant.length,
  }
}
