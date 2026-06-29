<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Sparkles, ArrowDown } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { PRICING_MODULES, MODULAR_PRICING, yearlyPerMonth } from '@/lib/pricing'

const props = defineProps<{
  yearly: boolean
  allSelected: boolean
}>()

// Aktivuje kompletní balík v kalkulačce (rodič nastaví všechny moduly).
const emit = defineEmits<{ selectAll: [] }>()

const czk = (n: number) => n.toLocaleString('cs-CZ')
const sumAll = PRICING_MODULES.reduce((acc, m) => acc + m.monthly, 0)

const price = computed(() =>
  props.yearly
    ? yearlyPerMonth(MODULAR_PRICING.bundleAllMonthly)
    : MODULAR_PRICING.bundleAllMonthly,
)
const reference = computed(() => (props.yearly ? yearlyPerMonth(sumAll) : sumAll))
const saving = computed(() => reference.value - price.value)

const OUTCOMES = [
  'Všech 6 modulů aktivních od začátku',
  'Jedna faktura, jeden přehled, žádné přepínání mezi aplikacemi',
  'Nové moduly rovnou v balíku, bez doplácení',
  'Sestavu i tak změníte kdykoliv',
]
</script>

<template>
  <div
    class="relative overflow-hidden rounded-3xl border border-coral/30 bg-card p-6 shadow-glow sm:p-8"
  >
    <!-- Aura jako focal point pouze tady -->
    <div
      class="pointer-events-none absolute -right-16 -top-16 -z-0 aspect-square w-64 rounded-full bg-aura opacity-25 blur-3xl"
      aria-hidden="true"
    />

    <div class="relative">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1 text-xs font-bold uppercase tracking-wide text-coral-foreground"
        >
          <Sparkles class="h-3.5 w-3.5" :stroke-width="2.5" />
          Nejvýhodnější volba
        </span>
        <span class="text-xs font-medium text-muted-foreground">Pro rostoucí provozy</span>
      </div>

      <h3 class="mt-4 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
        Kompletní balík — celý provoz na jednom místě.
      </h3>
      <p class="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
        Vše, co potřebujete pro každodenní provoz, bez skládání jednotlivých částí.
      </p>

      <div class="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
        <span class="font-mono text-5xl font-black tracking-tight text-foreground">{{
          czk(price)
        }}</span>
        <span class="pb-1 text-base font-semibold text-foreground">Kč / měs</span>
        <span class="pb-1 font-mono text-base text-muted-foreground line-through"
          >{{ czk(reference) }} Kč</span
        >
      </div>
      <p v-if="saving > 0" class="mt-1.5 text-sm font-semibold text-success">
        Ušetříte {{ czk(saving) }} Kč/měs oproti samostatným modulům.
      </p>

      <ul class="mt-5 grid gap-2 sm:grid-cols-2">
        <li
          v-for="o in OUTCOMES"
          :key="o"
          class="flex items-start gap-2 text-sm leading-relaxed text-foreground"
        >
          <Check class="mt-0.5 h-4 w-4 shrink-0 text-coral" :stroke-width="2.5" />
          {{ o }}
        </li>
      </ul>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="coral" size="lg" class="w-full sm:w-auto" as-child>
          <RouterLink to="/registrace">Vyzkoušet kompletní balík zdarma</RouterLink>
        </Button>
        <button
          v-if="!allSelected"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-coral transition-colors hover:text-coral/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          @click="emit('selectAll')"
        >
          <ArrowDown class="h-4 w-4" :stroke-width="2.5" />
          Zapnout v sestavě
        </button>
        <p
          v-else
          class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
        >
          <Check class="h-4 w-4 text-success" :stroke-width="2.5" />
          Máte aktivní v sestavě
        </p>
      </div>

      <p class="mt-4 text-xs text-muted-foreground">
        Bez karty · {{ MODULAR_PRICING.trialDays }} dní zdarma · zrušení jedním klikem
      </p>
    </div>
  </div>
</template>
