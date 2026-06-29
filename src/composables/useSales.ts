import { ref } from 'vue'
import { http } from '@/lib/http'
import type { DailySalesSummary, PaymentMethod, Sale } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

// Pokladní prodej není prostý CRUD (má /summary, /storno, /receipt) → vlastní composable nad http.
// Funguje jen v API módu (POS dává smysl jen proti reálnému backendu).
export interface SaleLineInput {
  productId: string | null
  description: string | null
  quantity: number
  unitPrice: number // cena VČETNĚ DPH
  vatRate: number
  discountPercent?: number
}

export function useSales() {
  const lastSale = ref<Sale | null>(null)

  async function create(paymentMethod: PaymentMethod, items: SaleLineInput[]): Promise<Sale> {
    const sale = await http.post<Sale>('/sales', {
      paymentMethod,
      items: items.map((i) => ({ ...i, discountPercent: i.discountPercent ?? 0 })),
    })
    lastSale.value = sale
    return sale
  }

  function summaryToday(): Promise<DailySalesSummary> {
    return http.get<DailySalesSummary>('/sales/summary')
  }

  // Historie prodejů (nejnovější první — řazení řeší backend defaultně).
  function list(): Promise<Sale[]> {
    return http.get<PagedResult<Sale>>('/sales?pageSize=50').then((r) => r.items)
  }

  // Storno prodeje — vrátí zboží na sklad, prodej dostane stav Cancelled.
  function storno(id: string): Promise<Sale> {
    return http.post<Sale>(`/sales/${id}/storno`)
  }

  return { lastSale, create, summaryToday, list, storno }
}
