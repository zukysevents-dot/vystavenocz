import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Location } from '@/lib/types'

// Pobočky. Naplní useLocations().load().
export const useLocationsStore = defineStore('locations', () => {
  const locations = ref<Location[]>([])
  return { locations }
})
