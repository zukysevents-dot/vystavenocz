<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Percent, Loader2 } from 'lucide-vue-next'
import { useInvoices } from '@/composables/useInvoices'
import { formatCZK } from '@/lib/invoice'
import { vatSummary, availablePeriods } from '@/lib/dph'

const { invoices, load } = useInvoices()
const loading = ref(true)
const period = ref('all')

onMounted(async () => {
  await load()
  loading.value = false
})

const periods = computed(() => availablePeriods(invoices.value))
const summary = computed(() => vatSummary(invoices.value, period.value))

function periodLabel(p: string): string {
  const [y, m] = p.split('-')
  return `${Number(m)}/${y}`
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Přehled DPH</h1>
        <p class="mt-1 text-muted-foreground">
          Daň na výstupu z vystavených faktur — podklad k přiznání DPH.
        </p>
      </div>
      <div>
        <label class="sr-only" for="period">Období</label>
        <select
          id="period"
          v-model="period"
          class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="all">Všechna období</option>
          <option v-for="p in periods" :key="p" :value="p">{{ periodLabel(p) }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div
      v-else-if="summary.count === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Percent class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Žádné doklady pro DPH</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Pro vybrané období nejsou žádné vystavené faktury.
      </p>
    </div>

    <template v-else>
      <!-- Souhrn -->
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Dokladů</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.count }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Základ daně</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.totalBase) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">DPH k odvedení</div>
          <div class="mt-1 text-2xl font-bold text-primary">{{ formatCZK(summary.totalVat) }}</div>
        </div>
      </div>

      <!-- Rozpad po sazbách -->
      <div class="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Sazba DPH</th>
              <th class="px-4 py-3 text-right">Základ daně</th>
              <th class="px-4 py-3 text-right">Daň</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in summary.rows"
              :key="r.rate"
              class="border-b border-border hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ r.rate }} %</td>
              <td class="px-4 py-3 text-right">{{ formatCZK(r.base) }}</td>
              <td class="px-4 py-3 text-right">{{ formatCZK(r.vat) }}</td>
            </tr>
            <tr class="bg-muted/30 font-semibold">
              <td class="px-4 py-3">Celkem</td>
              <td class="px-4 py-3 text-right">{{ formatCZK(summary.totalBase) }}</td>
              <td class="px-4 py-3 text-right">{{ formatCZK(summary.totalVat) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="mt-3 text-xs text-muted-foreground">
        Orientační podklad z vystavených faktur (dle DUZP). Nenahrazuje daňové přiznání ani
        kontrolní hlášení.
      </p>
    </template>
  </div>
</template>
