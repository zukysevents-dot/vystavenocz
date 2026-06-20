<script setup lang="ts">
import { Sparkles, Bell, QrCode, ArrowRight } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'

const items = [
  {
    icon: Sparkles,
    title: 'AI asistent v češtině',
    desc: 'Řekni mu, co chceš změnit, a faktura se aktualizuje sama.',
  },
  {
    icon: Bell,
    title: 'Automatické upomínky',
    desc: 'Systém sám připomene nezaplacené faktury.',
  },
  {
    icon: QrCode,
    title: 'QR platby na každé faktuře',
    desc: 'Klient zaplatí rychle naskenováním.',
  },
]
</script>

<template>
  <section class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Vše, co potřebuje živnostník. Nic navíc.
        </h2>
      </div>

      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="it in items"
          :key="it.title"
          class="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
        >
          <div
            class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-soft text-foreground"
          >
            <component :is="it.icon" class="h-5 w-5" />
          </div>
          <h3 class="text-base font-semibold text-foreground">{{ it.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
            {{ it.desc }}
          </p>
        </div>
      </div>

      <div class="mt-10 flex justify-center">
        <Button variant="outline" size="lg" as-child class="group">
          <RouterLink to="/funkce">
            Všechny funkce
            <ArrowRight class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </RouterLink>
        </Button>
      </div>
    </div>
  </section>
</template>
