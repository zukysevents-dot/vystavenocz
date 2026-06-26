import { http } from '@/lib/http'
import type { Order, PaymentMethod } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

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
  function addItem(orderId: string, productId: string, quantity = 1): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/items`, { productId, quantity })
  }
  function updateItem(orderId: string, itemId: string, quantity: number): Promise<Order> {
    return http.put<Order>(`/orders/${orderId}/items/${itemId}`, { quantity })
  }
  function removeItem(orderId: string, itemId: string): Promise<Order> {
    return http.del<Order>(`/orders/${orderId}/items/${itemId}`)
  }
  function sendToKitchen(orderId: string): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/send-to-kitchen`)
  }
  function pay(orderId: string, method: PaymentMethod): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/pay`, { paymentMethod: method })
  }
  function cancel(orderId: string): Promise<Order> {
    return http.post<Order>(`/orders/${orderId}/cancel`)
  }
  return { listOpen, get, open, addItem, updateItem, removeItem, sendToKitchen, pay, cancel }
}
