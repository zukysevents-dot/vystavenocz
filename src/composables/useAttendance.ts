import { http, getTokens } from '@/lib/http'
import type {
  AttendanceException,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  Employee,
} from '@/lib/types'
import type { PagedResult } from '@/composables/useApi'

const API = import.meta.env.VITE_API_URL as string | undefined

export type EmployeeInput = {
  fullName: string
  userId?: string | null
  isActive?: boolean
  position?: string | null
  hourlyRate?: number | null
}

export interface RecordsQuery {
  page?: number
  pageSize?: number
  from?: string // ISO UTC (podle clockInAt)
  to?: string
  employeeId?: string
  status?: AttendanceStatus
  sort?: string // "start" | "-start"
}

export interface CorrectRecordInput {
  clockInAt: string // ISO UTC
  clockOutAt: string | null // null = nechat otevřenou
}

export interface ExceptionsQuery {
  from: string // ISO UTC
  to: string
  locationId?: string | null
}

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

  // Záznamy docházky (manažerský přehled + korekce). Self-scope: bez attendance.manage jen svoje.
  function records(query: RecordsQuery = {}): Promise<PagedResult<AttendanceRecord>> {
    const p = new URLSearchParams()
    if (query.page) p.set('page', String(query.page))
    if (query.pageSize) p.set('pageSize', String(query.pageSize))
    if (query.from) p.set('from', query.from)
    if (query.to) p.set('to', query.to)
    if (query.employeeId) p.set('employeeId', query.employeeId)
    if (query.status) p.set('status', query.status)
    if (query.sort) p.set('sort', query.sort)
    const qs = p.toString()
    return http.get<PagedResult<AttendanceRecord>>(`/attendance/records${qs ? `?${qs}` : ''}`)
  }

  // Manažerská oprava časů (audit AttendanceCorrected na backendu). Vyžaduje attendance.manage.
  function correctRecord(id: string, input: CorrectRecordInput): Promise<AttendanceRecord> {
    return http.put<AttendanceRecord>(`/attendance/records/${id}`, input)
  }

  // Docházkové výjimky za období (chybějící odchod / přesčas / plán vs. realita). Manager-scoped.
  function exceptions(query: ExceptionsQuery): Promise<AttendanceException[]> {
    const p = new URLSearchParams({ from: query.from, to: query.to })
    if (query.locationId) p.set('locationId', query.locationId)
    return http.get<AttendanceException[]>(`/attendance/exceptions?${p.toString()}`)
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
    records,
    correctRecord,
    exceptions,
  }
}
