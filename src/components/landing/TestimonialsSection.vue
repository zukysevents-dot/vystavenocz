<script setup lang="ts">
import { Quote } from 'lucide-vue-next'

const items = [
  {
    quote: 'Pokladna i sklad v jednom — ráno otevřu a všechno sedí.',
    name: 'Tereza',
    role: 'majitelka kavárny',
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
  <section class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Pár vět od lidí jako ty
        </h2>
      </div>

      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <figure
          v-for="t in items"
          :key="t.name"
          class="flex flex-col rounded-2xl border border-border bg-card p-6"
        >
          <Quote class="h-5 w-5 text-muted-foreground/50" aria-hidden />
          <blockquote class="mt-3 text-base leading-relaxed text-foreground">
            „{{ t.quote }}"
          </blockquote>
          <figcaption class="mt-5 text-sm text-muted-foreground">
            <span class="font-semibold text-foreground">{{ t.name }}</span> ·
            {{ t.role }}
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
