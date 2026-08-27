<script setup lang="ts">
import PageHeader from '@/components/landing/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { RouterLink } from 'vue-router'
import { Check, UserPlus, MonitorPlay, Settings2, Rocket, ShieldCheck } from 'lucide-vue-next'
import { EARLY_ACCESS_MAILTO, REGISTER_ROUTE } from '@/lib/landing-cta'

// Early access nabídka nahrazuje dřívější časově omezenou akci (do 1. 6.),
// která už proběhla a odkazovala na starý jednotarifní ceník.
// VYS-06: early access NENÍ konkurenční cesta k registraci. Účet si zákazník založí sám a hned
// (self-serve funnel funguje), early access je nadstavba NAD ním — osobní nasazení a zaváděcí cena.
// Dřív tu stálo „místo anonymní registrace" a hlavní CTA byl mailto, takže web nabízel dva
// soupeřící funnely a ten dražší (napsat e-mail) byl ten viditelnější.
const benefits = [
  'Zvýhodněná zaváděcí cena pro první zákazníky — domluvíme individuálně',
  'Osobní pomoc s nastavením modulů, katalogu a převodem dat',
  'Přímá linka na zakladatele — vaše zpětná vazba řídí roadmapu',
  'Drobná vylepšení na míru obvykle nasazujeme do pár dní',
  'Žádný závazek — kdykoliv můžete skončit',
]

const steps = [
  {
    icon: UserPlus,
    title: '1. Založíte si účet',
    desc: 'Registrace trvá minutu, bez karty. Hned můžete vystavit první fakturu.',
  },
  {
    icon: MonitorPlay,
    title: '2. Ozvete se nám',
    desc: 'Napíšete, co provozujete. Projdeme s vámi váš provoz — online nebo u vás.',
  },
  {
    icon: Settings2,
    title: '3. Nastavíme systém',
    desc: 'Zapneme moduly, které potřebujete, pomůžeme s katalogem, recepturami i sklady.',
  },
  {
    icon: Rocket,
    title: '4. Jedete naostro',
    desc: 'Obsluha se učí minuty. Jsme na příjmu, kdyby cokoliv — odpovídáme do 24 hodin.',
  },
]
</script>

<template>
  <PageHeader
    eyebrow="Early access"
    title="Buďte u toho"
    title-accent="od začátku"
    subtitle="Účet si můžete založit hned a zdarma. První provozy k tomu navíc dostanou osobní nasazení, pomoc s převodem dat a zaváděcí podmínky, které s veřejným spuštěním zmizí."
  />

  <section class="py-16 sm:py-20">
    <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <!-- Co early access znamená -->
      <div class="rounded-3xl border-2 border-coral bg-card p-8 shadow-glow">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/10 text-coral">
            <ShieldCheck class="h-5 w-5" />
          </div>
          <h2 class="text-lg font-bold text-foreground">Co jako první zákazník získáte</h2>
        </div>
        <ul class="mt-5 grid gap-3 sm:grid-cols-2">
          <li v-for="b in benefits" :key="b" class="flex items-start gap-2 text-sm text-foreground">
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15"
            >
              <Check class="h-3 w-3 text-success" />
            </span>
            {{ b }}
          </li>
        </ul>
        <div class="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button variant="coral" size="lg" class="w-full sm:w-auto" as-child>
            <RouterLink :to="REGISTER_ROUTE">Vyzkoušet zdarma</RouterLink>
          </Button>
          <Button variant="outline" size="lg" class="w-full sm:w-auto" as-child>
            <a :href="EARLY_ACCESS_MAILTO">Chci osobní nasazení</a>
          </Button>
        </div>
        <p class="mt-3 text-xs text-muted-foreground">
          14 dní zdarma, bez karty · na e-maily odpovídáme do 24 hodin · patrik@vystaveno.cz
        </p>
      </div>

      <!-- Jak to probíhá -->
      <div class="mt-12">
        <h2 class="text-center text-lg font-bold text-foreground">Jak to probíhá</h2>
        <div class="mt-6 grid gap-5 sm:grid-cols-2">
          <div
            v-for="s in steps"
            :key="s.title"
            class="rounded-2xl border border-border bg-card p-6"
          >
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"
            >
              <component :is="s.icon" class="h-5 w-5" />
            </div>
            <h3 class="mt-4 text-base font-bold text-foreground">{{ s.title }}</h3>
            <p class="mt-2 text-sm text-muted-foreground">{{ s.desc }}</p>
          </div>
        </div>
      </div>

      <div class="mt-10 flex flex-col items-center gap-3 text-center">
        <RouterLink
          to="/cenik"
          class="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Prohlédnout moduly a orientační ceník →
        </RouterLink>
      </div>
    </div>
  </section>
</template>
