<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DEMO_MAILTO } from '@/lib/landing-cta'

withDefaults(defineProps<{ title: string; hint?: string }>(), {
  hint: 'Ukázka zdarma · bez závazku',
})
</script>

<template>
  <section class="bg-background py-8 sm:py-10">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div
        class="flex flex-col items-start gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
      >
        <div class="flex items-start gap-4">
          <span
            class="mt-1 hidden h-10 w-1 shrink-0 rounded-full bg-coral sm:block"
            aria-hidden="true"
          />
          <div class="min-w-0">
            <p class="text-lg font-semibold leading-snug text-foreground sm:text-xl">
              {{ title }}
            </p>
            <p v-if="hint" class="mt-1 font-mono text-xs text-muted-foreground">{{ hint }}</p>
          </div>
        </div>
        <Button variant="coral" size="lg" class="group w-full shrink-0 sm:w-auto" as-child>
          <a :href="DEMO_MAILTO">
            Chci demo
            <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
      </div>
    </div>
  </section>
</template>
