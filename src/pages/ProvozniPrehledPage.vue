<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Loader2,
  TrendingUp,
  ShoppingCart,
  Receipt,
  Banknote,
  CreditCard,
  Percent,
  Coins,
  Ban,
  Package,
  Trophy,
} from 'lucide-vue-next'
import { BarChart } from '@/components/ui/chart'
import LoadError from '@/components/app/LoadError.vue'
import { useLocations } from '@/composables/useLocations'
import { usePosReports } from '@/composables/usePosReports'
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import {
  posReportRange,
  type PosReportPreset,
  type PosSalesSummary,
  type PosRevenue,
  type PosCostSummary,
} from '@/lib/posReports'

const apiMode = isApiMode()
const reportsApi = usePosReports()
const { locations, load: loadLocations } = useLocations()

const loading = ref(true)
const loadError = ref(false)

const PRESETS: { id: PosReportPreset; label: string }[] = [
  { id: 'today', label: 'Dnes' },
  { id: 'last7', label: '7 dní' },
  { id: 'last30', label: '30 dní' },
  { id: 'thisMonth', label: 'Tento měsíc' },
]
const preset = ref<PosReportPreset>('thisMonth')
const locationId = ref<string>('') // '' = všechny provozovny

const summary = ref<PosSalesSummary | null>(null)
const revenue = ref<PosRevenue | null>(null)
const costs = ref<PosCostSummary | null>(null)
const percentFormatter = new Intl.NumberFormat('cs-CZ', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

// Graf: tržby po dnech. Popisek osy X = den v měsíci (např. „5.7."), aby šla řada přečíst.
const revenueBars = computed(() =>
  (revenue.value?.series ?? []).map((b) => {
    const d = new Date(b.periodStart)
    return { label: `${d.getDate()}.${d.getMonth() + 1}.`, total: b.total }
  }),
)
const hasRevenue = computed(() => revenueBars.value.some((b) => b.total > 0))

function formatPercent(value: number): string {
  return `${percentFormatter.format(value)} %`
}

async function load(): Promise<void> {
  if (!apiMode) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = false
  try {
    const range = posReportRange(preset.value, new Date())
    const loc = locationId.value || undefined
    const [sum, rev, cost] = await Promise.all([
      reportsApi.summary(range, loc),
      reportsApi.revenue(range, 'Day', loc),
      reportsApi.costs(range, loc),
    ])
    summary.value = sum
    revenue.value = rev
    costs.value = cost
  } catch (e) {
    console.warn('Načtení provozního přehledu selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (apiMode) await loadLocations()
  await load()
})

function selectPreset(id: PosReportPreset): void {
  if (preset.value === id) return
  preset.value = id
  load()
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <Package class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">
        Provozní přehled potřebuje připojení k serveru
      </p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Provozní přehled</h1>
          <p class="mt-1 text-muted-foreground">
            Tržby, platby, marže a nejprodávanější položky za období.
          </p>
        </div>
      </div>

      <!-- Filtry: období + provozovna -->
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          v-for="p in PRESETS"
          :key="p.id"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            preset === p.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="selectPreset(p.id)"
        >
          {{ p.label }}
        </button>
        <select
          v-if="locations.length > 1"
          v-model="locationId"
          class="ml-auto h-9 rounded-lg border border-border bg-background px-2 text-sm"
          aria-label="Provozovna"
          @change="load"
        >
          <option value="">Všechny provozovny</option>
          <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
        </select>
      </div>

      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <LoadError v-else-if="loadError" class="mt-6" :retrying="loading" @retry="load" />

      <template v-else-if="summary">
        <!-- KPI karty -->
        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp class="h-4 w-4" /> Tržby
            </div>
            <div class="mt-2 text-2xl font-bold tabular-nums">{{ formatCZK(summary.total) }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart class="h-4 w-4" /> Účtů
            </div>
            <div class="mt-2 text-2xl font-bold tabular-nums">{{ summary.saleCount }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt class="h-4 w-4" /> Průměrný účet
            </div>
            <div class="mt-2 text-2xl font-bold tabular-nums">
              {{ formatCZK(summary.averageSale) }}
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins class="h-4 w-4" /> Spropitné
            </div>
            <div class="mt-2 text-2xl font-bold tabular-nums">
              {{ formatCZK(summary.tipTotal) }}
            </div>
          </div>
        </div>

        <!-- Platby / slevy / storna -->
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Banknote class="h-4 w-4" /> Hotově
            </div>
            <div class="mt-1 text-xl font-semibold tabular-nums">
              {{ formatCZK(summary.cashTotal) }}
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard class="h-4 w-4" /> Kartou
            </div>
            <div class="mt-1 text-xl font-semibold tabular-nums">
              {{ formatCZK(summary.cardTotal) }}
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent class="h-4 w-4" /> Slevy
            </div>
            <div class="mt-1 text-xl font-semibold tabular-nums">
              {{ formatCZK(summary.discountTotal) }}
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Ban class="h-4 w-4 text-destructive" /> Storna
            </div>
            <div class="mt-1 text-xl font-semibold tabular-nums">{{ summary.cancelledCount }}</div>
            <div class="text-xs text-muted-foreground">{{ formatCZK(summary.cancelledTotal) }}</div>
          </div>
        </div>

        <!-- Marže / food cost -->
        <div v-if="costs" class="mt-6">
          <div class="flex items-center gap-2">
            <Percent class="h-4 w-4 text-primary" />
            <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Marže a food cost
            </h2>
          </div>

          <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp class="h-4 w-4" /> Hrubá marže
              </div>
              <div class="mt-1 text-xl font-semibold tabular-nums">
                {{ formatCZK(costs.grossMargin) }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ formatPercent(costs.grossMarginPercent) }}
              </div>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Percent class="h-4 w-4" /> Food cost
              </div>
              <div class="mt-1 text-xl font-semibold tabular-nums">
                {{ formatPercent(costs.foodCostPercent) }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ formatCZK(costs.estimatedCost) }}
              </div>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt class="h-4 w-4" /> Katalogové tržby
              </div>
              <div class="mt-1 text-xl font-semibold tabular-nums">
                {{ formatCZK(costs.productRevenueGross) }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ costs.products.length }} položek v přehledu
              </div>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Package class="h-4 w-4" /> Mimo katalog
              </div>
              <div class="mt-1 text-xl font-semibold tabular-nums">
                {{ formatCZK(costs.unlinkedRevenueGross) }}
              </div>
              <div class="text-xs text-muted-foreground">Ručně zadané položky</div>
            </div>
          </div>

          <div class="mt-4 rounded-xl border border-border bg-card p-4 sm:p-6">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Produkty s nejvyšším food costem
            </h3>
            <p v-if="costs.missingCostProductCount > 0" class="mt-1 text-xs text-muted-foreground">
              {{ costs.missingCostProductCount }} produktů nemá kompletní nákupní cenu.
            </p>
            <div v-if="costs.products.length" class="mt-4 divide-y divide-border">
              <div
                v-for="p in costs.products"
                :key="p.productId"
                class="grid gap-2 py-3 text-sm md:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
              >
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ p.name }}</div>
                  <div class="text-xs text-muted-foreground tabular-nums">
                    {{ p.quantity }}× · náklad {{ formatCZK(p.estimatedCost) }}
                    <span v-if="!p.hasCostBasis"> · chybí nákupní cena</span>
                  </div>
                </div>
                <div class="tabular-nums md:text-right">
                  <span class="text-muted-foreground md:hidden">Tržba </span>
                  {{ formatCZK(p.revenueGross) }}
                </div>
                <div class="tabular-nums md:text-right">
                  <span class="text-muted-foreground md:hidden">Marže </span>
                  {{ formatCZK(p.grossMargin) }}
                </div>
                <div class="font-semibold tabular-nums md:text-right">
                  <span class="text-muted-foreground md:hidden">Food cost </span>
                  {{ formatPercent(p.foodCostPercent) }}
                </div>
              </div>
            </div>
            <p v-else class="mt-4 text-sm text-muted-foreground">
              Za zvolené období nejsou žádné katalogové prodeje.
            </p>
          </div>
        </div>

        <!-- Graf tržeb po dnech -->
        <div class="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tržby po dnech
          </h2>
          <BarChart
            v-if="hasRevenue"
            class="mt-4"
            :data="revenueBars"
            :x="(_, i) => i"
            :y="(d) => d.total"
            :x-tick-format="(_, i) => revenueBars[i]?.label ?? ''"
            aria-label="Tržby po dnech za zvolené období"
          />
          <p v-else class="mt-4 text-sm text-muted-foreground">
            Za zvolené období zatím nejsou žádné tržby.
          </p>
        </div>

        <!-- Nejprodávanější položky -->
        <div class="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
          <div class="flex items-center gap-2">
            <Trophy class="h-4 w-4 text-primary" />
            <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Nejprodávanější položky
            </h2>
          </div>
          <div v-if="summary.topProducts.length" class="mt-4 divide-y divide-border">
            <div
              v-for="(p, i) in summary.topProducts"
              :key="p.productId ?? `x${i}`"
              class="flex items-center gap-3 py-2 text-sm"
            >
              <span class="w-5 text-center font-semibold text-muted-foreground tabular-nums">
                {{ i + 1 }}
              </span>
              <span class="min-w-0 flex-1 truncate font-medium">{{ p.name }}</span>
              <span class="shrink-0 text-muted-foreground tabular-nums">{{ p.quantity }}×</span>
              <span class="w-24 shrink-0 text-right font-semibold tabular-nums">
                {{ formatCZK(p.revenueGross) }}
              </span>
            </div>
          </div>
          <p v-else class="mt-4 text-sm text-muted-foreground">Za zvolené období žádné prodeje.</p>
        </div>
      </template>
    </template>
  </div>
</template>
