import type { Sale, Location } from './types'
import { round2 } from './invoice'

/**
 * Konsolidace poboček — čistá logika nad prodeji (POS Sale), seskupená po pobočkách.
 * Žádný stav ani server: vše se odvodí z prodejů, které appka má (v API režimu z /sales,
 * v mocku ze seedu). `locationId` plní backend podle terminálu/pobočky; dokud je prázdné,
 * prodeje spadnou do „Nepřiřazeno".
 */

export const UNASSIGNED_LABEL = 'Nepřiřazeno'

export interface LocationRevenue {
  locationId: string | null
  locationName: string
  revenue: number // tržba VČETNĚ DPH, BEZ spropitného (= totalNet + totalVat); tip není tržba provozovny
  tips: number // spropitné zvlášť (patří obsluze, ne do tržeb)
  saleCount: number
  avgSale: number
  sharePercent: number // podíl na celkových tržbách (%)
}

export interface ConsolidationSummary {
  totalRevenue: number
  totalTips: number
  totalSales: number
  locationCount: number // počet POBOČEK s aspoň jedním prodejem (Nepřiřazeno se nepočítá)
  topLocationName: string | null
}

/** Do tržeb se počítá jen dokončený prodej; stornovaný ne. */
function isRevenueSale(s: Sale): boolean {
  return s.status === 'Completed'
}

/** Dostupná období (YYYY-MM dle data prodeje dokončených prodejů), sestupně. */
export function availablePeriods(sales: Sale[]): string[] {
  const set = new Set<string>()
  for (const s of sales) {
    if (isRevenueSale(s) && s.soldAt) set.add(s.soldAt.slice(0, 7))
  }
  return [...set].sort().reverse()
}

/**
 * Tržby po pobočkách za období ('all' = vše). Seskupuje dokončené prodeje podle
 * `locationId`, dopočítá průměr a podíl na celku. Prodeje bez pobočky jdou do
 * „Nepřiřazeno" (zobrazí se vždy poslední). Řazeno sestupně dle tržby.
 */
export function buildLocationRevenue(
  sales: Sale[],
  locations: Location[],
  period = 'all',
): LocationRevenue[] {
  const nameById = new Map(locations.map((l) => [l.id, l.name]))
  const relevant = sales.filter(
    (s) => isRevenueSale(s) && (period === 'all' || (s.soldAt || '').startsWith(period)),
  )

  const map = new Map<string, LocationRevenue>()
  for (const s of relevant) {
    const key = s.locationId ?? '__unassigned__'
    const entry = map.get(key) ?? {
      locationId: s.locationId,
      locationName: s.locationId
        ? (nameById.get(s.locationId) ?? 'Neznámá pobočka')
        : UNASSIGNED_LABEL,
      revenue: 0,
      tips: 0,
      saleCount: 0,
      avgSale: 0,
      sharePercent: 0,
    }
    const tip = s.tipAmount ?? 0
    // Tržba bez spropitného (tip patří obsluze, ne provozovně): total = net + vat + tip.
    entry.revenue = round2(entry.revenue + (s.total - tip))
    entry.tips = round2(entry.tips + tip)
    entry.saleCount += 1
    map.set(key, entry)
  }

  const total = [...map.values()].reduce((a, r) => a + r.revenue, 0)
  const rows = [...map.values()].map((r) => ({
    ...r,
    avgSale: r.saleCount ? round2(r.revenue / r.saleCount) : 0,
    sharePercent: total > 0 ? round2((r.revenue / total) * 100) : 0,
  }))

  // Tržba sestupně; „Nepřiřazeno" vždy na konec.
  return rows.sort((a, b) => {
    if (a.locationId === null) return 1
    if (b.locationId === null) return -1
    return b.revenue - a.revenue
  })
}

export function consolidationSummary(rows: LocationRevenue[]): ConsolidationSummary {
  const totalRevenue = round2(rows.reduce((a, r) => a + r.revenue, 0))
  const totalTips = round2(rows.reduce((a, r) => a + r.tips, 0))
  const totalSales = rows.reduce((a, r) => a + r.saleCount, 0)
  // Jen skutečné pobočky (Nepřiřazeno vynecháme), top dle tržby.
  const assigned = rows.filter((r) => r.locationId !== null && r.saleCount > 0)
  const top = [...assigned].sort((a, b) => b.revenue - a.revenue)[0]
  return {
    totalRevenue,
    totalTips,
    totalSales,
    locationCount: assigned.length,
    topLocationName: top?.locationName ?? null,
  }
}
