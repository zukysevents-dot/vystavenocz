import { http } from '@/lib/http'
import type {
  PosCostSummary,
  PosDateRange,
  PosLossSummary,
  PosRevenue,
  PosSalesSummary,
  PosStaffPerformance,
} from '@/lib/posReports'

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
  function costs(range: PosDateRange, locationId?: string): Promise<PosCostSummary> {
    const loc = locationId ? `&locationId=${locationId}` : ''
    return http.get<PosCostSummary>(`/pos-reports/costs?from=${range.from}&to=${range.to}${loc}`)
  }
  function staff(range: PosDateRange, locationId?: string): Promise<PosStaffPerformance> {
    const loc = locationId ? `&locationId=${locationId}` : ''
    return http.get<PosStaffPerformance>(
      `/pos-reports/staff?from=${range.from}&to=${range.to}${loc}`,
    )
  }
  function losses(range: PosDateRange, locationId?: string): Promise<PosLossSummary> {
    const loc = locationId ? `&locationId=${locationId}` : ''
    return http.get<PosLossSummary>(`/pos-reports/losses?from=${range.from}&to=${range.to}${loc}`)
  }
  return { summary, revenue, costs, staff, losses }
}
