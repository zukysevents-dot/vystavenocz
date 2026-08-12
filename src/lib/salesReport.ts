import type { Sale } from './types'
import { round2 } from './invoice'

/**
 * Uzávěrka / přehled tržeb — čisté agregace nad prodeji (POS Sale), bez HTTP a stavu.
 * Do tržeb se počítá JEN dokončený prodej (`status === 'Completed'`); stornované (`Cancelled`)
 * jdou zvlášť do storna. Řádky prodeje UŽ nesou spočítané `lineNet/lineVat/lineTotal`
 * (a Sale `totalNet/totalVat/total`), takže se jen SČÍTAJÍ, nedopočítávají. Vše přes `round2`.
 */

const BUSINESS_TIME_ZONE = 'Europe/Prague'

export function businessDateOfSale(soldAt: string): string {
  const date = new Date(soldAt)
  if (Number.isNaN(date.getTime())) return soldAt.slice(0, 10)

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export interface SalesSummary {
  count: number // počet dokončených účtenek
  totalNet: number
  totalVat: number
  total: number
  cashTotal: number
  cardTotal: number
  tipTotal: number
  discountTotal: number // sleva na účet v Kč (z rozdílu net bez slevy vs. se slevou)
  cancelledCount: number
  cancelledTotal: number
  avgSale: number // průměrný účet = total / count (dělení nulou → 0)
}

/** Dokončený prodej = tržba; stornovaný ne. */
function isCompleted(s: Sale): boolean {
  return s.status === 'Completed'
}

export function summarizeSales(sales: Sale[]): SalesSummary {
  let count = 0
  let totalNet = 0
  let totalVat = 0
  let total = 0
  let cashTotal = 0
  let cardTotal = 0
  let tipTotal = 0
  let discountTotal = 0
  let cancelledCount = 0
  let cancelledTotal = 0

  for (const s of sales) {
    if (isCompleted(s)) {
      count += 1
      totalNet += s.totalNet
      totalVat += s.totalVat
      total += s.total
      tipTotal += s.tipAmount ?? 0
      if (s.paymentMethod === 'Cash') cashTotal += s.total
      else if (s.paymentMethod === 'Card') cardTotal += s.total
      // Sleva na účet v Kč: podíl slevy z ceny řádků před slevou (net + DPH položek).
      if (s.discountPercent > 0) {
        const grossLines = s.items.reduce((a, it) => a + it.lineTotal, 0)
        const pct = s.discountPercent
        // grossLines je už PO slevě → původní = grossLines / (1 - pct/100).
        const beforeDiscount = pct < 100 ? grossLines / (1 - pct / 100) : grossLines
        discountTotal += beforeDiscount - grossLines
      }
    } else {
      cancelledCount += 1
      cancelledTotal += s.total
    }
  }

  return {
    count,
    totalNet: round2(totalNet),
    totalVat: round2(totalVat),
    total: round2(total),
    cashTotal: round2(cashTotal),
    cardTotal: round2(cardTotal),
    tipTotal: round2(tipTotal),
    discountTotal: round2(discountTotal),
    cancelledCount,
    cancelledTotal: round2(cancelledTotal),
    avgSale: count ? round2(total / count) : 0,
  }
}

export interface VatBreakdownRow {
  vatRate: number
  net: number
  vat: number
  gross: number
}

/**
 * Rozdělí jednu částku mezi sazby poměrem vah; zbytek po zaokrouhlení připadne největší
 * skupině, aby součet seděl na haléř. Zrcadlí serverový `SaleVatBreakdown.Allocate`.
 */
function distribute(weights: number[], target: number): number[] {
  const sum = weights.reduce((a, w) => a + w, 0)
  const out = new Array<number>(weights.length).fill(0)
  if (weights.length === 0) return out
  if (sum === 0) {
    out[0] = round2(target)
    return out
  }
  let allocated = 0
  for (let i = 0; i < weights.length; i++) {
    out[i] = round2((target * weights[i]) / sum)
    allocated = round2(allocated + out[i])
  }
  const residual = round2(target - allocated)
  if (residual !== 0) {
    let largest = 0
    for (let i = 1; i < weights.length; i++) if (weights[i] > weights[largest]) largest = i
    out[largest] = round2(out[largest] + residual)
  }
  return out
}

/**
 * Rozpad DPH z dokončených prodejů podle `vatRate`. Sazby se berou z dat (nehardcodují se),
 * řazeno sestupně dle vatRate.
 *
 * Řádky (`lineNet`/`lineVat`) nesou částky PŘED slevou na celý účet a před uplatněním bodů — ty
 * snižuje až server na úrovni prodeje. Prostý součet řádků proto nadhodnocoval základ i daň o celou
 * slevu na účet a Uzávěrka ukazovala u otevřeného dne vyšší DPH, než se reálně vybralo (a než pak
 * ukázal zavřený Z-report). Rozděluje se tedy skutečné `totalNet`/`totalVat` prodeje poměrem řádků.
 */
export function buildVatBreakdown(sales: Sale[]): VatBreakdownRow[] {
  const map = new Map<number, { net: number; vat: number; gross: number }>()
  for (const s of sales) {
    if (!isCompleted(s)) continue

    const rates = [...new Set(s.items.map((it) => it.vatRate))]
    const netWeights = rates.map((r) =>
      s.items.filter((it) => it.vatRate === r).reduce((a, it) => a + it.lineNet, 0),
    )
    const vatWeights = rates.map((r) =>
      s.items.filter((it) => it.vatRate === r).reduce((a, it) => a + it.lineVat, 0),
    )
    const nets = distribute(netWeights, s.totalNet)
    const vats = distribute(vatWeights, s.totalVat)

    rates.forEach((rate, i) => {
      const entry = map.get(rate) ?? { net: 0, vat: 0, gross: 0 }
      entry.net += nets[i]
      entry.vat += vats[i]
      entry.gross += nets[i] + vats[i]
      map.set(rate, entry)
    })
  }
  return [...map.entries()]
    .map(([vatRate, v]) => ({
      vatRate,
      net: round2(v.net),
      vat: round2(v.vat),
      gross: round2(v.gross),
    }))
    .sort((a, b) => b.vatRate - a.vatRate)
}

export interface TopProductRow {
  productId: string | null
  name: string
  quantity: number
  revenueGross: number
}

/**
 * Top produkty z dokončených prodejů: seskupí items po `productId`, sečte quantity a lineTotal,
 * seřadí dle revenueGross sestupně, vezme top `limit`. Neznámé productId → název „(neznámý)".
 */
export function buildTopProducts(
  sales: Sale[],
  productNameById: Map<string, string>,
  limit = 10,
): TopProductRow[] {
  const map = new Map<string, { quantity: number; revenueGross: number }>()
  for (const s of sales) {
    if (!isCompleted(s)) continue
    for (const it of s.items) {
      const key = it.productId ?? '__unknown__'
      const entry = map.get(key) ?? { quantity: 0, revenueGross: 0 }
      entry.quantity += it.quantity
      entry.revenueGross += it.lineTotal
      map.set(key, entry)
    }
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      productId: key === '__unknown__' ? null : key,
      name: key === '__unknown__' ? '(neznámý)' : (productNameById.get(key) ?? '(neznámý)'),
      quantity: round2(v.quantity),
      revenueGross: round2(v.revenueGross),
    }))
    .sort((a, b) => b.revenueGross - a.revenueGross)
    .slice(0, limit)
}

export interface CategoryRevenueRow {
  categoryName: string
  revenueGross: number
  quantity: number
}

/**
 * Tržby po kategoriích z dokončených prodejů: mapuje productId → kategorie (neznámé /
 * bez productId → „Bez kategorie"), sečte tržbu a množství, seřadí sestupně.
 */
export function buildRevenueByCategory(
  sales: Sale[],
  categoryNameByProductId: Map<string, string>,
): CategoryRevenueRow[] {
  const UNCATEGORIZED = 'Bez kategorie'
  const map = new Map<string, { revenueGross: number; quantity: number }>()
  for (const s of sales) {
    if (!isCompleted(s)) continue
    for (const it of s.items) {
      const name =
        (it.productId ? categoryNameByProductId.get(it.productId) : null) ?? UNCATEGORIZED
      const entry = map.get(name) ?? { revenueGross: 0, quantity: 0 }
      entry.revenueGross += it.lineTotal
      entry.quantity += it.quantity
      map.set(name, entry)
    }
  }
  return [...map.entries()]
    .map(([categoryName, v]) => ({
      categoryName,
      revenueGross: round2(v.revenueGross),
      quantity: round2(v.quantity),
    }))
    .sort((a, b) => b.revenueGross - a.revenueGross)
}
