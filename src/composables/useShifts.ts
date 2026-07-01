import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useShiftsStore } from '@/stores/shifts'
import type { Shift } from '@/lib/types'

const api = useApi<Shift>('shifts')

export type ShiftInput = Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>

export function useShifts() {
  const store = useShiftsStore()
  const { shifts } = storeToRefs(store)

  async function load(): Promise<void> {
    try {
      store.shifts = await api.list()
    } catch (e) {
      console.warn('Načtení směn selhalo:', e)
      store.shifts = []
    }
  }

  async function create(input: ShiftInput): Promise<Shift> {
    const now = new Date().toISOString()
    const created = await api.create({
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as Shift)
    store.shifts.push(created)
    return created
  }

  async function update(id: string, input: ShiftInput): Promise<Shift> {
    const updated = await api.update(id, { ...input, updatedAt: new Date().toISOString() })
    const idx = store.shifts.findIndex((s) => s.id === id)
    if (idx !== -1) store.shifts[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await api.remove(id)
    store.shifts = store.shifts.filter((s) => s.id !== id)
  }

  return { shifts, load, create, update, remove }
}
