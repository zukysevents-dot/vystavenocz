import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Subscription } from '@/lib/types'

// MVP mock — stav předplatného (bez Stripe). Nový uživatel dostane 14denní trial.
// Reálnou platební logiku doplní F7; rozhraní (isPaid/isTrial/trialDaysLeft) zůstane.
const STORAGE_KEY = 'vystaveno.subscription.v1'
const TRIAL_DAYS = 14

function defaultTrial(): Subscription {
  const ends = new Date()
  ends.setDate(ends.getDate() + TRIAL_DAYS)
  return { active: true, plan: 'trial', trialEndsAt: ends.toISOString(), subscriptionUntil: null }
}

export const useSubscriptionStore = defineStore('subscription', () => {
  const subscription = ref<Subscription | null>(null)
  const initialized = ref(false)

  function persist(): void {
    if (subscription.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription.value))
    else localStorage.removeItem(STORAGE_KEY)
  }

  function init(): void {
    if (initialized.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        subscription.value = JSON.parse(raw) as Subscription
      } else {
        subscription.value = defaultTrial()
        persist()
      }
    } catch {
      subscription.value = defaultTrial()
    }
    initialized.value = true
  }

  const trialDaysLeft = computed<number | null>(() => {
    const end = subscription.value?.trialEndsAt
    if (!end) return null
    const ms = new Date(end).getTime() - Date.now()
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  })

  const isPaid = computed(() => subscription.value?.plan === 'pro' && subscription.value.active)
  const isTrial = computed(
    () => subscription.value?.plan === 'trial' && (trialDaysLeft.value ?? 0) > 0,
  )

  function activatePro(): void {
    subscription.value = { active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }
    persist()
  }

  return { subscription, initialized, isPaid, isTrial, trialDaysLeft, init, activatePro }
})
