<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Plus,
  Minus,
  Loader2,
  Search,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  AlertTriangle,
  Scale,
  ArrowRightLeft,
  Building2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProducts } from '@/composables/useProducts'
import { useInventory, type StocktakeItemInput } from '@/composables/useInventory'
import { useLocations } from '@/composables/useLocations'
import { isApiMode, ApiError } from '@/lib/http'
import { isApprovalRequest } from '@/lib/types'
import { formatDate } from '@/lib/invoice'
import LoadError from '@/components/app/LoadError.vue'
import { toast } from '@/components/ui/sonner'
import type {
  StockByLocationResponse,
  StockLocationColumn,
  StockMirror,
  StockMirrorItem,
  StockMovement,
  StockMovementType,
} from '@/lib/types'

const { products, load: loadProducts } = useProducts()
const { locations, load: loadLocations } = useLocations()
const inv = useInventory()
const apiMode = isApiMode()
const ALL_LOCATIONS = '__all__'

const loading = ref(true)
const loadError = ref(false)
const busy = ref(false)
const tab = ref<'levels' | 'movements' | 'mirror' | 'byLocation'>('levels')
const search = ref('')
const levelMap = ref(new Map<string, number>())
const movements = ref<StockMovement[]>([])
const movementsLoaded = ref(false)
const movementsLoading = ref(false)
const movementsError = ref(false)
const mirror = ref<StockMirror | null>(null)
const mirrorLoaded = ref(false)
const mirrorLoading = ref(false)
const today = todayISO()
const mirrorFrom = ref(today)
const mirrorTo = ref(today)
const mirrorLocationId = ref(ALL_LOCATIONS)
const mirrorSearch = ref('')
const expandedMirrorProductId = ref<string | null>(null)
const stockLocationId = ref(ALL_LOCATIONS)

// Centrální sklad (přehled napříč pobočkami) — lazy load.
const byLocation = ref<StockByLocationResponse | null>(null)
const byLocationLoaded = ref(false)
const byLocationLoading = ref(false)
const byLocationSearch = ref('')
const NULL_COL = '__null__'
const colKey = (locationId: string | null): string => locationId ?? NULL_COL
// null id = skutečně nezařazený sklad; id bez jména = archivovaná pobočka se zbytkem (ať se labely nepletou).
const colLabel = (col: StockLocationColumn): string =>
  col.locationName ?? (col.locationId ? 'Archivovaná pobočka' : 'Nezařazeno')
const byLocationColumns = computed(() => byLocation.value?.locations ?? [])
// Řídké buňky → mapa množství podle sloupce, ať se v tabulce chybějící buňka doplní na 0.
const byLocationRows = computed(() =>
  (byLocation.value?.products.items ?? []).map((r) => {
    const q: Record<string, number> = {}
    for (const c of r.cells) q[colKey(c.locationId)] = c.quantity
    return { ...r, q }
  }),
)

const MOVE_LABEL: Record<StockMovementType, string> = {
  Receipt: 'Příjem',
  Issue: 'Výdej',
  WriteOff: 'Odpis',
  StaffMeal: 'Staff meal',
  Breakage: 'Rozbito',
  Expiration: 'Expirace',
  Correction: 'Korekce',
  Sale: 'Prodej',
  StornoSale: 'Storno',
  Stocktaking: 'Inventura',
  TransferOut: 'Přesun ven',
  TransferIn: 'Přesun dovnitř',
}
const ISSUE_TYPE_OPTIONS: Array<{ value: StockMovementType; label: string }> = [
  { value: 'Issue', label: 'Běžný výdej' },
  { value: 'WriteOff', label: 'Odpis' },
  { value: 'StaffMeal', label: 'Staff meal' },
  { value: 'Breakage', label: 'Rozbito' },
  { value: 'Expiration', label: 'Expirace' },
]
const ACTION_LABEL: Record<'receive' | 'issue' | 'correct', string> = {
  receive: 'Příjem',
  issue: 'Výdej',
  correct: 'Korekce',
}

interface Row {
  id: string
  name: string
  sku: string
  min: number
  qty: number
  low: boolean
}

interface StocktakeRow {
  id: string
  name: string
  sku: string
  expectedQuantity: number
  countedQuantity: number
  differenceQuantity: number
}

const rows = computed<Row[]>(() => {
  const q = search.value.toLowerCase().trim()
  return products.value
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    .map((p) => {
      const qty = levelMap.value.get(p.id) ?? 0
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        min: p.minQuantity,
        qty,
        low: p.minQuantity > 0 && qty < p.minQuantity,
      }
    })
})
const lowCount = computed(() => rows.value.filter((r) => r.low).length)
const stockFilterLocationId = computed(() =>
  stockLocationId.value === ALL_LOCATIONS ? null : stockLocationId.value,
)
const actionLocationId = computed(() => {
  if (stockLocationId.value !== ALL_LOCATIONS) return stockLocationId.value
  return locations.value.length === 1 ? (locations.value[0]?.id ?? null) : null
})
const stockLocationLabel = computed(() => {
  if (stockLocationId.value === ALL_LOCATIONS) return 'Všechny pobočky'
  return locationName(stockLocationId.value) ?? 'Vybraná pobočka'
})
const mirrorVarianceCount = computed(
  () => mirror.value?.items.filter((i) => Math.abs(i.varianceQuantity) > 0.0001).length ?? 0,
)
const mirrorVarianceValue = computed(() => {
  const values = mirror.value?.items
    .map((i) => i.varianceValue)
    .filter((value): value is number => value !== null && value !== undefined)
  if (!values?.length) return null
  return values.reduce((sum, value) => sum + value, 0)
})

function productName(id: string): string {
  return products.value.find((p) => p.id === id)?.name ?? '—'
}
function locationName(id: string | null): string | null {
  if (!id) return null
  return locations.value.find((l) => l.id === id)?.name ?? 'Neznámá pobočka'
}
function fmtQty(n: number): string {
  return Number(n).toLocaleString('cs-CZ', { maximumFractionDigits: 3 })
}
function fmtSigned(n: number): string {
  return `${n > 0 ? '+' : ''}${fmtQty(n)}`
}
function fmtMoney(n: number): string {
  return n.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })
}
function fmtSignedMoney(n: number): string {
  return `${n > 0 ? '+' : ''}${fmtMoney(n)}`
}
function varianceTone(item: StockMirrorItem): string {
  if (item.varianceQuantity > 0) return 'text-success'
  if (item.varianceQuantity < 0) return 'text-destructive'
  return 'text-muted-foreground'
}
function toggleMirrorDetail(productId: string) {
  expandedMirrorProductId.value = expandedMirrorProductId.value === productId ? null : productId
}
function mirrorConsumption(item: StockMirrorItem): number {
  return item.soldQuantity + item.issuedQuantity
}
function mirrorVarianceExplanation(item: StockMirrorItem): string {
  if (Math.abs(item.varianceQuantity) <= 0.0001) {
    return 'Rozdíl je nulový: realita odpovídá systému po započtení všech pohybů.'
  }
  const reasons: string[] = []
  if (item.correctionQuantity !== 0) reasons.push(`korekce ${fmtSigned(item.correctionQuantity)}`)
  if (item.stocktakingQuantity !== 0)
    reasons.push(`inventura ${fmtSigned(item.stocktakingQuantity)}`)
  if (!reasons.length) {
    return 'Rozdíl je nenulový, ale zrcadlo nemá samostatný korekční nebo inventurní pohyb. Zkontrolujte historii pohybů položky.'
  }
  return `Rozdíl vzniká z: ${reasons.join(' + ')}. Prodeje, výdeje a přesuny už jsou započtené ve stavu „má být".`
}
function todayISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}

async function loadLevels() {
  const levels = await inv.levels({ locationId: stockFilterLocationId.value })
  const totals = new Map<string, number>()
  for (const level of levels) {
    totals.set(level.productId, (totals.get(level.productId) ?? 0) + level.quantity)
  }
  levelMap.value = totals
}

watch(stockLocationId, async (locationId) => {
  if (!apiMode || loading.value) return
  try {
    mirrorLocationId.value = locationId
    await loadLevels()
    if (mirrorLoaded.value) await loadMirror()
  } catch (e) {
    toast.error('Stav zásob pro pobočku se nepodařilo načíst.')
    console.error(e)
  }
})

async function reload() {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([loadProducts(), loadLocations()])
    await loadLevels()
  } catch (e) {
    loadError.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!apiMode) {
    loading.value = false
    return
  }
  reload()
})

async function showMovements() {
  tab.value = 'movements'
  if (movementsLoaded.value || movementsLoading.value) return
  movementsLoading.value = true
  movementsError.value = false
  try {
    movements.value = await inv.movements()
    movementsLoaded.value = true
  } catch (e) {
    movementsError.value = true
    toast.error('Skladové pohyby se nepodařilo načíst.')
    console.error(e)
  } finally {
    movementsLoading.value = false
  }
}

async function loadMirror() {
  mirrorLoading.value = true
  try {
    mirror.value = await inv.stockMirror({
      from: mirrorFrom.value,
      to: mirrorTo.value,
      locationId: mirrorLocationId.value === ALL_LOCATIONS ? null : mirrorLocationId.value,
      search: mirrorSearch.value,
    })
    expandedMirrorProductId.value = null
    mirrorLoaded.value = true
  } catch (e) {
    toast.error('Zrcadlo skladu se nepodařilo načíst.')
    console.error(e)
  } finally {
    mirrorLoading.value = false
  }
}

async function showMirror() {
  tab.value = 'mirror'
  if (!mirrorLoaded.value) {
    await loadMirror()
  }
}

async function loadByLocation() {
  byLocationLoading.value = true
  try {
    byLocation.value = await inv.stockByLocation(byLocationSearch.value)
    byLocationLoaded.value = true
  } catch (e) {
    toast.error('Přehled zásob po pobočkách se nepodařilo načíst.')
    console.error(e)
  } finally {
    byLocationLoading.value = false
  }
}

async function showByLocation() {
  tab.value = 'byLocation'
  if (!byLocationLoaded.value) await loadByLocation()
}

// --- Akce: příjem / výdej / korekce ---
const actionOpen = ref(false)
const actionMode = ref<'receive' | 'issue' | 'correct'>('receive')
const actionProduct = ref<Row | null>(null)
const actionForm = reactive<{ amount: number; note: string; issueType: StockMovementType }>({
  amount: 0,
  note: '',
  issueType: 'Issue',
})

function openAction(row: Row, mode: 'receive' | 'issue' | 'correct') {
  if (locations.value.length > 1 && stockLocationId.value === ALL_LOCATIONS) {
    toast.error('Nejdřív vyberte konkrétní pobočku skladu.')
    return
  }
  actionProduct.value = row
  actionMode.value = mode
  actionForm.amount = 0
  actionForm.note = ''
  actionForm.issueType = 'Issue'
  actionOpen.value = true
}

async function submitAction() {
  const row = actionProduct.value
  if (!row) return
  const amount = Number(actionForm.amount)
  if (actionMode.value === 'correct') {
    if (amount === 0) return toast.error('Zadejte nenulovou změnu (±).')
    if (!actionForm.note.trim()) return toast.error('U korekce zadejte důvod.')
  } else if (amount <= 0) {
    return toast.error('Zadejte kladné množství.')
  }
  busy.value = true
  try {
    const id = row.id
    const locationId = actionLocationId.value
    if (actionMode.value === 'receive')
      await inv.receive(id, amount, actionForm.note || null, locationId)
    else if (actionMode.value === 'issue') {
      const result = await inv.issue(
        id,
        amount,
        actionForm.note || null,
        actionForm.issueType,
        locationId,
      )
      if (isApprovalRequest(result)) {
        actionOpen.value = false
        toast.success('Výdej čeká na schválení managerem.')
        return
      }
    } else await inv.correct(id, amount, actionForm.note.trim(), locationId)
    await loadLevels()
    if (movementsLoaded.value) movements.value = await inv.movements()
    if (mirrorLoaded.value) await loadMirror()
    actionOpen.value = false
    toast.success(`${ACTION_LABEL[actionMode.value]} uložen.`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) toast.error('Nedostatek zásoby na skladě.')
    else toast.error('Operace selhala.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Přesun mezi provozovnami/sklady ---
const transferOpen = ref(false)
const transferProduct = ref<Row | null>(null)
const transferForm = reactive({
  amount: 0,
  fromLocationId: '',
  toLocationId: '',
  note: '',
})

function openTransfer(row: Row) {
  if (locations.value.length < 2) {
    toast.error('Pro přesun založte alespoň dvě pobočky.')
    return
  }
  transferProduct.value = row
  transferForm.amount = 0
  transferForm.fromLocationId =
    stockLocationId.value !== ALL_LOCATIONS ? stockLocationId.value : (locations.value[0]?.id ?? '')
  transferForm.toLocationId =
    locations.value.find((l) => l.id !== transferForm.fromLocationId)?.id ?? ''
  transferForm.note = ''
  transferOpen.value = true
}

async function submitTransfer() {
  const row = transferProduct.value
  if (!row) return
  const amount = Number(transferForm.amount)
  if (amount <= 0) return toast.error('Zadejte kladné množství.')
  if (!transferForm.fromLocationId || !transferForm.toLocationId)
    return toast.error('Vyberte zdrojovou i cílovou pobočku.')
  if (transferForm.fromLocationId === transferForm.toLocationId)
    return toast.error('Zdroj a cíl musí být jiné pobočky.')

  busy.value = true
  try {
    await inv.transfer(
      row.id,
      amount,
      transferForm.fromLocationId,
      transferForm.toLocationId,
      transferForm.note.trim() || null,
    )
    await loadLevels()
    if (movementsLoaded.value) movements.value = await inv.movements()
    if (mirrorLoaded.value) await loadMirror()
    transferOpen.value = false
    toast.success('Přesun uložen.')
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) toast.error('Nedostatek zásoby na skladě.')
    else if (e instanceof ApiError && e.status === 403)
      toast.error('Přesun mimo vaši pobočku není povolen.')
    else toast.error('Přesun selhal.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Inventura ---
const stocktakeOpen = ref(false)
const stocktakeSearch = ref('')
const stocktakeNote = ref('Inventura')
const counts = ref<Record<string, number | ''>>({})

function openStocktake() {
  if (locations.value.length > 1 && stockLocationId.value === ALL_LOCATIONS) {
    toast.error('Inventuru spusťte pro konkrétní pobočku.')
    return
  }
  counts.value = Object.fromEntries(
    products.value.map((p) => [p.id, levelMap.value.get(p.id) ?? 0]),
  )
  stocktakeSearch.value = ''
  stocktakeNote.value = 'Inventura'
  stocktakeOpen.value = true
}

function normalizeCount(value: number | ''): number {
  if (value === '') return 0
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

const allStocktakeRows = computed<StocktakeRow[]>(() =>
  products.value.map((p) => {
    const expectedQuantity = levelMap.value.get(p.id) ?? 0
    const countedQuantity = normalizeCount(counts.value[p.id] ?? expectedQuantity)
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      expectedQuantity,
      countedQuantity,
      differenceQuantity: countedQuantity - expectedQuantity,
    }
  }),
)

const stocktakeRows = computed<StocktakeRow[]>(() => {
  const q = stocktakeSearch.value.toLowerCase().trim()
  if (!q) return allStocktakeRows.value
  return allStocktakeRows.value.filter(
    (r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q),
  )
})

const stocktakeChangedRows = computed(() =>
  allStocktakeRows.value.filter((r) => Math.abs(r.differenceQuantity) > 0.0001),
)

const stocktakeDifferenceTotal = computed(() =>
  stocktakeChangedRows.value.reduce((sum, row) => sum + row.differenceQuantity, 0),
)

async function submitStocktake() {
  const items: StocktakeItemInput[] = products.value.map((p) => ({
    productId: p.id,
    countedQuantity: normalizeCount(counts.value[p.id] ?? 0),
  }))
  if (!items.length) return toast.error('Žádné produkty k inventuře.')
  busy.value = true
  try {
    const result = await inv.stocktake(
      items,
      stocktakeNote.value.trim() || null,
      actionLocationId.value,
    )
    if (isApprovalRequest(result)) {
      stocktakeOpen.value = false
      toast.success('Inventura čeká na schválení managerem.')
      return
    }
    await loadLevels()
    if (movementsLoaded.value) movements.value = await inv.movements()
    if (mirrorLoaded.value) await loadMirror()
    stocktakeOpen.value = false
    toast.success('Inventura uložena — stav srovnán.')
  } catch (e) {
    toast.error('Inventura selhala.')
    console.error(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Stav skladu</h1>
        <p class="mt-1 text-muted-foreground">Stav skladu, příjem/výdej, korekce a inventura.</p>
      </div>
      <Button variant="outline" :disabled="!apiMode" @click="openStocktake">
        <ClipboardCheck class="h-4 w-4" /> Inventura
      </Button>
    </div>

    <div
      v-if="!apiMode"
      class="mt-6 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      Stav skladu teď není dostupný. Zkontrolujte připojení a zkuste to znovu.
    </div>

    <template v-else>
      <!-- flex-wrap: na 320px se přepínače záložek zalomí místo horizontálního overflow -->
      <div class="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'levels'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="tab = 'levels'"
        >
          Stav zásob
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'movements'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="showMovements"
        >
          Pohyby
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'mirror'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="showMirror"
        >
          <Scale class="h-4 w-4" /> Zrcadlo
        </button>
        <button
          v-if="locations.length > 1"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'byLocation'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="showByLocation"
        >
          <Building2 class="h-4 w-4" /> Podle poboček
        </button>
        <span
          v-if="lowCount"
          class="ml-auto inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive"
        >
          <AlertTriangle class="h-3.5 w-3.5" /> {{ lowCount }} pod minimem
        </span>
        <span
          v-else-if="mirrorVarianceCount"
          class="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
        >
          <AlertTriangle class="h-3.5 w-3.5" />
          {{ mirrorVarianceCount }} rozdílů
          <template v-if="mirrorVarianceValue !== null">
            · {{ fmtSignedMoney(mirrorVarianceValue) }}
          </template>
        </span>
      </div>

      <div
        v-if="locations.length > 1"
        class="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
      >
        <div class="grid gap-1.5">
          <Label for="stock-location">Pobočka skladu</Label>
          <Select v-model="stockLocationId">
            <SelectTrigger id="stock-location" class="w-64">
              <SelectValue placeholder="Všechny pobočky" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_LOCATIONS">Všechny pobočky</SelectItem>
              <SelectItem v-for="l in locations" :key="l.id" :value="l.id">
                {{ l.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="max-w-xl text-sm text-muted-foreground">
          Stav zásob a minimum se přepočítá podle vybrané pobočky. Příjem, výdej, korekce a
          inventura vyžadují konkrétní pobočku.
        </div>
      </div>

      <div v-if="loading" class="mt-6 flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <LoadError
        v-else-if="loadError"
        class="mt-6"
        message="Stav skladu se nepodařilo načíst. Skladová data se proto nezobrazují jako prázdná."
        :retrying="loading"
        @retry="reload"
      />

      <!-- STAV ZÁSOB -->
      <template v-else-if="tab === 'levels'">
        <div class="relative mt-4">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input v-model="search" class="pl-9" placeholder="Hledat podle názvu nebo kódu…" />
        </div>

        <div class="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <div v-if="!rows.length" class="p-12 text-center text-muted-foreground">
            Žádné produkty. Přidejte je v sekci Sklad.
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="r in rows"
              :key="r.id"
              class="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4"
              :class="r.low ? 'bg-destructive/5' : 'hover:bg-muted/40'"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2 font-semibold">
                  {{ r.name }}
                  <AlertTriangle v-if="r.low" class="h-4 w-4 text-destructive" />
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ r.sku }}<span v-if="r.min > 0"> • min {{ fmtQty(r.min) }}</span>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <div
                  class="w-16 text-right text-lg font-bold tabular-nums"
                  :class="r.low ? 'text-destructive' : ''"
                >
                  {{ fmtQty(r.qty) }}
                </div>
                <div class="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    title="Příjem"
                    @click="openAction(r, 'receive')"
                  >
                    <Plus class="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" title="Výdej" @click="openAction(r, 'issue')">
                    <Minus class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Korekce"
                    @click="openAction(r, 'correct')"
                  >
                    <SlidersHorizontal class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Přesun mezi pobočkami"
                    :disabled="locations.length < 2"
                    @click="openTransfer(r)"
                  >
                    <ArrowRightLeft class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- POHYBY -->
      <template v-else-if="tab === 'movements'">
        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div v-if="movementsLoading" class="p-12 text-center text-muted-foreground">
            <Loader2 class="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
            Načítám skladové pohyby.
          </div>
          <LoadError
            v-else-if="movementsError"
            class="border-0 shadow-none"
            message="Historii skladových pohybů se nepodařilo načíst."
            :retrying="movementsLoading"
            @retry="showMovements"
          />
          <div v-else-if="!movements.length" class="p-12 text-center text-muted-foreground">
            Zatím žádné skladové pohyby.
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="m in movements"
              :key="m.id"
              class="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <div class="min-w-0">
                <div class="font-medium">{{ productName(m.productId) }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ MOVE_LABEL[m.type] }} • {{ formatDate(m.createdAt) }}
                  <span v-if="locationName(m.locationId)"> • {{ locationName(m.locationId) }}</span>
                  <span v-if="m.note"> • {{ m.note }}</span>
                </div>
              </div>
              <div class="flex items-center gap-4 tabular-nums">
                <span
                  class="font-semibold"
                  :class="m.quantity >= 0 ? 'text-success' : 'text-destructive'"
                >
                  {{ m.quantity >= 0 ? '+' : '' }}{{ fmtQty(m.quantity) }}
                </span>
                <span class="w-16 text-right text-muted-foreground">
                  {{ fmtQty(m.quantityAfter) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ZRCADLO -->
      <template v-else-if="tab === 'mirror'">
        <div
          class="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <div class="grid gap-1.5">
            <Label for="mirror-from">Od</Label>
            <Input id="mirror-from" v-model="mirrorFrom" type="date" class="w-40" />
          </div>
          <div class="grid gap-1.5">
            <Label for="mirror-to">Do</Label>
            <Input id="mirror-to" v-model="mirrorTo" type="date" class="w-40" />
          </div>
          <div v-if="locations.length > 1" class="grid gap-1.5">
            <Label for="mirror-location">Pobočka</Label>
            <Select v-model="mirrorLocationId">
              <SelectTrigger id="mirror-location" class="w-56">
                <SelectValue placeholder="Všechny pobočky" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="ALL_LOCATIONS">Všechny pobočky</SelectItem>
                <SelectItem v-for="l in locations" :key="l.id" :value="l.id">
                  {{ l.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid min-w-56 flex-1 gap-1.5">
            <Label for="mirror-search">Položka</Label>
            <Input
              id="mirror-search"
              v-model="mirrorSearch"
              placeholder="Název nebo skladový kód"
            />
          </div>
          <Button type="button" variant="outline" :disabled="mirrorLoading" @click="loadMirror">
            <Loader2 v-if="mirrorLoading" class="h-4 w-4 animate-spin" />
            Načíst zrcadlo
          </Button>
        </div>
        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div v-if="mirrorLoading && !mirror" class="p-12 text-center text-muted-foreground">
            <Loader2 class="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
            Načítám skladové zrcadlo.
          </div>
          <div v-else-if="!mirror" class="p-12 text-center text-muted-foreground">
            Zvolte filtr a načtěte skladové zrcadlo.
          </div>
          <div v-else-if="!mirror.items.length" class="p-12 text-center text-muted-foreground">
            Zatím žádné skladové pohyby pro zrcadlo.
          </div>
          <div v-else>
            <div
              class="grid min-w-[760px] grid-cols-[minmax(160px,1.5fr)_repeat(5,minmax(90px,1fr))] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground"
            >
              <span>Produkt</span>
              <span class="text-right">Příjem</span>
              <span class="text-right">Prodej/výdej</span>
              <span class="text-right">Stav má být</span>
              <span class="text-right">Realita</span>
              <span class="text-right">Rozdíl</span>
            </div>
            <div v-for="item in mirror.items" :key="item.productId" class="border-b last:border-0">
              <div
                class="grid min-w-[760px] grid-cols-[minmax(160px,1.5fr)_repeat(5,minmax(90px,1fr))] gap-3 px-4 py-3 text-sm"
              >
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ item.productName }}</div>
                  <div class="text-xs text-muted-foreground">
                    {{ item.productSku }} • otevření {{ fmtQty(item.openingQuantity) }}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="mt-2 h-7 px-2 text-xs"
                    :aria-expanded="expandedMirrorProductId === item.productId"
                    @click="toggleMirrorDetail(item.productId)"
                  >
                    <ChevronUp
                      v-if="expandedMirrorProductId === item.productId"
                      class="h-3.5 w-3.5"
                    />
                    <ChevronDown v-else class="h-3.5 w-3.5" />
                    Detail zrcadla
                  </Button>
                </div>
                <div class="text-right tabular-nums">
                  <div class="font-semibold text-success">{{ fmtQty(item.receivedQuantity) }}</div>
                  <div v-if="item.stornoQuantity" class="text-xs text-muted-foreground">
                    storno {{ fmtQty(item.stornoQuantity) }}
                  </div>
                </div>
                <div class="text-right tabular-nums">
                  <div class="font-semibold text-destructive">
                    {{ fmtQty(mirrorConsumption(item)) }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    prodej {{ fmtQty(item.soldQuantity) }}
                  </div>
                </div>
                <div class="text-right tabular-nums">
                  <div class="font-semibold">{{ fmtQty(item.expectedQuantity) }}</div>
                  <div class="text-xs text-muted-foreground">podle pohybů</div>
                </div>
                <div class="text-right tabular-nums">
                  <div class="font-semibold">{{ fmtQty(item.actualQuantity) }}</div>
                  <div class="text-xs text-muted-foreground">po kontrole</div>
                </div>
                <div class="text-right tabular-nums">
                  <div class="font-semibold" :class="varianceTone(item)">
                    {{ fmtSigned(item.varianceQuantity) }}
                  </div>
                  <div
                    v-if="item.varianceValue !== null"
                    class="text-xs font-medium"
                    :class="varianceTone(item)"
                  >
                    {{ fmtSignedMoney(item.varianceValue) }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    kor. {{ fmtSigned(item.correctionQuantity) }} / inv.
                    {{ fmtSigned(item.stocktakingQuantity) }}
                  </div>
                  <div v-if="item.unitCost !== null" class="text-xs text-muted-foreground">
                    náklad {{ fmtMoney(item.unitCost) }}/ks
                  </div>
                </div>
              </div>
              <div
                v-if="expandedMirrorProductId === item.productId"
                class="min-w-[760px] border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground"
              >
                <div class="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                  <div>
                    <div class="font-semibold text-foreground">Výpočet stavu má být</div>
                    <div class="mt-2 grid grid-cols-6 gap-2 text-center tabular-nums">
                      <div>
                        <div class="text-[11px] uppercase">Otevření</div>
                        <div class="font-semibold text-foreground">
                          {{ fmtQty(item.openingQuantity) }}
                        </div>
                      </div>
                      <div>
                        <div class="text-[11px] uppercase">+ Příjem</div>
                        <div class="font-semibold text-success">
                          {{ fmtQty(item.receivedQuantity) }}
                        </div>
                      </div>
                      <div>
                        <div class="text-[11px] uppercase">+ Storno</div>
                        <div class="font-semibold text-success">
                          {{ fmtQty(item.stornoQuantity) }}
                        </div>
                      </div>
                      <div>
                        <div class="text-[11px] uppercase">- Prodej</div>
                        <div class="font-semibold text-destructive">
                          {{ fmtQty(item.soldQuantity) }}
                        </div>
                      </div>
                      <div>
                        <div class="text-[11px] uppercase">- Výdej</div>
                        <div class="font-semibold text-destructive">
                          {{ fmtQty(item.issuedQuantity) }}
                        </div>
                      </div>
                      <div>
                        <div class="text-[11px] uppercase">= Má být</div>
                        <div class="font-semibold text-foreground">
                          {{ fmtQty(item.expectedQuantity) }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div class="font-semibold text-foreground">Vysvětlení rozdílu</div>
                    <p class="mt-2 leading-relaxed">{{ mirrorVarianceExplanation(item) }}</p>
                    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
                      <span>Korekce {{ fmtSigned(item.correctionQuantity) }}</span>
                      <span>Inventura {{ fmtSigned(item.stocktakingQuantity) }}</span>
                      <span :class="varianceTone(item)">
                        Rozdíl {{ fmtSigned(item.varianceQuantity) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Podle poboček: matice produkt × pobočka (centrální sklad) -->
      <template v-else-if="tab === 'byLocation'">
        <div class="mt-4 rounded-2xl border border-border bg-card p-4">
          <div class="flex flex-wrap items-center gap-2">
            <div class="relative min-w-48 flex-1">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                v-model="byLocationSearch"
                placeholder="Hledat podle názvu nebo skladového kódu…"
                class="pl-9"
                @keyup.enter="loadByLocation"
              />
            </div>
            <Button variant="outline" :disabled="byLocationLoading" @click="loadByLocation">
              <Loader2 v-if="byLocationLoading" class="h-4 w-4 animate-spin" />
              Načíst
            </Button>
          </div>

          <div v-if="byLocationLoading && !byLocation" class="mt-8 flex justify-center">
            <Loader2 class="h-6 w-6 animate-spin text-primary" />
          </div>
          <div
            v-else-if="byLocationRows.length === 0"
            class="mt-8 text-center text-sm text-muted-foreground"
          >
            Žádné zásoby k zobrazení.
          </div>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr
                  class="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"
                >
                  <th class="py-2 pr-4 text-left font-medium">Produkt</th>
                  <th
                    v-for="col in byLocationColumns"
                    :key="colKey(col.locationId)"
                    class="px-3 py-2 text-right font-medium"
                  >
                    {{ colLabel(col) }}
                  </th>
                  <th class="px-3 py-2 text-right font-semibold text-foreground">Celkem</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in byLocationRows"
                  :key="row.productId"
                  class="border-b border-border/60"
                >
                  <td class="py-2 pr-4">
                    <div class="font-medium text-foreground">{{ row.productName }}</div>
                    <div class="text-xs text-muted-foreground">{{ row.productSku }}</div>
                  </td>
                  <td
                    v-for="col in byLocationColumns"
                    :key="colKey(col.locationId)"
                    class="px-3 py-2 text-right tabular-nums"
                    :class="
                      (row.q[colKey(col.locationId)] ?? 0) === 0
                        ? 'text-muted-foreground/50'
                        : 'text-foreground'
                    "
                  >
                    {{ fmtQty(row.q[colKey(col.locationId)] ?? 0) }}
                  </td>
                  <td class="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                    {{ fmtQty(row.totalQuantity) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>

    <!-- Dialog příjem / výdej / korekce -->
    <Dialog v-model:open="actionOpen">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ ACTION_LABEL[actionMode] }} — {{ actionProduct?.name }}</DialogTitle>
          <DialogDescription>
            {{ stockLocationLabel }} · aktuální stav: {{ fmtQty(actionProduct?.qty ?? 0) }}
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitAction">
          <div class="space-y-2">
            <Label for="amount">
              {{ actionMode === 'correct' ? 'Změna (± množství)' : 'Množství' }}
            </Label>
            <Input
              id="amount"
              v-model.number="actionForm.amount"
              type="number"
              step="any"
              :placeholder="actionMode === 'correct' ? 'např. -2 nebo 5' : '0'"
            />
          </div>
          <div v-if="actionMode === 'issue'" class="space-y-2">
            <Label for="issue-type">Důvod výdeje</Label>
            <select
              id="issue-type"
              v-model="actionForm.issueType"
              class="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option
                v-for="option in ISSUE_TYPE_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="space-y-2">
            <Label for="note">Poznámka{{ actionMode === 'correct' ? ' (důvod) *' : '' }}</Label>
            <Input id="note" v-model="actionForm.note" placeholder="volitelné" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="actionOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog přesun -->
    <Dialog v-model:open="transferOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Přesun — {{ transferProduct?.name }}</DialogTitle>
          <DialogDescription>
            Přesuňte zásobu mezi pobočkami nebo sklady. Celkový stav firmy se nezmění.
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitTransfer">
          <div class="space-y-2">
            <Label for="transfer-amount">Množství</Label>
            <Input
              id="transfer-amount"
              v-model.number="transferForm.amount"
              type="number"
              step="any"
            />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="transfer-from">Odkud</Label>
              <Select v-model="transferForm.fromLocationId">
                <SelectTrigger id="transfer-from">
                  <SelectValue placeholder="Zdroj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="l in locations" :key="l.id" :value="l.id">
                    {{ l.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label for="transfer-to">Kam</Label>
              <Select v-model="transferForm.toLocationId">
                <SelectTrigger id="transfer-to">
                  <SelectValue placeholder="Cíl" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="l in locations" :key="l.id" :value="l.id">
                    {{ l.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="space-y-2">
            <Label for="transfer-note">Poznámka</Label>
            <Input id="transfer-note" v-model="transferForm.note" placeholder="volitelné" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="transferOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit přesun
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog inventura -->
    <Dialog v-model:open="stocktakeOpen">
      <DialogContent class="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventura</DialogTitle>
          <DialogDescription>
            {{ stockLocationLabel }} · zadejte fyzicky napočítané množství. Systém uloží realitu a
            rozdíl promítne do skladového zrcadla.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-3 sm:grid-cols-[1fr_220px]">
          <div class="relative">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="stocktakeSearch"
              class="pl-9"
              placeholder="Hledat položku pro počítání"
            />
          </div>
          <Input v-model="stocktakeNote" placeholder="Poznámka k inventuře" />
        </div>

        <div
          class="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm sm:grid-cols-3"
        >
          <div>
            <div class="text-xs text-muted-foreground">Položek</div>
            <div class="font-semibold tabular-nums">{{ allStocktakeRows.length }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">Rozdílů</div>
            <div class="font-semibold tabular-nums">{{ stocktakeChangedRows.length }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">Rozdíl celkem</div>
            <div
              class="font-semibold tabular-nums"
              :class="
                stocktakeDifferenceTotal > 0
                  ? 'text-success'
                  : stocktakeDifferenceTotal < 0
                    ? 'text-destructive'
                    : ''
              "
            >
              {{ fmtSigned(stocktakeDifferenceTotal) }}
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-lg border border-border">
          <div
            class="hidden grid-cols-[minmax(0,1.4fr)_110px_130px_110px] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground sm:grid"
          >
            <span>Produkt</span>
            <span class="text-right">Stav má být</span>
            <span class="text-right">Realita</span>
            <span class="text-right">Rozdíl</span>
          </div>
          <div v-if="!stocktakeRows.length" class="p-8 text-center text-sm text-muted-foreground">
            Žádná položka neodpovídá hledání.
          </div>
          <div
            v-for="row in stocktakeRows"
            :key="row.id"
            class="grid gap-3 border-b border-border px-3 py-3 text-sm last:border-0 sm:grid-cols-[minmax(0,1.4fr)_110px_130px_110px] sm:items-center"
          >
            <div class="min-w-0">
              <div class="truncate font-medium">{{ row.name }}</div>
              <div class="text-xs text-muted-foreground">{{ row.sku }}</div>
            </div>
            <div class="flex items-center justify-between gap-3 sm:block sm:text-right">
              <span class="text-xs text-muted-foreground sm:hidden">Stav má být</span>
              <span class="font-semibold tabular-nums">{{ fmtQty(row.expectedQuantity) }}</span>
            </div>
            <label class="space-y-1 text-xs font-medium text-muted-foreground sm:text-right">
              <span class="sm:hidden">Realita</span>
              <Input
                v-model.number="counts[row.id]"
                type="number"
                step="any"
                :min="0"
                class="text-right"
                aria-label="Napočítaná realita"
              />
            </label>
            <div class="flex items-center justify-between gap-3 sm:block sm:text-right">
              <span class="text-xs text-muted-foreground sm:hidden">Rozdíl</span>
              <span
                class="font-semibold tabular-nums"
                :class="
                  row.differenceQuantity > 0
                    ? 'text-success'
                    : row.differenceQuantity < 0
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                "
              >
                {{ fmtSigned(row.differenceQuantity) }}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <span class="mr-auto text-xs text-muted-foreground">
            Uloží se celá inventura, nejen filtrované řádky.
          </span>
          <Button type="button" variant="ghost" @click="stocktakeOpen = false">Zrušit</Button>
          <Button variant="coral" :disabled="busy" @click="submitStocktake">
            <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit inventuru
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
