<script setup lang="ts">
import { Check, Minus } from 'lucide-vue-next'
import { vReveal } from '@/lib/reveal'

type Row = {
  label: string
  us: boolean | string
  dotykacka: boolean | string
  storyous: boolean | string
  fakturoid: boolean | string
}

const ourFeatures: Row[] = [
  {
    label: 'Pokladna i fakturace v jednom',
    us: true,
    dotykacka: 'Doplňky',
    storyous: 'Doplňky',
    fakturoid: false,
  },
  {
    label: 'Modulární — platíte jen za zapnuté moduly',
    us: true,
    dotykacka: false,
    storyous: false,
    fakturoid: false,
  },
  {
    label: 'Receptury, suroviny a food cost',
    us: true,
    dotykacka: 'Doplněk',
    storyous: 'Doplněk',
    fakturoid: false,
  },
  {
    label: 'Skladové zrcadlo: má být / realita / rozdíl v Kč',
    us: true,
    dotykacka: 'Omezeně',
    storyous: 'Omezeně',
    fakturoid: false,
  },
  {
    label: 'Provozní přehled: marže, výkon obsluhy, ztráty, ležáky',
    us: true,
    dotykacka: 'Omezeně',
    storyous: 'Omezeně',
    fakturoid: false,
  },
  {
    label: 'Rezervace s hlídáním kolizí',
    us: true,
    dotykacka: false,
    storyous: false,
    fakturoid: false,
  },
  {
    label: 'Docházka + export pro mzdy',
    us: true,
    dotykacka: false,
    storyous: false,
    fakturoid: false,
  },
  {
    label: 'Zakázky a servisní výjezdy',
    us: true,
    dotykacka: false,
    storyous: false,
    fakturoid: false,
  },
  {
    label: 'AI pomocník u faktur (česky)',
    us: true,
    dotykacka: false,
    storyous: false,
    fakturoid: false,
  },
]

const standardFeatures: Row[] = [
  { label: 'Dotyková pokladna (POS)', us: true, dotykacka: true, storyous: true, fakturoid: false },
  {
    label: 'Účty na stůl a mapa stolů',
    us: true,
    dotykacka: true,
    storyous: true,
    fakturoid: false,
  },
  {
    label: 'Bony do kuchyně a na bar (KDS)',
    us: true,
    dotykacka: true,
    storyous: true,
    fakturoid: false,
  },
  { label: 'Sklad a inventura', us: true, dotykacka: true, storyous: true, fakturoid: false },
  {
    label: 'Uzávěrky a denní Z-report',
    us: true,
    dotykacka: true,
    storyous: true,
    fakturoid: false,
  },
  {
    label: 'Faktury s DPH a QR (ČBA standard)',
    us: true,
    dotykacka: 'Omezeně',
    storyous: 'Omezeně',
    fakturoid: true,
  },
  {
    label: 'Mobil / tablet bez instalace (PWA)',
    us: true,
    dotykacka: 'Aplikace',
    storyous: 'Aplikace',
    fakturoid: 'Aplikace',
  },
  { label: 'Tmavý režim', us: true, dotykacka: false, storyous: false, fakturoid: false },
]

const honestFeatures: Row[] = [
  {
    label: 'Veřejná registrace bez čekání',
    us: 'Early access',
    dotykacka: true,
    storyous: true,
    fakturoid: true,
  },
  {
    label: 'Tisk na pokladní tiskárně',
    us: 'Připravujeme',
    dotykacka: true,
    storyous: true,
    fakturoid: false,
  },
  {
    label: 'Nativní mobilní aplikace',
    us: 'Připravujeme',
    dotykacka: true,
    storyous: true,
    fakturoid: true,
  },
  {
    label: 'Vlastní pokladní hardware',
    us: false,
    dotykacka: true,
    storyous: true,
    fakturoid: false,
  },
  {
    label: 'Veřejné REST API',
    us: 'Připravujeme',
    dotykacka: true,
    storyous: true,
    fakturoid: true,
  },
]

const priceRow: Row = {
  label: 'Cena od (měsíčně, orientační)',
  us: '149 Kč',
  dotykacka: 'dle balíčku',
  storyous: 'dle balíčku',
  fakturoid: '151 Kč',
}

const sections: { title: string; subtitle?: string; data: Row[] }[] = [
  {
    title: 'Co umíme navíc — vše v jednom, modulárně',
    subtitle:
      'Pokladna, restaurace, sklad, docházka, rezervace, zakázky i fakturace pod jedním účtem.',
    data: ourFeatures,
  },
  {
    title: 'Standard, ve kterém držíme krok',
    data: standardFeatures,
  },
  {
    title: 'Buďme upřímní — tohle zatím neumíme',
    subtitle:
      'Vystaveno běží na vašem počítači, tabletu nebo telefonu — vlastní pokladní hardware neprodáváme. EET 2.0 přidáme, jakmile bude legislativně aktuální.',
    data: honestFeatures,
  },
]
</script>

<template>
  <section id="srovnani" class="bg-surface-soft py-16 sm:py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div v-reveal class="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[680px]">
            <thead>
              <tr class="border-b border-border bg-surface">
                <th
                  class="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Funkce
                </th>
                <th
                  class="bg-coral/10 px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-coral"
                >
                  Vystaveno.cz
                </th>
                <th
                  class="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Dotykačka
                </th>
                <th
                  class="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Storyous
                </th>
                <th
                  class="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Fakturoid
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="section in sections" :key="section.title">
                <tr class="bg-surface">
                  <td colspan="5" class="px-5 py-3">
                    <p class="text-xs font-bold uppercase tracking-wider text-foreground">
                      {{ section.title }}
                    </p>
                    <p v-if="section.subtitle" class="mt-0.5 text-xs text-muted-foreground">
                      {{ section.subtitle }}
                    </p>
                  </td>
                </tr>
                <tr
                  v-for="(r, i) in section.data"
                  :key="r.label"
                  :class="i % 2 === 0 ? 'bg-background' : 'bg-surface/40'"
                >
                  <td class="px-5 py-3.5 text-sm font-medium text-foreground">{{ r.label }}</td>
                  <td class="bg-coral/5 px-5 py-3.5 text-center">
                    <template v-if="typeof r.us === 'boolean'">
                      <Check v-if="r.us" class="mx-auto h-5 w-5 text-coral" />
                      <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                    </template>
                    <span v-else class="text-sm font-semibold text-coral">{{ r.us }}</span>
                  </td>
                  <td class="px-5 py-3.5 text-center">
                    <template v-if="typeof r.dotykacka === 'boolean'">
                      <Check v-if="r.dotykacka" class="mx-auto h-5 w-5 text-success" />
                      <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                    </template>
                    <span v-else class="text-sm font-semibold text-muted-foreground">{{
                      r.dotykacka
                    }}</span>
                  </td>
                  <td class="px-5 py-3.5 text-center">
                    <template v-if="typeof r.storyous === 'boolean'">
                      <Check v-if="r.storyous" class="mx-auto h-5 w-5 text-success" />
                      <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                    </template>
                    <span v-else class="text-sm font-semibold text-muted-foreground">{{
                      r.storyous
                    }}</span>
                  </td>
                  <td class="px-5 py-3.5 text-center">
                    <template v-if="typeof r.fakturoid === 'boolean'">
                      <Check v-if="r.fakturoid" class="mx-auto h-5 w-5 text-success" />
                      <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                    </template>
                    <span v-else class="text-sm font-semibold text-muted-foreground">{{
                      r.fakturoid
                    }}</span>
                  </td>
                </tr>
              </template>

              <tr class="border-t-2 border-border bg-coral/5">
                <td class="px-5 py-4 text-sm font-bold text-foreground">{{ priceRow.label }}</td>
                <td class="bg-coral/10 px-5 py-4 text-center">
                  <template v-if="typeof priceRow.us === 'boolean'">
                    <Check v-if="priceRow.us" class="mx-auto h-5 w-5 text-coral" />
                    <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                  </template>
                  <span v-else class="text-sm font-semibold text-coral">{{ priceRow.us }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <template v-if="typeof priceRow.dotykacka === 'boolean'">
                    <Check v-if="priceRow.dotykacka" class="mx-auto h-5 w-5 text-success" />
                    <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                  </template>
                  <span v-else class="text-sm font-semibold text-muted-foreground">{{
                    priceRow.dotykacka
                  }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <template v-if="typeof priceRow.storyous === 'boolean'">
                    <Check v-if="priceRow.storyous" class="mx-auto h-5 w-5 text-success" />
                    <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                  </template>
                  <span v-else class="text-sm font-semibold text-muted-foreground">{{
                    priceRow.storyous
                  }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <template v-if="typeof priceRow.fakturoid === 'boolean'">
                    <Check v-if="priceRow.fakturoid" class="mx-auto h-5 w-5 text-success" />
                    <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                  </template>
                  <span v-else class="text-sm font-semibold text-muted-foreground">{{
                    priceRow.fakturoid
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="mt-4 text-center text-xs text-muted-foreground">
        Orientační srovnání k 7/2026 podle veřejně dostupných informací. Ceny a rozsah balíčků
        konkurence se liší podle sestavy a hardwaru. Platí obdobně i pro další fakturační nástroje
        (iDoklad) a samostatné skladové či rezervační systémy.
      </p>
    </div>
  </section>
</template>
