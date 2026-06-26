<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Check,
  FileText,
  ShoppingCart,
  UtensilsCrossed,
  Package,
  CalendarDays,
  Clock,
  type LucideIcon,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { PRICING_MODULES, MODULAR_PRICING, yearlyPerMonth, type ModuleKey } from '@/lib/pricing'

const ICONS: Record<ModuleKey, LucideIcon> = {
  invoicing: FileText,
  pos: ShoppingCart,
  restaurant: UtensilsCrossed,
  inventory: Package,
  booking: CalendarDays,
  attendance: Clock,
}

const yearly = ref(true)
// Výchozí: vše zapnuto (ukáže kompletní balík + úsporu); zákazník odepne, co nepotřebuje.
const selected = ref<ModuleKey[]>(PRICING_MODULES.map((m) => m.key))

function toggle(key: ModuleKey) {
  selected.value = selected.value.includes(key)
    ? selected.value.filter((k) => k !== key)
    : [...selected.value, key]
}
const isOn = (key: ModuleKey) => selected.value.includes(key)

const allSelected = computed(() => selected.value.length === PRICING_MODULES.length)
const sumMonthly = computed(() =>
  PRICING_MODULES.filter((m) => selected.value.includes(m.key)).reduce(
    (acc, m) => acc + m.monthly,
    0,
  ),
)
// Při kompletním balíku platí zvýhodněná cena; jinak součet vybraných.
const baseMonthly = computed(() =>
  allSelected.value ? MODULAR_PRICING.bundleAllMonthly : sumMonthly.value,
)
const perMonth = computed(() =>
  yearly.value ? yearlyPerMonth(baseMonthly.value) : baseMonthly.value,
)
const yearlyTotal = computed(() => perMonth.value * 12)
const bundleSaving = computed(() => sumMonthly.value - MODULAR_PRICING.bundleAllMonthly)

const czk = (n: number) => n.toLocaleString('cs-CZ')
</script>

<template>
  <section id="cenik" class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Postav si svůj systém.
        </h2>
        <p class="mt-4 text-base text-muted-foreground sm:text-lg">
          Zapneš jen moduly, které potřebuješ — a platíš jen za ně. Kdykoliv přidáš nebo odebereš.
        </p>
      </div>

      <!-- Měsíčně / ročně -->
      <div class="mt-9 flex items-center justify-center">
        <div class="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            class="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            :class="!yearly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="yearly = false"
          >
            Měsíčně
          </button>
          <button
            class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
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

      <div class="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <!-- Moduly -->
        <div class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="m in PRICING_MODULES"
            :key="m.key"
            type="button"
            :aria-pressed="isOn(m.key)"
            class="flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-colors"
            :class="
              isOn(m.key)
                ? 'border-coral ring-1 ring-coral/40'
                : 'border-border hover:border-coral/40'
            "
            @click="toggle(m.key)"
          >
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
              :class="isOn(m.key) ? 'border-coral bg-coral text-coral-foreground' : 'border-border'"
            >
              <Check v-if="isOn(m.key)" class="h-3.5 w-3.5" :stroke-width="3" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <component :is="ICONS[m.key]" class="h-4 w-4 text-coral" :stroke-width="1.75" />
                <span class="font-semibold text-foreground">{{ m.name }}</span>
              </span>
              <span class="mt-1 block text-xs leading-relaxed text-muted-foreground">{{
                m.desc
              }}</span>
              <span class="mt-2 block font-mono text-sm text-foreground">
                {{ czk(yearly ? yearlyPerMonth(m.monthly) : m.monthly) }} Kč<span
                  class="text-muted-foreground"
                >
                  / měs</span
                >
              </span>
            </span>
          </button>
        </div>

        <!-- Souhrn -->
        <div class="lg:sticky lg:top-24 lg:self-start">
          <div class="rounded-3xl border border-border bg-card p-6 shadow-card">
            <p class="text-sm text-muted-foreground">
              {{
                allSelected
                  ? 'Kompletní balík — všechny moduly'
                  : `Vybráno modulů: ${selected.length}`
              }}
            </p>
            <div class="mt-2 flex items-end gap-2">
              <span class="font-mono text-5xl font-black tracking-tight text-foreground">
                {{ czk(perMonth) }}
              </span>
              <div class="pb-1.5">
                <p class="text-base font-semibold text-foreground">Kč</p>
                <p class="text-xs text-muted-foreground">/ měsíc</p>
              </div>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">
              <template v-if="selected.length === 0">Vyber aspoň jeden modul.</template>
              <template v-else-if="yearly">
                Účtováno ročně <span class="font-mono">{{ czk(yearlyTotal) }} Kč</span>.
              </template>
              <template v-else>Měsíčně, bez závazku.</template>
            </p>
            <p v-if="allSelected && bundleSaving > 0" class="mt-2 text-sm font-medium text-success">
              Ušetříš {{ czk(bundleSaving) }} Kč/měs oproti samostatným modulům.
            </p>

            <Button
              variant="coral"
              size="lg"
              class="mt-5 w-full"
              :disabled="selected.length === 0"
              as-child
            >
              <RouterLink to="/registrace"
                >Vyzkoušet zdarma {{ MODULAR_PRICING.trialDays }} dní</RouterLink
              >
            </Button>
            <p class="mt-3 text-center text-xs text-muted-foreground">
              Bez karty · Zrušení jedním klikem · Ceny bez DPH (neplátce)
            </p>
          </div>
        </div>
      </div>

      <p class="mt-8 text-center text-xs text-muted-foreground">
        Nejste si jistí skladbou? Napište na patrik@vystaveno.cz — poradíme s nastavením pro váš
        provoz.
      </p>
    </div>
  </section>
</template>
