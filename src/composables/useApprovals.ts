import { http } from '@/lib/http'
import type { ApprovalRequest, ApprovalSettings, ApprovalStatus } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

export interface ApprovalListQuery {
  page?: number
  pageSize?: number
  status?: ApprovalStatus | null
}

export function useApprovals() {
  function settings(): Promise<ApprovalSettings> {
    return http.get('/approvals/settings')
  }

  function updateSettings(request: ApprovalSettings): Promise<ApprovalSettings> {
    return http.put('/approvals/settings', request)
  }

  function list(query: ApprovalListQuery = {}): Promise<PagedResult<ApprovalRequest>> {
    const params = new URLSearchParams()
    params.set('page', String(query.page ?? 1))
    params.set('pageSize', String(query.pageSize ?? 20))
    if (query.status) params.set('status', query.status)
    return http.get(`/approvals?${params}`)
  }

  function approve(id: string): Promise<ApprovalRequest> {
    return http.post(`/approvals/${id}/approve`)
  }

  function reject(id: string, note: string | null): Promise<ApprovalRequest> {
    return http.post(`/approvals/${id}/reject`, { note })
  }

  return { settings, updateSettings, list, approve, reject }
}
