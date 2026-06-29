<script setup lang="ts">
import { Quote } from 'lucide-vue-next'

const items = [
  {
    quote: 'Pokladna i sklad v jednom — ráno otevřu a všechno sedí.',
    name: 'Tereza',
    role: 'majitelka kavárny',
    featured: true,
  },
  {
    quote: 'Rezervace bez kolizí a žádný papírový diář. Konečně klid.',
    name: 'Lucie',
    role: 'kadeřnice, vlastní salon',
  },
  {
    quote: 'Bony letí rovnou do kuchyně, účty na stůl drží přehled.',
    name: 'Martin',
    role: 'šéf restaurace',
  },
]
</script>

<template>
  <section class="bg-background py-20 sm:py-28">
    <div class="mx-auto grid max-w-6xl gap-y-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-x-12 lg:px-8">
      <div class="lg:col-span-4">
        <p
          class="flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span class="h-px w-7 bg-coral" aria-hidden="true" />
          Z reálného provozu
        </p>
        <h2
          class="mt-5 font-display text-3xl font-black leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[2.5rem]"
        >
          Pár vět od lidí jako ty
        </h2>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:col-span-8">
        <figure
          v-for="t in items"
          :key="t.name"
          :class="[
            'flex flex-col rounded-2xl border p-6',
            t.featured
              ? 'border-coral/20 bg-gradient-to-br from-card to-accent/50 sm:col-span-2'
              : 'border-border bg-card',
          ]"
        >
          <Quote class="h-5 w-5 text-coral/60" aria-hidden="true" />
          <blockquote
            :class="[
              'mt-3 leading-relaxed text-foreground',
              t.featured ? 'text-xl font-medium sm:text-2xl' : 'text-base',
            ]"
          >
            „{{ t.quote }}"
          </blockquote>
          <figcaption class="mt-6 flex items-center gap-3 text-sm">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/15 font-display text-sm font-bold text-coral"
              aria-hidden="true"
            >
              {{ t.name.charAt(0) }}
            </span>
            <span class="leading-tight">
              <span class="font-semibold text-foreground">{{ t.name }}</span>
              <span class="block text-muted-foreground">{{ t.role }}</span>
            </span>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
