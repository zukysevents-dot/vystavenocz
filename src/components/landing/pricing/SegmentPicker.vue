<script setup lang="ts">
import { Scissors, UtensilsCrossed, ShoppingBag, Wrench, Users, FileText } from 'lucide-vue-next'
import type { LucideIcon } from 'lucide-vue-next'
import { PRICING_SEGMENTS, type SegmentId } from '@/lib/pricing'

// Vybraný typ provozu (null = nic, ruční sestava). Řídí předvýběr modulů v rodiči.
const model = defineModel<SegmentId | null>({ required: true })

const ICONS: Record<SegmentId, LucideIcon> = {
  services: Scissors,
  gastro: UtensilsCrossed,
  retail: ShoppingBag,
  field: Wrench,
  team: Users,
  'invoicing-only': FileText,
}

function pick(id: SegmentId) {
  // Druhý klik na stejný segment ho zruší (zpět na ruční sestavu).
  model.value = model.value === id ? null : id
}
</script>

<template>
  <div>
    <h3 class="text-center font-display text-xl font-bold text-foreground sm:text-2xl">
      Co řešíte nejčastěji?
    </h3>
    <p class="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
      Vyberte typ provozu — předvyplníme doporučenou sestavu. Doladíte ji podle sebe.
    </p>

    <div class="mt-5 flex flex-wrap justify-center gap-2.5">
      <button
        v-for="s in PRICING_SEGMENTS"
        :key="s.id"
        type="button"
        :aria-pressed="model === s.id"
        class="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        :class="
          model === s.id
            ? 'border-coral bg-coral text-coral-foreground'
            : 'border-border bg-card text-foreground hover:border-coral/40'
        "
        @click="pick(s.id)"
      >
        <component :is="ICONS[s.id]" class="h-4 w-4" :stroke-width="2" />
        {{ s.label }}
      </button>
    </div>
  </div>
</template>
