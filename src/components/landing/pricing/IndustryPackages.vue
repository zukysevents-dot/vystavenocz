<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Sparkles,
  UtensilsCrossed,
  ShoppingBag,
  Wrench,
  Users,
  Briefcase,
  ArrowRight,
} from 'lucide-vue-next'
import type { LucideIcon } from 'lucide-vue-next'
import { PRICING_ADDONS, ADDON_CATEGORIES, type AddonCategory } from '@/lib/pricing'

const props = defineProps<{
  /** Add-ony doporučené vybraným segmentem (zvýrazní se). */
  highlight: readonly string[]
}>()

const CATEGORY_ICONS: Record<AddonCategory, LucideIcon> = {
  services: Sparkles,
  gastro: UtensilsCrossed,
  retail: ShoppingBag,
  field: Wrench,
  team: Users,
  management: Briefcase,
}

const active = ref<AddonCategory | 'all'>('all')

const visible = computed(() =>
  active.value === 'all'
    ? PRICING_ADDONS
    : PRICING_ADDONS.filter((a) => a.category === active.value),
)

const czk = (n: number) => n.toLocaleString('cs-CZ')
const isHighlighted = (key: string) => props.highlight.includes(key)
const mailto = (name: string) =>
  `mailto:patrik@vystaveno.cz?subject=${encodeURIComponent(`Mám zájem o modul ${name}`)}`
</script>

<template>
  <div>
    <div class="mx-auto max-w-2xl text-center">
      <h3 class="font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
        Až porostete, Vystaveno poroste s vámi.
      </h3>
      <p class="mt-3 text-sm text-muted-foreground sm:text-base">
        Oborové nástavby pro konkrétní provozy. Zapnete je, až je budete reálně potřebovat.
      </p>
    </div>

    <!-- Navigace kategorií -->
    <div class="mt-6 flex flex-wrap justify-center gap-2">
      <button
        type="button"
        :aria-pressed="active === 'all'"
        class="rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        :class="
          active === 'all'
            ? 'border-coral bg-coral text-coral-foreground'
            : 'border-border bg-card text-foreground hover:border-coral/40'
        "
        @click="active = 'all'"
      >
        Vše
      </button>
      <button
        v-for="c in ADDON_CATEGORIES"
        :key="c.id"
        type="button"
        :aria-pressed="active === c.id"
        class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        :class="
          active === c.id
            ? 'border-coral bg-coral text-coral-foreground'
            : 'border-border bg-card text-foreground hover:border-coral/40'
        "
        @click="active = c.id"
      >
        <component :is="CATEGORY_ICONS[c.id]" class="h-4 w-4" :stroke-width="2" />
        {{ c.label }}
      </button>
    </div>

    <!-- Karty -->
    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="a in visible"
        :key="a.key"
        class="flex flex-col rounded-2xl border bg-card p-5 transition-colors"
        :class="isHighlighted(a.key) ? 'border-coral/50 ring-1 ring-coral/30' : 'border-border'"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="font-semibold text-foreground">{{ a.name }}</span>
          <span
            v-if="a.soon"
            class="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            Připravujeme
          </span>
        </div>

        <p class="mt-2 text-sm leading-relaxed text-foreground">{{ a.desc }}</p>
        <p class="mt-2 text-xs text-muted-foreground">
          <span class="font-medium text-foreground/80">Pro koho:</span> {{ a.segment }}
        </p>

        <div class="mt-auto pt-4">
          <p class="font-mono text-sm text-foreground">
            od {{ czk(a.monthly) }} Kč<span class="text-muted-foreground">
              / měs / {{ a.unit }}</span
            >
          </p>
          <p v-if="a.perExtra" class="mt-0.5 text-xs text-muted-foreground">
            + {{ czk(a.perExtra.monthly) }} Kč {{ a.perExtra.label }}
          </p>
          <a
            :href="mailto(a.name)"
            class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-coral transition-colors hover:text-coral/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Mám zájem
            <ArrowRight class="h-3.5 w-3.5" :stroke-width="2.5" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
