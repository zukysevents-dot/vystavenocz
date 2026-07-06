<script setup lang="ts">
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { faqs } from '@/lib/faq-data'
import { vReveal } from '@/lib/reveal'
</script>

<template>
  <section id="faq" class="bg-surface/40 py-16 sm:py-20">
    <div v-reveal class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <Accordion
        type="single"
        collapsible
        class="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
      >
        <AccordionItem
          v-for="(f, i) in faqs"
          :key="f.q"
          :value="`item-${i}`"
          class="border-b border-border last:border-b-0"
        >
          <AccordionTrigger
            class="px-6 py-4 text-left text-base font-semibold text-foreground hover:no-underline"
          >
            {{ f.q }}
          </AccordionTrigger>
          <AccordionContent class="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
            {{ f.a }}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  </section>
</template>
