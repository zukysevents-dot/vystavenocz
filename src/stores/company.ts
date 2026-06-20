import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Company } from '@/lib/types'

// Skeleton — profil firmy; naplní onboarding/nastavení (F4/F7).
export const useCompanyStore = defineStore('company', () => {
  const company = ref<Company | null>(null)

  return { company }
})
