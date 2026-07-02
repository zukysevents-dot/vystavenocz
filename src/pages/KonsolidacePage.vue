<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Building2, TrendingUp, ShoppingCart, Trophy, Loader2 } from 'lucide-vue-next'
import { useApi } from '@/composables/useApi'
import { useLocations } from '@/composables/useLocations'
import { formatCZK } from '@/lib/invoice'
import { availablePeriods, buildLocationRevenue, consolidationSummary } from '@/lib/consolidation'
import LoadError from '@/components/app/LoadError.vue'
import type { Sale } from '@/lib/types'

// Prodeje čteme přes useApi<Sale>('sales') — v API režimu trefí /sales (reálná data),
// v mocku čtou seed z localStorage. locationId plní backend podle pobočky/terminálu.
const salesApi = useApi<Sale>('sales')
const { locations, load: loadLocations } = useLocations()

const sales = ref<Sale[]>([])
const loading = ref(true)
const loadError = ref(false)
const period = ref('all')

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([loadLocations(), salesApi.list().then((s) => (sales.value = s))])
  } catch (e) {
    console.warn('Načtení dat konsolidace selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(reload)

const periods = computed(() => availablePeriods(sales.value))
const rows = computed(() => buildLocationRevenue(sales.value, locations.value, period.value))
const summary = computed(() => consolidationSummary(rows.value))
// list() vrací max 100 prodejů (strop useApi) — u agregace varujeme, ať čísla nevypadají úplná.
const truncated = computed(() => sales.value.length >= 100)

function periodLabel(p: string): string {
  const [y, m] = p.split('-')
  return `${m}/${y}`
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Konsolidace poboček</h1>
        <p class="mt-1 text-muted-foreground">Tržby a výkon poboček na jednom místě.</p>
      </div>
      <label v-if="periods.length" class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">Období</span>
        <select
          v-model="period"
          class="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">Vše</option>
          <option v-for="p in periods" :key="p" :value="p">{{ periodLabel(p) }}</option>
        </select>
      </label>
    </div>

    <p
      v-if="!loading && truncated"
      class="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
    >
      Zobrazeno prvních 100 prodejů — u většího objemu mohou být čísla neúplná.
    </p>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <div
      v-else-if="rows.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Building2 class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Zatím žádné tržby</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Jakmile pobočky začnou prodávat, uvidíš tu jejich srovnání.
      </p>
    </div>

    <template v-else>
      <!-- Souhrn -->
      <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUp class="h-4 w-4" /> Celkové tržby
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.totalRevenue) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShoppingCart class="h-4 w-4" /> Prodejů
          </div>
          <div class="mt-1 text-2xl font-bold">{{ summary.totalSales }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 class="h-4 w-4" /> Poboček
          </div>
          <div class="mt-1 text-2xl font-bold">{{ summary.locationCount }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Trophy class="h-4 w-4 text-primary" /> Nejlepší pobočka
          </div>
          <div class="mt-1 truncate text-2xl font-bold">{{ summary.topLocationName ?? '—' }}</div>
        </div>
      </div>

      <!-- Tržby po pobočkách -->
      <h2 class="mt-8 text-lg font-semibold">Tržby po pobočkách</h2>

      <!-- Mobil: karty -->
      <div class="mt-3 space-y-3 sm:hidden">
        <div
          v-for="r in rows"
          :key="r.locationId ?? 'unassigned'"
          class="rounded-xl border border-border bg-card p-4"
          :class="{ 'border-dashed': r.locationId === null }"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 font-semibold">{{ r.locationName }}</div>
            <span class="shrink-0 text-sm text-muted-foreground">{{ r.sharePercent }} %</span>
          </div>
          <div class="mt-2 text-lg font-bold">{{ formatCZK(r.revenue) }}</div>
          <div class="mt-0.5 text-xs text-muted-foreground">
            {{ r.saleCount }} {{ r.saleCount === 1 ? 'prodej' : 'prodejů' }} · ⌀
            {{ formatCZK(r.avgSale) }}
            <template v-if="r.tips > 0"> · spropitné {{ formatCZK(r.tips) }}</template>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full"
              :class="r.locationId === null ? 'bg-muted-foreground/40' : 'bg-primary'"
              :style="{ width: r.sharePercent + '%' }"
            />
          </div>
        </div>
      </div>

      <!-- Desktop: tabulka -->
      <div class="mt-3 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table class="w-full min-w-[720px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Pobočka</th>
              <th class="px-4 py-3 text-right">Tržba</th>
              <th class="px-4 py-3 text-left">Podíl</th>
              <th class="px-4 py-3 text-right">Prodejů</th>
              <th class="px-4 py-3 text-right">Průměr</th>
              <th class="px-4 py-3 text-right">Spropitné</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.locationId ?? 'unassigned'"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td
                class="px-4 py-3 font-medium"
                :class="{ 'text-muted-foreground': r.locationId === null }"
              >
                {{ r.locationName }}
              </td>
              <td class="px-4 py-3 text-right font-semibold">{{ formatCZK(r.revenue) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full"
                      :class="r.locationId === null ? 'bg-muted-foreground/40' : 'bg-primary'"
                      :style="{ width: r.sharePercent + '%' }"
                    />
                  </div>
                  <span class="tabular-nums text-muted-foreground">{{ r.sharePercent }} %</span>
                </div>
              </td>
              <td class="px-4 py-3 text-right text-muted-foreground">{{ r.saleCount }}</td>
              <td class="px-4 py-3 text-right text-muted-foreground">{{ formatCZK(r.avgSale) }}</td>
              <td class="px-4 py-3 text-right text-muted-foreground">
                {{ r.tips > 0 ? formatCZK(r.tips) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
