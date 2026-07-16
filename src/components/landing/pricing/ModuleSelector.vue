<script setup lang="ts">
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
import { PRICING_MODULES, yearlyPerMonth, type ModuleKey } from '@/lib/pricing'

const props = defineProps<{
  selected: readonly ModuleKey[]
  yearly: boolean
  /** Moduly doporučené vybraným segmentem (zvýrazní se odznakem). */
  recommended: readonly ModuleKey[]
}>()

const emit = defineEmits<{ toggle: [key: ModuleKey] }>()

const ICONS: Record<ModuleKey, LucideIcon> = {
  invoicing: FileText,
  pos: ShoppingCart,
  restaurant: UtensilsCrossed,
  inventory: Package,
  booking: CalendarDays,
  attendance: Clock,
}

const isOn = (key: ModuleKey) => props.selected.includes(key)
const isRecommended = (key: ModuleKey) => props.recommended.includes(key)
const czk = (n: number) => n.toLocaleString('cs-CZ')
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <button
      v-for="m in PRICING_MODULES"
      :key="m.key"
      :id="`pricing-${m.key}`"
      type="button"
      :aria-pressed="isOn(m.key)"
      class="group relative flex flex-col rounded-2xl border bg-card p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      :class="
        isOn(m.key) ? 'border-coral ring-1 ring-coral/40' : 'border-border hover:border-coral/40'
      "
      @click="emit('toggle', m.key)"
    >
      <!-- Hlavička: ikona + název + checkbox -->
      <div class="flex items-start gap-3">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors"
          :class="isOn(m.key) ? 'bg-coral/15 text-coral' : 'bg-secondary text-muted-foreground'"
        >
          <component :is="ICONS[m.key]" class="h-[1.15rem] w-[1.15rem]" :stroke-width="1.75" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <span class="font-semibold text-foreground">{{ m.name }}</span>
            <span
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
              :class="isOn(m.key) ? 'border-coral bg-coral text-coral-foreground' : 'border-border'"
            >
              <Check v-if="isOn(m.key)" class="h-3.5 w-3.5" :stroke-width="3" />
            </span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              v-if="isRecommended(m.key)"
              class="rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-coral-foreground"
            >
              Doporučeno pro vás
            </span>
            <span
              v-else-if="m.relevanceLabel"
              class="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {{ m.relevanceLabel }}
            </span>
          </div>
        </div>
      </div>

      <!-- Outcome -->
      <p class="mt-3 text-sm leading-relaxed text-foreground">{{ m.outcome }}</p>

      <!-- Proof points -->
      <ul class="mt-3 space-y-1.5">
        <li
          v-for="p in m.points"
          :key="p"
          class="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
        >
          <Check class="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" :stroke-width="2.5" />
          {{ p }}
        </li>
      </ul>

      <!-- Cena -->
      <div class="mt-4 flex items-baseline gap-1 border-t border-border pt-3">
        <span class="font-mono text-lg font-bold text-foreground">{{
          czk(yearly ? yearlyPerMonth(m.monthly) : m.monthly)
        }}</span>
        <span class="text-sm text-muted-foreground">Kč / měs</span>
      </div>
    </button>
  </div>
</template>
