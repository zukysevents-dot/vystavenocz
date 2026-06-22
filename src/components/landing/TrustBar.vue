<script setup lang="ts">
import { ShieldCheck, HeadphonesIcon, Wallet, Globe } from 'lucide-vue-next'

const items = [
  { icon: ShieldCheck, label: '14 dní zdarma bez karty' },
  { icon: HeadphonesIcon, label: 'Česká podpora' },
  { icon: Wallet, label: 'Od 100 Kč měsíčně' },
  { icon: Globe, label: 'Plně online, bez instalace' },
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
            class="flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground/70 ring-1 ring-inset ring-border"
          >
            <component :is="it.icon" class="h-3.5 w-3.5" :stroke-width="1.75" />
          </span>
          <span class="text-foreground/85">{{ it.label }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
