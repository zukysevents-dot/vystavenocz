import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAudit } from '@/composables/useAudit'
import { http } from '@/lib/http'

vi.mock('@/lib/http', () => ({
  http: { get: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAudit', () => {
  it('lists company audit with default paging and newest-first sort', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as never)

    await useAudit().list()

    expect(http.get).toHaveBeenCalledWith('/company/audit?page=1&pageSize=20&sort=-createdAt')
  })

  it('passes explicit page and sort params', async () => {
    vi.mocked(http.get).mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 10 } as never)

    await useAudit().list({ page: 2, pageSize: 10, sort: 'createdAt' })

    expect(http.get).toHaveBeenCalledWith('/company/audit?page=2&pageSize=10&sort=createdAt')
  })
})
