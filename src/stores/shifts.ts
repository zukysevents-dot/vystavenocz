import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Shift } from '@/lib/types'

// Směny. Naplní useShifts().load().
export const useShiftsStore = defineStore('shifts', () => {
  const shifts = ref<Shift[]>([])
  return { shifts }
})
