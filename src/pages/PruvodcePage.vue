<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Lightbulb,
  MousePointerClick,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { visibleHelpGuides } from '@/lib/help'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const guides = computed(() => visibleHelpGuides(auth.modules, auth.role))
</script>

<template>
  <div class="mx-auto w-full max-w-6xl p-4 pb-10 pt-20 md:p-8 md:pt-8">
    <div class="max-w-3xl">
      <div class="flex items-center gap-2 text-sm font-medium text-primary">
        <BookOpenCheck class="h-4 w-4" /> Průvodce systémem
      </div>
      <h1 class="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
        Jak vám dnes Vystaveno pomůže?
      </h1>
      <p class="mt-2 text-muted-foreground">
        Jednoduché návody pro práci ve vaší firmě. Každá karta vysvětluje pojmy, kdy ji použít a co
        přesně udělat.
      </p>
    </div>

    <section class="mt-6 rounded-lg border bg-card p-5">
      <h2 class="font-semibold">Jak Průvodce používat</h2>
      <div class="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
        <p>
          <strong class="text-foreground">1. Vyberte situaci.</strong> Karty odpovídají běžným
          úkolům, ne technickým názvům.
        </p>
        <p>
          <strong class="text-foreground">2. Projděte kroky.</strong> Rozbalte kartu, když si nejste
          jistí významem nebo pořadím.
        </p>
        <p>
          <strong class="text-foreground">3. Otevřete obrazovku.</strong> Tlačítko vás vezme rovnou
          na správné místo.
        </p>
      </div>
    </section>

    <div class="mt-8 grid gap-4 md:grid-cols-2">
      <article
        v-for="guide in guides"
        :key="guide.id"
        class="flex flex-col rounded-lg border bg-card p-5"
      >
        <h2 class="text-base font-semibold">{{ guide.title }}</h2>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ guide.description }}</p>
        <details class="group mt-4 rounded-md bg-muted/50 p-3 text-sm">
          <summary class="cursor-pointer font-medium">
            <MousePointerClick class="mr-1 inline h-4 w-4 text-primary" /> Vysvětlit a ukázat postup
          </summary>
          <div class="mt-4 space-y-4">
            <div>
              <p class="font-medium">Co to znamená</p>
              <p class="mt-1 leading-6 text-muted-foreground">{{ guide.whatItMeans }}</p>
            </div>
            <div>
              <p class="font-medium">Kdy to použít</p>
              <p class="mt-1 leading-6 text-muted-foreground">{{ guide.whenToUse }}</p>
            </div>
            <ol class="space-y-3">
              <li v-for="(item, index) in guide.steps" :key="item.title" class="flex gap-2">
                <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span
                  ><span class="font-medium">{{ index + 1 }}. {{ item.title }}</span
                  ><br /><span class="text-muted-foreground">{{ item.description }}</span></span
                >
              </li>
            </ol>
            <p class="rounded-md border border-primary/20 bg-background p-3 text-muted-foreground">
              <Lightbulb class="mr-1 inline h-4 w-4 text-primary" /><strong class="text-foreground"
                >Tip:</strong
              >
              {{ guide.tip }}
            </p>
          </div>
        </details>
        <Button
          variant="ghost"
          class="mt-4 justify-start px-0 text-primary hover:text-primary"
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
