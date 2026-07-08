import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSalesImport } from './useSalesImport'
import { http } from '@/lib/http'
import type { SalesImportRequest } from '@/lib/sales-import'

vi.mock('@/lib/http', () => ({
  http: { post: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useSalesImport', () => {
  it('volá backend kontrakt POST /sales/import', async () => {
    const request: SalesImportRequest = {
      source: 'dotykacka',
      dryRun: true,
      sales: [],
    }
    vi.mocked(http.post).mockResolvedValue({ dryRun: true, summary: { total: 0 } } as never)

    await useSalesImport().run(request)

    expect(http.post).toHaveBeenCalledWith('/sales/import', request)
  })
})
