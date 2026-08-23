import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'

/**
 * Stav předplatného pro stránky a paywall. Hodnoty pocházejí ze serveru (viz `stores/subscription`).
 *
 * `hasAccess` = plný provozní přístup (zkušební doba, ochranná lhůta nebo zaplacený tarif).
 * `canInvoice` = smí se vystavit faktura. To NENÍ totéž: fakturace a klienti jsou podle ceníku
 * zdarma navždy, takže po skončení předplatného zůstávají otevřené a server je pustí — zavírá je
 * až ruční pozastavení přístupu. Kdyby se fakturace gate-ovala přes `hasAccess`, aplikace by
 * chtěla peníze přesně za to, co ceník dává zdarma.
 *
 * `activatePro()` tady vědomě NENÍ — tarif nelze aktivovat z prohlížeče.
 */
export function useSubscription() {
  const store = useSubscriptionStore()

  const { subscription, plan, isPaid, isTrial, isGracePeriod, trialDaysLeft } = storeToRefs(store)
  const auth = useAuthStore()
  const hasAccess = computed(() => isPaid.value || isTrial.value || isGracePeriod.value)
  // Zrcadlí serverové pravidlo: zápis do modulů zdarma navždy zavře až `locked` (pozastavení).
  const canInvoice = computed(() => auth.entitlement.accessMode !== 'locked')

  return {
    subscription,
    plan,
    isPaid,
    isTrial,
    isGracePeriod,
    trialDaysLeft,
    hasAccess,
    canInvoice,
  }
}
