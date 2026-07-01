import type { Product } from './types'

/**
 * Návrhy k doobjednání — čistá logika. Produkt je „nízko", když jeho stav ≤ minQuantity
 * (a minQuantity > 0). Doporučené množství doplní stav na cílovou hladinu 2× minimum
 * (jednoduchá heuristika bez konfigurace), zaokrouhleno nahoru na celý kus.
 */

export interface ReorderRow {
  productId: string
  name: string
  sku: string
  current: number
  min: number
  suggested: number
}

const TARGET_MULTIPLIER = 2

export function reorderSuggestions(products: Product[], levels: Map<string, number>): ReorderRow[] {
  const rows: ReorderRow[] = []
  for (const p of products) {
    if (p.minQuantity <= 0) continue
    const current = levels.get(p.id) ?? 0
    if (current > p.minQuantity) continue
    const suggested = Math.max(0, Math.ceil(p.minQuantity * TARGET_MULTIPLIER - current))
    rows.push({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      current,
      min: p.minQuantity,
      suggested,
    })
  }
  // Nejnaléhavější (nejhlouběji pod minimem) nahoře.
  return rows.sort((a, b) => a.current - a.min - (b.current - b.min))
}

/** Najde produkt podle přesného EAN (čtečka pošle kód). Prázdný/nenalezený → undefined. */
export function findByEan(products: Product[], ean: string): Product | undefined {
  const code = ean.trim()
  if (!code) return undefined
  return products.find((p) => p.ean === code)
}
