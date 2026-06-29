<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight, Check, ShieldCheck, MapPin, Zap } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import DashboardPreview from './DashboardPreview.vue'

const benefits = [
  'Dotyková pokladna, účty na stůl, kuchyně i bar — jako Dotykačka',
  'Sklad, docházka, rezervace i fakturace — všechno propojené',
  'Modulární — zapneš a platíš jen to, co opravdu používáš',
  'České, podle zákona, bez závazku — zrušíš jedním klikem',
]

const signals = [
  { icon: ShieldCheck, label: 'Plně dle českého zákona' },
  { icon: MapPin, label: 'Vyrobeno v Česku' },
  { icon: Zap, label: 'Spuštění během pár minut' },
]
</script>

<template>
  <section class="relative overflow-hidden">
    <!-- Soft paper-to-background base. -->
    <div class="absolute inset-0 -z-20 bg-hero" aria-hidden="true" />
    <!-- Very faint brand mesh — atmosphere, not a wash. -->
    <div class="absolute inset-0 -z-10 bg-mesh opacity-[0.16]" aria-hidden="true" />

    <div
      class="mx-auto grid max-w-7xl items-center gap-x-8 gap-y-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-12 lg:pb-32 lg:pt-24 lg:px-8"
    >
      <!-- Copy column -->
      <div class="lg:col-span-6 xl:col-span-5">
        <p
          class="flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span class="h-px w-7 bg-coral" aria-hidden="true" />
          Jeden systém pro celý provoz
        </p>

        <h1
          class="mt-6 font-display font-black leading-[0.95] tracking-[-0.03em] text-foreground text-[clamp(2.6rem,7vw,4.6rem)]"
        >
          Prodej, faktura, rezervace —
          <span class="text-gradient-primary">na jeden ťuk.</span>
        </h1>

        <p class="mt-6 max-w-xl text-base leading-[1.65] text-muted-foreground sm:text-lg">
          Pokladna, restaurace, kuchyně, sklad, docházka, rezervace i fakturace.
          <span class="font-semibold text-foreground">Jeden systém pro celý provoz</span> — zapneš
          jen moduly, které potřebuješ.
        </p>

        <ul class="mt-8 space-y-3.5 text-[15px] text-foreground/90">
          <li v-for="b in benefits" :key="b" class="flex items-start gap-3">
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"
            >
              <Check class="h-3 w-3" :stroke-width="2.5" />
            </span>
            <span class="leading-[1.55]">{{ b }}</span>
          </li>
        </ul>

        <div class="mt-9 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <Button size="xl" variant="coral" class="group w-full text-base sm:w-auto" as-child>
            <RouterLink to="/registrace">
              Vyzkoušet zdarma
              <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
            </RouterLink>
          </Button>
          <Button size="xl" variant="outline" class="w-full sm:w-auto" as-child>
            <RouterLink to="/funkce">Prohlédnout moduly</RouterLink>
          </Button>
        </div>

        <p class="mt-4 font-mono text-xs text-muted-foreground">Bez karty · 14 dní zdarma.</p>

        <ul
          class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-border/60 pt-6 text-xs text-muted-foreground"
        >
          <li v-for="s in signals" :key="s.label" class="flex items-center gap-1.5">
            <component :is="s.icon" class="h-3.5 w-3.5 text-coral/80" :stroke-width="1.75" />
            {{ s.label }}
          </li>
        </ul>
      </div>

      <!-- Product preview — the signature aura moment. -->
      <div class="relative lg:col-span-6 xl:col-span-7">
        <div
          class="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[115%] max-w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-aura opacity-50 blur-2xl sm:opacity-60"
          aria-hidden="true"
        />
        <DashboardPreview />
      </div>
    </div>
  </section>
</template>
