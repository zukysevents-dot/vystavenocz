import { ref } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'

// UI stav — téma (toggle logika ve F0-09) a sidebar (F4).
export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>('dark')
  const sidebarOpen = ref(true)

  return { theme, sidebarOpen }
})
