import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useIntegrations } from '@/composables/useIntegrations'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), download: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useIntegrations - backend foundation contract', () => {
  it('listTerminalPayments volá stránkovaný endpoint terminálových plateb', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0 } as never)
    await useIntegrations().listTerminalPayments({ pageSize: 5, status: 'Pending' })
    expect(http.get).toHaveBeenCalledWith(
      '/integrations/terminal-payments?page=1&pageSize=5&status=Pending',
    )
  })

  it('listPrintJobs volá frontu tiskových jobů s filtrem stavu a tiskárny', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0 } as never)
    await useIntegrations().listPrintJobs({ pageSize: 10, status: 'Queued', printer: ' kitchen ' })
    expect(http.get).toHaveBeenCalledWith(
      '/integrations/print-jobs?page=1&pageSize=10&status=Queued&printer=kitchen',
    )
  })

  it('buildAccountingExport skládá query pro Generic CSV export', async () => {
    vi.mocked(http.get).mockResolvedValue({ content: '' } as never)
    await useIntegrations().buildAccountingExport({
      type: 'ZReports',
      from: '2026-07-01',
      to: '2026-07-31',
      locationId: 'loc-1',
    })
    expect(http.get).toHaveBeenCalledWith(
      '/integrations/exports?type=ZReports&from=2026-07-01&to=2026-07-31&target=Generic&format=Csv&locationId=loc-1',
    )
  })

  it('downloadAccountingExport skládá query pro Pohoda XML export', async () => {
    vi.mocked(http.download).mockResolvedValue({
      blob: new Blob(['<dataPack />']),
      fileName: 'pohoda.xml',
      contentType: 'application/xml',
    } as never)
    await useIntegrations().downloadAccountingExport({
      type: 'Sales',
      from: '2026-07-01',
      to: '2026-07-31',
      target: 'Pohoda',
      format: 'Xml',
    })
    expect(http.download).toHaveBeenCalledWith(
      '/integrations/exports/download?type=Sales&from=2026-07-01&to=2026-07-31&target=Pohoda&format=Xml',
    )
  })

  it('listPrintAgents volá správu tiskových agentů', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useIntegrations().listPrintAgents()
    expect(http.get).toHaveBeenCalledWith('/integrations/print-agents')
  })

  it('registerPrintAgent posílá název a provozovnu', async () => {
    vi.mocked(http.post).mockResolvedValue({ token: 'secret' } as never)
    await useIntegrations().registerPrintAgent({ name: 'Kuchyně', locationId: 'loc-1' })
    expect(http.post).toHaveBeenCalledWith('/integrations/print-agents', {
      name: 'Kuchyně',
      locationId: 'loc-1',
    })
  })

  it('revokePrintAgent ruší agenta podle id', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useIntegrations().revokePrintAgent('agent-1')
    expect(http.del).toHaveBeenCalledWith('/integrations/print-agents/agent-1')
  })

  it('listPaymentProviderCatalog volá provider-neutral katalog platebních providerů', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useIntegrations().listPaymentProviderCatalog()
    expect(http.get).toHaveBeenCalledWith('/integrations/payment-providers/catalog')
  })

  it('listPaymentProviderConnections volá seznam konfigurací providerů', async () => {
    vi.mocked(http.get).mockResolvedValue([] as never)
    await useIntegrations().listPaymentProviderConnections()
    expect(http.get).toHaveBeenCalledWith('/integrations/payment-provider-connections')
  })

  it('createPaymentProviderConnection posílá metadata bez tajných hodnot', async () => {
    vi.mocked(http.post).mockResolvedValue({ id: 'conn-1' } as never)
    await useIntegrations().createPaymentProviderConnection({
      providerKey: 'csob',
      name: 'ČSOB terminál Praha',
      mode: 'sandbox',
      status: 'awaiting_credentials',
      locationId: 'loc-1',
      configuredFields: ['merchantId'],
    })
    expect(http.post).toHaveBeenCalledWith('/integrations/payment-provider-connections', {
      providerKey: 'csob',
      name: 'ČSOB terminál Praha',
      mode: 'sandbox',
      status: 'awaiting_credentials',
      locationId: 'loc-1',
      configuredFields: ['merchantId'],
    })
  })

  it('updatePaymentProviderConnection volá PUT s id konfigurace', async () => {
    vi.mocked(http.put).mockResolvedValue({ id: 'conn-1' } as never)
    await useIntegrations().updatePaymentProviderConnection('conn-1', {
      providerKey: 'csob',
      name: 'ČSOB',
      mode: 'production',
      status: 'ready',
    })
    expect(http.put).toHaveBeenCalledWith('/integrations/payment-provider-connections/conn-1', {
      providerKey: 'csob',
      name: 'ČSOB',
      mode: 'production',
      status: 'ready',
    })
  })

  it('deletePaymentProviderConnection ruší konfiguraci podle id', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useIntegrations().deletePaymentProviderConnection('conn-1')
    expect(http.del).toHaveBeenCalledWith('/integrations/payment-provider-connections/conn-1')
  })

  it('listPaymentProviderSecrets čte stav trezoru (bez hodnot) konfigurace', async () => {
    vi.mocked(http.get).mockResolvedValue({ fields: [] } as never)
    await useIntegrations().listPaymentProviderSecrets('conn-1')
    expect(http.get).toHaveBeenCalledWith(
      '/integrations/payment-provider-connections/conn-1/secrets',
    )
  })

  it('storePaymentProviderSecret posílá raw hodnotu v body { value } na PUT pole', async () => {
    vi.mocked(http.put).mockResolvedValue({ fields: [] } as never)
    await useIntegrations().storePaymentProviderSecret('conn-1', 'apiKeyRef', 'sk_live_secret')
    expect(http.put).toHaveBeenCalledWith(
      '/integrations/payment-provider-connections/conn-1/secrets/apiKeyRef',
      { value: 'sk_live_secret' },
    )
  })

  it('deletePaymentProviderSecret maže jedno credential pole (url-encode názvu)', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useIntegrations().deletePaymentProviderSecret('conn-1', 'apiKeyRef')
    expect(http.del).toHaveBeenCalledWith(
      '/integrations/payment-provider-connections/conn-1/secrets/apiKeyRef',
    )
  })

  it('revokePaymentProviderSecrets revokuje všechny klíče konfigurace', async () => {
    vi.mocked(http.del).mockResolvedValue(undefined as never)
    await useIntegrations().revokePaymentProviderSecrets('conn-1')
    expect(http.del).toHaveBeenCalledWith(
      '/integrations/payment-provider-connections/conn-1/secrets',
    )
  })
})
