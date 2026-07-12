import { http } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'

// Webhook subscriptions veřejného API. Signing secret (`whsec_…`) přijde JEN při vytvoření
// (`WebhookSubscriptionCreated.secret`) — ukládá se šifrovaně a už se nikdy nevrací.
// Historie doručení nikdy neobsahuje secret ani tělo requestu. Jen API režim (vzor useIntegrations).

export const WEBHOOK_EVENTS = [
  { value: 'invoice.created', label: 'Faktura vytvořena' },
  { value: 'invoice.issued', label: 'Faktura vystavena' },
  { value: 'invoice.paid', label: 'Faktura uhrazena' },
  { value: 'invoice.cancelled', label: 'Faktura stornována' },
  { value: 'sale.completed', label: 'Prodej dokončen' },
  { value: 'sale.cancelled', label: 'Prodej stornován' },
  { value: 'customer.created', label: 'Zákazník vytvořen' },
  { value: 'customer.updated', label: 'Zákazník upraven' },
  { value: 'product.created', label: 'Produkt vytvořen' },
  { value: 'product.updated', label: 'Produkt upraven' },
  { value: 'product.deleted', label: 'Produkt smazán' },
  { value: 'stock.level.changed', label: 'Změna skladu' },
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number]['value']

export type WebhookDeliveryStatus = 'Pending' | 'Succeeded' | 'Failed'

export interface WebhookSubscription {
  id: string
  url: string
  events: string[]
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

// Odpověď vytvoření — `secret` přijde JEN JEDNOU.
export interface WebhookSubscriptionCreated {
  id: string
  url: string
  events: string[]
  isEnabled: boolean
  secret: string
  createdAt: string
}

export interface UpsertWebhookSubscriptionRequest {
  url: string
  events: string[]
  isEnabled: boolean
}

export interface WebhookDelivery {
  id: string
  eventId: string
  eventType: string
  status: WebhookDeliveryStatus
  attemptCount: number
  lastHttpStatus: number | null
  lastError: string | null
  nextAttemptAt: string | null
  lastAttemptAt: string | null
  createdAt: string
}

export function useWebhooks() {
  function list(): Promise<WebhookSubscription[]> {
    return http.get<WebhookSubscription[]>('/webhook-subscriptions')
  }

  function create(request: UpsertWebhookSubscriptionRequest): Promise<WebhookSubscriptionCreated> {
    return http.post<WebhookSubscriptionCreated>('/webhook-subscriptions', request)
  }

  function update(
    id: string,
    request: UpsertWebhookSubscriptionRequest,
  ): Promise<WebhookSubscription> {
    return http.put<WebhookSubscription>(`/webhook-subscriptions/${id}`, request)
  }

  function remove(id: string): Promise<void> {
    return http.del(`/webhook-subscriptions/${id}`)
  }

  // Zařadí testovací `ping` event; doručí ho nejbližší běh workeru (do ~30 s).
  function sendTest(id: string): Promise<{ eventId: string }> {
    return http.post<{ eventId: string }>(`/webhook-subscriptions/${id}/test`, {})
  }

  function deliveries(id: string, page = 1, pageSize = 20): Promise<PagedResult<WebhookDelivery>> {
    return http.get<PagedResult<WebhookDelivery>>(
      `/webhook-subscriptions/${id}/deliveries?page=${page}&pageSize=${pageSize}`,
    )
  }

  return { list, create, update, remove, sendTest, deliveries }
}
