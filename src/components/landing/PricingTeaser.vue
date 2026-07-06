<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { PRICING_MODULES, MODULAR_PRICING } from '@/lib/pricing'
import { EARLY_ACCESS_MAILTO } from '@/lib/landing-cta'
import { vReveal } from '@/lib/reveal'

const minPrice = Math.min(...PRICING_MODULES.map((m) => m.monthly))
const czk = (n: number) => n.toLocaleString('cs-CZ')
</script>

<template>
  <section id="cenik" class="relative overflow-hidden py-16 sm:py-20">
    <div
      class="pointer-events-none absolute left-1/2 top-0 -z-10 aspect-square w-[120%] max-w-3xl -translate-x-1/2 -translate-y-1/3"
      aria-hidden="true"
    >
      <div class="blob-2 animate-liquid-slow h-full w-full bg-aura opacity-20 blur-3xl" />
    </div>
    <div v-reveal class="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
      <p
        class="flex items-center justify-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
      >
        <span class="h-px w-7 bg-coral" aria-hidden="true" />
        Ceník
        <span class="h-px w-7 bg-coral" aria-hidden="true" />
      </p>
      <h2 class="mt-5 font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
        Zaplatíte jen za to, co používáte.
      </h2>
      <p class="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
        Žádný předražený kolos. Poskládejte si systém z modulů, které váš provoz reálně potřebuje —
        a přidávejte další, až porostete.
      </p>

      <!-- Modulární náhled -->
      <div class="mt-7 flex flex-wrap justify-center gap-2">
        <span
          v-for="m in PRICING_MODULES"
          :key="m.key"
          class="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
        >
          {{ m.name }}
        </span>
      </div>

      <p class="mt-6 text-sm text-muted-foreground">
        Už od <span class="font-mono font-bold text-foreground">{{ czk(minPrice) }} Kč/měs</span> ·
        kompletní balík za
        <span class="font-mono font-bold text-foreground"
          >{{ czk(MODULAR_PRICING.bundleAllMonthly) }} Kč/měs</span
        >
        · ceny orientační do veřejného spuštění
      </p>

      <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button variant="coral" size="xl" class="group w-full sm:w-auto" as-child>
          <RouterLink to="/cenik">
            Vybrat moduly
            <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
          </RouterLink>
        </Button>
        <Button variant="outline" size="xl" class="w-full sm:w-auto" as-child>
          <a :href="EARLY_ACCESS_MAILTO">Zapsat se do early access</a>
        </Button>
      </div>
    </div>
  </section>
</template>
