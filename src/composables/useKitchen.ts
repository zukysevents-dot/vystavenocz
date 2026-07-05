import { http } from '@/lib/http'
import type { CategoryKitchenSection, KitchenQueueItem, KitchenStatus } from '@/lib/types'

// Kuchyňský displej (KDS). Jen API mód.
export function useKitchen() {
  function sectionQuery(section?: CategoryKitchenSection): string {
    return section && section !== 'None' ? `?section=${section}` : ''
  }

  function queue(section?: CategoryKitchenSection): Promise<KitchenQueueItem[]> {
    return http.get<KitchenQueueItem[]>(`/kitchen/queue${sectionQuery(section)}`)
  }
  function history(section?: CategoryKitchenSection): Promise<KitchenQueueItem[]> {
    return http.get<KitchenQueueItem[]>(`/kitchen/history${sectionQuery(section)}`)
  }
  function setStatus(itemId: string, status: KitchenStatus): Promise<void> {
    return http.post(`/kitchen/items/${itemId}/status`, { status })
  }
  return { queue, history, setStatus }
}
