<script setup lang="ts">
import { FilePlus2, Send, CheckCircle2, Archive } from 'lucide-vue-next'

const stages = [
  {
    icon: FilePlus2,
    title: 'Vystavíš',
    desc: 'AI nebo formulář — za 30 sekund.',
  },
  {
    icon: Send,
    title: 'Pošleš',
    desc: 'Mail s PDF a QR kódem na jeden klik.',
  },
  {
    icon: CheckCircle2,
    title: 'Pohlídá splatnost',
    desc: 'Automatické upomínky bez tvého zásahu.',
  },
  {
    icon: Archive,
    title: 'Najdeš kdykoli',
    desc: 'Všechny faktury, klienti i historie na jednom místě.',
  },
]
</script>

<template>
  <section class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Celý život faktury na jednom místě
        </h2>
        <p class="mt-3 text-base text-muted-foreground sm:text-lg">
          Od vystavení po archiv. Bez Excelu, bez papírů, bez ztracených PDF v mailu.
        </p>
      </div>

      <ol class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li
          v-for="(s, i) in stages"
          :key="s.title"
          class="relative rounded-2xl border border-border bg-card p-5"
        >
          <div class="mb-3 flex items-center justify-between">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft text-foreground"
            >
              <component :is="s.icon" class="h-5 w-5" />
            </div>
            <span class="text-xs font-medium tabular-nums text-muted-foreground/60">
              0{{ i + 1 }}
            </span>
          </div>
          <h3 class="text-base font-semibold text-foreground">{{ s.title }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-muted-foreground">{{ s.desc }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
