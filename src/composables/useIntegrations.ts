import { http, type DownloadResponse } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'

export type TerminalPaymentStatus = 'Pending' | 'Succeeded' | 'Failed' | 'Cancelled'
export type PrintJobStatus = 'Queued' | 'Printed' | 'Failed'
export type PrintJobType = 'Receipt' | 'KitchenTicket' | 'ZReport'
export type AccountingExportType = 'Sales' | 'ZReports'
export type AccountingExportTarget = 'Generic' | 'Pohoda' | 'MoneyS3' | 'SuperFaktura'
export type AccountingExportFormat = 'Csv' | 'Xml'

export interface TerminalPayment {
  id: string
  provider: string
  status: TerminalPaymentStatus
  amount: number
  currency: string
  orderId: string | null
  locationId: string | null
  reference: string | null
  providerReference: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface PrintJob {
  id: string
  type: PrintJobType
  status: PrintJobStatus
  printer: string
  payload: string
  relatedOrderId: string | null
  relatedSaleId: string | null
  relatedDayCloseId: string | null
  locationId: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface PrintAgent {
  id: string
  name: string
  locationId: string | null
  lastSeenAt: string | null
  createdAt: string
}

export interface PrintAgentRegistered extends PrintAgent {
  token: string
}

export interface RegisterPrintAgentRequest {
  name: string
  locationId?: string | null
}

// Provider-neutral katalog platebních bran/terminálů (ČSOB, NFCTRON, Comgate, SumUp, GP webpay, …). Backend je
// jediný zdroj pravdy o tom, co je reálně napojené (`isOperational`) vs zatím jen připravený cíl. NENÍ Stripe-first.
export interface PaymentProviderCatalogItem {
  key: string
  name: string
  category: string
  status: string
  isOperational: boolean
  supportsInPerson: boolean
  supportsOnline: boolean
  supportsWebhooks: boolean
  requiresPartnerContract: boolean
  requiresCredentials: boolean
  setupFields: string[]
  // Podmnožina setupFields, která jsou skutečná tajemství (credential ref) a patří do zabezpečeného trezoru
  // (ne do checklistu `configuredFields`). Backend #225+ ho posílá; starší/mock odpovědi ho nemají → volitelné.
  credentialFields?: string[]
  notes: string
}

export type PaymentConnectionMode = 'sandbox' | 'production'
export type PaymentConnectionStatus = 'draft' | 'awaiting_credentials' | 'ready' | 'disabled'

// Konfigurace napojení konkrétního platebního providera. NIKDY nenese tajné hodnoty — jen metadata a checklist
// (`configuredFields` = které setup pole má obsluha bezpečně připravené). Tajné klíče (credentialy) žijí v
// zabezpečeném trezoru na backendu (viz IntegrationSecretsStatus); tady je jen souhrn required/stored polí.
export interface PaymentProviderConnection {
  id: string
  providerKey: string
  name: string
  mode: PaymentConnectionMode
  status: PaymentConnectionStatus
  locationId: string | null
  configuredFields: string[]
  // Souhrn credential trezoru (backend #225+): která credential pole provider vyžaduje a která už mají uložený klíč.
  requiredCredentialFields?: string[]
  storedCredentialFields?: string[]
  createdAt: string
  updatedAt: string
}

// Stav jednoho credential pole v zabezpečeném trezoru. NIKDY nenese hodnotu — jen jestli je klíč uložený a odkdy.
export interface IntegrationSecretFieldStatus {
  fieldName: string
  required: boolean
  hasSecret: boolean
  updatedAt: string | null
}

// Přehled trezoru credentialů konfigurace. `allRequiredPresent` = má všechny povinné klíče (podmínka pro stav Ready).
export interface IntegrationSecretsStatus {
  connectionId: string
  providerKey: string
  fields: IntegrationSecretFieldStatus[]
  allRequiredPresent: boolean
}

// Zápisový payload — vědomě BEZ tajných hodnot (jen names v `configuredFields`). Backend endpoint zatím neexistuje;
// UI je připravené a v testech se mockuje (GET/POST/PUT/DELETE /integrations/payment-provider-connections).
export interface UpsertPaymentProviderConnectionRequest {
  providerKey: string
  name: string
  mode: PaymentConnectionMode
  status: PaymentConnectionStatus
  locationId?: string | null
  configuredFields?: string[]
}

export interface AccountingVatLine {
  vatRate: number
  net: number
  vat: number
  gross: number
}

export interface AccountingExportRow {
  documentType: string
  documentNumber: string
  date: string
  totalNet: number
  totalVat: number
  total: number
  currency: string
  paymentMethod: string
  vatBreakdown: AccountingVatLine[]
}

export interface AccountingExportResult {
  type: AccountingExportType
  target: AccountingExportTarget
  format: AccountingExportFormat
  from: string
  to: string
  locationId: string | null
  rowCount: number
  totalNet: number
  totalVat: number
  total: number
  rows: AccountingExportRow[]
  contentType: string
  fileName: string
  content: string
}

export interface AccountingExportQuery {
  type: AccountingExportType
  from: string
  to: string
  locationId?: string | null
  target?: AccountingExportTarget
  format?: AccountingExportFormat
}

export interface IntegrationListQuery<TStatus extends string> {
  page?: number
  pageSize?: number
  status?: TStatus | null
}

export function useIntegrations() {
  function listTerminalPayments(
    query: IntegrationListQuery<TerminalPaymentStatus> & { orderId?: string | null } = {},
  ): Promise<PagedResult<TerminalPayment>> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    })
    if (query.status) params.set('status', query.status)
    if (query.orderId) params.set('orderId', query.orderId)
    return http.get<PagedResult<TerminalPayment>>(
      `/integrations/terminal-payments?${params.toString()}`,
    )
  }

  function listPrintJobs(
    query: IntegrationListQuery<PrintJobStatus> & { printer?: string | null } = {},
  ): Promise<PagedResult<PrintJob>> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      pageSize: String(query.pageSize ?? 20),
    })
    if (query.status) params.set('status', query.status)
    if (query.printer?.trim()) params.set('printer', query.printer.trim())
    return http.get<PagedResult<PrintJob>>(`/integrations/print-jobs?${params.toString()}`)
  }

  function buildAccountingExport(query: AccountingExportQuery): Promise<AccountingExportResult> {
    const params = new URLSearchParams({
      type: query.type,
      from: query.from,
      to: query.to,
      target: query.target ?? 'Generic',
      format: query.format ?? 'Csv',
    })
    if (query.locationId) params.set('locationId', query.locationId)
    return http.get<AccountingExportResult>(`/integrations/exports?${params.toString()}`)
  }

  function listPrintAgents(): Promise<PrintAgent[]> {
    return http.get<PrintAgent[]>('/integrations/print-agents')
  }

  function registerPrintAgent(request: RegisterPrintAgentRequest): Promise<PrintAgentRegistered> {
    return http.post<PrintAgentRegistered>('/integrations/print-agents', request)
  }

  function revokePrintAgent(id: string): Promise<void> {
    return http.del(`/integrations/print-agents/${id}`)
  }

  // Provider-neutral katalog platebních providerů (marketplace). Read-only; backend říká, co je reálně napojené.
  function listPaymentProviderCatalog(): Promise<PaymentProviderCatalogItem[]> {
    return http.get<PaymentProviderCatalogItem[]>('/integrations/payment-providers/catalog')
  }

  // Konfigurace napojení platebních providerů. Payload NIKDY neobsahuje tajné hodnoty (jen checklist `configuredFields`).
  // Backend endpoint je zatím budoucí — UI je připravené, testy ho mockují.
  function listPaymentProviderConnections(): Promise<PaymentProviderConnection[]> {
    return http.get<PaymentProviderConnection[]>('/integrations/payment-provider-connections')
  }

  function createPaymentProviderConnection(
    request: UpsertPaymentProviderConnectionRequest,
  ): Promise<PaymentProviderConnection> {
    return http.post<PaymentProviderConnection>(
      '/integrations/payment-provider-connections',
      request,
    )
  }

  function updatePaymentProviderConnection(
    id: string,
    request: UpsertPaymentProviderConnectionRequest,
  ): Promise<PaymentProviderConnection> {
    return http.put<PaymentProviderConnection>(
      `/integrations/payment-provider-connections/${id}`,
      request,
    )
  }

  function deletePaymentProviderConnection(id: string): Promise<void> {
    return http.del(`/integrations/payment-provider-connections/${id}`)
  }

  // --- Zabezpečený trezor credentialů (backend #225) ---
  // Čtení vrací JEN stav polí (hasSecret/updatedAt), nikdy hodnoty. Zápis/rotace posílá raw hodnotu jednorázově;
  // backend ji zašifruje a už nikdy nevrací. Mazání/revoke degraduje konfiguraci (Ready → čeká na údaje řeší UI/backend).
  function listPaymentProviderSecrets(connectionId: string): Promise<IntegrationSecretsStatus> {
    return http.get<IntegrationSecretsStatus>(
      `/integrations/payment-provider-connections/${connectionId}/secrets`,
    )
  }

  function storePaymentProviderSecret(
    connectionId: string,
    field: string,
    value: string,
  ): Promise<IntegrationSecretsStatus> {
    return http.put<IntegrationSecretsStatus>(
      `/integrations/payment-provider-connections/${connectionId}/secrets/${encodeURIComponent(field)}`,
      { value },
    )
  }

  function deletePaymentProviderSecret(connectionId: string, field: string): Promise<void> {
    return http.del(
      `/integrations/payment-provider-connections/${connectionId}/secrets/${encodeURIComponent(field)}`,
    )
  }

  function revokePaymentProviderSecrets(connectionId: string): Promise<void> {
    return http.del(`/integrations/payment-provider-connections/${connectionId}/secrets`)
  }

  function downloadAccountingExport(query: AccountingExportQuery): Promise<DownloadResponse> {
    const params = new URLSearchParams({
      type: query.type,
      from: query.from,
      to: query.to,
      target: query.target ?? 'Generic',
      format: query.format ?? 'Csv',
    })
    if (query.locationId) params.set('locationId', query.locationId)
    return http.download(`/integrations/exports/download?${params.toString()}`)
  }

  return {
    listTerminalPayments,
    listPrintJobs,
    listPrintAgents,
    registerPrintAgent,
    revokePrintAgent,
    listPaymentProviderCatalog,
    listPaymentProviderConnections,
    createPaymentProviderConnection,
    updatePaymentProviderConnection,
    deletePaymentProviderConnection,
    listPaymentProviderSecrets,
    storePaymentProviderSecret,
    deletePaymentProviderSecret,
    revokePaymentProviderSecrets,
    buildAccountingExport,
    downloadAccountingExport,
  }
}
