import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Quote } from '@/lib/types'

// Cenové nabídky. Naplní useQuotes().load().
export const useQuotesStore = defineStore('quotes', () => {
  const quotes = ref<Quote[]>([])
  // True = poslední načtení selhalo (výpadek serveru) → UI ukáže chybu místo prázdna.
  const loadError = ref(false)
  return { quotes, loadError }
})
