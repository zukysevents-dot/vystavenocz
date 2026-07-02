import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Job } from '@/lib/types'

// Zakázky / výjezdy. Naplní useJobs().load().
export const useJobsStore = defineStore('jobs', () => {
  const jobs = ref<Job[]>([])
  // True = poslední načtení selhalo (výpadek serveru) → UI ukáže chybu místo prázdna.
  const loadError = ref(false)
  return { jobs, loadError }
})
