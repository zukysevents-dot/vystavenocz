<script setup lang="ts">
import {
  Sparkles,
  QrCode,
  FileText,
  Languages,
  Repeat,
  Briefcase,
  Receipt,
  Shield,
  Globe,
  PieChart,
  Bell,
  Smartphone,
  Save,
  Stamp,
  FileMinus,
  CheckCircle2,
} from 'lucide-vue-next'

const features = [
  {
    icon: Sparkles,
    title: 'AI asistent v češtině',
    desc: 'Napište „změň splatnost na 30 dní" nebo „přidej slevu 10 %" a faktura se aktualizuje sama.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: QrCode,
    title: 'QR platba na každé faktuře',
    desc: 'Standardní QR kód podle ČBA. Klient zaplatí naskenováním v bance za 5 sekund.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: FileMinus,
    title: 'Dobropisy (opravné doklady)',
    desc: 'Z vystavené faktury jedním klikem vytvoříte opravný daňový doklad s vlastní řadou OD- a vazbou na původní fakturu.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: Save,
    title: 'Autosave konceptů',
    desc: 'Každých 30 sekund automaticky ukládáme rozpracovanou fakturu na pozadí. O práci nepřijdete, ani když zavřete tab.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: Stamp,
    title: 'Vodoznak STORNOVÁNO v PDF',
    desc: 'Stornované faktury mají v PDF výrazný vodoznak přes celou stránku — na první pohled je jasné, že doklad není platný.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: CheckCircle2,
    title: 'Chytrá validace konceptů',
    desc: 'Koncept uložíte i napůl rozpracovaný — stačí číslo faktury. Přísnou kontrolu spustíme až při finálním vystavení.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: FileText,
    title: 'Plně český formát',
    desc: 'IČO, DIČ, DPH 21/15/10/0 %, DUZP, datum vystavení a splatnosti, číselné řady.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: Repeat,
    title: 'Opakované faktury',
    desc: 'Měsíční předplatné nebo paušály se vystaví a odešlou samy. Připomínky platby v ceně.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: Receipt,
    title: 'Všechny měrné jednotky',
    desc: 'Ks, hodina, den, kg, m, m², m³, balení, paušál — i vlastní jednotky bez omezení.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: Briefcase,
    title: 'Logo a vlastní vzhled',
    desc: 'Nahrajte logo, vyberte barvu a šablonu. Faktura, která vypadá jako vy.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: Shield,
    title: 'Legislativa pod kontrolou',
    desc: 'Reverse charge, OSS, neplátce DPH, zaokrouhlení, zákonné náležitosti — vše hlídá systém.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: Languages,
    title: 'Faktury v cizí měně',
    desc: 'EUR, USD, GBP a další. Kurz ČNB stahujeme automaticky každý den.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: Globe,
    title: 'Klientské portfolio',
    desc: 'Adresář klientů s historií, dluhy, průměrnou splatností a poznámkami.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: PieChart,
    title: 'Přehledný dashboard',
    desc: 'Příjmy, neuhrazené, po splatnosti, predikce cash-flow. Jednou na první pohled.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: Bell,
    title: 'Automatické upomínky',
    desc: 'Slušné připomínky platby s gradací 3, 7, 14 dní po splatnosti — česky a včas.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: Smartphone,
    title: 'Mobil-first',
    desc: 'Vystavte fakturu z tramvaje. Plnohodnotná aplikace v prohlížeči, bez instalace.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
]
</script>

<template>
  <section id="funkce" class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="f in features"
          :key="f.title"
          class="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
        >
          <div
            class="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
            :class="[f.bg, f.color]"
          >
            <component :is="f.icon" class="h-5 w-5" />
          </div>
          <h3 class="text-base font-semibold text-foreground">{{ f.title }}</h3>
          <p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{{ f.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
