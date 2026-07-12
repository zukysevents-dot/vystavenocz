<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Percent, Loader2 } from 'lucide-vue-next'
import { useInvoices } from '@/composables/useInvoices'
import LoadError from '@/components/app/LoadError.vue'
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import { vatSummary as clientVatSummary, availablePeriods } from '@/lib/dph'
import type { VatSummary } from '@/lib/dph'

// Peníze/DPH nikdy nepočítá FE v API režimu: server dodá přehled přes /invoices/vat-summary.
// Mock režim počítá client-side z položek (dph.ts) — beze změny.
const isApi = isApiMode()
const { invoices, loadError, load, vatSummary } = useInvoices()
const loading = ref(true)
const period = ref('all')
const EMPTY_SUMMARY: VatSummary = { rows: [], totalBase: 0, totalVat: 0, count: 0 }
const apiSummary = ref<VatSummary>(EMPTY_SUMMARY)

/** Období 'YYYY-MM' → rozsah [1. den, poslední den měsíce]; 'all' → bez omezení. */
function periodRange(p: string): { from?: string; to?: string } {
  if (p === 'all') return {}
  const [y, m] = p.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${p}-01`, to: `${p}-${String(lastDay).padStart(2, '0')}` }
}

// API režim: serverový přehled za vybrané období. Chybu převede na LoadError (jako load()),
// ať obsluha nevidí stará čísla ani zavádějící „žádné doklady".
async function refreshSummary(): Promise<void> {
  const { from, to } = periodRange(period.value)
  try {
    apiSummary.value = await vatSummary(from, to)
  } catch (e) {
    console.warn('Načtení DPH přehledu selhalo:', e)
    apiSummary.value = EMPTY_SUMMARY
    loadError.value = true
  }
}

async function reload(): Promise<void> {
  loading.value = true
  await load() // load() si chytá vlastní chyby → loadError
  if (isApi && !loadError.value) await refreshSummary()
  loading.value = false
}
onMounted(reload)

// Změna období v API režimu = nový serverový dotaz (jen přehled, ne celý seznam).
// Mock režim jen přepočítá client-side computed z už načtených položek.
watch(period, async () => {
  if (!isApi) return
  loading.value = true
  loadError.value = false
  await refreshSummary()
  loading.value = false
})

// API režim: summary list nemá DUZP (jen issueDate) → období nabídni podle data vystavení
// relevantních daňových dokladů. Mock režim počítá období z DUZP přes dph.ts (beze změny).
const periods = computed(() => {
  if (!isApi) return availablePeriods(invoices.value)
  const set = new Set<string>()
  for (const i of invoices.value) {
    const relevant =
      (!i.currency || i.currency === 'CZK') &&
      (i.documentType === 'invoice' || i.documentType === 'credit_note') &&
      (i.status === 'issued' || i.status === 'paid' || i.status === 'overdue')
    if (relevant && i.issueDate) set.add(i.issueDate.slice(0, 7))
  }
  return [...set].sort().reverse()
})

const summary = computed<VatSummary>(() =>
  isApi ? apiSummary.value : clientVatSummary(invoices.value, period.value),
)

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

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

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
        Orientační podklad z vystavených faktur v Kč (dle DUZP). Nezahrnuje dobropisy ani cizí měny.
        Nenahrazuje daňové přiznání ani kontrolní hlášení.
      </p>
    </template>
  </div>
</template>
