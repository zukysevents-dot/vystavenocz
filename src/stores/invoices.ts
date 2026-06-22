import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Invoice } from '@/lib/types'

// Skeleton — CRUD přes mock vrstvu (F0-06), UI ve F6.
export const useInvoicesStore = defineStore('invoices', () => {
  const invoices = ref<Invoice[]>([])

  return { invoices }
})
