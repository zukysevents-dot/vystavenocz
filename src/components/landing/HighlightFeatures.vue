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
import { vReveal } from '@/lib/reveal'

type Module = {
  icon: typeof ShoppingCart
  title: string
  desc: string
  span?: string
  featured?: boolean
  formats?: string[]
}

const modules: Module[] = [
  {
    icon: ShoppingCart,
    title: 'Pokladna (POS)',
    desc: 'Dotyková prodejní obrazovka, platba hotově i kartou, účtenka na ťuk a tržby okamžitě v přehledu.',
    span: 'sm:col-span-2 lg:col-span-2',
    featured: true,
  },
  {
    icon: UtensilsCrossed,
    title: 'Restaurace & kuchyně',
    desc: 'Mapa stolů, účty na stůl, rozdělení účtu mezi hosty a bony do kuchyně i na bar (KDS).',
  },
  {
    icon: Package,
    title: 'Sklad & zásoby',
    desc: 'Příjemky, výdeje, receptury a inventury. Skladové zrcadlo ukáže, co má být, co je — a rozdíl.',
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
    desc: 'Faktury, klienti, DPH, QR platby. Doklad z prodeje vystavíte jedním klikem.',
    span: 'sm:col-span-2 lg:col-span-3',
    featured: true,
    formats: ['PDF', 'ISDOC', 'XML', 'QR platba'],
  },
]
</script>

<template>
  <section class="bg-background py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div v-reveal class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-2xl">
          <p
            class="flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
          >
            <span class="h-px w-7 bg-coral" aria-hidden="true" />
            Moduly
          </p>
          <h2
            class="mt-5 font-display text-3xl font-black leading-[1.02] tracking-[-0.02em] text-foreground sm:text-[2.75rem]"
          >
            Jeden systém. Všechny moduly.
          </h2>
          <p class="mt-4 text-base text-muted-foreground sm:text-lg">
            Zapneš jen ty, které potřebuješ — a platíš jen za ně.
          </p>
        </div>
        <Button variant="outline" size="lg" as-child class="group shrink-0">
          <RouterLink to="/funkce">
            Všechny moduly a funkce
            <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </RouterLink>
        </Button>
      </div>

      <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="(m, i) in modules"
          :key="m.title"
          v-reveal="{ delay: i * 70 }"
          :class="[
            'group relative flex flex-col rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-card',
            m.featured
              ? 'border-coral/20 bg-gradient-to-br from-card to-accent/50 hover:border-coral/45'
              : 'border-border bg-card hover:border-coral/40',
            m.span,
          ]"
        >
          <div class="mb-4 flex items-center justify-between">
            <span
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-coral/12 text-coral ring-1 ring-inset ring-coral/15"
            >
              <component :is="m.icon" class="h-5 w-5" :stroke-width="1.75" />
            </span>
            <span class="font-mono text-xs tabular-nums text-muted-foreground"> 0{{ i + 1 }} </span>
          </div>
          <h3 :class="['font-semibold text-foreground', m.featured ? 'text-lg' : 'text-base']">
            {{ m.title }}
          </h3>
          <p class="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {{ m.desc }}
          </p>

          <ul v-if="m.formats" class="mt-4 flex flex-wrap gap-1.5">
            <li
              v-for="f in m.formats"
              :key="f"
              class="rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {{ f }}
            </li>
          </ul>
        </article>
      </div>

      <p v-reveal class="mt-8 text-sm text-muted-foreground">
        A až porostete, přidáte oborové nástavby — zakázky a výjezdy, věrnost, pobočky, rozvoz,
        směny nebo klientskou zónu.
        <RouterLink to="/cenik" class="font-medium text-coral underline-offset-2 hover:underline">
          Celý přehled najdete v ceníku.
        </RouterLink>
      </p>
    </div>
  </section>
</template>
