import { ref } from 'vue'
import { http } from '@/lib/http'
import type { ApprovalRequest, DailySalesSummary, PaymentMethod, Sale } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

const SALES_EXPORT_PAGE_SIZE = 100
const SALES_EXPORT_MAX = 5000

// Pokladní prodej není prostý CRUD (má /summary, /storno, /receipt) → vlastní composable nad http.
// Funguje jen v API módu (POS dává smysl jen proti reálnému backendu).
export interface SaleLineInput {
  productId: string | null
  description: string | null
  quantity: number
  unitPrice: number // cena VČETNĚ DPH
  vatRate: number
  discountPercent?: number
  productVariantId?: string | null
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

export interface SaleListOptions {
  from?: string | null
  to?: string | null
  paymentMethod?: PaymentMethod | null
}

function saleListQuery(options: SaleListOptions = {}, pageSize = 50, page?: number): string {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  if (options.from) params.set('from', options.from)
  if (options.to) params.set('to', options.to)
  if (options.paymentMethod) params.set('paymentMethod', options.paymentMethod)
  return `/sales?${params.toString()}`
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
  function list(options?: SaleListOptions): Promise<Sale[]> {
    return http.get<PagedResult<Sale>>(saleListQuery(options)).then((r) => r.items)
  }

  /**
   * Přesný export nikdy nesmí tiše skončit na první stránce. Pro neobvykle velký
   * výběr raději skončí chybou než aby stáhl neúplný soubor.
   */
  async function listAll(options?: SaleListOptions): Promise<Sale[]> {
    const first = await http.get<PagedResult<Sale>>(
      saleListQuery(options, SALES_EXPORT_PAGE_SIZE, 1),
    )
    if (first.total > SALES_EXPORT_MAX) {
      throw new RangeError(`Pro export je vybráno příliš mnoho účtenek (${first.total}).`)
    }

    const sales = [...first.items]
    const totalPages = Math.ceil(first.total / SALES_EXPORT_PAGE_SIZE)
    for (let page = 2; page <= totalPages; page++) {
      const next = await http.get<PagedResult<Sale>>(
        saleListQuery(options, SALES_EXPORT_PAGE_SIZE, page),
      )
      sales.push(...next.items)
    }

    const unique = [...new Map(sales.map((sale) => [sale.id, sale])).values()]
    if (unique.length !== first.total) {
      throw new Error('Historie účtenek se během exportu změnila. Zkuste export zopakovat.')
    }
    return unique
  }

  function get(id: string): Promise<Sale> {
    return http.get<Sale>(`/sales/${id}`)
  }

  // Storno prodeje — vrátí zboží na sklad, prodej dostane stav Cancelled.
  function storno(id: string): Promise<Sale | ApprovalRequest> {
    return http.post<Sale | ApprovalRequest>(`/sales/${id}/storno`)
  }

  return { lastSale, create, summaryToday, list, listAll, get, storno }
}
