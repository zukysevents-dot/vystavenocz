<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

withDefaults(defineProps<{ title: string; hint?: string }>(), {
  hint: '14 dní zdarma · bez karty',
})
</script>

<template>
  <section class="bg-background py-10 sm:py-12">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div
        class="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 text-center sm:flex-row sm:text-left"
      >
        <div class="min-w-0">
          <p class="text-base font-semibold text-foreground sm:text-lg">
            {{ title }}
          </p>
          <p v-if="hint" class="mt-0.5 text-xs text-muted-foreground">{{ hint }}</p>
        </div>
        <Button variant="coral" size="lg" class="group shrink-0" as-child>
          <RouterLink to="/registrace">
            Začít zdarma
            <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
          </RouterLink>
        </Button>
      </div>
    </div>
  </section>
</template>
