import { http, getTokens } from '@/lib/http'
import type { AttendanceRecord, AttendanceSummary, Employee } from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

const API = import.meta.env.VITE_API_URL as string | undefined

export type EmployeeInput = { fullName: string; userId?: string | null; isActive?: boolean }

// Docházka — zaměstnanci, píchačka, přehled. Jen API mód.
export function useAttendance() {
  async function employees(): Promise<Employee[]> {
    return (await http.get<PagedResult<Employee>>('/employees?pageSize=100')).items
  }
  function createEmployee(input: EmployeeInput): Promise<Employee> {
    return http.post<Employee>('/employees', input)
  }
  function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
    return http.put<Employee>(`/employees/${id}`, input)
  }
  function removeEmployee(id: string): Promise<void> {
    return http.del(`/employees/${id}`)
  }

  async function current(): Promise<AttendanceRecord | null> {
    return (await http.get<AttendanceRecord | null>('/attendance/current')) ?? null
  }
  function clockIn(): Promise<AttendanceRecord> {
    return http.post<AttendanceRecord>('/attendance/clock-in', {})
  }
  function clockOut(): Promise<AttendanceRecord> {
    return http.post<AttendanceRecord>('/attendance/clock-out')
  }
  function startBreak(): Promise<AttendanceRecord> {
    return http.post<AttendanceRecord>('/attendance/break/start')
  }
  function endBreak(): Promise<AttendanceRecord> {
    return http.post<AttendanceRecord>('/attendance/break/end')
  }

  function summary(year: number, month: number): Promise<AttendanceSummary> {
    return http.get<AttendanceSummary>(`/attendance/summary?year=${year}&month=${month}`)
  }

  // CSV export — stáhne soubor (mimo http wrapper kvůli blobu).
  async function exportCsv(year: number, month: number): Promise<void> {
    const res = await fetch(`${API}/attendance/export?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${getTokens()?.accessToken ?? ''}` },
    })
    if (!res.ok) throw new Error('export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dochazka-${year}-${String(month).padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    employees,
    createEmployee,
    updateEmployee,
    removeEmployee,
    current,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    summary,
    exportCsv,
  }
}
