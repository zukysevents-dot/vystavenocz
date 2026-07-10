import { http, isApiMode } from '@/lib/http'
import type { PagedResult } from '@/composables/useApi'
import type { ShiftTemplate } from '@/lib/types'

/**
 * Šablony směn (Workforce V2) — opakovatelné vzory (pobočka + den v týdnu + čas) pro rychlé
 * plánování. Mock-capable jako `useShifts`: v mock režimu localStorage (`vystaveno:shift-templates`),
 * v API režimu `/shift-templates`. Aplikace šablony (vytvoření směny z ní) je logika plánovače.
 */

const STORAGE_KEY = 'vystaveno:shift-templates'

export interface ShiftTemplateInput {
  name: string
  locationId: string | null
  weekday: number // 0=Po … 6=Ne
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  position: string | null
}

function readLocal(): ShiftTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ShiftTemplate[]) : []
  } catch {
    return []
  }
}
function writeLocal(list: ShiftTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function useShiftTemplates() {
  async function list(): Promise<ShiftTemplate[]> {
    if (isApiMode()) {
      const res = await http.get<PagedResult<ShiftTemplate>>('/shift-templates?pageSize=100')
      return res.items
    }
    return readLocal().sort(
      (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
    )
  }

  async function create(input: ShiftTemplateInput): Promise<ShiftTemplate> {
    if (isApiMode()) return http.post<ShiftTemplate>('/shift-templates', input)
    const template: ShiftTemplate = { id: crypto.randomUUID(), ...input }
    writeLocal([...readLocal(), template])
    return template
  }

  async function update(id: string, input: ShiftTemplateInput): Promise<ShiftTemplate> {
    if (isApiMode()) return http.put<ShiftTemplate>(`/shift-templates/${id}`, input)
    const listData = readLocal()
    const idx = listData.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error(`shift-template ${id} nenalezen`)
    const updated: ShiftTemplate = { ...listData[idx], ...input }
    listData[idx] = updated
    writeLocal(listData)
    return updated
  }

  async function remove(id: string): Promise<void> {
    if (isApiMode()) {
      await http.del(`/shift-templates/${id}`)
      return
    }
    writeLocal(readLocal().filter((t) => t.id !== id))
  }

  return { list, create, update, remove }
}
