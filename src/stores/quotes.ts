import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Quote } from '@/lib/types'

// Cenové nabídky. Naplní useQuotes().load().
export const useQuotesStore = defineStore('quotes', () => {
  const quotes = ref<Quote[]>([])
  return { quotes }
})
