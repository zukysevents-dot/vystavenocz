import { ref } from 'vue'
import { http, isApiMode } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'
import type { Shift, ShiftStatus } from '@/lib/types'

/**
 * Plánované směny (Workforce V2). Zdroj pravdy = backend; po akci si stránka znovu načte
 * viditelný týden (vzor `useOrders`). Mock-capable: v mock režimu čte/píše localStorage
 * (`vystaveno:shifts`) ve stejném tvaru jako API, takže plánovač funguje i bez serveru.
 */

const STORAGE_KEY = 'vystaveno:shifts'

export interface ShiftInput {
  employeeId: string
  locationId: string | null
  startsAt: string // ISO UTC
  endsAt: string // ISO UTC
  status?: ShiftStatus
  position?: string | null
  hourlyRateOverride?: number | null
  note?: string | null
}

export interface ShiftQuery {
  from?: string // ISO UTC — dolní mez podle startsAt
  to?: string // ISO UTC — horní mez podle startsAt
  locationId?: string | null
  status?: ShiftStatus
}

export interface PublishInput {
  from: string // ISO UTC
  to: string // ISO UTC
  locationId?: string | null
}

function readLocal(): Shift[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Shift[]) : []
  } catch {
    return []
  }
}
function writeLocal(list: Shift[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function inRange(shift: Shift, query: ShiftQuery): boolean {
  const at = Date.parse(shift.startsAt)
  if (query.from && Number.isFinite(Date.parse(query.from)) && at < Date.parse(query.from))
    return false
  if (query.to && Number.isFinite(Date.parse(query.to)) && at > Date.parse(query.to)) return false
  if (query.locationId != null && shift.locationId !== query.locationId) return false
  if (query.status && shift.status !== query.status) return false
  return true
}

function buildQuery(query: ShiftQuery): string {
  const params = new URLSearchParams({ pageSize: '100' })
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.locationId) params.set('locationId', query.locationId)
  if (query.status) params.set('status', query.status)
  return params.toString()
}

export function useShifts() {
  const shifts = ref<Shift[]>([])

  async function load(query: ShiftQuery = {}): Promise<void> {
    if (isApiMode()) {
      const res = await http.get<PagedResult<Shift>>(`/shifts?${buildQuery(query)}`)
      shifts.value = res.items
    } else {
      shifts.value = readLocal()
        .filter((s) => inRange(s, query))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    }
  }

  async function create(input: ShiftInput): Promise<Shift> {
    if (isApiMode()) return http.post<Shift>('/shifts', input)
    const shift: Shift = {
      id: crypto.randomUUID(),
      employeeId: input.employeeId,
      locationId: input.locationId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status ?? 'Draft',
      position: input.position ?? null,
      hourlyRateOverride: input.hourlyRateOverride ?? null,
      note: input.note ?? null,
    }
    writeLocal([...readLocal(), shift])
    return shift
  }

  async function update(id: string, input: ShiftInput): Promise<Shift> {
    if (isApiMode()) return http.put<Shift>(`/shifts/${id}`, input)
    const list = readLocal()
    const idx = list.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`shift ${id} nenalezen`)
    const updated: Shift = {
      ...list[idx],
      employeeId: input.employeeId,
      locationId: input.locationId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status ?? list[idx].status,
      position: input.position ?? null,
      hourlyRateOverride: input.hourlyRateOverride ?? null,
      note: input.note ?? null,
    }
    list[idx] = updated
    writeLocal(list)
    return updated
  }

  async function remove(id: string): Promise<void> {
    if (isApiMode()) {
      await http.del(`/shifts/${id}`)
      return
    }
    writeLocal(readLocal().filter((s) => s.id !== id))
  }

  /** Publikuje (Draft → Published) směny ve zvoleném rozsahu/pobočce. Vrací počet publikovaných. */
  async function publish(input: PublishInput): Promise<number> {
    if (isApiMode()) {
      const res = await http.post<{ published: number }>('/shifts/publish', input)
      return res.published
    }
    const list = readLocal()
    let published = 0
    for (const s of list) {
      if (s.status !== 'Draft') continue
      if (
        !inRange(s, { from: input.from, to: input.to, locationId: input.locationId ?? undefined })
      )
        continue
      s.status = 'Published'
      published += 1
    }
    writeLocal(list)
    return published
  }

  return { shifts, load, create, update, remove, publish }
}
