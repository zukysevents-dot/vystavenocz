<script setup lang="ts">
import { Check, Minus } from 'lucide-vue-next'

type Row = {
  label: string
  us: boolean | string
  fakturoid: boolean | string
  idoklad: boolean | string
  vyfakturuj: boolean | string
}

const ourFeatures: Row[] = [
  { label: 'AI asistent v češtině', us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  {
    label: 'Autosave konceptů (30 s)',
    us: true,
    fakturoid: false,
    idoklad: false,
    vyfakturuj: false,
  },
  {
    label: 'Vodoznak STORNOVÁNO v PDF',
    us: true,
    fakturoid: false,
    idoklad: false,
    vyfakturuj: false,
  },
  {
    label: 'Cash-flow predikce zdarma',
    us: true,
    fakturoid: 'Maximum',
    idoklad: false,
    vyfakturuj: false,
  },
  {
    label: 'Opakované faktury zdarma',
    us: true,
    fakturoid: 'Maximum',
    idoklad: 'Plus',
    vyfakturuj: false,
  },
  {
    label: 'Automatické upomínky zdarma',
    us: true,
    fakturoid: 'Na každý den',
    idoklad: 'Plus',
    vyfakturuj: false,
  },
  {
    label: 'Dobropisy s vlastní řadou OD-',
    us: true,
    fakturoid: true,
    idoklad: true,
    vyfakturuj: 'Omezeně',
  },
  {
    label: 'Chytrá validace konceptů',
    us: true,
    fakturoid: 'Omezeně',
    idoklad: 'Omezeně',
    vyfakturuj: false,
  },
]

const standardFeatures: Row[] = [
  { label: 'QR platba (ČBA standard)', us: true, fakturoid: true, idoklad: true, vyfakturuj: true },
  {
    label: 'Vlastní logo a šablony',
    us: true,
    fakturoid: true,
    idoklad: true,
    vyfakturuj: 'Omezeně',
  },
  { label: 'Klientské portfolio', us: true, fakturoid: true, idoklad: true, vyfakturuj: true },
  { label: 'Cizí měny + kurz ČNB', us: true, fakturoid: true, idoklad: true, vyfakturuj: false },
  {
    label: 'Reverse charge & OSS',
    us: true,
    fakturoid: 'Maximum',
    idoklad: true,
    vyfakturuj: false,
  },
  {
    label: 'Web faktury s odkazem pro klienta',
    us: true,
    fakturoid: true,
    idoklad: true,
    vyfakturuj: false,
  },
  {
    label: 'Export do účetnictví (ISDOC, XML)',
    us: true,
    fakturoid: 'Na lehko',
    idoklad: true,
    vyfakturuj: 'Omezeně',
  },
  {
    label: 'Mobil-first (bez instalace)',
    us: true,
    fakturoid: 'Aplikace',
    idoklad: 'Aplikace',
    vyfakturuj: true,
  },
]

const honestFeatures: Row[] = [
  { label: 'Vedení skladu', us: false, fakturoid: 'Maximum', idoklad: 'Plus', vyfakturuj: false },
  { label: 'Cenové nabídky', us: 'Brzy', fakturoid: 'Maximum', idoklad: true, vyfakturuj: true },
  { label: 'Veřejné REST API', us: 'Brzy', fakturoid: true, idoklad: true, vyfakturuj: false },
  {
    label: 'Nativní mobilní aplikace',
    us: false,
    fakturoid: true,
    idoklad: true,
    vyfakturuj: false,
  },
]

const priceRow: Row = {
  label: 'Cena od (měsíčně, ročně placeno)',
  us: '100 Kč',
  fakturoid: '151 Kč',
  idoklad: '270 Kč',
  vyfakturuj: '149 Kč',
}

const sections: { title: string; subtitle?: string; data: Row[] }[] = [
  {
    title: 'Co umíme my a konkurence ne (nebo až v dražším tarifu)',
    data: ourFeatures,
  },
  {
    title: 'Standard, ve kterém držíme krok',
    data: standardFeatures,
  },
  {
    title: 'Buďme upřímní — tohle zatím neumíme',
    subtitle: 'Pro většinu OSVČ to neřeší. Pokud potřebujete sklad nebo API, řekněte nám to.',
    data: honestFeatures,
  },
]
</script>

<template>
  <section id="srovnani" class="bg-surface-soft py-16 sm:py-20">
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
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
                  Fakturoid
                </th>
                <th
                  class="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  iDoklad
                </th>
                <th
                  class="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Vyfakturuj
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
                    <template v-if="typeof r.fakturoid === 'boolean'">
                      <Check v-if="r.fakturoid" class="mx-auto h-5 w-5 text-success" />
                      <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                    </template>
                    <span v-else class="text-sm font-semibold text-muted-foreground">{{
                      r.fakturoid
                    }}</span>
                  </td>
                  <td class="px-5 py-3.5 text-center">
                    <template v-if="typeof r.idoklad === 'boolean'">
                      <Check v-if="r.idoklad" class="mx-auto h-5 w-5 text-success" />
                      <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                    </template>
                    <span v-else class="text-sm font-semibold text-muted-foreground">{{
                      r.idoklad
                    }}</span>
                  </td>
                  <td class="px-5 py-3.5 text-center">
                    <template v-if="typeof r.vyfakturuj === 'boolean'">
                      <Check v-if="r.vyfakturuj" class="mx-auto h-5 w-5 text-success" />
                      <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                    </template>
                    <span v-else class="text-sm font-semibold text-muted-foreground">{{
                      r.vyfakturuj
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
                  <template v-if="typeof priceRow.fakturoid === 'boolean'">
                    <Check v-if="priceRow.fakturoid" class="mx-auto h-5 w-5 text-success" />
                    <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                  </template>
                  <span v-else class="text-sm font-semibold text-muted-foreground">{{
                    priceRow.fakturoid
                  }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <template v-if="typeof priceRow.idoklad === 'boolean'">
                    <Check v-if="priceRow.idoklad" class="mx-auto h-5 w-5 text-success" />
                    <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                  </template>
                  <span v-else class="text-sm font-semibold text-muted-foreground">{{
                    priceRow.idoklad
                  }}</span>
                </td>
                <td class="px-5 py-4 text-center">
                  <template v-if="typeof priceRow.vyfakturuj === 'boolean'">
                    <Check v-if="priceRow.vyfakturuj" class="mx-auto h-5 w-5 text-success" />
                    <Minus v-else class="mx-auto h-5 w-5 text-muted-foreground/40" />
                  </template>
                  <span v-else class="text-sm font-semibold text-muted-foreground">{{
                    priceRow.vyfakturuj
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="mt-4 text-center text-xs text-muted-foreground">
        Ceny konkurence k 4/2026, vždy nejnižší placený tarif s ročním předplatným. Zdroj: veřejné
        ceníky.
      </p>
    </div>
  </section>
</template>
