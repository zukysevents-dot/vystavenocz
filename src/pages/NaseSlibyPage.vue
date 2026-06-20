<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ShieldCheck, Lock, Clock, Heart, Sparkles, AlertTriangle } from 'lucide-vue-next'
import PageHeader from '@/components/landing/PageHeader.vue'
import { Button } from '@/components/ui/button'

const promises = [
  {
    icon: Sparkles,
    title: 'Akční cena do 1. 6.',
    text: 'Registrujte se do 1. června a získáte současnou cenu 100 Kč/měsíc (ročně) nebo 159 Kč/měsíc. Po 1. 6. budou nové ceny 2 000 Kč ročně a 269 Kč měsíčně.',
  },
  {
    icon: ShieldCheck,
    title: 'Garance ceny 12 měsíců',
    text: 'Pokud se zaregistrujete před změnou ceníku, vaše cena se po dobu 12 měsíců nezmění. Zvýšení nikdy nezavedeme zpětně.',
  },
  {
    icon: Lock,
    title: 'Žádná platební karta na začátku',
    text: '14 dní zkoušíte zdarma, kartu zadáváte až když se rozhodnete pokračovat. Žádné automatické stržení po triálu.',
  },
  {
    icon: Clock,
    title: 'Zrušení jedním kliknutím',
    text: 'Předplatné zrušíte sami v nastavení – bez e-mailů, bez telefonátů, bez výpovědních lhůt.',
  },
  {
    icon: Heart,
    title: 'Česká podpora od lidí',
    text: 'Píšete českým lidem, ne robotovi. Odpovídáme obvykle do několika hodin v pracovní době.',
  },
]

const limits = [
  'Termíny vývoje nových funkcí orientačně dodržujeme, ale závisí na změnách legislativy a třetích stranách (např. Stripe, ARES, banky).',
  'Cenovou garanci nelze uplatnit zpětně po vypršení 12měsíčního období – v té době přechází na aktuální ceník.',
  'Vrácení peněz za nevyčerpané období nenárokujeme automaticky, ale píšete-li nám férový důvod, řešíme individuálně.',
]
</script>

<template>
  <PageHeader
    eyebrow="Naše sliby"
    title="Co vám garantujeme"
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
          <RouterLink to="/registrace">Využít akční cenu do 1. 6.</RouterLink>
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
