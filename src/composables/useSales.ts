import { ref } from 'vue'
import { http } from '@/lib/http'
import type { ApprovalRequest, DailySalesSummary, PaymentMethod, Sale } from '@/lib/types'
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

export interface SaleOptions {
  discountPercent?: number // sleva na CELÝ účet, 0–100
  tipAmount?: number // spropitné v Kč, mimo DPH
  // Provozovna, na které prodej vznikl. Bez ní backend uloží prodej „bez pobočky" a per-pobočka
  // uzávěrka (Z-report) ho neuvidí. '' / null = neposílat (klient bez provozoven).
  locationId?: string | null
  // Přijatá hotovost (jen platba Cash) — backend validuje, že pokryje Total, a vrátí cashChange.
  cashReceived?: number | null
  // Volitelná cenová hladina/VIP cena. Backend počítá finální cenu, frontend ji jen vybírá.
  priceLevelId?: string | null
  // Věrnostní zákazník + počet uplatněných bodů. Backend počítá slevu i earn ledger.
  customerId?: string | null
  redeemPoints?: number
}

export function useSales() {
  const lastSale = ref<Sale | null>(null)

  async function create(
    paymentMethod: PaymentMethod,
    items: SaleLineInput[],
    options?: SaleOptions,
  ): Promise<Sale> {
    const sale = await http.post<Sale>('/sales', {
      paymentMethod,
      locationId: options?.locationId || null,
      items: items.map((i) => ({ ...i, discountPercent: i.discountPercent ?? 0 })),
      discountPercent: options?.discountPercent ?? 0,
      tipAmount: options?.tipAmount ?? 0,
      cashReceived: options?.cashReceived ?? null,
      priceLevelId: options?.priceLevelId ?? null,
      customerId: options?.customerId ?? null,
      redeemPoints: options?.redeemPoints ?? 0,
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

  function get(id: string): Promise<Sale> {
    return http.get<Sale>(`/sales/${id}`)
  }

  // Storno prodeje — vrátí zboží na sklad, prodej dostane stav Cancelled.
  function storno(id: string): Promise<Sale | ApprovalRequest> {
    return http.post<Sale | ApprovalRequest>(`/sales/${id}/storno`)
  }

  return { lastSale, create, summaryToday, list, get, storno }
}
