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
  Users,
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
  type PosStaffPerformance,
  type PosLossSummary,
  type PosLossType,
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
const staff = ref<PosStaffPerformance | null>(null)
const losses = ref<PosLossSummary | null>(null)
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

function lossTypeLabel(type: PosLossType): string {
  const labels: Record<PosLossType, string> = {
    Issue: 'Výdej',
    WriteOff: 'Odpis',
    StaffMeal: 'Personálka',
    Breakage: 'Rozbití',
    Expiration: 'Expirace',
    Correction: 'Korekce',
    Stocktaking: 'Inventura',
  }
  return labels[type]
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
    const [sum, rev, cost, staffReport, lossReport] = await Promise.all([
      reportsApi.summary(range, loc),
      reportsApi.revenue(range, 'Day', loc),
      reportsApi.costs(range, loc),
      reportsApi.staff(range, loc),
      reportsApi.losses(range, loc),
    ])
    summary.value = sum
    revenue.value = rev
    costs.value = cost
    staff.value = staffReport
    losses.value = lossReport
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

        <!-- Ztráty / nálezy skladu -->
        <div v-if="losses" class="mt-6">
          <div class="flex items-center gap-2">
            <Ban class="h-4 w-4 text-destructive" />
            <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ztráty skladu
            </h2>
          </div>

          <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Ban class="h-4 w-4" /> Ztráty celkem
              </div>
              <div class="mt-1 text-xl font-semibold tabular-nums">
                {{ formatCZK(losses.totalLossValue) }}
              </div>
              <div class="text-xs text-muted-foreground">Bez započtení nálezů</div>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Package class="h-4 w-4" /> Provozní ztráty
              </div>
              <div class="mt-1 text-xl font-semibold tabular-nums">
                {{ formatCZK(losses.operationalLossValue) }}
              </div>
              <div class="text-xs text-muted-foreground">Odpisy, rozbití, expirace</div>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt class="h-4 w-4" /> Inventurní ztráty
              </div>
              <div class="mt-1 text-xl font-semibold tabular-nums">
                {{ formatCZK(losses.inventoryLossValue) }}
              </div>
              <div class="text-xs text-muted-foreground">Korekce a inventury</div>
            </div>
            <div class="rounded-xl border border-border bg-card p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp class="h-4 w-4" /> Nálezy
              </div>
              <div class="mt-1 text-xl font-semibold tabular-nums">
                {{ formatCZK(losses.inventoryGainValue) }}
              </div>
              <div class="text-xs text-muted-foreground">Kladné korekce a inventury</div>
            </div>
          </div>

          <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div class="rounded-xl border border-border bg-card p-4 sm:p-6">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Důvody
              </h3>
              <div v-if="losses.reasons.length" class="mt-4 divide-y divide-border">
                <div
                  v-for="reason in losses.reasons"
                  :key="reason.type"
                  class="flex items-center gap-3 py-3 text-sm"
                >
                  <div class="min-w-0 flex-1">
                    <div class="font-medium">{{ lossTypeLabel(reason.type) }}</div>
                    <div class="text-xs text-muted-foreground tabular-nums">
                      {{ reason.movementCount }} pohybů · ztráta {{ reason.quantityLost }}
                      <span v-if="reason.quantityGained > 0">
                        · nález {{ reason.quantityGained }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold tabular-nums">
                      {{ formatCZK(reason.lossValue) }}
                    </div>
                    <div
                      v-if="reason.gainValue > 0"
                      class="text-xs text-muted-foreground tabular-nums"
                    >
                      +{{ formatCZK(reason.gainValue) }}
                    </div>
                  </div>
                </div>
              </div>
              <p v-else class="mt-4 text-sm text-muted-foreground">
                Za zvolené období nejsou žádné skladové ztráty.
              </p>
            </div>

            <div class="rounded-xl border border-border bg-card p-4 sm:p-6">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Největší ztráty podle položek
              </h3>
              <p
                v-if="losses.missingCostProductCount > 0"
                class="mt-1 text-xs text-muted-foreground"
              >
                {{ losses.missingCostProductCount }} položek nemá nákladovou cenu.
              </p>
              <div v-if="losses.products.length" class="mt-4 divide-y divide-border">
                <div
                  v-for="p in losses.products"
                  :key="`${p.productId}-${p.type}`"
                  class="grid gap-2 py-3 text-sm md:grid-cols-[minmax(0,1fr)_auto_auto]"
                >
                  <div class="min-w-0">
                    <div class="truncate font-medium">{{ p.name }}</div>
                    <div class="text-xs text-muted-foreground tabular-nums">
                      {{ p.sku }} · {{ lossTypeLabel(p.type) }}
                      <span v-if="!p.hasCostBasis"> · chybí nákupní cena</span>
                    </div>
                  </div>
                  <div class="tabular-nums md:text-right">
                    <span class="text-muted-foreground md:hidden">Množství </span>
                    {{ p.quantityLost }}
                  </div>
                  <div class="font-semibold tabular-nums md:text-right">
                    <span class="text-muted-foreground md:hidden">Ztráta </span>
                    {{ formatCZK(p.lossValue) }}
                  </div>
                </div>
              </div>
              <p v-else class="mt-4 text-sm text-muted-foreground">
                Za zvolené období nejsou žádné položkové ztráty.
              </p>
            </div>
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

        <!-- Výkon obsluhy -->
        <div v-if="staff" class="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-primary" />
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Výkon obsluhy
              </h2>
            </div>
            <div class="text-sm text-muted-foreground tabular-nums">
              {{ staff.saleCount }} účtů · {{ formatCZK(staff.total) }}
            </div>
          </div>

          <div v-if="staff.staff.length" class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[760px] text-sm">
              <thead class="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr class="border-b border-border">
                  <th class="py-2 pr-4 font-medium">Obsluha</th>
                  <th class="px-3 py-2 text-right font-medium">Účtů</th>
                  <th class="px-3 py-2 text-right font-medium">Tržba</th>
                  <th class="px-3 py-2 text-right font-medium">Průměr</th>
                  <th class="px-3 py-2 text-right font-medium">Hotově</th>
                  <th class="px-3 py-2 text-right font-medium">Kartou</th>
                  <th class="px-3 py-2 text-right font-medium">Tip</th>
                  <th class="px-3 py-2 text-right font-medium">Slevy</th>
                  <th class="py-2 pl-3 text-right font-medium">Storna</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="row in staff.staff" :key="row.employeeId ?? 'unassigned'">
                  <td class="py-3 pr-4">
                    <div class="font-medium">{{ row.employeeName }}</div>
                    <div v-if="row.employeeId === null" class="text-xs text-muted-foreground">
                      Prodeje bez přiřazené obsluhy
                    </div>
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">{{ row.saleCount }}</td>
                  <td class="px-3 py-3 text-right font-semibold tabular-nums">
                    {{ formatCZK(row.total) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    {{ formatCZK(row.averageSale) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    {{ formatCZK(row.cashTotal) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    {{ formatCZK(row.cardTotal) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    {{ formatCZK(row.tipTotal) }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    {{ formatCZK(row.discountTotal) }}
                  </td>
                  <td class="py-3 pl-3 text-right tabular-nums">
                    <span class="font-medium">{{ row.cancelledCount }}</span>
                    <span class="ml-1 text-muted-foreground">
                      {{ formatCZK(row.cancelledTotal) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-4 text-sm text-muted-foreground">
            Za zvolené období nejsou žádné tržby podle obsluhy.
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
