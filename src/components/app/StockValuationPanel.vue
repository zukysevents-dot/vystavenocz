<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useInventory, type StockValuationQuery } from '@/composables/useInventory'
import { downloadCsv } from '@/lib/csv-export'
import {
  buildStockValuationRows,
  STOCK_COST_SOURCE_LABELS,
  STOCK_VALUATION_COLUMNS,
  stockValuationFilename,
} from '@/lib/inventory-export'
import type { Location, StockValuationResponse } from '@/lib/types'

const props = defineProps<{
  locations: Location[]
  initialLocationId?: string | null
}>()

const inventory = useInventory()
const ALL_LOCATIONS = '__all_locations__'
const PAGE_SIZE = 25
const today = localIsoDate(new Date())
const from = ref(localIsoDate(new Date(Date.now() - 29 * 86_400_000)))
const to = ref(today)
const locationId = ref(props.initialLocationId || ALL_LOCATIONS)
const search = ref('')
const sort = ref('-stockValue')
const page = ref(1)
const result = ref<StockValuationResponse | null>(null)
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const totalPages = computed(() =>
  Math.max(1, Math.ceil((result.value?.products.total ?? 0) / PAGE_SIZE)),
)

function localIsoDate(date: Date): string {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function query(requestedPage = page.value, pageSize = PAGE_SIZE): StockValuationQuery {
  return {
    from: from.value,
    to: to.value,
    locationId: locationId.value === ALL_LOCATIONS ? null : locationId.value,
    search: search.value,
    sort: sort.value,
    page: requestedPage,
    pageSize,
  }
}

function locationLabel(id = locationId.value): string {
  if (id === ALL_LOCATIONS) return 'Všechny pobočky'
  return props.locations.find((location) => location.id === id)?.name ?? 'Archivovaná pobočka'
}

function quantity(value: number): string {
  return value.toLocaleString('cs-CZ', { maximumFractionDigits: 3 })
}

function money(value: number | null): string {
  if (value === null) return 'Neúplné'
  const currency = result.value?.currency || 'CZK'
  try {
    return value.toLocaleString('cs-CZ', { style: 'currency', currency })
  } catch {
    return `${value.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} ${currency}`
  }
}

function signedMoney(value: number | null): string {
  if (value === null) return 'Neúplné'
  return `${value > 0 ? '+' : ''}${money(value)}`
}

function validatePeriod(): boolean {
  if (!from.value || !to.value) {
    toast.error('Vyberte začátek i konec období.')
    return false
  }
  if (to.value < from.value) {
    toast.error('Konec období nesmí být před začátkem.')
    return false
  }
  return true
}

async function load(requestedPage = page.value): Promise<void> {
  if (loading.value || !validatePeriod()) return
  loading.value = true
  error.value = ''
  try {
    let next = await inventory.stockValuation(query(requestedPage))
    const lastPage = Math.max(1, Math.ceil(next.products.total / PAGE_SIZE))
    if (requestedPage > lastPage) {
      requestedPage = lastPage
      next = await inventory.stockValuation(query(requestedPage))
    }
    result.value = next
    page.value = requestedPage
  } catch (cause) {
    console.error(cause)
    error.value = 'Ocenění skladu se nepodařilo načíst.'
  } finally {
    loading.value = false
  }
}

async function exportCsv(): Promise<void> {
  if (exporting.value || !validatePeriod()) return
  exporting.value = true
  try {
    const exported = await inventory.allStockValuation(query(1, 100))
    downloadCsv(
      stockValuationFilename(exported.from, exported.to),
      STOCK_VALUATION_COLUMNS,
      buildStockValuationRows(exported, exported.products.items, locationLabel()),
    )
    toast.success(`Exportováno ${exported.products.items.length} produktů a kontrolní součet.`)
  } catch (cause) {
    console.error(cause)
    toast.error(cause instanceof Error ? cause.message : 'Ocenění se nepodařilo exportovat.')
  } finally {
    exporting.value = false
  }
}

watch(
  () => props.initialLocationId,
  (value) => {
    locationId.value = value || ALL_LOCATIONS
    void load(1)
  },
)

onMounted(() => void load(1))
</script>

<template>
  <section class="mt-4 space-y-4" aria-labelledby="stock-valuation-title">
    <div class="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div class="max-w-3xl">
        <h2 id="stock-valuation-title" class="flex items-center gap-2 font-semibold">
          <Calculator class="h-5 w-5 text-primary" /> Ocenění skladu
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Periodický vážený průměr z příjemek. Výpočet i součty vznikají na serveru; chybějící cena se nezapočte jako nula.
        </p>
      </div>
      <Button type="button" variant="outline" :disabled="exporting || loading" @click="exportCsv">
        <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
        <Download v-else class="h-4 w-4" /> Export CSV
      </Button>
    </div>

    <div class="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-[160px_160px_200px_1fr_190px_auto]">
      <div class="space-y-1.5">
        <Label for="valuation-from">Od</Label>
        <Input id="valuation-from" v-model="from" type="date" />
      </div>
      <div class="space-y-1.5">
        <Label for="valuation-to">Do</Label>
        <Input id="valuation-to" v-model="to" type="date" />
      </div>
      <div v-if="locations.length > 1" class="space-y-1.5">
        <Label for="valuation-location">Pobočka</Label>
        <Select v-model="locationId">
          <SelectTrigger id="valuation-location"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL_LOCATIONS">Všechny pobočky</SelectItem>
            <SelectItem v-for="location in locations" :key="location.id" :value="location.id">
              {{ location.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="space-y-1.5">
        <Label for="valuation-search">Produkt</Label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="valuation-search" v-model="search" class="pl-9" placeholder="Název nebo SKU…" @keyup.enter="load(1)" />
        </div>
      </div>
      <div class="space-y-1.5">
        <Label for="valuation-sort">Řazení</Label>
        <Select v-model="sort">
          <SelectTrigger id="valuation-sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="-stockValue">Nejvyšší hodnota</SelectItem>
            <SelectItem value="-cogs">Nejvyšší COGS</SelectItem>
            <SelectItem value="-loss">Nejvyšší ztráty</SelectItem>
            <SelectItem value="name">Název A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex items-end">
        <Button type="button" variant="coral" class="w-full" :disabled="loading" @click="load(1)">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" /> Načíst výkaz
        </Button>
      </div>
    </div>

    <div v-if="loading && !result" class="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
      <Loader2 class="mx-auto mb-3 h-5 w-5 animate-spin text-primary" /> Počítám ocenění.
    </div>
    <div v-else-if="error" class="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
      {{ error }}
    </div>

    <template v-else-if="result">
      <div
        v-if="!result.summary.isComplete"
        class="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
        role="status"
      >
        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div>
          <div class="font-semibold">Výkaz není nákladově úplný</div>
          <p class="mt-1 text-muted-foreground">
            {{ result.summary.missingCostProductCount }} produktům chybí cena pro ocenění a
            {{ result.summary.missingPurchaseCostProductCount }} produktům chybí cena na příjemce.
            Neúplné peněžní součty proto zobrazujeme jako „Neúplné“, ne jako nulu.
          </p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl border border-border bg-card p-4">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Koncová hodnota</div>
          <div class="mt-1 text-xl font-bold tabular-nums">{{ money(result.summary.closingStockValue) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">počátek {{ money(result.summary.openingStockValue) }}</div>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Nákupy</div>
          <div class="mt-1 text-xl font-bold tabular-nums">{{ money(result.summary.purchaseValue) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">přesné ceny z příjemek</div>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">COGS z prodejů</div>
          <div class="mt-1 text-xl font-bold tabular-nums">{{ money(result.summary.cogsValue) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">prodej minus storna</div>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Ztráty</div>
          <div class="mt-1 text-xl font-bold tabular-nums text-destructive">{{ money(result.summary.lossValue) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">odpis, rozbití a expirace</div>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4 sm:col-span-2 xl:col-span-1">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Ostatní spotřeba</div>
          <div class="mt-1 text-lg font-bold tabular-nums">{{ money(result.summary.consumptionValue) }}</div>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4 sm:col-span-2 xl:col-span-1">
          <div class="text-xs uppercase tracking-wide text-muted-foreground">Inventurní rozdíl</div>
          <div class="mt-1 text-lg font-bold tabular-nums">{{ signedMoney(result.summary.inventoryAdjustmentValue) }}</div>
        </div>
      </div>

      <div v-if="!result.products.items.length" class="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
        Pro zvolený filtr nejsou žádné skladové pohyby.
      </div>
      <div v-else class="space-y-3">
        <article v-for="item in result.products.items" :key="item.productId" class="rounded-2xl border border-border bg-card p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="font-semibold">{{ item.productName }}</h3>
              <p class="text-xs text-muted-foreground">
                {{ item.productSku }} · {{ STOCK_COST_SOURCE_LABELS[item.costSource] }}
                <span v-if="!item.isCostComplete"> · neúplný odhad</span>
              </p>
            </div>
            <div class="text-right">
              <div class="text-xs uppercase tracking-wide text-muted-foreground">Jednotkový náklad</div>
              <div class="font-bold tabular-nums" :class="!item.isCostComplete ? 'text-amber-700 dark:text-amber-300' : ''">
                {{ money(item.unitCost) }}
              </div>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
            <div class="rounded-xl bg-muted/40 p-3">
              <div class="text-xs text-muted-foreground">Koncový stav</div>
              <div class="font-semibold tabular-nums">{{ quantity(item.closingQuantity) }}</div>
              <div class="text-xs tabular-nums">{{ money(item.closingStockValue) }}</div>
            </div>
            <div class="rounded-xl bg-muted/40 p-3">
              <div class="text-xs text-muted-foreground">Nákup</div>
              <div class="font-semibold tabular-nums">{{ quantity(item.purchaseQuantity) }}</div>
              <div class="text-xs tabular-nums">{{ money(item.purchaseValue) }}</div>
            </div>
            <div class="rounded-xl bg-muted/40 p-3">
              <div class="text-xs text-muted-foreground">COGS</div>
              <div class="font-semibold tabular-nums">{{ quantity(item.cogsQuantity) }}</div>
              <div class="text-xs tabular-nums">{{ money(item.cogsValue) }}</div>
            </div>
            <div class="rounded-xl bg-muted/40 p-3">
              <div class="text-xs text-muted-foreground">Spotřeba</div>
              <div class="font-semibold tabular-nums">{{ quantity(item.consumptionQuantity) }}</div>
              <div class="text-xs tabular-nums">{{ money(item.consumptionValue) }}</div>
            </div>
            <div class="rounded-xl bg-muted/40 p-3">
              <div class="text-xs text-muted-foreground">Ztráty</div>
              <div class="font-semibold tabular-nums">{{ quantity(item.lossQuantity) }}</div>
              <div class="text-xs tabular-nums">{{ money(item.lossValue) }}</div>
            </div>
            <div class="rounded-xl bg-muted/40 p-3">
              <div class="text-xs text-muted-foreground">Inventurní rozdíl</div>
              <div class="font-semibold tabular-nums">{{ quantity(item.inventoryAdjustmentQuantity) }}</div>
              <div class="text-xs tabular-nums">{{ signedMoney(item.inventoryAdjustmentValue) }}</div>
            </div>
          </div>
        </article>
      </div>

      <nav
        v-if="result.products.total > PAGE_SIZE"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
        aria-label="Stránkování ocenění skladu"
      >
        <p class="text-sm text-muted-foreground">
          Strana {{ page }} z {{ totalPages }} · {{ result.products.total }} produktů
        </p>
        <div class="flex gap-2">
          <Button type="button" size="sm" variant="outline" :disabled="loading || page <= 1" @click="load(page - 1)">
            <ChevronLeft class="h-4 w-4" /> Předchozí
          </Button>
          <Button type="button" size="sm" variant="outline" :disabled="loading || page >= totalPages" @click="load(page + 1)">
            Další <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </nav>
    </template>
  </section>
</template>
