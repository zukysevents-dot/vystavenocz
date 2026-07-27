import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'

/**
 * Stav předplatného pro stránky a paywall. Hodnoty pocházejí ze serveru (viz `stores/subscription`).
 * `hasAccess` = plný provozní přístup (zkušební doba, ochranná lhůta nebo zaplacený tarif).
 *
 * `activatePro()` tady vědomě NENÍ — tarif nelze aktivovat z prohlížeče.
 */
export function useSubscription() {
  const store = useSubscriptionStore()

  const { subscription, plan, isPaid, isTrial, isGracePeriod, trialDaysLeft } = storeToRefs(store)
  const hasAccess = computed(() => isPaid.value || isTrial.value || isGracePeriod.value)

  return {
    subscription,
    plan,
    isPaid,
    isTrial,
    isGracePeriod,
    trialDaysLeft,
    hasAccess,
  }
}
