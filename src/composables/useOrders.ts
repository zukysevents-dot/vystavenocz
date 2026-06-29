import { http } from '@/lib/http'
import type { Order, PaymentMethod } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

// Poznámka a chod položky (backend AddOrderItemRequest/UpdateOrderItemRequest — Note, Course).
export interface OrderItemMeta {
  note?: string | null
  course?: string | null
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
    meta?: OrderItemMeta,
  ): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/items`, { productId, quantity, ...meta })
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
  function pay(orderId: string, method: PaymentMethod): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/pay`, { paymentMethod: method })
  }
  function cancel(orderId: string): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/cancel`)
  }
  return { listOpen, get, open, addItem, updateItem, removeItem, sendToKitchen, move, pay, cancel }
}
