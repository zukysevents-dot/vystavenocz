import { http } from '@/lib/http'

/**
 * Klientská zóna (self-service portál) — klient přes odkaz `/klient/:token` bez
 * přihlášení vidí své faktury a schvaluje/odmítá nabídky. Volá veřejné (neautorizované)
 * endpointy klíčované tokenem klienta; http bez tokenu neposílá Authorization.
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
    return http.get<ClientPortalData>(`/public/client/${encodeURIComponent(token)}`)
  }

  /** Klient odpoví na nabídku (přijmout / odmítnout). */
  async function respondQuote(
    token: string,
    quoteId: string,
    action: 'approve' | 'reject',
  ): Promise<void> {
    await http.post(
      `/public/client/${encodeURIComponent(token)}/quotes/${encodeURIComponent(quoteId)}/${action}`,
    )
  }

  return { load, respondQuote }
}
