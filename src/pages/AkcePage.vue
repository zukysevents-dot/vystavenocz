<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { RouterLink } from 'vue-router'
import { Check, Clock, ShieldCheck, TrendingUp } from 'lucide-vue-next'

const benefits = [
  'Cena 100 Kč/měs (1 200 Kč ročně) nebo 159 Kč při měsíčním placení',
  'Garance ceny po dobu 12 měsíců od registrace',
  'Plný přístup ke všem funkcím Vystaveno Pro',
  '14 dní na vyzkoušení zdarma, bez platební karty',
  'Zrušení jedním kliknutím v nastavení',
]
</script>

<template>
  <PageHeader
    eyebrow="Akční nabídka"
    title="Současná cena platí jen do 1. 6."
    subtitle="Po 1. 6. se ceník mění na 269 Kč/měs a 2 000 Kč/rok. Zaregistrujte se teď a cenu si zamknete na celých 12 měsíců."
  />

  <section class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <!-- Price comparison -->
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="rounded-3xl border-2 border-coral bg-card p-8 shadow-glow">
          <div
            class="inline-flex items-center gap-2 rounded-full bg-coral/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-coral"
          >
            <Clock class="h-3 w-3" />
            Do 1. 6.
          </div>
          <div class="mt-5 flex items-end gap-2">
            <span class="text-5xl font-extrabold tracking-tight text-foreground"> 100 </span>
            <div class="pb-2">
              <p class="text-base font-semibold text-foreground">Kč/měs</p>
              <p class="text-xs text-muted-foreground">při ročním placení</p>
            </div>
          </div>
          <p class="mt-2 text-sm text-muted-foreground">
            Účtováno ročně <strong class="text-foreground">1 200 Kč</strong>. Měsíční tarif 159 Kč.
          </p>
          <Button variant="coral" size="lg" class="mt-6 w-full" as-child>
            <a href="/registrace">Využít akční cenu</a>
          </Button>
          <p class="mt-2 text-center text-xs text-muted-foreground">
            Bez platební karty · Garance 12 měsíců
          </p>
        </div>

        <div class="rounded-3xl border border-border bg-surface-soft p-8">
          <div
            class="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground"
          >
            <TrendingUp class="h-3 w-3" />
            Od 1. 6.
          </div>
          <div class="mt-5 flex items-end gap-2">
            <span class="text-5xl font-extrabold tracking-tight text-muted-foreground"> 167 </span>
            <div class="pb-2">
              <p class="text-base font-semibold text-muted-foreground">Kč/měs</p>
              <p class="text-xs text-muted-foreground">při ročním placení</p>
            </div>
          </div>
          <p class="mt-2 text-sm text-muted-foreground">
            Účtováno ročně <strong class="text-foreground">2 000 Kč</strong>. Měsíční tarif 269 Kč.
          </p>
          <div
            class="mt-6 rounded-lg border border-border bg-background px-4 py-3 text-xs text-muted-foreground"
          >
            Tato cena se bude vztahovat na všechny nové registrace po 1. 6. Stávající zákazníci si
            svou cenu drží dál podle pravidel garance.
          </div>
        </div>
      </div>

      <!-- Benefits -->
      <div class="mt-12 rounded-3xl border border-border bg-card p-8">
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"
          >
            <ShieldCheck class="h-5 w-5" />
          </div>
          <h2 class="text-lg font-bold text-foreground">Co získáte registrací do 1. 6.</h2>
        </div>
        <ul class="mt-5 grid gap-3 sm:grid-cols-2">
          <li v-for="b in benefits" :key="b" class="flex items-start gap-2 text-sm text-foreground">
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15"
            >
              <Check class="h-3 w-3 text-success" />
            </span>
            {{ b }}
          </li>
        </ul>
      </div>

      <div class="mt-10 flex flex-col items-center gap-3 text-center">
        <Button variant="coral" size="lg" as-child>
          <a href="/registrace">Zaregistrovat se za 100 Kč/měs</a>
        </Button>
        <RouterLink
          to="/cenik"
          class="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Zobrazit kompletní ceník →
        </RouterLink>
      </div>
    </div>
  </section>
</template>
