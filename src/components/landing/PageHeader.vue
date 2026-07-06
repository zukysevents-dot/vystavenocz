<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DEMO_MAILTO } from '@/lib/landing-cta'

withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    /** Zvýrazněná část titulku ve značkovém gradientu (za `title`). */
    titleAccent?: string
    subtitle?: string
    cta?: boolean
  }>(),
  { cta: false },
)
</script>

<template>
  <section class="relative overflow-hidden border-b border-border/60">
    <div class="absolute inset-0 bg-mesh opacity-60" aria-hidden="true" />
    <!-- Aura moment i na podstránkách — jemný liquid blob za titulkem. -->
    <div
      class="pointer-events-none absolute left-1/2 top-[-14rem] h-[26rem] w-[38rem] -translate-x-1/2"
      aria-hidden="true"
    >
      <div class="blob animate-liquid h-full w-full bg-aura opacity-25 blur-3xl" />
    </div>
    <div class="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
      <p class="hero-rise mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
        {{ eyebrow }}
      </p>
      <h1
        class="hero-rise font-display text-4xl font-black tracking-tight text-foreground [animation-delay:90ms] sm:text-5xl"
      >
        {{ title }}
        <span v-if="titleAccent" class="text-gradient-heading">{{ titleAccent }}</span>
      </h1>
      <p
        v-if="subtitle"
        class="hero-rise mx-auto mt-5 max-w-2xl text-lg text-muted-foreground [animation-delay:180ms]"
      >
        {{ subtitle }}
      </p>
      <div
        v-if="cta"
        class="hero-rise mt-8 flex flex-col items-center justify-center gap-3 [animation-delay:270ms] sm:flex-row"
      >
        <Button variant="coral" size="lg" class="group" as-child>
          <a :href="DEMO_MAILTO">
            Chci demo
            <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
      </div>
    </div>
  </section>
</template>
