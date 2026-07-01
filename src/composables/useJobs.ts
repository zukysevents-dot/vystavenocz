import { storeToRefs } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useJobsStore } from '@/stores/jobs'
import type { Job } from '@/lib/types'

const api = useApi<Job>('jobs')

export type JobInput = Omit<Job, 'id' | 'createdAt' | 'updatedAt'>

export function useJobs() {
  const store = useJobsStore()
  const { jobs } = storeToRefs(store)

  async function load(): Promise<void> {
    try {
      store.jobs = await api.list()
    } catch (e) {
      // Endpoint nedostupný / modul vypnutý → prázdný seznam místo pádu appky.
      console.warn('Načtení zakázek selhalo:', e)
      store.jobs = []
    }
  }

  async function create(input: JobInput): Promise<Job> {
    const now = new Date().toISOString()
    const created = await api.create({
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as Job)
    store.jobs.push(created)
    return created
  }

  async function update(id: string, input: JobInput): Promise<Job> {
    const updated = await api.update(id, { ...input, updatedAt: new Date().toISOString() })
    const idx = store.jobs.findIndex((j) => j.id === id)
    if (idx !== -1) store.jobs[idx] = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    await api.remove(id)
    store.jobs = store.jobs.filter((j) => j.id !== id)
  }

  return { jobs, load, create, update, remove }
}
