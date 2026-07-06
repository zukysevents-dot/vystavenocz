<script setup lang="ts">
import {
  ShoppingCart,
  Users,
  UtensilsCrossed,
  Tags,
  Package,
  ChefHat,
  Scale,
  Clock,
  CalendarDays,
  FileText,
  ClipboardCheck,
  BarChart3,
  Contact,
  Building2,
  ShieldCheck,
  Moon,
  Smartphone,
  Landmark,
  ToggleRight,
} from 'lucide-vue-next'
import { vReveal } from '@/lib/reveal'

const features = [
  {
    icon: ShoppingCart,
    title: 'Dotyková pokladna',
    desc: 'Prodejní obrazovka s dlaždicemi produktů, platba hotově i kartou, účtenka na jeden ťuk.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: Users,
    title: 'Účty na stůl',
    desc: 'Mapa stolů, otevřené účty, přesun položek mezi stoly i rozdělení účtu mezi hosty.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: UtensilsCrossed,
    title: 'Bony do kuchyně a baru',
    desc: 'Objednávka putuje rovnou na kuchyňský displej (KDS) a na bar — bez papírků a křiku přes pas.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: Tags,
    title: 'Kategorie a katalog',
    desc: 'Produkty a služby rozdělené do kategorií. Stejný katalog pro pokladnu, sklad i faktury.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: Package,
    title: 'Sklad, příjemky a zásoby',
    desc: 'Nákupní příjemky, výdeje i korekce. Systém hlídá minima a doporučí, co doobjednat.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: ChefHat,
    title: 'Receptury a food cost',
    desc: 'Prodej porce odečte suroviny podle receptury. U každého jídla vidíte náklad, marži i food cost.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: Scale,
    title: 'Skladové zrcadlo a inventura',
    desc: 'Stav má být vs. realita vs. rozdíl — v kusech i korunách. Inventura bez papírů a slepých míst.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: ClipboardCheck,
    title: 'Uzávěrky a Z-report',
    desc: 'Denní uzávěrka s kontrolou hotovosti, DPH, spropitným a exportem CSV pro účetní.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: BarChart3,
    title: 'Provozní přehled',
    desc: 'Tržby, marže, výkon obsluhy, ztráty skladu i ležáky. Manažerský pohled, ne jen pokladna.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: Clock,
    title: 'Docházka a export',
    desc: 'Píchačka pro zaměstnance, přehled odpracovaných hodin a export do CSV pro mzdy.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: CalendarDays,
    title: 'Rezervace bez kolizí',
    desc: 'Kalendář služeb a zdrojů. Systém hlídá kolize, ať se dva termíny nikdy nepřekryjí.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: FileText,
    title: 'Faktury, DPH a QR',
    desc: 'Faktury se všemi zákonnými náležitostmi, sazby DPH a QR platba podle standardu ČBA.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: Contact,
    title: 'Evidence klientů',
    desc: 'Adresář klientů s historií, kontakty a poznámkami — propojený s fakturami i rezervacemi.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: Building2,
    title: 'Více provozoven',
    desc: 'Spravuj víc poboček z jednoho účtu. Každá provozovna má vlastní pokladnu i sklad.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: ShieldCheck,
    title: 'Role a oprávnění',
    desc: 'Majitel, manažer, obsluha — každý vidí jen to, co má. Citlivé akce zůstanou pod kontrolou.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: Moon,
    title: 'Tmavý režim',
    desc: 'Příjemný i po setmění a na barovém pultu. Přepneš jedním klikem, systém si volbu pamatuje.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
  {
    icon: Smartphone,
    title: 'PWA a mobil',
    desc: 'Přidáš si systém na plochu telefonu nebo tabletu. Funguje v prohlížeči, bez instalace.',
    color: 'text-primary',
    bg: 'bg-primary-soft',
  },
  {
    icon: Landmark,
    title: 'Podle českých zákonů',
    desc: 'Náležitosti faktur, sazby DPH i zaokrouhlení podle české legislativy — hlídá to systém.',
    color: 'text-foreground',
    bg: 'bg-mint/30',
  },
  {
    icon: ToggleRight,
    title: 'Moduly zapneš podle sebe',
    desc: 'Zapneš jen moduly, které potřebuješ, a jen za ně platíš. Kdykoliv přidáš nebo odebereš.',
    color: 'text-coral',
    bg: 'bg-coral/10',
  },
]
</script>

<template>
  <section id="funkce" class="py-16 sm:py-20">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(f, i) in features"
          :key="f.title"
          v-reveal="{ delay: (i % 3) * 80 }"
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
