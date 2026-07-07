import { http } from '@/lib/http'
import type { SalesImportRequest, SalesImportResponse } from '@/lib/sales-import'

export function useSalesImport() {
  function run(request: SalesImportRequest): Promise<SalesImportResponse> {
    return http.post<SalesImportResponse>('/sales/import', request)
  }

  return { run }
}
