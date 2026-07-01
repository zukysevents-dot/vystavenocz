import { http } from '@/lib/http'

/**
 * Klientská zóna (self-service portál) — klient přes odkaz `/klient/:token` bez
 * přihlášení vidí své faktury a schvaluje/odmítá nabídky. Volá veřejné endpointy
 * klíčované tokenem klienta přes http.getPublic/postPublic — striktně BEZ Authorization
 * (aby na public endpoint neunikl JWT náhodně přihlášeného operátora).
 * Online platba faktur je pozdější fáze (platební brána = backend).
 */

export interface PortalInvoice {
  invoiceNumber: string | null
  issueDate: string
  dueDate: string
  total: number
  currency: string
  status: string
}

export interface PortalQuote {
  id: string
  number: string
  total: number
  status: string // draft|sent|accepted|rejected
  validUntil: string | null
}

export interface ClientPortalData {
  clientName: string
  invoices: PortalInvoice[]
  quotes: PortalQuote[]
}

export function useClientPortal() {
  async function load(token: string): Promise<ClientPortalData> {
    return http.getPublic<ClientPortalData>(`/public/client/${encodeURIComponent(token)}`)
  }

  /** Klient odpoví na nabídku (přijmout / odmítnout). */
  async function respondQuote(
    token: string,
    quoteId: string,
    action: 'approve' | 'reject',
  ): Promise<void> {
    await http.postPublic(
      `/public/client/${encodeURIComponent(token)}/quotes/${encodeURIComponent(quoteId)}/${action}`,
    )
  }

  return { load, respondQuote }
}
