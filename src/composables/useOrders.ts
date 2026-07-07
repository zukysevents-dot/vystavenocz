import { http } from '@/lib/http'
import type { Order, OrderSplitGroup, PaymentMethod } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

// Poznámka a chod položky (backend AddOrderItemRequest/UpdateOrderItemRequest — Note, Course).
export interface OrderItemMeta {
  note?: string | null
  course?: string | null
}

export interface AddOrderItemInput extends OrderItemMeta {
  modifierOptionIds?: string[]
}

// Sleva na účet + spropitné — ukládá se průběžně na otevřený účet (ne až v pay()).
export interface OrderDiscountInput {
  discountPercent?: number
  tipAmount?: number
}

export interface OrderItemPaymentShare {
  itemId: string
  quantity: number
}

// Otevřené účty na stole (gastro). Jen API mód (restaurační provoz proti reálnému backendu).
export function useOrders() {
  async function listOpen(): Promise<Order[]> {
    return (await http.get<PagedResult<Order>>('/orders?status=Open&pageSize=200')).items
  }
  function get(id: string): Promise<Order> {
    return http.get<Order>(`/orders/${id}`)
  }
  function open(tableId: string): Promise<Order> {
    return http.post<Order>('/orders', { tableId })
  }
  function addItem(
    orderId: string,
    productId: string,
    quantity = 1,
    input?: AddOrderItemInput,
  ): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/items`, { productId, quantity, ...input })
  }
  // POZOR: backend bere Note/Course jako součást celého updatu (default null) — kdo volá jen s quantity,
  // smaže stávající poznámku/chod. Volající proto musí předat aktuální meta, pokud je chce zachovat.
  function updateItem(
    orderId: string,
    itemId: string,
    quantity: number,
    meta?: OrderItemMeta,
  ): Promise<Order> {
    return http.put<Order>(`/orders/${orderId}/items/${itemId}`, { quantity, ...meta })
  }
  function removeItem(orderId: string, itemId: string): Promise<Order> {
    return http.del<Order>(`/orders/${orderId}/items/${itemId}`)
  }
  function sendToKitchen(orderId: string): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/send-to-kitchen`)
  }
  function move(orderId: string, tableId: string): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/move`, { tableId })
  }
  // Sloučení dvou otevřených účtů: položky ze zdrojového účtu se přesunou do cílového.
  // Vrací aktualizovaný CÍLOVÝ účet; zdrojový server nastaví na Cancelled (uvolní stůl).
  // Sleva/spropitné zůstávají na cílovém účtu, split (rozpad účtu) se ruší — nastavuje se znovu.
  function merge(targetOrderId: string, sourceOrderId: string): Promise<Order> {
    return http.post<Order>(`/orders/${targetOrderId}/merge`, { sourceOrderId })
  }
  // Sleva na účet a spropitné se ukládají průběžně (přežije refresh/přepnutí obsluhy),
  // ne až při platbě — pay() je bere z aktuálního serverového stavu Order.
  function updateDiscount(orderId: string, input: OrderDiscountInput): Promise<Order> {
    return http.patch<Order>(`/orders/${orderId}/discount`, input)
  }
  // Split je čistě zobrazovací/organizační rozpočet (kdo kolik dluží) — nemění platební tok.
  // Idempotentní: nahrazuje celé pole splitGroups, ne inkrementální patch.
  function updateSplit(orderId: string, splitGroups: OrderSplitGroup[]): Promise<Order> {
    return http.put<Order>(`/orders/${orderId}/split`, { splitGroups })
  }
  // cashReceived = přijatá hotovost (jen platba Cash) — backend validuje, že pokryje placenou částku,
  // a uloží ji na Sale (účtenka pak umí „Přijato / Vráceno").
  function pay(
    orderId: string,
    method: PaymentMethod,
    cashReceived?: number | null,
  ): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/pay`, {
      paymentMethod: method,
      cashReceived: cashReceived ?? null,
    })
  }
  function payItems(
    orderId: string,
    method: PaymentMethod,
    items: OrderItemPaymentShare[],
    cashReceived?: number | null,
  ): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/pay-items`, {
      paymentMethod: method,
      items,
      cashReceived: cashReceived ?? null,
    })
  }
  function cancel(orderId: string): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/cancel`)
  }
  return {
    listOpen,
    get,
    open,
    addItem,
    updateItem,
    removeItem,
    sendToKitchen,
    move,
    merge,
    updateDiscount,
    updateSplit,
    pay,
    payItems,
    cancel,
  }
}
