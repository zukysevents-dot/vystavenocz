<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getArticleBySlug, getRelatedArticles } from '@/lib/articles'
import { Clock, ArrowLeft, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DEMO_MAILTO } from '@/lib/landing-cta'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const article = computed(() => getArticleBySlug(slug.value))
const related = computed(() => (article.value ? getRelatedArticles(article.value.slug, 3) : []))

const formattedDate = computed(() =>
  article.value
    ? new Date(article.value.publishedAt).toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '',
)
</script>

<template>
  <div v-if="!article" class="mx-auto max-w-2xl px-4 py-24 text-center">
    <h1 class="text-3xl font-bold">Článek nenalezen</h1>
    <p class="mt-3 text-muted-foreground">Tento článek neexistuje nebo byl přesunut.</p>
    <Button variant="coral" class="mt-6" as-child>
      <RouterLink to="/clanky">Zpět na všechny články</RouterLink>
    </Button>
  </div>

  <article v-else class="bg-background">
    <header class="relative overflow-hidden border-b border-border bg-hero">
      <div class="absolute inset-0 bg-mesh opacity-50" aria-hidden />
      <div class="relative mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <RouterLink
          to="/clanky"
          class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="h-3.5 w-3.5" /> Zpět na články
        </RouterLink>
        <div
          class="mt-5 inline-flex w-fit items-center rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary"
        >
          {{ article.category }}
        </div>
        <h1
          class="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
        >
          {{ article.title }}
        </h1>
        <p class="mt-5 text-lg text-muted-foreground">{{ article.excerpt }}</p>
        <div class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span>{{ formattedDate }}</span>
          <span class="inline-flex items-center gap-1.5">
            <Clock class="h-3.5 w-3.5" />
            {{ article.readingMinutes }} min čtení
          </span>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <section v-for="section in article.sections" :key="section.heading" class="mb-10 last:mb-0">
        <h2 class="mb-5 text-2xl font-bold tracking-tight text-foreground">
          {{ section.heading }}
        </h2>
        <div class="space-y-4">
          <template v-for="(block, i) in section.blocks" :key="i">
            <p v-if="block.type === 'p'" class="text-[15px] leading-[1.75] text-foreground/90">
              {{ block.text }}
            </p>
            <ul
              v-else-if="block.type === 'ul'"
              class="list-disc space-y-2 pl-5 text-[15px] leading-[1.7] text-foreground/90 marker:text-coral"
            >
              <li v-for="(it, j) in block.items" :key="j">{{ it }}</li>
            </ul>
            <ol
              v-else-if="block.type === 'ol'"
              class="list-decimal space-y-2 pl-5 text-[15px] leading-[1.7] text-foreground/90 marker:font-semibold marker:text-coral"
            >
              <li v-for="(it, j) in block.items" :key="j">{{ it }}</li>
            </ol>
            <div
              v-else
              class="flex gap-3 rounded-xl border p-4 text-[14px] leading-[1.6]"
              :class="
                block.variant === 'tip'
                  ? 'border-coral/30 bg-coral/5 text-foreground'
                  : 'border-destructive/30 bg-destructive/5 text-foreground'
              "
            >
              <component
                :is="block.variant === 'tip' ? Lightbulb : AlertTriangle"
                class="mt-0.5 h-4 w-4 shrink-0 text-coral"
              />
              <p>{{ block.text }}</p>
            </div>
          </template>
        </div>
      </section>

      <section v-if="article.faq && article.faq.length > 0" class="mt-12">
        <h2 class="mb-5 text-2xl font-bold tracking-tight text-foreground">Časté otázky</h2>
        <Accordion
          type="single"
          collapsible
          class="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <AccordionItem
            v-for="(f, i) in article.faq"
            :key="f.q"
            :value="`faq-${i}`"
            class="border-b border-border last:border-b-0"
          >
            <AccordionTrigger
              class="px-5 py-4 text-left text-[15px] font-semibold text-foreground hover:no-underline"
            >
              {{ f.q }}
            </AccordionTrigger>
            <AccordionContent class="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
              {{ f.a }}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <!-- CTA — využít to, že čtenář dočetl -->
      <div class="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
        <h3 class="text-xl font-bold text-foreground">Faktury, pokladna i sklad v jednom</h3>
        <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Vystaveno spouštíme pro první provozy. Napište si o ukázku — zdarma a bez závazku.
        </p>
        <Button variant="coral" size="lg" class="group mt-5" as-child>
          <a :href="DEMO_MAILTO">
            Chci demo
            <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
      </div>
    </div>

    <!-- Related -->
    <section v-if="related.length > 0" class="border-t border-border bg-surface-soft py-14">
      <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 class="mb-6 text-xl font-bold text-foreground">Mohlo by tě zajímat</h2>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <RouterLink
            v-for="r in related"
            :key="r.slug"
            :to="`/clanky/${r.slug}`"
            class="group rounded-xl border border-border bg-card p-5 transition-all hover:border-coral/40 hover:shadow-card"
          >
            <div class="text-[11px] font-medium uppercase tracking-wide text-coral">
              {{ r.category }}
            </div>
            <h3
              class="mt-2 text-base font-semibold leading-snug text-foreground group-hover:text-coral"
            >
              {{ r.title }}
            </h3>
            <p class="mt-2 line-clamp-2 text-sm text-muted-foreground">{{ r.excerpt }}</p>
          </RouterLink>
        </div>
      </div>
    </section>
  </article>
</template>
