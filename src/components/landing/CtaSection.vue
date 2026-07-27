<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { REGISTER_ROUTE, LOGIN_ROUTE, CONTACT_EMAIL } from '@/lib/landing-cta'
import { vReveal } from '@/lib/reveal'
</script>

<template>
  <section class="py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <!-- Dark anchor + signature aura: the page closes with confidence.
           .aura-panel + ring = měkký glow do okolí místo tvrdé hrany. -->
      <div
        v-reveal
        class="dark bg-ink-gradient aura-panel relative isolate overflow-hidden rounded-[2rem] px-6 py-20 text-center text-foreground ring-1 ring-white/10 sm:px-16 sm:py-28"
      >
        <div
          class="pointer-events-none absolute left-1/2 top-[62%] -z-10 aspect-square w-[130%] max-w-3xl -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <div class="blob animate-liquid h-full w-full bg-aura opacity-40 blur-3xl" />
        </div>
        <div
          class="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-40"
          aria-hidden="true"
        />

        <p
          class="mb-6 inline-flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span class="h-px w-7 bg-coral" aria-hidden="true" />
          Začněte ještě dnes
        </p>
        <h2
          class="mx-auto max-w-2xl font-display text-4xl font-black leading-[1.0] tracking-[-0.02em] text-foreground sm:text-[3.25rem]"
        >
          Uvidíte to na <span class="text-gradient-heading">vlastním provozu.</span>
        </h2>
        <p class="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Založte si účet a začněte jen s fakturami. Podle vašeho oboru vám sami nabídneme, co se
          hodí přidat — pokladnu, sklad, rezervace nebo zakázky.
        </p>
        <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="coral" size="xl" class="group h-14 px-10 text-base" as-child>
            <RouterLink :to="REGISTER_ROUTE">
              Vyzkoušet zdarma
              <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
            </RouterLink>
          </Button>
          <Button variant="outline" size="xl" class="h-14 px-8 text-base" as-child>
            <RouterLink :to="LOGIN_ROUTE">Přihlásit se</RouterLink>
          </Button>
        </div>
        <p class="mt-5 font-mono text-xs text-muted-foreground">
          14 dní zdarma, bez karty · {{ CONTACT_EMAIL }}
        </p>
      </div>
    </div>
  </section>
</template>
