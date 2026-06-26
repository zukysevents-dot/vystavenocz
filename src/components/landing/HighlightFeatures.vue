<script setup lang="ts">
import {
  ShoppingCart,
  UtensilsCrossed,
  Package,
  Clock,
  CalendarDays,
  FileText,
  ArrowRight,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'

const modules = [
  {
    icon: ShoppingCart,
    title: 'Pokladna (POS)',
    desc: 'Dotyková prodejní obrazovka, dlaždice produktů, platba hotově i kartou, účtenka na ťuk.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Restaurace & kuchyně',
    desc: 'Mapa stolů, účty na stůl, bony do kuchyně i na bar — provoz jako v Dotykačce.',
  },
  {
    icon: Package,
    title: 'Sklad & zásoby',
    desc: 'Příjem, výdej, inventura, hlídání nízkých zásob. Sklad se odečítá automaticky při prodeji.',
  },
  {
    icon: CalendarDays,
    title: 'Rezervace',
    desc: 'Kalendář, služby a zdroje, hlídání kolizí. Pro salony, kadeřnictví i restaurace.',
  },
  {
    icon: Clock,
    title: 'Docházka',
    desc: 'Píchačka, zaměstnanci, přehled odpracovaných hodin a export pro mzdy.',
  },
  {
    icon: FileText,
    title: 'Fakturace',
    desc: 'Faktury, klienti, DPH, QR platby. Doklad z prodeje vystavíš jedním klikem.',
  },
]
</script>

<template>
  <section class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Jeden systém. Všechny moduly.
        </h2>
        <p class="mt-4 text-base text-muted-foreground sm:text-lg">
          Zapneš jen ty, které potřebuješ — a platíš jen za ně.
        </p>
      </div>

      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="m in modules"
          :key="m.title"
          class="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-coral/40"
        >
          <div
            class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-coral/12 text-coral"
          >
            <component :is="m.icon" class="h-5 w-5" />
          </div>
          <h3 class="text-base font-semibold text-foreground">{{ m.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
            {{ m.desc }}
          </p>
        </div>
      </div>

      <div class="mt-10 flex justify-center">
        <Button variant="outline" size="lg" as-child class="group">
          <RouterLink to="/funkce">
            Všechny moduly a funkce
            <ArrowRight class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </RouterLink>
        </Button>
      </div>
    </div>
  </section>
</template>
