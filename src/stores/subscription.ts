import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Subscription } from '@/lib/types'

// Skeleton — stav předplatného (UI mock, bez Stripe), F7.
export const useSubscriptionStore = defineStore('subscription', () => {
  const subscription = ref<Subscription | null>(null)

  return { subscription }
})
