import { ref } from 'vue'
import { http, isApiMode } from '@/lib/http'
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

/** Volitelné zúžení reportu na konkrétní den + pobočku (Fáze 2). */
export interface ReportFilter {
  date?: string // 'YYYY-MM-DD'
  locationId?: string
}

/**
 * Data pro uzávěrku dneška (read-only, Fáze 1). Načte poslední účtenky (`/sales`),
 * denní souhrn (`/sales/summary`), produkty a kategorie, a přes `salesReport.ts` složí report.
 * Chyby jsou zachyceny → místo pádu appky prázdný report + `error`.
 *
 * Fáze 2: `reload(filter)` umí report zúžit na zvolený den + pobočku (živý přehled OTEVŘENÉHO dne).
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
  // Kompletní seznam prodaných produktů za den (kvůli inventuře) — ne jen „top", ale všechny.
  const soldProducts = ref<TopProductRow[]>([])
  const byCategory = ref<CategoryRevenueRow[]>([])

  /**
   * Denní souhrn z API pro daný den + pobočku (Fáze 2). Když filtr chybí, spadne zpět
   * na `summaryToday()` (dnešek, orientační). Jen API režim.
   */
  function fetchSummary(filter?: ReportFilter): Promise<DailySalesSummary | null> {
    if (!isApiMode()) return Promise.resolve(null)
    if (filter?.date && filter.locationId) {
      const params = `date=${filter.date}&locationId=${encodeURIComponent(filter.locationId)}`
      return http.get<DailySalesSummary>(`/sales/summary?${params}`).catch(() => null)
    }
    return summaryToday().catch(() => null)
  }

  /**
   * @param filter volitelný filtr na den + pobočku (Fáze 2). Bez filtru = dnešek/všechny
   *   pobočky z posledních 50 účtenek (Fáze 1, orientační).
   */
  async function reload(filter?: ReportFilter): Promise<void> {
    loading.value = true
    error.value = false
    try {
      // summaryToday je jen orientační ozdoba KPI; kategorie mohou být v mocku prázdné.
      const [list_, summary_, , categories] = await Promise.all([
        salesApi.list(),
        fetchSummary(filter),
        loadProducts(),
        listCategories().catch(() => []),
      ])

      // Fáze 2: pro konkrétní den + pobočku zúžíme lokální účtenky (rozpad DPH, top produkty).
      const filtered = filter?.date
        ? list_.filter(
            (s) =>
              s.soldAt.slice(0, 10) === filter.date &&
              (!filter.locationId || s.locationId === filter.locationId),
          )
        : list_

      sales.value = filtered
      serverSummary.value = summary_

      const productNameById = new Map(products.value.map((p) => [p.id, p.name]))
      const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))
      const categoryNameByProductId = new Map<string, string>()
      for (const p of products.value) {
        const name = p.categoryId ? categoryNameById.get(p.categoryId) : undefined
        if (name) categoryNameByProductId.set(p.id, name)
      }

      summary.value = summarizeSales(filtered)
      vatBreakdown.value = buildVatBreakdown(filtered)
      // Bez limitu = všechny prodané produkty (pro inventuru), seřazené od nejprodávanějšího.
      soldProducts.value = buildTopProducts(filtered, productNameById, Number.POSITIVE_INFINITY)
      byCategory.value = buildRevenueByCategory(filtered, categoryNameByProductId)
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
    soldProducts,
    byCategory,
    reload,
  }
}
