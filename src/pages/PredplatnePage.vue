<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { BadgeCheck, Check, Clock, Sparkles } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useSubscriptionStore } from '@/stores/subscription'
import { PRO_FEATURES as features, PRO_PRICING } from '@/lib/pricing'

const subStore = useSubscriptionStore()
const { isPaid, isTrial, trialDaysLeft } = storeToRefs(subStore)

const yearly = ref(true)

onMounted(() => subStore.init())

function dayWord(n: number): string {
  return n === 1 ? 'den' : n < 5 ? 'dny' : 'dní'
}
</script>

<template>
  <div class="mx-auto max-w-2xl p-4 sm:p-6 md:p-8">
    <h1 class="text-3xl font-bold tracking-tight">Předplatné</h1>
    <p class="mt-1 text-muted-foreground">Spravujte svůj tarif Vystaveno.</p>

    <!-- Aktuální plán -->
    <div
      v-if="isPaid"
      class="mt-6 flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4"
    >
      <BadgeCheck class="h-5 w-5 shrink-0 text-success" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">Aktivní tarif: Vystaveno Pro</p>
        <p class="text-muted-foreground">Máte přístup ke všem funkcím bez omezení.</p>
      </div>
    </div>
    <div
      v-else-if="isTrial"
      class="mt-6 flex items-center gap-3 rounded-xl border border-mint/30 bg-mint/10 p-4"
    >
      <Clock class="h-5 w-5 shrink-0 text-mint-foreground" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">
          Zkušební verze — zbývá {{ trialDaysLeft }} {{ dayWord(trialDaysLeft ?? 0) }}
        </p>
        <p class="text-muted-foreground">
          Před koncem si prohlédněte možnosti navazujícího tarifu.
        </p>
      </div>
    </div>
    <div
      v-else
      class="mt-6 flex items-center gap-3 rounded-xl border border-coral/30 bg-coral/10 p-4"
    >
      <Clock class="h-5 w-5 shrink-0 text-coral" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">Zkušební doba skončila</p>
        <p class="text-muted-foreground">
          Zvolte tarif; aktivace proběhne až po potvrzení objednávky.
        </p>
      </div>
    </div>

    <!-- Karta tarifu -->
    <div class="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
      <div class="border-b border-border bg-surface-soft px-6 py-5 sm:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-foreground">Vystaveno Pro</h2>
            <p class="text-sm text-muted-foreground">
              Fakturace, klienti a finance v jednom místě.
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral">
            <Sparkles class="h-6 w-6" />
          </div>
        </div>
      </div>

      <div class="px-6 py-6 sm:px-8">
        <!-- Přepínač období -->
        <div class="flex items-center justify-center">
          <div
            class="inline-flex items-center gap-1 rounded-full border border-border bg-background p-1"
          >
            <button
              type="button"
              class="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              :class="!yearly ? 'bg-foreground text-background' : 'text-muted-foreground'"
              @click="yearly = false"
            >
              Měsíčně
            </button>
            <button
              type="button"
              class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              :class="yearly ? 'bg-foreground text-background' : 'text-muted-foreground'"
              @click="yearly = true"
            >
              Ročně
              <span
                class="rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-coral-foreground"
              >
                −{{ PRO_PRICING.discountPercent }} %
              </span>
            </button>
          </div>
        </div>

        <div class="mt-6 flex items-end justify-center gap-2">
          <span class="text-5xl font-extrabold tracking-tight text-foreground">
            {{ yearly ? PRO_PRICING.yearlyPricePerMonth : PRO_PRICING.monthlyPrice }}
          </span>
          <div class="pb-1">
            <p class="text-base font-semibold text-foreground">Kč</p>
            <p class="text-xs text-muted-foreground">měsíčně</p>
          </div>
        </div>
        <p class="mt-2 text-center text-sm text-muted-foreground">
          {{
            yearly
              ? `Účtováno ročně ${PRO_PRICING.yearlyTotal.toLocaleString('cs-CZ')} Kč. Ušetříte ${PRO_PRICING.yearlySavings} Kč.`
              : 'Účtováno měsíčně.'
          }}
        </p>

        <Button v-if="!isPaid" variant="coral" size="lg" class="mt-6 w-full" as-child>
          <RouterLink to="/cenik">Prohlédnout možnosti tarifu</RouterLink>
        </Button>
        <p v-else class="mt-6 text-center text-sm font-medium text-success">
          Tarif je aktivní — děkujeme!
        </p>
        <p class="mt-2 text-center text-xs text-muted-foreground">
          Aktivní tarif se objeví až po serverovém potvrzení objednávky. Tato obrazovka jej sama
          nemění.
        </p>

        <ul class="mt-8 grid gap-3 sm:grid-cols-2">
          <li v-for="f in features" :key="f" class="flex items-start gap-2 text-sm text-foreground">
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15"
            >
              <Check class="h-3 w-3 text-success" />
            </span>
            {{ f }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
