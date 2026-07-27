<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { AlertTriangle, Clock, Sparkles } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useSubscription } from '@/composables/useSubscription'
import { daysUntil } from '@/lib/entitlements'

// Stavový pruh nad aplikací. Všechny stavy jdou ze serveru (entitlement snapshot), nikdy z prohlížeče.
const auth = useAuthStore()
const { plan, isTrial, isGracePeriod, trialDaysLeft } = useSubscription()

const isReadOnly = computed(() => auth.entitlement.accessMode === 'read_only')
const isLocked = computed(() => auth.entitlement.accessMode === 'locked')
const graceDaysLeft = computed(() => daysUntil(plan.value.graceEndsAt))

function dayWord(n: number): string {
  return n === 1 ? 'den' : n < 5 ? 'dny' : 'dní'
}
</script>

<template>
  <!-- Přístup pozastavený — upsell by tady byl nemístný, patří sem podpora. -->
  <div
    v-if="isLocked"
    class="flex items-center gap-2 border-b border-coral/30 bg-coral/10 px-4 py-2 text-sm text-coral"
  >
    <AlertTriangle class="h-4 w-4 shrink-0" />
    <span class="font-medium">Přístup je pozastavený. Napište nám prosím na podporu.</span>
  </div>

  <!-- Předplatné skončilo: data zůstávají ke čtení i k exportu, zápisy ne. -->
  <div
    v-else-if="isReadOnly"
    class="flex items-center justify-between gap-3 border-b border-coral/30 bg-coral/10 px-4 py-2 text-sm"
  >
    <div class="flex items-center gap-2 text-coral">
      <AlertTriangle class="h-4 w-4 shrink-0" />
      <span class="font-medium">
        Předplatné skončilo — data máte pořád k nahlédnutí i k exportu, nové zápisy ale nejdou.
      </span>
    </div>
    <RouterLink
      to="/app/predplatne"
      class="shrink-0 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-coral-foreground hover:opacity-90"
    >
      Obnovit
    </RouterLink>
  </div>

  <!-- Ochranná lhůta — všechno ještě funguje, ale je potřeba jednat. -->
  <div
    v-else-if="isGracePeriod"
    class="flex items-center justify-between gap-3 border-b border-coral/30 bg-coral/10 px-4 py-2 text-sm"
  >
    <div class="flex items-center gap-2 text-foreground">
      <Clock class="h-4 w-4 shrink-0 text-coral" />
      <span>
        Tarif {{ plan.name }} je potřeba obnovit<span v-if="graceDaysLeft !== null">
          — zbývá <strong>{{ graceDaysLeft }}</strong> {{ dayWord(graceDaysLeft) }}</span
        >
      </span>
    </div>
    <RouterLink
      to="/app/predplatne"
      class="shrink-0 text-xs font-semibold text-primary hover:underline"
    >
      Obnovit →
    </RouterLink>
  </div>

  <!-- Zkušební doba — jen když se blíží konec. -->
  <div
    v-else-if="isTrial && trialDaysLeft !== null && trialDaysLeft <= 7"
    class="flex items-center justify-between gap-3 border-b border-mint/30 bg-mint/10 px-4 py-2 text-sm"
  >
    <div class="flex items-center gap-2 text-foreground">
      <Sparkles class="h-4 w-4 shrink-0 text-mint-foreground" />
      <span>
        Zkušební doba: zbývá <strong>{{ trialDaysLeft }}</strong> {{ dayWord(trialDaysLeft) }}
      </span>
    </div>
    <RouterLink
      to="/app/predplatne"
      class="shrink-0 text-xs font-semibold text-primary hover:underline"
    >
      Zobrazit možnosti →
    </RouterLink>
  </div>
</template>
