import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useClientsStore } from '@/stores/clients'
import type { Client } from '@/lib/types'

const api = useApi<Client>('clients')

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>

export function useClients() {
  const store = useClientsStore()
  const { clients } = storeToRefs(store)

  async function load(): Promise<void> {
    try {
      store.clients = await api.list()
    } catch (e) {
      console.warn('Načtení klientů selhalo:', e)
      store.clients = []
    }
  }

  async function create(input: ClientInput): Promise<Client> {
    const now = new Date().toISOString()
    const client: Client = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await api.create(client)
    store.clients.push(client)
    return client
  }

  async function update(id: string, patch: Partial<ClientInput>): Promise<Client> {
    const updated = await api.update(id, { ...patch, updatedAt: new Date().toISOString() })
    const idx = store.clients.findIndex((c) => c.id === id)
    if (idx !== -1) store.clients[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await api.remove(id)
    store.clients = store.clients.filter((c) => c.id !== id)
  }

  function getById(id: string): Client | null {
    return store.clients.find((c) => c.id === id) ?? null
  }

  return { clients, load, create, update, remove, getById }
}
