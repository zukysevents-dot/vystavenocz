<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
</script>

<template>
  <section class="bg-background py-20 sm:py-28">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div
        class="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center shadow-card sm:px-16 sm:py-20"
      >
        <div class="relative">
          <h2
            class="mx-auto max-w-2xl font-display text-4xl font-black tracking-tight text-foreground sm:text-5xl"
          >
            Jeden systém pro celý provoz.
          </h2>
          <p class="mx-auto mt-5 max-w-xl text-lg text-muted-foreground sm:text-xl">
            Pokladna, kuchyně, sklad, rezervace i fakturace. Vyzkoušej zdarma — bez karty.
          </p>
          <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="coral" size="xl" class="group h-14 px-10 text-base" as-child>
              <RouterLink to="/registrace">
                Vyzkoušet zdarma
                <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
              </RouterLink>
            </Button>
          </div>
          <p class="mt-5 text-sm text-muted-foreground">
            14 dní zdarma bez karty · Zrušení jedním kliknutím
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
