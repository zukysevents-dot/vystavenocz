import { ref } from 'vue'
import { isApiMode } from '@/lib/http'
import { useApi } from '@/composables/useApi'
import { useSales } from '@/composables/useSales'
import { useProducts } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import type { DailySalesSummary, Sale } from '@/lib/types'
import {
  summarizeSales,
  buildVatBreakdown,
  buildTopProducts,
  buildRevenueByCategory,
  type SalesSummary,
  type VatBreakdownRow,
  type TopProductRow,
  type CategoryRevenueRow,
} from '@/lib/salesReport'

/**
 * Data pro uzávěrku dneška (read-only, Fáze 1). Načte poslední účtenky (`/sales`),
 * denní souhrn (`/sales/summary`), produkty a kategorie, a přes `salesReport.ts` složí report.
 * Chyby jsou zachyceny → místo pádu appky prázdný report + `error`.
 */
export function useSalesReport() {
  // Prodeje čteme přes useApi('sales') — v mock režimu ze seedu (localStorage), v API režimu
  // z /sales. summaryToday() (/sales/summary) je jen orientační KPI a existuje jen v API režimu.
  const salesApi = useApi<Sale>('sales')
  const { summaryToday } = useSales()
  const { products, load: loadProducts } = useProducts()
  const { list: listCategories } = useCategories()

  const loading = ref(true)
  const error = ref(false)

  const sales = ref<Sale[]>([])
  const serverSummary = ref<DailySalesSummary | null>(null)
  const summary = ref<SalesSummary>(summarizeSales([]))
  const vatBreakdown = ref<VatBreakdownRow[]>([])
  const topProducts = ref<TopProductRow[]>([])
  const byCategory = ref<CategoryRevenueRow[]>([])

  async function reload(): Promise<void> {
    loading.value = true
    error.value = false
    try {
      // summaryToday je jen orientační ozdoba KPI; kategorie mohou být v mocku prázdné.
      const [list_, summary_, , categories] = await Promise.all([
        salesApi.list(),
        isApiMode() ? summaryToday().catch(() => null) : Promise.resolve(null),
        loadProducts(),
        listCategories().catch(() => []),
      ])

      sales.value = list_
      serverSummary.value = summary_

      const productNameById = new Map(products.value.map((p) => [p.id, p.name]))
      const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
      const categoryNameByProductId = new Map<string, string>()
      for (const p of products.value) {
        const name = p.categoryId ? categoryNameById.get(p.categoryId) : undefined
        if (name) categoryNameByProductId.set(p.id, name)
      }

      summary.value = summarizeSales(list_)
      vatBreakdown.value = buildVatBreakdown(list_)
      topProducts.value = buildTopProducts(list_, productNameById)
      byCategory.value = buildRevenueByCategory(list_, categoryNameByProductId)
    } catch (e) {
      console.warn('Načtení uzávěrky selhalo:', e)
      error.value = true
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    sales,
    serverSummary,
    summary,
    vatBreakdown,
    topProducts,
    byCategory,
    reload,
  }
}
