<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Sparkles } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const features = [
  'Neomezený počet faktur',
  'Neomezený počet klientů',
  'QR platba na každé faktuře',
  'AI asistent v češtině',
  'Opakované faktury',
  'Vlastní logo a šablony',
  'Cizí měny + kurz ČNB',
  'Automatické upomínky',
  'Export do účetnictví (ISDOC, XML)',
  'Česká podpora e-mailem (odpověď do 24 h)',
]

const yearly = ref(true)
</script>

<template>
  <section id="cenik" class="bg-background py-16 sm:py-20">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <!-- Toggle -->
      <div class="flex items-center justify-center">
        <div
          class="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm"
        >
          <button
            class="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            :class="!yearly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="yearly = false"
          >
            Měsíčně
          </button>
          <button
            class="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            :class="yearly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="yearly = true"
          >
            Ročně
            <span
              class="rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-coral-foreground"
            >
              −37 %
            </span>
          </button>
        </div>
      </div>

      <!-- Card -->
      <div class="relative mx-auto mt-10 max-w-xl">
        <div class="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div class="border-b border-border bg-surface-soft px-8 py-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-bold text-foreground">Vystaveno Pro</h3>
                <p class="text-sm text-muted-foreground">Pro OSVČ i firmy. Vše bez omezení.</p>
              </div>
              <div
                class="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral"
              >
                <Sparkles class="h-6 w-6" />
              </div>
            </div>
          </div>

          <div class="px-8 py-8">
            <div class="flex items-end gap-2">
              <span class="text-6xl font-extrabold tracking-tight text-foreground">
                {{ yearly ? '100' : '159' }}
              </span>
              <div class="pb-2">
                <p class="text-lg font-semibold text-foreground">Kč</p>
                <p class="text-xs text-muted-foreground">měsíčně</p>
              </div>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">
              {{
                yearly
                  ? 'Účtováno ročně 1 200 Kč. Ušetříte 708 Kč oproti měsíčnímu tarifu.'
                  : 'Účtováno měsíčně. Roční tarif vyjde na 100 Kč/měsíc — ušetříte 708 Kč ročně.'
              }}
            </p>

            <Button variant="coral" size="lg" class="mt-6 w-full" as-child>
              <RouterLink to="/registrace">Začít 14denní zkušební verzi</RouterLink>
            </Button>
            <p class="mt-2 text-center text-xs text-muted-foreground">
              Bez platební karty · Zrušení jedním kliknutím · Neplátce DPH (cena je konečná)
            </p>

            <ul class="mt-8 grid gap-3 sm:grid-cols-2">
              <li
                v-for="f in features"
                :key="f"
                class="flex items-start gap-2 text-sm text-foreground"
              >
                <span
                  class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15"
                >
                  <Check class="h-3 w-3 text-success" />
                </span>
                {{ f }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <p class="mt-6 text-center text-xs text-muted-foreground">
        Méně než 5 faktur měsíčně? Napište nám na patrik@vystaveno.cz — domluvíme se.
      </p>
    </div>
  </section>
</template>
