<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

withDefaults(defineProps<{ eyebrow: string; title: string; subtitle?: string; cta?: boolean }>(), {
  cta: false,
})
</script>

<template>
  <section class="relative overflow-hidden border-b border-border bg-hero">
    <div class="absolute inset-0 bg-mesh opacity-60" aria-hidden="true" />
    <div class="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
      <p class="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">{{ eyebrow }}</p>
      <h1 class="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
        {{ subtitle }}
      </p>
      <div v-if="cta" class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button variant="coral" size="lg" class="group">
          Vyzkoušet 30 dní zdarma
          <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  </section>
</template>
