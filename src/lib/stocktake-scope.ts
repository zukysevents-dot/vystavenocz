import type { Product } from '@/lib/types'
import type { StocktakeRangeKind } from '@/lib/stocktake-draft'

type ScopeProduct = Pick<Product, 'id' | 'categoryId'>

export function stocktakeRangeLabel(kind: StocktakeRangeKind): string {
  return {
    full: 'Úplná inventura',
    partial: 'Částečná inventura',
    cycle: 'Cyklická inventura',
    spot: 'Namátková kontrola',
  }[kind]
}

export function stocktakeRangeDescription(kind: StocktakeRangeKind): string {
  return {
    full: 'Započítáte celý sklad vybrané pobočky.',
    partial: 'Vyberete kategorie nebo konkrétní položky, které chcete zkontrolovat.',
    cycle: 'Průběžně kontrolujete vybranou část skladu bez odstávky celého skladu.',
    spot: 'Rychle ověříte jen konkrétní položky, například při kontrole dodávky.',
  }[kind]
}

export function resolveStocktakeScopeProductIds(
  products: ScopeProduct[],
  kind: StocktakeRangeKind,
  categoryIds: Iterable<string>,
  productIds: Iterable<string>,
): string[] {
  if (kind === 'full') return products.map((product) => product.id)

  const included = new Set(productIds)
  if (kind === 'partial' || kind === 'cycle') {
    const categories = new Set(categoryIds)
    for (const product of products) {
      if (product.categoryId && categories.has(product.categoryId)) included.add(product.id)
    }
  }

  // Zachováme pořadí katalogu a ignorujeme už neexistující položky bezpečně.
  return products.filter((product) => included.has(product.id)).map((product) => product.id)
}
