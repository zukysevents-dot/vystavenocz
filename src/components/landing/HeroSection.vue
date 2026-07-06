<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight, Check, ShieldCheck, MapPin, MonitorSmartphone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DEMO_MAILTO } from '@/lib/landing-cta'

const benefits = [
  'Gastro bez papírů — mapa stolů, účty, bony do kuchyně i na bar',
  'Sklad, který sedí — receptury, food cost, inventury a skladové zrcadlo',
  'Faktury, rezervace, docházka a zakázky pro služby, řemeslo i obchod',
  'Modulární — každý provoz si zapne a platí jen to, co potřebuje',
]

const signals = [
  { icon: ShieldCheck, label: 'Plně dle českého zákona' },
  { icon: MapPin, label: 'Vyrobeno v Česku' },
  { icon: MonitorSmartphone, label: 'Počítač, tablet i mobil' },
]
</script>

<template>
  <section class="relative overflow-hidden">
    <!-- Base nechává prosvítat landing-aura plátno z PublicLayoutu; mesh jen dokresluje. -->
    <div class="absolute inset-0 -z-10 bg-mesh opacity-[0.16]" aria-hidden="true" />
    <!-- Liquid aura blobs — pomalý organický drift. Wrapper drží pozici (translate),
         vnitřek animuje transform, aby se pozice a animace nepřepsaly. -->
    <div
      class="pointer-events-none absolute -top-44 left-1/2 -z-10 h-[30rem] w-[30rem] -translate-x-[85%] sm:h-[36rem] sm:w-[36rem]"
      aria-hidden="true"
    >
      <div class="blob animate-liquid h-full w-full bg-aura opacity-30 blur-3xl" />
    </div>
    <div
      class="pointer-events-none absolute -right-40 top-40 -z-10 h-[24rem] w-[24rem] sm:h-[30rem] sm:w-[30rem]"
      aria-hidden="true"
    >
      <div class="blob-2 animate-liquid-slow h-full w-full bg-aura opacity-[0.22] blur-3xl" />
    </div>

    <div class="mx-auto max-w-4xl px-4 pb-24 pt-16 text-center sm:px-6 lg:pb-32 lg:pt-24">
      <p
        class="hero-rise inline-flex items-center justify-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
      >
        <span class="h-px w-7 bg-coral" aria-hidden="true" />
        Modulární provozní systém
        <span class="h-px w-7 bg-coral" aria-hidden="true" />
      </p>

      <h1
        class="hero-rise mt-6 font-display font-black leading-[0.95] tracking-[-0.03em] text-foreground text-[clamp(2.8rem,8vw,5.5rem)] [animation-delay:90ms]"
      >
        Jeden systém místo
        <span class="text-gradient-heading text-gradient-animated">pěti aplikací.</span>
      </h1>

      <p
        class="hero-rise mx-auto mt-7 max-w-2xl text-base leading-[1.65] text-muted-foreground [animation-delay:180ms] sm:text-lg"
      >
        Pokladna, restaurace a kuchyně, sklad, rezervace, docházka i fakturace. Místo papírů, Excelů
        a přepisování —
        <span class="font-semibold text-foreground">celý provoz na jednom místě.</span>
      </p>

      <ul
        class="hero-rise mx-auto mt-10 grid max-w-2xl gap-x-8 gap-y-3.5 text-left text-[15px] text-foreground/90 [animation-delay:270ms] sm:grid-cols-2"
      >
        <li v-for="b in benefits" :key="b" class="flex items-start gap-3">
          <span
            class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral/12 text-coral"
          >
            <Check class="h-3 w-3" :stroke-width="2.5" />
          </span>
          <span class="leading-[1.55]">{{ b }}</span>
        </li>
      </ul>

      <div
        class="hero-rise mt-11 flex w-full flex-col justify-center gap-3 [animation-delay:360ms] sm:flex-row sm:items-center"
      >
        <Button size="xl" variant="coral" class="group w-full text-base sm:w-auto" as-child>
          <a :href="DEMO_MAILTO">
            Chci demo
            <ArrowRight class="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
        <Button size="xl" variant="outline" class="w-full sm:w-auto" as-child>
          <RouterLink to="/funkce">Prohlédnout moduly</RouterLink>
        </Button>
      </div>

      <p class="hero-rise mt-4 font-mono text-xs text-muted-foreground [animation-delay:430ms]">
        Ukázka zdarma a bez závazku · odpovídáme do 24 hodin.
      </p>

      <ul
        class="hero-rise mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-2.5 border-t border-border/60 pt-6 text-xs text-muted-foreground [animation-delay:500ms]"
      >
        <li v-for="s in signals" :key="s.label" class="flex items-center gap-1.5">
          <component :is="s.icon" class="h-3.5 w-3.5 text-coral/80" :stroke-width="1.75" />
          {{ s.label }}
        </li>
      </ul>
    </div>
  </section>
</template>
