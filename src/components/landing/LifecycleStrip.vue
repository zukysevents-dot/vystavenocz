<script setup lang="ts">
import {
  ShoppingCart,
  UtensilsCrossed,
  CreditCard,
  Package,
  BarChart3,
  ArrowRight,
} from 'lucide-vue-next'
import { vReveal } from '@/lib/reveal'

const stages = [
  {
    icon: ShoppingCart,
    title: 'Objednávka & prodej',
    desc: 'Účet na stůl nebo prodej na pokladně — pár ťuků, i z tabletu.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Kuchyně & bar',
    desc: 'Bon letí rovnou na kuchyňský displej. Žádné papírky, žádný křik přes pas.',
  },
  {
    icon: CreditCard,
    title: 'Platba',
    desc: 'Hotově i kartou, rozdělení účtu mezi hosty, spropitné, účtenka.',
  },
  {
    icon: Package,
    title: 'Sklad & receptury',
    desc: 'Prodej odečte suroviny podle receptury — food cost pod kontrolou.',
  },
  {
    icon: BarChart3,
    title: 'Uzávěrka & přehled',
    desc: 'Z-report, tržby, DPH i rozdíl hotovosti. Žádné slepé uzávěrky.',
  },
]
</script>

<template>
  <section class="py-20 sm:py-24">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <!-- Aura panel (styl závěrečného CTA): ink gradient + mesh uvnitř, měkký brand
           glow ven (.aura-panel), ring jako skleněná hrana — žádný tvrdý ořez. -->
      <div
        class="dark bg-ink-gradient aura-panel relative isolate overflow-hidden rounded-[2rem] px-6 py-16 text-foreground ring-1 ring-white/10 sm:px-12 sm:py-20"
      >
        <div class="absolute inset-0 -z-10 bg-mesh opacity-50" aria-hidden="true" />
        <div
          class="pointer-events-none absolute -right-32 -top-40 -z-10 h-[26rem] w-[26rem]"
          aria-hidden="true"
        >
          <div class="blob animate-liquid-slow h-full w-full bg-aura opacity-25 blur-3xl" />
        </div>

        <div v-reveal class="max-w-2xl">
          <p
            class="flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
          >
            <span class="h-px w-7 bg-coral" aria-hidden="true" />
            Od objednávky po doklad
          </p>
          <h2
            class="mt-5 font-display text-3xl font-black leading-[1.02] tracking-[-0.02em] text-foreground sm:text-[2.75rem]"
          >
            Celý provoz <span class="text-gradient-heading">v jednom toku</span>
          </h2>
          <p class="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Pokladna, kuchyně, sklad i uzávěrka spolu mluví — bez papírků, ručního přepisování a
            počítání v Excelu.
          </p>
        </div>

        <ol class="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          <li v-for="(s, i) in stages" :key="s.title" v-reveal="{ delay: i * 90 }" class="relative">
            <div class="mb-4 flex items-center gap-3">
              <span
                class="flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/12 text-coral ring-1 ring-inset ring-coral/25"
              >
                <component :is="s.icon" class="h-5 w-5" :stroke-width="1.75" />
              </span>
              <span class="font-mono text-sm font-medium tabular-nums text-muted-foreground">
                0{{ i + 1 }}
              </span>
            </div>
            <h3 class="text-base font-semibold text-foreground">{{ s.title }}</h3>
            <p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{{ s.desc }}</p>

            <!-- Flow connector between stages (desktop only). -->
            <ArrowRight
              v-if="i < stages.length - 1"
              class="absolute -right-3 top-3 hidden h-5 w-5 text-coral/40 lg:block"
              aria-hidden="true"
            />
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
