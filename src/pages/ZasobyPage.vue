<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Plus,
  Minus,
  Loader2,
  Search,
  ClipboardCheck,
  SlidersHorizontal,
  AlertTriangle,
  Scale,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { isApiMode, ApiError } from '@/lib/http'
import { formatDate } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type { StockMirror, StockMirrorItem, StockMovement, StockMovementType } from '@/lib/types'

const { products, load: loadProducts } = useProducts()
const inv = useInventory()
const apiMode = isApiMode()

const loading = ref(true)
const busy = ref(false)
const tab = ref<'levels' | 'movements' | 'mirror'>('levels')
const search = ref('')
const levelMap = ref(new Map<string, number>())
const movements = ref<StockMovement[]>([])
const movementsLoaded = ref(false)
const mirror = ref<StockMirror | null>(null)
const mirrorLoaded = ref(false)

const MOVE_LABEL: Record<StockMovementType, string> = {
  Receipt: 'Příjem',
  Issue: 'Výdej',
  Correction: 'Korekce',
  Sale: 'Prodej',
  StornoSale: 'Storno',
  Stocktaking: 'Inventura',
}
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
        low: p.minQuantity > 0 && qty <= p.minQuantity,
      }
    })
})
const lowCount = computed(() => rows.value.filter((r) => r.low).length)
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

async function loadLevels() {
  const levels = await inv.levels()
  levelMap.value = new Map(levels.map((l) => [l.productId, l.quantity]))
}

onMounted(async () => {
  if (!apiMode) {
    loading.value = false
    return
  }
  try {
    await loadProducts()
    await loadLevels()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function showMovements() {
  tab.value = 'movements'
  if (!movementsLoaded.value) {
    try {
      movements.value = await inv.movements()
      movementsLoaded.value = true
    } catch (e) {
      console.error(e)
    }
  }
}

async function loadMirror() {
  mirror.value = await inv.stockMirror()
  mirrorLoaded.value = true
}

async function showMirror() {
  tab.value = 'mirror'
  if (!mirrorLoaded.value) {
    try {
      await loadMirror()
    } catch (e) {
      toast.error('Zrcadlo skladu se nepodařilo načíst.')
      console.error(e)
    }
  }
}

// --- Akce: příjem / výdej / korekce ---
const actionOpen = ref(false)
const actionMode = ref<'receive' | 'issue' | 'correct'>('receive')
const actionProduct = ref<Row | null>(null)
const actionForm = reactive({ amount: 0, note: '' })

function openAction(row: Row, mode: 'receive' | 'issue' | 'correct') {
  actionProduct.value = row
  actionMode.value = mode
  actionForm.amount = 0
  actionForm.note = ''
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
    if (actionMode.value === 'receive') await inv.receive(id, amount, actionForm.note || null)
    else if (actionMode.value === 'issue') await inv.issue(id, amount, actionForm.note || null)
    else await inv.correct(id, amount, actionForm.note.trim())
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

// --- Inventura ---
const stocktakeOpen = ref(false)
const stocktakeSearch = ref('')
const stocktakeNote = ref('Inventura')
const counts = ref<Record<string, number | ''>>({})

function openStocktake() {
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
    await inv.stocktake(items, stocktakeNote.value.trim() || null)
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
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Zásoby</h1>
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
      Sklad potřebuje připojení k serveru.
    </div>

    <template v-else>
      <div class="mt-6 flex items-center gap-2">
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

      <div v-if="loading" class="mt-6 flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

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
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- POHYBY -->
      <template v-else-if="tab === 'movements'">
        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div v-if="!movements.length" class="p-12 text-center text-muted-foreground">
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
                <span class="w-16 text-right text-muted-foreground"
                  >= {{ fmtQty(m.quantityAfter) }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ZRCADLO -->
      <template v-else>
        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div v-if="!mirror" class="p-12 text-center text-muted-foreground">
            <Loader2 class="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
            Načítám skladové zrcadlo.
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
            <div
              v-for="item in mirror.items"
              :key="item.productId"
              class="grid min-w-[760px] grid-cols-[minmax(160px,1.5fr)_repeat(5,minmax(90px,1fr))] gap-3 border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <div class="min-w-0">
                <div class="truncate font-medium">{{ item.productName }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ item.productSku }} • otevření {{ fmtQty(item.openingQuantity) }}
                </div>
              </div>
              <div class="text-right tabular-nums">
                <div class="font-semibold text-success">{{ fmtQty(item.receivedQuantity) }}</div>
                <div v-if="item.stornoQuantity" class="text-xs text-muted-foreground">
                  storno {{ fmtQty(item.stornoQuantity) }}
                </div>
              </div>
              <div class="text-right tabular-nums">
                <div class="font-semibold text-destructive">
                  {{ fmtQty(item.soldQuantity + item.issuedQuantity) }}
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
                  nákup {{ fmtMoney(item.unitCost) }}/ks
                </div>
              </div>
            </div>
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
            Aktuální stav: {{ fmtQty(actionProduct?.qty ?? 0) }}
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

    <!-- Dialog inventura -->
    <Dialog v-model:open="stocktakeOpen">
      <DialogContent class="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventura</DialogTitle>
          <DialogDescription>
            Zadejte fyzicky napočítané množství. Systém uloží realitu a rozdíl promítne do
            skladového zrcadla.
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
