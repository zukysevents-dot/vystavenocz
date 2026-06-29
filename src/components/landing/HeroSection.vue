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
</script>

<template>
  <section class="relative overflow-hidden bg-hero">
    <div class="absolute inset-0 bg-mesh opacity-30" aria-hidden />
    <!-- Žhavá aura — signaturní moment značky. -->
    <div
      class="pointer-events-none absolute -right-32 -top-40 h-[36rem] w-[36rem] rounded-full bg-aura opacity-40 blur-3xl sm:opacity-50"
      aria-hidden
    />
    <div
      class="relative mx-auto grid max-w-7xl gap-14 px-4 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-36 lg:pt-28"
    >
      <div class="flex flex-col justify-center">
        <div
          class="mb-9 inline-flex w-fit items-center rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-xs font-medium text-foreground/85 backdrop-blur-sm sm:mb-10"
        >
          Jeden systém pro celý provoz
        </div>

        <h1
          class="font-display text-[2.85rem] font-black leading-[0.98] tracking-[-0.03em] text-foreground sm:text-[3.5rem] lg:text-[4.5rem]"
        >
          Prodej, faktura, rezervace —<br />
          <span class="text-gradient-primary">na jeden ťuk.</span>
        </h1>

        <p class="mt-7 max-w-xl text-base leading-[1.65] text-muted-foreground sm:text-lg">
          Pokladna, restaurace, kuchyně, sklad, docházka, rezervace i fakturace.
          <span class="font-semibold text-foreground">Jeden systém pro celý provoz</span> — zapneš
          jen moduly, které potřebuješ.
        </p>

        <ul class="mt-9 space-y-4 text-[15px] text-foreground/90">
          <li v-for="b in benefits" :key="b" class="flex items-start gap-3">
            <Check class="mt-[5px] h-4 w-4 shrink-0 text-coral" :stroke-width="1.5" />
            <span class="leading-[1.55]">{{ b }}</span>
          </li>
        </ul>

        <div class="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
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

        <p class="mt-5 text-sm text-muted-foreground">Bez karty · 14 dní zdarma.</p>

        <!-- Mikro social proof — důvěryhodné signály bez vymyšlených čísel -->
        <ul
          class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-border/60 pt-6 text-xs text-muted-foreground"
        >
          <li class="flex items-center gap-1.5">
            <ShieldCheck class="h-3.5 w-3.5 text-muted-foreground/70" :stroke-width="1.75" />
            Plně dle českého zákona
          </li>
          <li class="flex items-center gap-1.5">
            <MapPin class="h-3.5 w-3.5 text-muted-foreground/70" :stroke-width="1.75" />
            Vyrobeno v Česku
          </li>
          <li class="flex items-center gap-1.5">
            <Zap class="h-3.5 w-3.5 text-muted-foreground/70" :stroke-width="1.75" />
            Spuštění během pár minut
          </li>
        </ul>
      </div>

      <div class="flex items-center justify-center">
        <DashboardPreview />
      </div>
    </div>
  </section>
</template>
