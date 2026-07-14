<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, Loader2, RefreshCw } from 'lucide-vue-next'
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
import { useInventory, type StockMovementQuery } from '@/composables/useInventory'
import { downloadCsv } from '@/lib/csv-export'
import {
  buildStockMovementRows,
  STOCK_MOVEMENT_COLUMNS,
  STOCK_MOVEMENT_LABELS,
  stockMovementFilename,
  stockMovementLocationName,
  stockMovementProductName,
  stockMovementProductSku,
  stockMovementSource,
} from '@/lib/inventory-export'
import type {
  Location,
  Product,
  StockMovement,
  StockMovementFilters,
  StockMovementType,
} from '@/lib/types'
import { toast } from '@/components/ui/sonner'

const props = defineProps<{
  products: Product[]
  locations: Location[]
  initialLocationId?: string | null
}>()

const ALL_PRODUCTS = '__all_products__'
const ALL_TYPES = '__all_types__'
const ALL_LOCATIONS = '__all_locations__'
const today = localDateIso(new Date())

const from = ref(`${today.slice(0, 8)}01`)
const to = ref(today)
const productId = ref(ALL_PRODUCTS)
const movementType = ref(ALL_TYPES)
const locationId = ref(props.initialLocationId || ALL_LOCATIONS)
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const movements = ref<StockMovement[]>([])
const loadedFilterKey = ref('')
const loadedQuery = ref<StockMovementQuery | null>(null)
const totalMovements = ref(0)
const responsePageSize = ref(100)
const displayPage = ref(1)
const filterCatalog = ref<StockMovementFilters>({ products: [], locations: [] })

const inventory = useInventory()
const movementTypeOptions = Object.entries(STOCK_MOVEMENT_LABELS) as Array<
  [StockMovementType, string]
>
const productNameById = computed(
  () => new Map(props.products.map((product) => [product.id, product.name])),
)
const productSkuById = computed(
  () => new Map(props.products.map((product) => [product.id, product.sku])),
)
const locationNameById = computed(
  () => new Map(props.locations.map((location) => [location.id, location.name])),
)
const fallbacks = computed(() => ({
  productNameById: productNameById.value,
  productSkuById: productSkuById.value,
  locationNameById: locationNameById.value,
}))
const incomingCount = computed(
  () => movements.value.filter((movement) => movement.quantity > 0).length,
)
const outgoingCount = computed(
  () => movements.value.filter((movement) => movement.quantity < 0).length,
)
const selectedQuery = computed(() => ({
  from: from.value || undefined,
  to: to.value || undefined,
  productId: productId.value === ALL_PRODUCTS ? null : productId.value,
  type: movementType.value === ALL_TYPES ? null : (movementType.value as StockMovementType),
  locationId: locationId.value === ALL_LOCATIONS ? null : locationId.value,
}))
const filterKey = computed(() => JSON.stringify(selectedQuery.value))
const filtersDirty = computed(() => filterKey.value !== loadedFilterKey.value)
const productOptions = computed(() => {
  const options = new Map(
    props.products.map((product) => [
      product.id,
      { id: product.id, name: product.name, sku: product.sku, archived: false },
    ]),
  )
  for (const product of filterCatalog.value.products) {
    options.set(product.id, {
      id: product.id,
      name: product.name,
      sku: product.sku,
      archived: product.isArchived,
    })
  }
  for (const movement of movements.value) {
    if (!options.has(movement.productId)) {
      options.set(movement.productId, {
        id: movement.productId,
        name: movement.productName || movement.productId,
        sku: movement.productSku || '',
        archived: true,
      })
    }
  }
  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, 'cs'))
})
const locationOptions = computed(() => {
  const options = new Map(
    props.locations.map((location) => [
      location.id,
      { id: location.id, name: location.name, archived: false },
    ]),
  )
  for (const location of filterCatalog.value.locations) {
    options.set(location.id, {
      id: location.id,
      name: location.name,
      archived: location.isArchived,
    })
  }
  for (const movement of movements.value) {
    if (movement.locationId && !options.has(movement.locationId)) {
      options.set(movement.locationId, {
        id: movement.locationId,
        name: movement.locationName || 'Archivovaná pobočka',
        archived: true,
      })
    }
  }
  return [...options.values()].sort((a, b) => a.name.localeCompare(b.name, 'cs'))
})
const displayPageCount = computed(() => Math.ceil(totalMovements.value / responsePageSize.value))

function localDateIso(date: Date): string {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatQuantity(value: number): string {
  return value.toLocaleString('cs-CZ', { maximumFractionDigits: 3 })
}

function signedQuantity(value: number): string {
  return `${value > 0 ? '+' : ''}${formatQuantity(value)}`
}

function productName(movement: StockMovement): string {
  return stockMovementProductName(movement, fallbacks.value)
}

function productSku(movement: StockMovement): string {
  return stockMovementProductSku(movement, fallbacks.value)
}

function locationName(movement: StockMovement): string {
  return stockMovementLocationName(movement, fallbacks.value)
}

async function load(): Promise<void> {
  if (loading.value) return
  if (from.value && to.value && from.value > to.value) {
    toast.error('Datum „Od“ nesmí být později než datum „Do“.')
    return
  }

  loading.value = true
  error.value = ''
  loadedFilterKey.value = ''
  const query = selectedQuery.value
  const requestFilterKey = filterKey.value
  try {
    const result = await inventory.movementPage(query)
    movements.value = result.items
    totalMovements.value = result.total
    responsePageSize.value = result.pageSize
    displayPage.value = result.page
    loadedQuery.value = query
    loadedFilterKey.value = requestFilterKey
  } catch (cause) {
    console.error(cause)
    error.value =
      cause instanceof Error
        ? cause.message
        : 'Skladové pohyby se nepodařilo načíst. Zkuste výběr znovu.'
  } finally {
    loading.value = false
  }
}

async function loadPage(page: number): Promise<void> {
  if (loading.value || filtersDirty.value || !loadedQuery.value) return
  loading.value = true
  error.value = ''
  try {
    const result = await inventory.movementPage(loadedQuery.value, page)
    movements.value = result.items
    totalMovements.value = result.total
    responsePageSize.value = result.pageSize
    displayPage.value = result.page
  } catch (cause) {
    console.error(cause)
    error.value = 'Další stránku skladových pohybů se nepodařilo načíst. Zkuste to znovu.'
  } finally {
    loading.value = false
  }
}

async function exportCsv(): Promise<void> {
  if (!totalMovements.value || filtersDirty.value || !loadedQuery.value || error.value) return
  exporting.value = true
  const query = loadedQuery.value
  try {
    const allMovements = await inventory.movements(query)
    downloadCsv(
      stockMovementFilename(query.from, query.to),
      STOCK_MOVEMENT_COLUMNS,
      buildStockMovementRows(allMovements, fallbacks.value),
    )
  } catch (cause) {
    console.error(cause)
    toast.error(
      cause instanceof Error
        ? cause.message
        : 'Skladový export se nepodařilo připravit. Zkuste to znovu.',
    )
  } finally {
    exporting.value = false
  }
}

async function loadFilterCatalog(): Promise<void> {
  try {
    filterCatalog.value = await inventory.movementFilters()
  } catch (cause) {
    console.error('Načtení katalogu filtrů skladových pohybů selhalo:', cause)
  }
}

onMounted(() => {
  void Promise.all([load(), loadFilterCatalog()])
})
</script>

<template>
  <section aria-labelledby="stock-ledger-title" class="mt-4 space-y-4">
    <div class="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="stock-ledger-title" class="text-lg font-semibold">Skladová karta a pohyby</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Přesný dohledatelný výběr z neměnného skladového ledgeru. Export obsahuje i ID
            zdrojového dokladu.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          :disabled="loading || exporting || !totalMovements || filtersDirty || !!error"
          @click="exportCsv"
        >
          <Loader2 v-if="exporting" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
          {{ exporting ? 'Připravuji CSV' : 'Export CSV' }}
        </Button>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div class="grid gap-1.5">
          <Label for="ledger-from">Od</Label>
          <Input id="ledger-from" v-model="from" type="date" />
        </div>
        <div class="grid gap-1.5">
          <Label for="ledger-to">Do</Label>
          <Input id="ledger-to" v-model="to" type="date" />
        </div>
        <div class="grid min-w-0 gap-1.5">
          <Label for="ledger-product">Produkt</Label>
          <Select v-model="productId">
            <SelectTrigger id="ledger-product"
              ><SelectValue placeholder="Všechny produkty"
            /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_PRODUCTS">Všechny produkty</SelectItem>
              <SelectItem v-for="product in productOptions" :key="product.id" :value="product.id">
                {{ product.name }}<template v-if="product.sku"> · {{ product.sku }}</template>
                <template v-if="product.archived"> (archiv)</template>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid min-w-0 gap-1.5">
          <Label for="ledger-type">Typ pohybu</Label>
          <Select v-model="movementType">
            <SelectTrigger id="ledger-type"
              ><SelectValue placeholder="Všechny typy"
            /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_TYPES">Všechny typy</SelectItem>
              <SelectItem v-for="option in movementTypeOptions" :key="option[0]" :value="option[0]">
                {{ option[1] }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid min-w-0 gap-1.5">
          <Label for="ledger-location">Pobočka</Label>
          <Select v-model="locationId">
            <SelectTrigger id="ledger-location"
              ><SelectValue placeholder="Všechny pobočky"
            /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_LOCATIONS">Všechny pobočky</SelectItem>
              <SelectItem
                v-for="location in locationOptions"
                :key="location.id"
                :value="location.id"
              >
                {{ location.name }}<template v-if="location.archived"> (archiv)</template>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="coral" :disabled="loading" @click="load">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <RefreshCw v-else class="h-4 w-4" />
          Použít filtry
        </Button>
        <p aria-live="polite" class="text-sm text-muted-foreground">
          {{ totalMovements }} pohybů · na této straně {{ incomingCount }} příchozích a
          {{ outgoingCount }} odchozích
        </p>
        <p
          v-if="loadedFilterKey && filtersDirty && !loading"
          class="text-sm text-amber-700 dark:text-amber-300"
          role="status"
        >
          Filtry byly změněny. Pro zobrazení a export použijte tlačítko Použít filtry.
        </p>
      </div>
    </div>

    <div
      v-if="error"
      role="alert"
      class="rounded-2xl border border-destructive/40 bg-destructive/5 p-5"
    >
      <p class="font-medium text-destructive">{{ error }}</p>
      <Button type="button" variant="outline" class="mt-3" @click="load">Načíst znovu</Button>
    </div>

    <div
      v-else-if="loading"
      class="flex justify-center rounded-2xl border border-border bg-card p-12"
    >
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div
      v-else-if="!totalMovements"
      class="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"
    >
      Vybraným filtrům neodpovídá žádný skladový pohyb. CSV se nestahuje.
    </div>

    <div v-else>
      <div class="hidden overflow-x-auto rounded-2xl border border-border bg-card md:block">
        <table class="w-full min-w-[980px] text-sm">
          <thead class="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th class="px-4 py-3 font-medium">Datum</th>
              <th class="px-4 py-3 font-medium">Produkt</th>
              <th class="px-4 py-3 font-medium">Pobočka</th>
              <th class="px-4 py-3 font-medium">Typ</th>
              <th class="px-4 py-3 font-medium">Zdroj</th>
              <th class="px-4 py-3 text-right font-medium">Změna</th>
              <th class="px-4 py-3 text-right font-medium">Stav po</th>
              <th class="px-4 py-3 font-medium">Poznámka</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="movement in movements" :key="movement.id">
              <td class="whitespace-nowrap px-4 py-3">{{ formatDateTime(movement.createdAt) }}</td>
              <td class="px-4 py-3">
                <div class="font-medium">{{ productName(movement) }}</div>
                <div class="text-xs text-muted-foreground">{{ productSku(movement) }}</div>
              </td>
              <td class="px-4 py-3">{{ locationName(movement) }}</td>
              <td class="px-4 py-3">{{ STOCK_MOVEMENT_LABELS[movement.type] }}</td>
              <td class="px-4 py-3">
                <div>{{ stockMovementSource(movement).label }}</div>
                <div class="max-w-56 break-all font-mono text-xs text-muted-foreground">
                  {{ stockMovementSource(movement).id || '—' }}
                </div>
              </td>
              <td
                class="px-4 py-3 text-right font-semibold tabular-nums"
                :class="movement.quantity >= 0 ? 'text-success' : 'text-destructive'"
              >
                {{ signedQuantity(movement.quantity) }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums">
                {{ formatQuantity(movement.quantityAfter) }}
              </td>
              <td
                class="max-w-60 truncate px-4 py-3 text-muted-foreground"
                :title="movement.note || ''"
              >
                {{ movement.note || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-3 md:hidden">
        <article
          v-for="movement in movements"
          :key="movement.id"
          class="rounded-2xl border border-border bg-card p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate font-semibold">{{ productName(movement) }}</h3>
              <p class="text-xs text-muted-foreground">
                {{ productSku(movement) }} · {{ locationName(movement) }}
              </p>
            </div>
            <span
              class="shrink-0 font-semibold tabular-nums"
              :class="movement.quantity >= 0 ? 'text-success' : 'text-destructive'"
            >
              {{ signedQuantity(movement.quantity) }}
            </span>
          </div>
          <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt class="text-xs text-muted-foreground">Typ</dt>
              <dd>{{ STOCK_MOVEMENT_LABELS[movement.type] }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Stav po pohybu</dt>
              <dd class="tabular-nums">{{ formatQuantity(movement.quantityAfter) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Datum</dt>
              <dd>{{ formatDateTime(movement.createdAt) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Zdroj</dt>
              <dd>
                {{ stockMovementSource(movement).label }}
                <span class="block break-all font-mono text-xs text-muted-foreground">
                  {{ stockMovementSource(movement).id || '—' }}
                </span>
              </dd>
            </div>
          </dl>
          <p v-if="movement.note" class="mt-3 break-words text-sm text-muted-foreground">
            {{ movement.note }}
          </p>
        </article>
      </div>

      <nav
        v-if="displayPageCount > 1"
        aria-label="Stránkování skladových pohybů"
        class="mt-4 flex items-center justify-center gap-3"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="displayPage === 1 || filtersDirty"
          @click="loadPage(displayPage - 1)"
        >
          Předchozí
        </Button>
        <span class="text-sm text-muted-foreground">
          Strana {{ displayPage }} z {{ displayPageCount }}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="displayPage === displayPageCount || filtersDirty"
          @click="loadPage(displayPage + 1)"
        >
          Další
        </Button>
      </nav>
    </div>
  </section>
</template>
