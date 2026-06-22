import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'

/**
 * Přístup k tarifu a právům (mock). Náhrada starého `use-subscription` hooku.
 * `hasAccess` = běžící trial nebo zaplacený plán — podmínka pro prémiové akce.
 */
export function useSubscription() {
  const store = useSubscriptionStore()
  store.init()

  const { subscription, isPaid, isTrial, trialDaysLeft } = storeToRefs(store)
  const hasAccess = computed(() => isPaid.value || isTrial.value)

  return {
    subscription,
    isPaid,
    isTrial,
    trialDaysLeft,
    hasAccess,
    activatePro: store.activatePro,
  }
}
