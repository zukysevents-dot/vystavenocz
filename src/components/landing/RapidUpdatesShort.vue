<script setup lang="ts">
import { Clock, Mail } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
</script>

<template>
  <section class="bg-surface-soft py-14 sm:py-16">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
      <div
        class="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
      >
        <Clock class="h-3.5 w-3.5" />
        Stavíme to s vámi
      </div>
      <h2 class="font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
        Co napíšete, to brzo uvidíte
      </h2>
      <p class="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
        Drobná vylepšení napříč moduly obvykle nasadíme do pár dní. Když vám něco v provozu chybí,
        napište — odpovídáme osobně.
      </p>

      <div class="mt-6 flex justify-center">
        <Button variant="outline" size="lg" as-child>
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
