import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Client } from '@/lib/types'

// Skeleton — CRUD přes mock vrstvu (F0-06), UI ve F5.
export const useClientsStore = defineStore('clients', () => {
  const clients = ref<Client[]>([])

  return { clients }
})
