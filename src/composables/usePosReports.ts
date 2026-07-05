import { http } from '@/lib/http'
import type { PosDateRange, PosRevenue, PosSalesSummary } from '@/lib/posReports'

// Provozní přehled (manažerská analytika prodejů). Jen API režim — čte agregace z backendu
// (/pos-reports/*). Oprávnění pos.reports řeší backend (Owner/Admin/Manager); FE routu gatuje modul reporting.
export function usePosReports() {
  function summary(range: PosDateRange, locationId?: string): Promise<PosSalesSummary> {
    const loc = locationId ? `&locationId=${locationId}` : ''
    return http.get<PosSalesSummary>(`/pos-reports/summary?from=${range.from}&to=${range.to}${loc}`)
  }
  function revenue(
    range: PosDateRange,
    granularity: 'Day' | 'Week' | 'Month' = 'Day',
    locationId?: string,
  ): Promise<PosRevenue> {
    const loc = locationId ? `&locationId=${locationId}` : ''
    return http.get<PosRevenue>(
      `/pos-reports/revenue?from=${range.from}&to=${range.to}&granularity=${granularity}${loc}`,
    )
  }
  return { summary, revenue }
}
