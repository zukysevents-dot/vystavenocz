<script setup lang="ts">
import { Mail } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { vReveal } from '@/lib/reveal'
</script>

<template>
  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div
        v-reveal
        class="flex flex-col items-start gap-6 rounded-3xl border border-border bg-surface-soft p-8 sm:p-10 md:flex-row md:items-center md:justify-between"
      >
        <div class="max-w-xl">
          <p
            class="flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
          >
            <span class="h-px w-7 bg-coral" aria-hidden="true" />
            Stavíme to s vámi
          </p>
          <h2
            class="mt-4 font-display text-2xl font-black leading-[1.05] tracking-[-0.02em] text-foreground sm:text-3xl"
          >
            Co napíšete, to <span class="text-gradient-heading">brzo uvidíte</span>
          </h2>
          <p class="mt-3 text-base leading-relaxed text-muted-foreground">
            Drobná vylepšení napříč moduly obvykle nasadíme do pár dní. Když vám něco v provozu
            chybí, napište — odpovídáme osobně.
          </p>
        </div>

        <Button variant="outline" size="lg" class="shrink-0" as-child>
          <a
            href="mailto:patrik@vystaveno.cz?subject=N%C3%A1vrh%20na%20vylep%C5%A1en%C3%AD%20Vystaveno"
          >
            <Mail class="h-4 w-4" />
            Navrhnout vylepšení
          </a>
        </Button>
      </div>
    </div>
  </section>
</template>
