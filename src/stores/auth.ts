import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User } from '@/lib/types'

// Skeleton — mock auth logika přijde ve F3 (F0-32..36).
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => user.value !== null)

  return { user, isAuthenticated }
})
