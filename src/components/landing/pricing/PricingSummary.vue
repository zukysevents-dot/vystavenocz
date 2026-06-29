<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { MODULAR_PRICING, bundleSavingMonthly } from '@/lib/pricing'

const props = defineProps<{
  selectedCount: number
  perMonth: number
  yearly: boolean
  yearlyTotal: number
  allSelected: boolean
  /** Cena kompletního balíku v aktuálním režimu platby (Kč/měs). */
  bundlePerMonth: number
}>()

const czk = (n: number) => n.toLocaleString('cs-CZ')
const saving = computed(() => bundleSavingMonthly(props.yearly))
// Kolik Kč/měs navíc do kompletního balíku (0 = balík už vyjde stejně/levněji).
const upgradeDelta = computed(() => Math.max(0, props.bundlePerMonth - props.perMonth))

// České skloňování „modul".
const modulesWord = computed(() => {
  const n = props.selectedCount
  if (n === 1) return 'modul'
  if (n >= 2 && n <= 4) return 'moduly'
  return 'modulů'
})
</script>

<template>
  <div class="rounded-3xl border border-border bg-card p-6 shadow-card">
    <p class="text-sm font-medium text-muted-foreground">
      {{
        allSelected
          ? 'Kompletní balík — všech 6 modulů'
          : `Vaše sestava · ${selectedCount} ${modulesWord}`
      }}
    </p>

    <div class="mt-2 flex items-end gap-2">
      <span class="font-mono text-5xl font-black tracking-tight text-foreground">{{
        czk(perMonth)
      }}</span>
      <div class="pb-1.5">
        <p class="text-base font-semibold text-foreground">Kč</p>
        <p class="text-xs text-muted-foreground">/ měsíc</p>
      </div>
    </div>

    <p class="mt-2 text-sm text-muted-foreground">
      <template v-if="selectedCount === 0">Vyberte aspoň jeden modul.</template>
      <template v-else-if="yearly">
        Účtováno ročně <span class="font-mono text-foreground">{{ czk(yearlyTotal) }} Kč</span> · 2
        měsíce zdarma.
      </template>
      <template v-else>Měsíčně, bez závazku.</template>
    </p>

    <!-- Faktická úspora / pobídka k balíku -->
    <p
      v-if="allSelected && saving > 0"
      class="mt-3 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success"
    >
      Ušetříte {{ czk(saving) }} Kč/měs oproti samostatným modulům.
    </p>
    <p
      v-else-if="selectedCount > 0 && upgradeDelta === 0"
      class="mt-3 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success"
    >
      Kompletní balík (všech 6) vyjde levněji — přidejte zbylé moduly bez navýšení ceny.
    </p>
    <p
      v-else-if="selectedCount > 0 && upgradeDelta > 0"
      class="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground"
    >
      Kompletní balík = {{ czk(bundlePerMonth) }} Kč/měs — jen
      <span class="font-semibold text-foreground">+{{ czk(upgradeDelta) }} Kč</span> za zbývající
      moduly.
    </p>

    <Button variant="coral" size="lg" class="mt-5 w-full" :disabled="selectedCount === 0" as-child>
      <RouterLink to="/registrace">Vyzkoušet zdarma {{ MODULAR_PRICING.trialDays }} dní</RouterLink>
    </Button>
    <p class="mt-3 text-center text-xs text-muted-foreground">
      Bez karty · Zrušení jedním klikem · Ceny bez DPH (neplátce)
    </p>
  </div>
</template>
