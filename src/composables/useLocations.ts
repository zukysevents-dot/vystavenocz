import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useLocationsStore } from '@/stores/locations'
import type { Location } from '@/lib/types'

const api = useApi<Location>('locations')

export type LocationInput = Omit<Location, 'id' | 'createdAt' | 'updatedAt'>

export function useLocations() {
  const store = useLocationsStore()
  const { locations } = storeToRefs(store)

  async function load(): Promise<void> {
    try {
      store.locations = await api.list()
    } catch (e) {
      console.warn('Načtení poboček selhalo:', e)
      store.locations = []
    }
  }

  async function loadAll(): Promise<void> {
    try {
      store.locations = await api.listAll()
    } catch (e) {
      console.warn('Načtení poboček selhalo:', e)
      store.locations = []
    }
  }

  async function create(input: LocationInput): Promise<Location> {
    const now = new Date().toISOString()
    const created = await api.create({
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as Location)
    store.locations.push(created)
    return created
  }

  async function update(id: string, input: LocationInput): Promise<Location> {
    const updated = await api.update(id, { ...input, updatedAt: new Date().toISOString() })
    const idx = store.locations.findIndex((l) => l.id === id)
    if (idx !== -1) store.locations[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await api.remove(id)
    store.locations = store.locations.filter((l) => l.id !== id)
  }

  return { locations, load, loadAll, create, update, remove }
}
