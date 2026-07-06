<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  PRICING_MODULES,
  PRICING_SEGMENTS,
  MODULAR_PRICING,
  yearlyPerMonth,
  modulesMonthly,
  type ModuleKey,
  type SegmentId,
} from '@/lib/pricing'
import SegmentPicker from '@/components/landing/pricing/SegmentPicker.vue'
import ModuleSelector from '@/components/landing/pricing/ModuleSelector.vue'
import PricingSummary from '@/components/landing/pricing/PricingSummary.vue'
import BundleCard from '@/components/landing/pricing/BundleCard.vue'
import IndustryPackages from '@/components/landing/pricing/IndustryPackages.vue'

const yearly = ref(true)
// Výchozí: vše zapnuto (ukáže kompletní balík + úsporu); zákazník odepne, co nepotřebuje.
const selected = ref<ModuleKey[]>(PRICING_MODULES.map((m) => m.key))
const segment = ref<SegmentId | null>(null)

// Výběr segmentu předvyplní doporučenou sestavu core modulů; uživatel ji dál ručně dolaďuje.
watch(segment, (id) => {
  if (!id) return
  const seg = PRICING_SEGMENTS.find((s) => s.id === id)
  if (seg) selected.value = [...seg.recommended]
})

function toggle(key: ModuleKey) {
  selected.value = selected.value.includes(key)
    ? selected.value.filter((k) => k !== key)
    : [...selected.value, key]
}
function selectAll() {
  selected.value = PRICING_MODULES.map((m) => m.key)
}

const allSelected = computed(() => selected.value.length >= PRICING_MODULES.length)
const selectedNames = computed(() =>
  PRICING_MODULES.filter((m) => selected.value.includes(m.key)).map((m) => m.name),
)
const baseMonthly = computed(() => modulesMonthly(selected.value))
const perMonth = computed(() =>
  yearly.value ? yearlyPerMonth(baseMonthly.value) : baseMonthly.value,
)
const yearlyTotal = computed(() => perMonth.value * 12)
const bundlePerMonth = computed(() =>
  yearly.value
    ? yearlyPerMonth(MODULAR_PRICING.bundleAllMonthly)
    : MODULAR_PRICING.bundleAllMonthly,
)

const activeSegment = computed(() => PRICING_SEGMENTS.find((s) => s.id === segment.value) ?? null)
const recommendedModules = computed<readonly ModuleKey[]>(
  () => activeSegment.value?.recommended ?? [],
)
const highlightAddons = computed<readonly string[]>(() => activeSegment.value?.addons ?? [])

const czk = (n: number) => n.toLocaleString('cs-CZ')
const modulesWord = computed(() => {
  const n = selected.value.length
  if (n === 1) return 'modul'
  if (n >= 2 && n <= 4) return 'moduly'
  return 'modulů'
})
</script>

<template>
  <section id="cenik" class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <!-- Segment / typ provozu -->
      <SegmentPicker v-model="segment" />

      <!-- Měsíčně / ročně -->
      <div class="mt-9 flex items-center justify-center">
        <div class="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="!yearly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="yearly = false"
          >
            Měsíčně
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="yearly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="yearly = true"
          >
            Ročně
            <span
              class="rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-coral-foreground"
            >
              2 měsíce zdarma
            </span>
          </button>
        </div>
      </div>

      <!-- Mobilní lepkavý souhrn (total nezmizí během výběru); CTA řeší spodní lišta PublicLayoutu -->
      <div
        class="sticky top-16 z-30 -mx-4 mt-8 border-y border-border bg-background/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium text-muted-foreground">
            {{ selected.length }} {{ modulesWord }} vybráno
          </span>
          <span class="font-mono text-lg font-bold text-foreground">
            {{ czk(perMonth) }} Kč<span class="text-xs font-normal text-muted-foreground"
              >/měs</span
            >
          </span>
        </div>
      </div>

      <!-- Konfigurátor: moduly + sticky souhrn -->
      <div class="mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[1fr_20rem]">
        <ModuleSelector
          :selected="selected"
          :yearly="yearly"
          :recommended="recommendedModules"
          @toggle="toggle"
        />
        <div class="lg:sticky lg:top-24 lg:self-start">
          <PricingSummary
            :selected-count="selected.length"
            :selected-names="selectedNames"
            :per-month="perMonth"
            :yearly="yearly"
            :yearly-total="yearlyTotal"
            :all-selected="allSelected"
            :bundle-per-month="bundlePerMonth"
          />
        </div>
      </div>

      <p class="mt-8 text-center text-xs text-muted-foreground">
        Nejste si jistí skladbou? Napište na
        <a
          href="mailto:patrik@vystaveno.cz"
          class="font-medium text-coral underline-offset-2 hover:underline"
        >
          patrik@vystaveno.cz </a
        >— navrhneme sestavu pro váš provoz.
      </p>

      <!-- Kompletní balík jako hodnotová kotva -->
      <div class="mt-12">
        <BundleCard :yearly="yearly" :all-selected="allSelected" @select-all="selectAll" />
      </div>

      <!-- Oborové nástavby -->
      <div class="mt-16">
        <IndustryPackages :highlight="highlightAddons" />
      </div>

      <!-- Závěrečná reassurance -->
      <p class="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
        Začněte tím, co potřebujete dnes. Vystaveno poroste s vámi — bez migrací, bez stěhování dat,
        bez nové aplikace.
      </p>
    </div>
  </section>
</template>
