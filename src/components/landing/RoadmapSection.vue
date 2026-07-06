<script setup lang="ts">
import { computed } from 'vue'
import { Check, Clock, Sparkles } from 'lucide-vue-next'
import { vReveal } from '@/lib/reveal'

type Status = 'done' | 'soon' | 'planned'

const items: { title: string; desc: string; status: Status; when?: string }[] = [
  {
    title: 'Pokladna (POS)',
    desc: 'Dotykový prodej, dlaždice produktů, platba hotově i kartou, účtenka.',
    status: 'done',
  },
  {
    title: 'Restaurace a kuchyně',
    desc: 'Mapa stolů, účty na stůl, rozdělení účtu, bony do kuchyně i na bar (KDS).',
    status: 'done',
  },
  {
    title: 'Sklad, příjemky a zásoby',
    desc: 'Nákupní příjemky, výdeje, hlídání minim a doporučené doobjednání.',
    status: 'done',
  },
  {
    title: 'Receptury a food cost',
    desc: 'Prodej odečte suroviny podle receptury; marže a food cost u každého produktu.',
    status: 'done',
  },
  {
    title: 'Skladové zrcadlo a inventury',
    desc: 'Stav má být vs. realita vs. rozdíl — v kusech i korunách, po pobočkách.',
    status: 'done',
  },
  {
    title: 'Uzávěrky a Z-report',
    desc: 'Denní uzávěrka s kontrolou hotovosti, DPH a exportem pro účetní.',
    status: 'done',
  },
  {
    title: 'Docházka zaměstnanců',
    desc: 'Píchačka, přehled odpracovaných hodin a export do CSV pro mzdy.',
    status: 'done',
  },
  {
    title: 'Rezervace',
    desc: 'Kalendář služeb a zdrojů s hlídáním kolizí termínů.',
    status: 'done',
  },
  {
    title: 'Fakturace a klienti',
    desc: 'Faktury s DPH, QR platby a evidence klientů — vše propojené.',
    status: 'done',
  },
  {
    title: 'Modulární zapínání per firma',
    desc: 'Každá firma si zapne a platí jen moduly, které opravdu používá.',
    status: 'done',
  },
  {
    title: 'Provozní přehled pro majitele',
    desc: 'Tržby, marže, výkon obsluhy, ztráty skladu a ležáky — na jedné obrazovce.',
    status: 'done',
  },
  {
    title: 'QR objednávky ke stolu',
    desc: 'Host si objedná mobilem přes QR kód — objednávka jde rovnou do kuchyně.',
    status: 'done',
  },
  {
    title: 'Veřejné spuštění a online registrace',
    desc: 'Teď jedeme early access s osobním nasazením — napište si o přístup.',
    status: 'soon',
  },
  {
    title: 'Mobilní aplikace',
    desc: 'Nativní appka pro telefon i tablet. Už dnes běží vše v prohlížeči (PWA).',
    status: 'soon',
    when: 'Q4 2026',
  },
  {
    title: 'EET 2.0',
    desc: 'Přidáme, jakmile bude evidence tržeb znovu legislativně aktuální.',
    status: 'planned',
  },
]

const statusMap: Record<Status, { label: string; dot: string; chip: string; icon: typeof Check }> =
  {
    done: { label: 'Hotovo', dot: 'bg-success', chip: 'bg-success/15 text-success', icon: Check },
    soon: { label: 'Brzy', dot: 'bg-coral', chip: 'bg-coral/15 text-coral', icon: Sparkles },
    planned: {
      label: 'V plánu',
      dot: 'bg-muted-foreground',
      chip: 'bg-muted text-muted-foreground',
      icon: Clock,
    },
  }

const done = computed(() => items.filter((i) => i.status === 'done'))
const upcoming = computed(() => items.filter((i) => i.status !== 'done'))
</script>

<template>
  <section class="bg-surface/40 py-20 sm:py-28">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div v-reveal class="max-w-2xl">
        <p
          class="flex items-center gap-3 font-mono text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span class="h-px w-7 bg-coral" aria-hidden="true" />
          Roadmapa
        </p>
        <h2
          class="mt-5 font-display text-3xl font-black leading-[1.02] tracking-[-0.02em] text-foreground sm:text-[2.75rem]"
        >
          Co už umíme a co chystáme
        </h2>
        <p class="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Vystaveno se vyvíjí každý týden podle zpětné vazby od skutečných provozů. Tady je, na čem
          pracujeme.
        </p>
      </div>

      <div class="mt-12 grid gap-x-6 gap-y-10 lg:grid-cols-3">
        <!-- Done — the proof block (dominant). -->
        <div v-reveal class="lg:col-span-2">
          <div class="flex items-center gap-2.5">
            <span
              :class="`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMap.done.chip}`"
            >
              <Check class="h-3 w-3" :stroke-width="2.5" />
              {{ statusMap.done.label }}
            </span>
            <span class="font-mono text-xs text-muted-foreground">{{ done.length }} modulů</span>
          </div>
          <ul class="mt-5 grid gap-3 sm:grid-cols-2">
            <li
              v-for="item in done"
              :key="item.title"
              class="rounded-xl border border-border bg-card p-4"
            >
              <div class="flex items-start gap-2.5">
                <span :class="`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusMap.done.dot}`" />
                <div>
                  <h3 class="text-sm font-semibold text-foreground">{{ item.title }}</h3>
                  <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ item.desc }}</p>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Upcoming — sidebar. -->
        <div v-reveal="{ delay: 140 }" class="space-y-3">
          <ul class="space-y-3">
            <li
              v-for="item in upcoming"
              :key="item.title"
              class="rounded-xl border border-border bg-card p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <span
                  :class="`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMap[item.status].chip}`"
                >
                  <component :is="statusMap[item.status].icon" class="h-3 w-3" />
                  {{ statusMap[item.status].label }}
                </span>
                <span v-if="item.when" class="font-mono text-xs text-muted-foreground">
                  {{ item.when }}
                </span>
              </div>
              <h3 class="mt-3 text-sm font-semibold text-foreground">{{ item.title }}</h3>
              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ item.desc }}</p>
            </li>
          </ul>
        </div>
      </div>

      <p class="mt-10 max-w-xl text-sm text-muted-foreground">
        Chybí ti něco konkrétního? Napiš nám na
        <a href="mailto:patrik@vystaveno.cz" class="font-medium text-foreground underline">
          patrik@vystaveno.cz
        </a>
        — funkce přidáváme podle poptávky.
      </p>
    </div>
  </section>
</template>
