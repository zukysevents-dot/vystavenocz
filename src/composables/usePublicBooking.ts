import { http } from '@/lib/http'
import type { Service } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

/**
 * Veřejná rezervace (bez přihlášení) — zákazník firmy si přes veřejný odkaz
 * `/rezervace/:slug` vybere službu a pošle žádost o termín. Firmě naskočí jako
 * rezervace ve stavu „Pending", kterou potvrdí stávajícím tokem v RezervacePage.
 * Volá veřejné endpointy přes http.getPublic/postPublic — striktně BEZ Authorization
 * (aby na public endpoint neunikl JWT náhodně přihlášeného operátora).
 */

export interface PublicBookingInput {
  serviceId: string
  startsAt: string // lokální datum a čas z formuláře (YYYY-MM-DDTHH:mm)
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  note?: string | null
}

export function usePublicBooking() {
  /** Aktivní služby firmy pro veřejný výběr. */
  async function services(slug: string): Promise<Service[]> {
    const res = await http.getPublic<PagedResult<Service>>(
      `/public/${encodeURIComponent(slug)}/services?pageSize=200`,
    )
    return res.items
  }

  /** Odešle žádost o rezervaci (vytvoří Pending). */
  async function book(slug: string, input: PublicBookingInput): Promise<void> {
    await http.postPublic(`/public/${encodeURIComponent(slug)}/reservations`, input)
  }

  return { services, book }
}
