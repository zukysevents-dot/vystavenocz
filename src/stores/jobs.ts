import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Job } from '@/lib/types'

// Zakázky / výjezdy. Naplní useJobs().load().
export const useJobsStore = defineStore('jobs', () => {
  const jobs = ref<Job[]>([])
  return { jobs }
})
