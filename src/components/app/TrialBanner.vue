<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { AlertTriangle, Sparkles } from 'lucide-vue-next'
import { useSubscriptionStore } from '@/stores/subscription'

const { isPaid, isTrial, trialDaysLeft } = storeToRefs(useSubscriptionStore())
</script>

<template>
  <!-- Expirovaný trial / bez aktivního trialu — blokující banner. -->
  <div
    v-if="!isPaid && !isTrial"
    class="flex items-center justify-between gap-3 border-b border-coral/30 bg-coral/10 px-4 py-2 text-sm"
  >
    <div class="flex items-center gap-2 text-coral">
      <AlertTriangle class="h-4 w-4" />
      <span class="font-medium">
        Zkušební doba skončila — pro vystavování faktur aktivujte předplatné.
      </span>
    </div>
    <RouterLink
      to="/app/predplatne"
      class="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-coral-foreground hover:opacity-90"
    >
      Aktivovat
    </RouterLink>
  </div>

  <!-- Aktivní trial — jen pokud zbývá ≤ 7 dní. -->
  <div
    v-else-if="!isPaid && isTrial && trialDaysLeft !== null && trialDaysLeft <= 7"
    class="flex items-center justify-between gap-3 border-b border-mint/30 bg-mint/10 px-4 py-2 text-sm"
  >
    <div class="flex items-center gap-2 text-foreground">
      <Sparkles class="h-4 w-4 text-mint-foreground" />
      <span>
        Zkušební doba: zbývá <strong>{{ trialDaysLeft }}</strong>
        {{ trialDaysLeft === 1 ? 'den' : trialDaysLeft < 5 ? 'dny' : 'dní' }}
      </span>
    </div>
    <RouterLink to="/app/predplatne" class="text-xs font-semibold text-primary hover:underline">
      Aktivovat za 100 Kč/měs →
    </RouterLink>
  </div>
</template>
