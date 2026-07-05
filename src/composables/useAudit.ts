import { http } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'
import type { AuditEntry } from '@/lib/audit'

export interface AuditListParams {
  page?: number
  pageSize?: number
  sort?: 'createdAt' | '-createdAt'
}

export function useAudit() {
  function list(params: AuditListParams = {}): Promise<PagedResult<AuditEntry>> {
    const qs = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      sort: params.sort ?? '-createdAt',
    })
    return http.get<PagedResult<AuditEntry>>(`/company/audit?${qs.toString()}`)
  }

  return { list }
}
