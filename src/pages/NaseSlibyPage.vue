<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ShieldCheck, Lock, Clock, Heart, Sparkles, AlertTriangle } from 'lucide-vue-next'
import PageHeader from '@/components/landing/PageHeader.vue'
import { Button } from '@/components/ui/button'

const promises = [
  {
    icon: Sparkles,
    title: 'Platíte jen za to, co používáte',
    text: 'Modulární ceník — zapnete jen moduly, které potřebujete, a jen za ně platíte. Kdykoliv modul přidáte nebo odeberete.',
  },
  {
    icon: ShieldCheck,
    title: 'Férové a srozumitelné ceny',
    text: 'Ceny máte přehledně v ceníku, kde si rovnou poskládáte svůj systém. Žádné skryté poplatky ani hvězdičky drobným písmem.',
  },
  {
    icon: Lock,
    title: 'Žádná platební karta na začátku',
    text: '14 dní zkoušíte zdarma, kartu zadáváte až když se rozhodnete pokračovat. Žádné automatické stržení po zkušebce.',
  },
  {
    icon: Clock,
    title: 'Bez závazku, zrušení jedním kliknutím',
    text: 'Předplatné i jednotlivé moduly zrušíte sami v nastavení – bez e-mailů, bez telefonátů, bez výpovědních lhůt.',
  },
  {
    icon: Heart,
    title: 'Česká podpora od lidí',
    text: 'Píšete českým lidem, ne robotovi. Odpovídáme obvykle do několika hodin v pracovní době.',
  },
]

const limits = [
  'Termíny vývoje nových funkcí orientačně dodržujeme, ale závisí na změnách legislativy a třetích stranách (např. banky, ARES).',
  'Ceny modulů jsou orientační a můžeme je do budoucna upravit; změnu vždy oznámíme dopředu a nikdy ji nezavádíme zpětně.',
  'Vrácení peněz za nevyčerpané období nenárokujeme automaticky, ale píšete-li nám férový důvod, řešíme individuálně.',
]
</script>

<template>
  <PageHeader
    eyebrow="Naše sliby"
    title="Férově, bez závazku"
    subtitle="Žádné hvězdičky drobným písmem. Tady je seznam všeho, co vám slibujeme – a kde jsou naše limity."
  />

  <section class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <ul class="grid gap-5 sm:grid-cols-2">
        <li
          v-for="{ icon, title, text } in promises"
          :key="title"
          class="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"
          >
            <component :is="icon" class="h-5 w-5" />
          </div>
          <h3 class="mt-4 text-base font-bold text-foreground">{{ title }}</h3>
          <p class="mt-2 text-sm text-muted-foreground">{{ text }}</p>
        </li>
      </ul>

      <div class="mt-12 rounded-2xl border border-border bg-surface-soft p-6 sm:p-8">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/10 text-coral">
            <AlertTriangle class="h-5 w-5" />
          </div>
          <h2 class="text-lg font-bold text-foreground">Kde jsou hranice slibů</h2>
        </div>
        <ul class="mt-4 space-y-3 text-sm text-muted-foreground">
          <li v-for="l in limits" :key="l" class="flex gap-2">
            <span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
            {{ l }}
          </li>
        </ul>
      </div>

      <div class="mt-10 flex flex-col items-center gap-3 text-center">
        <Button variant="coral" size="lg" as-child>
          <RouterLink to="/registrace">Vyzkoušet zdarma</RouterLink>
        </Button>
        <RouterLink
          to="/cenik"
          class="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Zpět na ceník →
        </RouterLink>
      </div>
    </div>
  </section>
</template>
