<script setup lang="ts">
import { ShieldCheck, CreditCard, MapPin, ToggleRight } from 'lucide-vue-next'

const items = [
  { icon: ShieldCheck, label: '14 dní zdarma' },
  { icon: CreditCard, label: 'Bez platební karty' },
  { icon: MapPin, label: 'České, podle zákona' },
  { icon: ToggleRight, label: 'Modulární — platíš jen co používáš' },
]
</script>

<template>
  <!--
    Tenký trust bar mezi Hero a první obsahovou sekcí.
    Záměrně bez velkých marginů — funguje jako důvěryhodný proužek,
    ne jako další full-blown sekce.
  -->
  <section class="border-y border-border/60 bg-surface py-5 sm:py-6">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <ul
        class="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-muted-foreground sm:gap-x-12 sm:text-sm"
      >
        <li v-for="it in items" :key="it.label" class="flex items-center gap-2">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full bg-coral/8 text-coral ring-1 ring-inset ring-coral/20"
          >
            <component :is="it.icon" class="h-3.5 w-3.5" :stroke-width="1.75" />
          </span>
          <span class="text-foreground/85">{{ it.label }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
