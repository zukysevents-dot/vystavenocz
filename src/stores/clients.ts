import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Client } from '@/lib/types'

// Skeleton — CRUD přes mock vrstvu (F0-06), UI ve F5.
export const useClientsStore = defineStore('clients', () => {
  const clients = ref<Client[]>([])
  // True = poslední načtení selhalo (výpadek serveru) → UI ukáže chybu místo prázdna.
  const loadError = ref(false)

  return { clients, loadError }
})
