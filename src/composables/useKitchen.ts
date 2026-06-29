import { http } from '@/lib/http'
import type { CategoryKitchenSection, KitchenQueueItem, KitchenStatus } from '@/lib/types'

// Kuchyňský displej (KDS). Jen API mód.
export function useKitchen() {
  function queue(section?: CategoryKitchenSection): Promise<KitchenQueueItem[]> {
    const q = section && section !== 'None' ? `?section=${section}` : ''
    return http.get<KitchenQueueItem[]>(`/kitchen/queue${q}`)
  }
  function setStatus(itemId: string, status: KitchenStatus): Promise<void> {
    return http.post(`/kitchen/items/${itemId}/status`, { status })
  }
  return { queue, setStatus }
}
