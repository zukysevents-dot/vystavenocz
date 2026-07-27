import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { daysUntil } from '@/lib/entitlements'
import type { Subscription } from '@/lib/types'

/**
 * Stav předplatného DERIVOVANÝ ze serveru (`/me` → `entitlement`).
 *
 * Dřív to byl localStorage mock, který si sám udělil 14denní trial a měl `activatePro()` —
 * z prohlížeče se tak dal „zaplatit" tarif. Rozhraní (`isPaid`/`isTrial`/`trialDaysLeft`) zůstává
 * stejné, aby banner, paywall i stránka předplatného fungovaly bez úprav, ale hodnoty teď pocházejí
 * VÝHRADNĚ ze serveru a nedají se lokálně zfalšovat.
 */
export const useSubscriptionStore = defineStore('subscription', () => {
  const auth = useAuthStore()

  const plan = computed(() => auth.entitlement.plan)

  const subscription = computed<Subscription | null>(() => ({
    active: auth.entitlement.accessMode === 'full',
    plan: plan.value.status === 'trial' ? 'trial' : 'pro',
    trialEndsAt: plan.value.status === 'trial' ? plan.value.renewsAt : null,
    subscriptionUntil: plan.value.status === 'trial' ? null : plan.value.renewsAt,
  }))

  /** Zbývající dny zkušební doby podle serveru; null = firma není ve zkušební době. */
  const trialDaysLeft = computed<number | null>(() =>
    plan.value.status === 'trial' ? daysUntil(plan.value.renewsAt) : null,
  )

  const isTrial = computed(() => plan.value.status === 'trial')
  /** Zaplacený (nebo dlouhodobě přiznaný) tarif — ne zkušební doba a s plným přístupem. */
  const isPaid = computed(() => !isTrial.value && auth.entitlement.accessMode === 'full')
  /** Doba, kdy přístup ještě běží, ale je potřeba jednat (po konci zkušební doby nebo období). */
  const isGracePeriod = computed(() => plan.value.status === 'grace_period')

  // Kompatibilní no-op — dřív se tady inicializoval localStorage. Stav teď přichází s identitou.
  function init(): void {}

  return { subscription, plan, isPaid, isTrial, isGracePeriod, trialDaysLeft, init }
})
