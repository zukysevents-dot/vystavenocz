import { ref } from 'vue'
import { http } from '@/lib/http'
import type { DailySalesSummary, PaymentMethod, Sale } from '@/lib/types'

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

  return { lastSale, create, summaryToday }
}
