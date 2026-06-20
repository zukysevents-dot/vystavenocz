<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Clock, ArrowRight } from 'lucide-vue-next'
import PageHeader from '@/components/landing/PageHeader.vue'
import { getArticlesSortedByDate } from '@/lib/articles'

const articles = getArticlesSortedByDate()
</script>

<template>
  <PageHeader
    eyebrow="Akademie"
    title="Články a rady pro OSVČ"
    subtitle="Praktické návody bez vaty — od založení živnosti přes fakturaci až po daně. Vše ověřeno podle aktuální české legislativy."
  />

  <section class="bg-background pb-24">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="a in articles"
          :key="a.slug"
          :to="`/clanky/${a.slug}`"
          class="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-coral/40 hover:shadow-card"
        >
          <div
            class="mb-3 inline-flex w-fit items-center rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary"
          >
            {{ a.category }}
          </div>
          <h2 class="text-lg font-semibold leading-snug text-foreground group-hover:text-coral">
            {{ a.title }}
          </h2>
          <p class="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
            {{ a.excerpt }}
          </p>
          <div class="mt-5 flex items-center justify-between text-xs text-muted-foreground">
            <span class="inline-flex items-center gap-1.5">
              <Clock class="h-3.5 w-3.5" />
              {{ a.readingMinutes }} min čtení
            </span>
            <span class="inline-flex items-center gap-1 font-medium text-coral">
              Číst
              <ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
