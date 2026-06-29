<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
</script>

<template>
  <section class="bg-background py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <!-- Dark anchor + signature aura: the page closes with confidence. -->
      <div
        class="dark relative isolate overflow-hidden rounded-[2rem] bg-background px-6 py-20 text-center text-foreground sm:px-16 sm:py-28"
      >
        <div
          class="pointer-events-none absolute left-1/2 top-[62%] -z-10 aspect-square w-[130%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-aura opacity-40 blur-3xl"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-40"
          aria-hidden="true"
        />

        <p
          class="mb-6 inline-flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span class="h-px w-7 bg-coral" aria-hidden="true" />
          Začni dneska
        </p>
        <h2
          class="mx-auto max-w-2xl font-display text-4xl font-black leading-[1.0] tracking-[-0.02em] text-foreground sm:text-[3.25rem]"
        >
          Jeden systém pro celý provoz.
        </h2>
        <p class="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Pokladna, kuchyně, sklad, rezervace i fakturace. Vyzkoušej zdarma — bez karty.
        </p>
        <div class="mt-10 flex justify-center">
          <Button variant="coral" size="xl" class="group h-14 px-10 text-base" as-child>
            <RouterLink to="/registrace">
              Vyzkoušet zdarma
              <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
            </RouterLink>
          </Button>
        </div>
        <p class="mt-5 font-mono text-xs text-muted-foreground">
          14 dní zdarma bez karty · Zrušení jedním kliknutím
        </p>
      </div>
    </div>
  </section>
</template>
