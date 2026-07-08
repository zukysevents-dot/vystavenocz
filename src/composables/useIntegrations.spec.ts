import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useIntegrations } from '@/composables/useIntegrations'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn() },
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
})
