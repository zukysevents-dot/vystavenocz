<script setup lang="ts">
import { UtensilsCrossed, Scissors, Wrench, ShoppingBag, Check } from 'lucide-vue-next'
import type { LucideIcon } from 'lucide-vue-next'
import { vReveal } from '@/lib/reveal'

type Audience = {
  icon: LucideIcon
  title: string
  who: string
  points: string[]
  featured?: boolean
}

// Poctivá náhrada za testimonials: místo smyšlených citací říkáme, komu systém stavíme
// a co konkrétně u něj řeší.
const audiences: Audience[] = [
  {
    icon: UtensilsCrossed,
    title: 'Restaurace, kavárny & bary',
    who: 'Od bistra po restauraci s kuchyní a barem',
    points: [
      'Mapa stolů, otevřené účty, rozdělení účtu i spropitné',
      'Bony do kuchyně a na bar — číšník s tabletem místo bloku',
      'Receptury a food cost: prodej odečte suroviny ze skladu',
      'Inventury, skladové zrcadlo a uzávěrky bez papírů',
    ],
    featured: true,
  },
  {
    icon: Scissors,
    title: 'Salony & služby',
    who: 'Kadeřnictví, kosmetika, masáže, studia',
    points: [
      'Rezervace s hlídáním kolizí místo papírového diáře',
      'Evidence klientů s historií návštěv',
      'Docházka týmu a podklady pro mzdy',
    ],
  },
  {
    icon: Wrench,
    title: 'Řemeslo & servisy',
    who: 'Instalatéři, elektrikáři, autoservisy, výjezdy',
    points: [
      'Nabídky, faktury s DPH a QR platbou',
      'Zakázky a servisní výjezdy od poptávky po fakturu',
      'Přehled neuhrazených dokladů a cashflow',
    ],
  },
  {
    icon: ShoppingBag,
    title: 'Obchody & prodejny',
    who: 'Prodejny, trafiky, večerky, showroomy',
    points: [
      'Rychlá dotyková pokladna s dlaždicemi produktů',
      'Sklad s příjemkami, inventurou a hlídáním minim',
      'Tržby a marže v denním přehledu',
    ],
  },
]
</script>

<template>
  <section class="bg-surface py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div v-reveal class="max-w-2xl">
        <p
          class="flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span class="h-px w-7 bg-coral" aria-hidden="true" />
          Pro koho to stavíme
        </p>
        <h2
          class="mt-5 font-display text-3xl font-black leading-[1.02] tracking-[-0.02em] text-foreground sm:text-[2.75rem]"
        >
          Každý provoz si zapne jen svoje moduly
        </h2>
        <p class="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Gastro jede naplno se stoly a kuchyní, řemeslník začne fakturami a zakázkami. Všichni v
          jednom systému — nikdo neplatí za to, co nepoužívá.
        </p>
      </div>

      <div class="mt-12 grid gap-4 sm:grid-cols-2">
        <article
          v-for="(a, i) in audiences"
          :key="a.title"
          v-reveal="{ delay: i * 80 }"
          :class="[
            'flex flex-col rounded-2xl border p-6 transition-all hover:-translate-y-0.5 hover:shadow-card',
            a.featured
              ? 'border-coral/25 bg-gradient-to-br from-card to-accent/50 hover:border-coral/45'
              : 'border-border bg-card hover:border-coral/40',
          ]"
        >
          <div class="flex items-center gap-3">
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral/12 text-coral ring-1 ring-inset ring-coral/15"
            >
              <component :is="a.icon" class="h-5 w-5" :stroke-width="1.75" />
            </span>
            <div class="min-w-0">
              <h3 class="text-base font-semibold text-foreground">{{ a.title }}</h3>
              <p class="text-xs text-muted-foreground">{{ a.who }}</p>
            </div>
          </div>
          <ul class="mt-4 space-y-2">
            <li
              v-for="p in a.points"
              :key="p"
              class="flex items-start gap-2 text-sm leading-relaxed text-foreground/90"
            >
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-coral" :stroke-width="2.5" />
              {{ p }}
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>
