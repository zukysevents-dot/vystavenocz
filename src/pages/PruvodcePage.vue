<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, BookOpenCheck, CheckCircle2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { visibleHelpGuides } from '@/lib/help'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const guides = computed(() => visibleHelpGuides(auth.modules, auth.role))
</script>

<template>
  <div class="mx-auto w-full max-w-6xl p-4 pb-10 pt-20 md:p-8 md:pt-8">
    <div class="max-w-2xl">
      <div class="flex items-center gap-2 text-sm font-medium text-primary">
        <BookOpenCheck class="h-4 w-4" /> Průvodce systémem
      </div>
      <h1 class="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Co chcete udělat?</h1>
      <p class="mt-2 text-muted-foreground">
        Vyberte si krátký postup. Zobrazujeme jen části, které má vaše firma zapnuté.
      </p>
    </div>
    <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="guide in guides"
        :key="guide.id"
        class="flex min-h-64 flex-col rounded-lg border bg-card p-5"
      >
        <h2 class="text-base font-semibold">{{ guide.title }}</h2>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ guide.description }}</p>
        <ol class="mt-5 space-y-2">
          <li v-for="(step, index) in guide.steps" :key="step" class="flex gap-2 text-sm">
            <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span
              ><span class="font-medium">{{ index + 1 }}.</span> {{ step }}</span
            >
          </li>
        </ol>
        <Button
          variant="ghost"
          class="mt-auto justify-start px-0 pt-5 text-primary hover:text-primary"
          @click="router.push(guide.to)"
          >{{ guide.action }} <ArrowRight class="ml-1 h-4 w-4"
        /></Button>
      </article>
    </div>
    <p
      v-if="!guides.length"
      class="mt-8 rounded-lg border bg-card p-5 text-sm text-muted-foreground"
    >
      Zatím nemáte zapnuté žádné pracovní moduly. Nastavte je v předplatném nebo nastavení firmy.
    </p>
  </div>
</template>
