<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
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
  CalendarClock,
  PackageCheck,
  ChartNoAxesCombined,
  ScanBarcode,
  Camera,
  RotateCcw,
  Download,
  Printer,
  ChevronLeft,
  Trash2,
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
import { useCategories } from '@/composables/useCategories'
import { isApiMode, ApiError } from '@/lib/http'
import { isApprovalRequest } from '@/lib/types'
import { toast } from '@/components/ui/sonner'
import StockLedgerPanel from '@/components/app/StockLedgerPanel.vue'
import StockLotsPanel from '@/components/app/StockLotsPanel.vue'
import StockReservationsPanel from '@/components/app/StockReservationsPanel.vue'
import StockValuationPanel from '@/components/app/StockValuationPanel.vue'
import CameraScanner from '@/components/app/CameraScanner.vue'
import { useAuthStore } from '@/stores/auth'
import { downloadCsv, safeCsvText } from '@/lib/csv-export'
import { findByEan } from '@/lib/reorder'
import {
  createStocktakeDraft,
  finalStocktakeItems,
  firstCountComplete,
  loadStocktakeDraft,
  recountComplete,
  recountProductIds,
  removeStocktakeDraft,
  saveStocktakeDraft,
  type StocktakeDraft,
  type StocktakeRangeKind,
  type StocktakeDraftScope,
} from '@/lib/stocktake-draft'
import {
  resolveStocktakeScopeProductIds,
  stocktakeRangeDescription,
  stocktakeRangeLabel,
} from '@/lib/stocktake-scope'
import type {
  Category,
  StockLot,
  StockLevel,
  StockByLocationResponse,
  StockLocationColumn,
  StockMirror,
  StockMirrorItem,
  StockMovementType,
  Stocktake,
} from '@/lib/types'

const { products, loadAll: loadProducts } = useProducts()
const { locations, loadAll: loadLocations } = useLocations()
const categoriesApi = useCategories()
const inv = useInventory()
const auth = useAuthStore()
const apiMode = isApiMode()
const ALL_LOCATIONS = '__all__'
const AUTO_LOT = '__auto_fefo__'

const loading = ref(true)
const busy = ref(false)
const tab = ref<
  'levels' | 'reservations' | 'movements' | 'lots' | 'mirror' | 'valuation' | 'byLocation'
>('levels')
const search = ref('')
const levelMap = ref(new Map<string, StockLevel>())
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
    const q: Record<
      string,
      { quantity: number; reserved: number; restricted: number; available: number }
    > = {}
    for (const c of r.cells)
      q[colKey(c.locationId)] = {
        quantity: c.quantity,
        reserved: c.reservedQuantity,
        restricted: c.restrictedQuantity ?? 0,
        available: c.availableQuantity,
      }
    return { ...r, q }
  }),
)

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
  reserved: number
  restricted: number
  available: number
  low: boolean
  lotTrackingEnabled: boolean
}

interface StocktakeRow {
  id: string
  name: string
  sku: string
  ean: string | null
  expectedQuantity: number
  firstCount: number | null
  recountCount: number | null
  countedQuantity: number | null
  differenceQuantity: number
}

const rows = computed<Row[]>(() => {
  const q = search.value.toLowerCase().trim()
  return products.value
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    .map((p) => {
      const level = levelMap.value.get(p.id)
      const qty = level?.quantity ?? 0
      const reserved = level?.reservedQuantity ?? 0
      const restricted = level?.restrictedQuantity ?? 0
      const available = level?.availableQuantity ?? qty
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        min: p.minQuantity,
        qty,
        reserved,
        restricted,
        available,
        low: p.minQuantity > 0 && available < p.minQuantity,
        lotTrackingEnabled: p.lotTrackingEnabled === true,
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
const stocktakeLocationLabel = computed(
  () => locationName(actionLocationId.value) ?? 'Nezařazený sklad',
)
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
function lotOptionLabel(lot: StockLot): string {
  const expiry = lot.expiresOn
    ? ` · exp. ${new Date(`${lot.expiresOn}T00:00:00`).toLocaleDateString('cs-CZ')}`
    : ' · bez expirace'
  return `${lot.lotNumber}${expiry} · ${fmtQty(lot.quantity)} skladem`
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
  levelMap.value = new Map(levels.map((level) => [level.productId, level]))
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

onMounted(async () => {
  if (!apiMode) {
    loading.value = false
    return
  }
  try {
    await Promise.all([loadProducts(), loadLocations(), loadStocktakeCategories()])
    await loadLevels()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function loadStocktakeCategories(): Promise<void> {
  try {
    stocktakeCategories.value = await categoriesApi.list()
  } catch (e) {
    // Kategorie jsou pouze pomůcka pro rychlý výběr. Inventuru lze vždy spustit položkami.
    console.error(e)
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
const actionLots = ref<StockLot[]>([])
const actionLotsLoading = ref(false)
const actionForm = reactive<{
  amount: number
  note: string
  issueType: StockMovementType
  lotNumber: string
  expiresOn: string
  stockLotId: string
}>({
  amount: 0,
  note: '',
  issueType: 'Issue',
  lotNumber: '',
  expiresOn: '',
  stockLotId: AUTO_LOT,
})

async function loadActionLots(row: Row) {
  if (!row.lotTrackingEnabled || !actionLocationId.value) {
    actionLots.value = []
    return
  }
  actionLotsLoading.value = true
  try {
    actionLots.value = await inv.allStockLots({
      productId: row.id,
      locationId: actionLocationId.value,
      positiveOnly: true,
      status: 'Active',
    })
  } catch (e) {
    actionLots.value = []
    toast.error('Dostupné šarže se nepodařilo načíst. Výdej může použít automatické FEFO.')
    console.error(e)
  } finally {
    actionLotsLoading.value = false
  }
}

async function openAction(row: Row, mode: 'receive' | 'issue' | 'correct') {
  if (locations.value.length > 1 && stockLocationId.value === ALL_LOCATIONS) {
    toast.error('Nejdřív vyberte konkrétní pobočku skladu.')
    return
  }
  actionProduct.value = row
  actionMode.value = mode
  actionForm.amount = 0
  actionForm.note = ''
  actionForm.issueType = 'Issue'
  actionForm.lotNumber = ''
  actionForm.expiresOn = ''
  actionForm.stockLotId = AUTO_LOT
  actionLots.value = []
  actionOpen.value = true
  if (mode !== 'receive') await loadActionLots(row)
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
  if (row.lotTrackingEnabled && actionMode.value === 'receive' && !actionForm.lotNumber.trim()) {
    return toast.error('U této položky zadejte číslo šarže.')
  }
  busy.value = true
  try {
    const id = row.id
    const locationId = actionLocationId.value
    if (actionMode.value === 'receive')
      await inv.receive(
        id,
        amount,
        actionForm.note || null,
        locationId,
        actionForm.lotNumber,
        actionForm.expiresOn,
      )
    else if (actionMode.value === 'issue') {
      const result = await inv.issue(
        id,
        amount,
        actionForm.note || null,
        actionForm.issueType,
        locationId,
        actionForm.stockLotId === AUTO_LOT ? null : actionForm.stockLotId,
      )
      if (isApprovalRequest(result)) {
        actionOpen.value = false
        toast.success('Výdej čeká na schválení managerem.')
        return
      }
    } else
      await inv.correct(
        id,
        amount,
        actionForm.note.trim(),
        locationId,
        amount < 0 && actionForm.stockLotId !== AUTO_LOT ? actionForm.stockLotId : null,
      )
  } catch (e) {
    if (e instanceof ApiError && e.status === 409)
      toast.error('Není dost disponibilní zásoby. Zkontrolujte rezervace a blokované šarže.')
    else toast.error('Operace selhala.')
    console.error(e)
    return
  } finally {
    busy.value = false
  }
  actionOpen.value = false
  toast.success(`${ACTION_LABEL[actionMode.value]} uložen.`)
  try {
    await loadLevels()
    if (mirrorLoaded.value) await loadMirror()
  } catch (e) {
    console.error(e)
    toast.warning('Operace je uložená, ale přehled skladu se nepodařilo obnovit.')
  }
}

// --- Přesun mezi provozovnami/sklady ---
const transferOpen = ref(false)
const transferProduct = ref<Row | null>(null)
const transferLots = ref<StockLot[]>([])
const transferLotsLoading = ref(false)
const transferForm = reactive({
  amount: 0,
  fromLocationId: '',
  toLocationId: '',
  note: '',
  stockLotId: AUTO_LOT,
})

async function loadTransferLots() {
  const row = transferProduct.value
  if (!row?.lotTrackingEnabled || !transferForm.fromLocationId) {
    transferLots.value = []
    return
  }
  transferLotsLoading.value = true
  try {
    transferLots.value = await inv.allStockLots({
      productId: row.id,
      locationId: transferForm.fromLocationId,
      positiveOnly: true,
      status: 'Active',
    })
  } catch (e) {
    transferLots.value = []
    toast.error('Šarže ve zdrojovém skladu se nepodařilo načíst.')
    console.error(e)
  } finally {
    transferLotsLoading.value = false
  }
}

async function openTransfer(row: Row) {
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
  transferForm.stockLotId = AUTO_LOT
  transferLots.value = []
  transferOpen.value = true
  await loadTransferLots()
}

watch(
  () => transferForm.fromLocationId,
  () => {
    transferForm.stockLotId = AUTO_LOT
    if (transferOpen.value) void loadTransferLots()
  },
)

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
      transferForm.stockLotId === AUTO_LOT ? null : transferForm.stockLotId,
    )
  } catch (e) {
    if (e instanceof ApiError && e.status === 409)
      toast.error('Není dost disponibilní zásoby. Zkontrolujte aktivní rezervace.')
    else if (e instanceof ApiError && e.status === 403)
      toast.error('Přesun mimo vaši pobočku není povolen.')
    else toast.error('Přesun selhal.')
    console.error(e)
    return
  } finally {
    busy.value = false
  }
  transferOpen.value = false
  toast.success('Přesun uložen.')
  try {
    await loadLevels()
    if (mirrorLoaded.value) await loadMirror()
  } catch (e) {
    console.error(e)
    toast.warning('Přesun je uložený, ale přehled skladu se nepodařilo obnovit.')
  }
}

// --- Inventura ---
const stocktakeOpen = ref(false)
const stocktakeSetupOpen = ref(false)
const stocktakeSearch = ref('')
const stocktakeScopeSearch = ref('')
const stocktakeDraft = ref<StocktakeDraft | null>(null)
const stocktakeRangeKind = ref<StocktakeRangeKind>('full')
const stocktakeSelectedCategoryIds = ref<string[]>([])
const stocktakeSelectedProductIds = ref<string[]>([])
const stocktakeCategories = ref<Category[]>([])
const stocktakeScanEan = ref('')
const stocktakeScanInput = ref<InstanceType<typeof Input> | null>(null)
const stocktakeScannerOpen = ref(false)
const stocktakeProtocolOpen = ref(false)
const stocktakeProtocol = ref<Stocktake | null>(null)
let draftSaveWarned = false

function currentStocktakeScope(): StocktakeDraftScope {
  return {
    companyId: auth.companyId,
    userId: auth.user?.id ?? '_unknown_user',
    locationId: actionLocationId.value,
  }
}

function freshStocktakeDraft(
  scope: StocktakeDraftScope,
  productIds: string[],
  range: StocktakeRangeKind,
): StocktakeDraft {
  return createStocktakeDraft(
    scope,
    products.value.filter((product) => productIds.includes(product.id)).map((product) => ({
      productId: product.id,
      expectedQuantity: levelMap.value.get(product.id)?.quantity ?? 0,
    })),
    undefined,
    undefined,
    { kind: range, label: stocktakeRangeLabel(range) },
  )
}

const stocktakeScopeProductIds = computed(() =>
  resolveStocktakeScopeProductIds(
    products.value,
    stocktakeRangeKind.value,
    stocktakeSelectedCategoryIds.value,
    stocktakeSelectedProductIds.value,
  ),
)
const stocktakeScopeProducts = computed(() => {
  const needle = stocktakeScopeSearch.value.trim().toLocaleLowerCase('cs-CZ')
  if (!needle) return products.value
  return products.value.filter((product) =>
    [product.name, product.sku, product.ean ?? ''].some((value) =>
      value.toLocaleLowerCase('cs-CZ').includes(needle),
    ),
  )
})

function resetStocktakeScope(): void {
  stocktakeRangeKind.value = 'full'
  stocktakeSelectedCategoryIds.value = []
  stocktakeSelectedProductIds.value = []
  stocktakeScopeSearch.value = ''
}

function toggleStocktakeCategory(categoryId: string): void {
  const selected = new Set(stocktakeSelectedCategoryIds.value)
  if (selected.has(categoryId)) selected.delete(categoryId)
  else selected.add(categoryId)
  stocktakeSelectedCategoryIds.value = [...selected]
}

function toggleStocktakeProduct(productId: string): void {
  const selected = new Set(stocktakeSelectedProductIds.value)
  if (selected.has(productId)) selected.delete(productId)
  else selected.add(productId)
  stocktakeSelectedProductIds.value = [...selected]
}

function beginStocktake(): void {
  const productIds = stocktakeScopeProductIds.value
  if (!productIds.length) {
    toast.error('Vyberte alespoň jednu položku nebo kategorii pro inventuru.')
    return
  }
  const draft = freshStocktakeDraft(currentStocktakeScope(), productIds, stocktakeRangeKind.value)
  if (draft.range.kind !== 'full') draft.note = draft.range.label
  stocktakeDraft.value = draft
  stocktakeSetupOpen.value = false
  stocktakeSearch.value = ''
  stocktakeScanEan.value = ''
  stocktakeOpen.value = true
  nextTick(focusStocktakeScan)
}

function openStocktake() {
  if (locations.value.length > 1 && stockLocationId.value === ALL_LOCATIONS) {
    toast.error('Inventuru spusťte pro konkrétní pobočku.')
    return
  }
  if (!products.value.length) {
    toast.error('Žádné produkty k inventuře.')
    return
  }
  const scope = currentStocktakeScope()
  const restored = loadStocktakeDraft(scope)
  const knownProductIds = new Set(products.value.map((product) => product.id))
  if (restored?.productIds.every((productId) => knownProductIds.has(productId))) {
    stocktakeDraft.value = restored
    toast.info('Pokračujete v rozpracované inventuře z tohoto zařízení.')
    stocktakeOpen.value = true
    nextTick(focusStocktakeScan)
  } else {
    if (restored) {
      removeStocktakeDraft(scope)
      toast.warning('Katalog se změnil. Rozpracovaná inventura byla bezpečně zahozena.')
    }
    stocktakeDraft.value = null
    resetStocktakeScope()
    stocktakeSetupOpen.value = true
  }
}

watch(
  stocktakeDraft,
  (draft) => {
    if (!draft) return
    if (!saveStocktakeDraft(draft) && !draftSaveWarned) {
      draftSaveWarned = true
      toast.warning('Průběh inventury se na tomto zařízení nepodařilo uložit.')
    }
  },
  { deep: true },
)

function normalizeDraftCount(value: string | number | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1_000_000 ? numeric : null
}

function setStocktakeCount(productId: string, value: string | number | undefined): void {
  const draft = stocktakeDraft.value
  if (!draft) return
  const count = normalizeDraftCount(value)
  if (draft.phase === 'first') draft.firstCounts[productId] = count
  else draft.recountCounts[productId] = count
}

function incrementStocktakeCount(productId: string): void {
  const draft = stocktakeDraft.value
  if (!draft) return
  const target = draft.phase === 'first' ? draft.firstCounts : draft.recountCounts
  target[productId] = (target[productId] ?? 0) + 1
}

function focusStocktakeScan(): void {
  const element = stocktakeScanInput.value?.$el as HTMLInputElement | undefined
  element?.focus()
}

function handleStocktakeCode(raw: string, announce = false): void {
  const code = raw.trim()
  const draft = stocktakeDraft.value
  if (!code || !draft) return
  const product = findByEan(products.value, code)
  const matches = products.value.filter((item) => item.ean === code)
  if (!product) {
    toast.error(`Čárový kód „${code}“ nebyl v katalogu nalezen.`)
    return
  }
  if (matches.length > 1) {
    toast.error(`Více produktů má čárový kód „${code}“. Vyberte produkt ručně.`)
    return
  }
  if (!draft.productIds.includes(product.id)) {
    toast.error('Produkt nepatří do této rozpracované inventury.')
    return
  }
  if (draft.phase === 'recount' && !recountProductIds(draft).includes(product.id)) {
    toast.info(`${product.name} při prvním počítání souhlasí a druhý přepočet nepotřebuje.`)
    return
  }
  incrementStocktakeCount(product.id)
  stocktakeSearch.value = product.name
  if (announce) toast.success(`${product.name}: započten 1 kus.`)
}

function submitStocktakeScan(): void {
  handleStocktakeCode(stocktakeScanEan.value)
  stocktakeScanEan.value = ''
  nextTick(focusStocktakeScan)
}

const allStocktakeRows = computed<StocktakeRow[]>(() => {
  const draft = stocktakeDraft.value
  if (!draft) return []
  const recountIds = new Set(recountProductIds(draft))
  return draft.productIds.flatMap((productId) => {
    const product = products.value.find((item) => item.id === productId)
    if (!product) return []
    const expectedQuantity = draft.expectedQuantities[productId] ?? 0
    const firstCount = draft.firstCounts[productId] ?? null
    const recountCount = draft.recountCounts[productId] ?? null
    const needsRecount = recountIds.has(productId)
    const countedQuantity = draft.phase === 'recount' && needsRecount ? recountCount : firstCount
    return [
      {
        id: product.id,
        name: product.name,
        sku: product.sku,
        ean: product.ean,
        expectedQuantity,
        firstCount,
        recountCount,
        countedQuantity,
        differenceQuantity: countedQuantity === null ? 0 : countedQuantity - expectedQuantity,
      },
    ]
  })
})

const stocktakeRows = computed<StocktakeRow[]>(() => {
  const draft = stocktakeDraft.value
  const recountIds = new Set(draft ? recountProductIds(draft) : [])
  const q = stocktakeSearch.value.toLowerCase().trim()
  return allStocktakeRows.value.filter((row) => {
    if (draft?.phase === 'recount' && !recountIds.has(row.id)) return false
    return (
      !q ||
      row.name.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q) ||
      (row.ean ?? '').includes(q)
    )
  })
})

const stocktakeChangedRows = computed(() =>
  allStocktakeRows.value.filter(
    (row) => row.countedQuantity !== null && Math.abs(row.differenceQuantity) > 0.0001,
  ),
)

const stocktakeDifferenceTotal = computed(() =>
  stocktakeChangedRows.value.reduce((sum, row) => sum + row.differenceQuantity, 0),
)

const stocktakeCountedCount = computed(
  () => allStocktakeRows.value.filter((row) => row.firstCount !== null).length,
)
const stocktakeRecountIds = computed(() =>
  stocktakeDraft.value ? recountProductIds(stocktakeDraft.value) : [],
)
const stocktakeRecountRemaining = computed(() => {
  const draft = stocktakeDraft.value
  if (!draft) return 0
  return stocktakeRecountIds.value.filter((productId) => draft.recountCounts[productId] === null)
    .length
})
const showStocktakeExpected = computed(
  () => stocktakeDraft.value?.phase === 'recount' || stocktakeDraft.value?.blindCount === false,
)

function startStocktakeRecount(): void {
  const draft = stocktakeDraft.value
  if (!draft) return
  if (!firstCountComplete(draft)) {
    toast.error(`Nejdřív napočítejte všech ${draft.productIds.length} položek.`)
    return
  }
  draft.phase = 'recount'
  stocktakeSearch.value = ''
  if (recountProductIds(draft).length)
    toast.info('Teď nezávisle přepočítejte pouze položky s rozdílem.')
  else toast.success('První počítání souhlasí se systémem. Inventuru můžete uzavřít.')
  nextTick(focusStocktakeScan)
}

function returnToFirstCount(): void {
  if (!stocktakeDraft.value) return
  stocktakeDraft.value.phase = 'first'
  stocktakeSearch.value = ''
  nextTick(focusStocktakeScan)
}

function discardStocktake(): void {
  const draft = stocktakeDraft.value
  if (draft) removeStocktakeDraft(draft.scope)
  stocktakeDraft.value = null
  stocktakeOpen.value = false
  toast.success('Rozpracovaná inventura byla zahozena.')
}

async function submitStocktake() {
  const draft = stocktakeDraft.value
  if (!draft) return
  const items: StocktakeItemInput[] | null = finalStocktakeItems(draft)
  if (!items || !recountComplete(draft))
    return toast.error('Dokončete první počítání i kontrolní přepočet rozdílů.')
  busy.value = true
  let result: Stocktake | null = null
  try {
    const response = await inv.stocktake(
      items,
      draft.note.trim() || null,
      draft.scope.locationId,
      draft.idempotencyKey,
    )
    if (isApprovalRequest(response)) {
      removeStocktakeDraft(draft.scope)
      stocktakeDraft.value = null
      stocktakeOpen.value = false
      toast.success('Inventura čeká na schválení managerem.')
      return
    }
    result = response
    removeStocktakeDraft(draft.scope)
    stocktakeDraft.value = null
    stocktakeOpen.value = false
    toast.success('Inventura uložena — stav srovnán.')
  } catch (e) {
    if (e instanceof ApiError && e.status === 409)
      toast.error('Tento retry klíč už patří jiné inventuře nebo stav chrání rezervace či blokace.')
    else toast.error('Inventura selhala. Průběh zůstal uložený pro bezpečný retry.')
    console.error(e)
    return
  } finally {
    busy.value = false
  }
  if (!result) return
  stocktakeProtocol.value = result
  stocktakeProtocolOpen.value = true
  try {
    await loadLevels()
    if (mirrorLoaded.value) await loadMirror()
  } catch (e) {
    console.error(e)
    toast.warning('Inventura je uložená, ale přehled skladu se nepodařilo obnovit.')
  }
}

const stocktakeProtocolRows = computed(() =>
  (stocktakeProtocol.value?.items ?? []).map((item) => {
    const product = products.value.find((candidate) => candidate.id === item.productId)
    return {
      ...item,
      productName: product?.name ?? 'Archivovaný produkt',
      productSku: product?.sku ?? item.productId,
    }
  }),
)

function exportStocktakeProtocol(): void {
  const protocol = stocktakeProtocol.value
  if (!protocol) return
  downloadCsv(
    `inventurni-protokol-${protocol.createdAt.slice(0, 10)}-${protocol.id}`,
    ['Produkt', 'SKU', 'Stav před inventurou', 'Napočítáno', 'Rozdíl'],
    stocktakeProtocolRows.value.map((row) => [
      safeCsvText(row.productName),
      safeCsvText(row.productSku),
      row.systemQuantity,
      row.countedQuantity,
      row.difference,
    ]),
  )
}

function printStocktakeProtocol(): void {
  window.print()
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
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'reservations'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="tab = 'reservations'"
        >
          <PackageCheck class="h-4 w-4" /> Rezervace
        </button>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'movements'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="tab = 'movements'"
        >
          Pohyby
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'lots'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="tab = 'lots'"
        >
          <CalendarClock class="h-4 w-4" /> Šarže
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
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === 'valuation'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="tab = 'valuation'"
        >
          <ChartNoAxesCombined class="h-4 w-4" /> Ocenění
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
              <div class="flex flex-1 flex-wrap items-center justify-end gap-3 sm:flex-none">
                <div class="grid min-w-[280px] grid-cols-4 gap-3 text-right tabular-nums">
                  <div>
                    <div class="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Skladem
                    </div>
                    <div class="font-semibold">{{ fmtQty(r.qty) }}</div>
                  </div>
                  <div>
                    <div class="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Rezervováno
                    </div>
                    <div class="font-semibold text-amber-700 dark:text-amber-300">
                      {{ fmtQty(r.reserved) }}
                    </div>
                  </div>
                  <div>
                    <div class="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Blokováno
                    </div>
                    <div class="font-semibold text-destructive">{{ fmtQty(r.restricted) }}</div>
                  </div>
                  <div>
                    <div class="text-[10px] uppercase tracking-wide text-muted-foreground">
                      K dispozici
                    </div>
                    <div class="text-lg font-bold" :class="r.low ? 'text-destructive' : ''">
                      {{ fmtQty(r.available) }}
                    </div>
                  </div>
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

      <!-- REZERVACE ZÁSOB -->
      <template v-else-if="tab === 'reservations'">
        <StockReservationsPanel
          :products="products"
          :locations="locations"
          :initial-location-id="stockFilterLocationId"
          @changed="loadLevels"
        />
      </template>

      <!-- OCENĚNÍ SKLADU -->
      <template v-else-if="tab === 'valuation'">
        <StockValuationPanel :locations="locations" :initial-location-id="stockFilterLocationId" />
      </template>

      <!-- POHYBY -->
      <template v-else-if="tab === 'movements'">
        <StockLedgerPanel
          :products="products"
          :locations="locations"
          :initial-location-id="stockFilterLocationId"
        />
      </template>

      <!-- ŠARŽE A EXPIRACE -->
      <template v-else-if="tab === 'lots'">
        <StockLotsPanel
          :products="products"
          :locations="locations"
          :initial-location-id="stockFilterLocationId"
        />
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
                    <span class="block text-[10px] font-normal normal-case"
                      >k dispozici / stav</span
                    >
                  </th>
                  <th class="px-3 py-2 text-right font-semibold text-foreground">
                    Celkem
                    <span class="block text-[10px] font-normal normal-case"
                      >k dispozici / stav</span
                    >
                  </th>
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
                      (row.q[colKey(col.locationId)]?.available ?? 0) === 0
                        ? 'text-muted-foreground/50'
                        : 'text-foreground'
                    "
                  >
                    <div class="font-semibold">
                      {{ fmtQty(row.q[colKey(col.locationId)]?.available ?? 0) }}
                    </div>
                    <div class="text-[11px] text-muted-foreground">
                      stav {{ fmtQty(row.q[colKey(col.locationId)]?.quantity ?? 0) }}
                      <template v-if="(row.q[colKey(col.locationId)]?.reserved ?? 0) > 0">
                        · rez. {{ fmtQty(row.q[colKey(col.locationId)]?.reserved ?? 0) }}
                      </template>
                      <template v-if="(row.q[colKey(col.locationId)]?.restricted ?? 0) > 0">
                        · blok. {{ fmtQty(row.q[colKey(col.locationId)]?.restricted ?? 0) }}
                      </template>
                    </div>
                  </td>
                  <td class="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                    <div>{{ fmtQty(row.totalAvailableQuantity) }}</div>
                    <div class="text-[11px] font-normal text-muted-foreground">
                      stav {{ fmtQty(row.totalQuantity) }}
                      <template v-if="row.totalReservedQuantity > 0">
                        · rez. {{ fmtQty(row.totalReservedQuantity) }}
                      </template>
                      <template v-if="(row.totalRestrictedQuantity ?? 0) > 0">
                        · blok. {{ fmtQty(row.totalRestrictedQuantity ?? 0) }}
                      </template>
                    </div>
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
            {{ stockLocationLabel }} · skladem {{ fmtQty(actionProduct?.qty ?? 0) }} · k dispozici
            {{ fmtQty(actionProduct?.available ?? 0) }}
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
          <div
            v-if="actionProduct?.lotTrackingEnabled && actionMode === 'receive'"
            class="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2"
          >
            <div class="space-y-2">
              <Label for="action-lot-number">Číslo šarže *</Label>
              <Input
                id="action-lot-number"
                v-model="actionForm.lotNumber"
                autocomplete="off"
                placeholder="Např. 2026-07-A"
              />
            </div>
            <div class="space-y-2">
              <Label for="action-lot-expiry">Expirace</Label>
              <Input id="action-lot-expiry" v-model="actionForm.expiresOn" type="date" />
            </div>
          </div>
          <div
            v-if="
              actionProduct?.lotTrackingEnabled &&
              (actionMode === 'issue' || (actionMode === 'correct' && actionForm.amount < 0))
            "
            class="space-y-2"
          >
            <Label for="action-stock-lot">Šarže</Label>
            <Select v-model="actionForm.stockLotId" :disabled="actionLotsLoading">
              <SelectTrigger id="action-stock-lot">
                <SelectValue
                  :placeholder="actionLotsLoading ? 'Načítám šarže…' : 'Automaticky FEFO'"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="AUTO_LOT">Automaticky — nejbližší expirace</SelectItem>
                <SelectItem v-for="lot in actionLots" :key="lot.id" :value="lot.id">
                  {{ lotOptionLabel(lot) }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Bez ručního výběru systém vydá nejdřív šarži s nejbližší expirací.
            </p>
          </div>
          <p
            v-if="
              actionProduct?.lotTrackingEnabled && actionMode === 'correct' && actionForm.amount > 0
            "
            class="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground"
          >
            Kladná korekce se zařadí do systémové šarže. Pro běžné doplnění s číslem šarže použijte
            příjem.
          </p>
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
          <div v-if="transferProduct?.lotTrackingEnabled" class="space-y-2">
            <Label for="transfer-lot">Šarže ze zdrojového skladu</Label>
            <Select v-model="transferForm.stockLotId" :disabled="transferLotsLoading">
              <SelectTrigger id="transfer-lot">
                <SelectValue
                  :placeholder="transferLotsLoading ? 'Načítám šarže…' : 'Automaticky FEFO'"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="AUTO_LOT">Automaticky — nejbližší expirace</SelectItem>
                <SelectItem v-for="lot in transferLots" :key="lot.id" :value="lot.id">
                  {{ lotOptionLabel(lot) }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Vybraná šarže se zachová i v cílové pobočce.
            </p>
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

    <!-- Výběr rozsahu inventury -->
    <Dialog v-model:open="stocktakeSetupOpen">
      <DialogContent class="max-h-[92dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nová inventura</DialogTitle>
          <DialogDescription>
            {{ stocktakeLocationLabel }} · vyberte, co dnes skutečně počítáte. Sklad se změní až po
            dokončení a potvrzení inventury.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-2 sm:grid-cols-2">
          <button
            v-for="range in (['full', 'partial', 'cycle', 'spot'] as StocktakeRangeKind[])"
            :key="range"
            type="button"
            class="rounded-xl border p-3 text-left transition-colors"
            :class="
              stocktakeRangeKind === range
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:bg-muted/50'
            "
            @click="stocktakeRangeKind = range"
          >
            <div class="font-semibold">{{ stocktakeRangeLabel(range) }}</div>
            <div class="mt-1 text-xs leading-relaxed text-muted-foreground">
              {{ stocktakeRangeDescription(range) }}
            </div>
          </button>
        </div>

        <div v-if="stocktakeRangeKind !== 'full'" class="space-y-4">
          <div
            v-if="stocktakeRangeKind === 'partial' || stocktakeRangeKind === 'cycle'"
            class="space-y-2"
          >
            <div class="text-sm font-medium">Kategorie</div>
            <p class="text-xs text-muted-foreground">
              Vybrané kategorie automaticky zahrnou všechny své produkty.
            </p>
            <div
              v-if="stocktakeCategories.length"
              class="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2"
            >
              <label
                v-for="category in stocktakeCategories"
                :key="category.id"
                class="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  class="size-4 accent-primary"
                  :checked="stocktakeSelectedCategoryIds.includes(category.id)"
                  @change="toggleStocktakeCategory(category.id)"
                />
                <span class="min-w-0 truncate">{{ category.name }}</span>
              </label>
            </div>
            <p v-else class="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Kategorie nejsou k dispozici. Vyberte konkrétní položky níže.
            </p>
          </div>

          <div class="space-y-2">
            <Label for="stocktake-scope-search">Konkrétní položky</Label>
            <Input
              id="stocktake-scope-search"
              v-model="stocktakeScopeSearch"
              placeholder="Název, SKU nebo EAN"
            />
            <div class="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              <label
                v-for="product in stocktakeScopeProducts"
                :key="product.id"
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  class="size-4 shrink-0 accent-primary"
                  :checked="stocktakeSelectedProductIds.includes(product.id)"
                  @change="toggleStocktakeProduct(product.id)"
                />
                <span class="min-w-0">
                  <span class="block truncate font-medium">{{ product.name }}</span>
                  <span class="block truncate text-xs text-muted-foreground">
                    {{ product.sku }}<span v-if="product.ean"> · EAN {{ product.ean }}</span>
                  </span>
                </span>
              </label>
              <p v-if="!stocktakeScopeProducts.length" class="p-3 text-center text-sm text-muted-foreground">
                Žádná položka neodpovídá hledání.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <span class="mr-auto text-xs text-muted-foreground">
            Vybráno {{ stocktakeScopeProductIds.length }} položek
          </span>
          <Button type="button" variant="ghost" @click="stocktakeSetupOpen = false">Zrušit</Button>
          <Button
            type="button"
            variant="coral"
            :disabled="stocktakeScopeProductIds.length === 0"
            @click="beginStocktake"
          >
            Zahájit počítání
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog inventura -->
    <Dialog v-model:open="stocktakeOpen">
      <DialogContent class="flex max-h-[92dvh] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader class="border-b border-border px-4 pb-4 pt-5 sm:px-6">
          <DialogTitle>Inventura</DialogTitle>
          <DialogDescription>
            {{ stocktakeLocationLabel }} · průběh se automaticky ukládá na tomto zařízení. Sklad se
            změní až po finálním potvrzení.
          </DialogDescription>
        </DialogHeader>

        <div v-if="stocktakeDraft" class="flex min-h-0 flex-1 flex-col">
          <div class="space-y-3 border-b border-border px-4 py-3 sm:px-6">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {{ stocktakeDraft.range.label }} · {{ stocktakeDraft.productIds.length }} položek
              </span>
              <Button
                v-if="stocktakeDraft.phase === 'recount'"
                type="button"
                variant="outline"
                size="sm"
                @click="returnToFirstCount"
              >
                <ChevronLeft class="h-4 w-4" /> První počítání
              </Button>
              <Button
                v-else
                type="button"
                variant="outline"
                size="sm"
                @click="stocktakeDraft.blindCount = !stocktakeDraft.blindCount"
              >
                <RotateCcw class="h-4 w-4" />
                {{
                  stocktakeDraft.blindCount ? 'Slepé počítání zapnuto' : 'Zapnout slepé počítání'
                }}
              </Button>
              <span class="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                {{ stocktakeDraft.phase === 'first' ? '1. počítání' : '2. kontrolní přepočet' }}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="ml-auto text-destructive hover:text-destructive"
                @click="discardStocktake"
              >
                <Trash2 class="h-4 w-4" /> Zahodit průběh
              </Button>
            </div>

            <div class="rounded-xl border border-border bg-muted/30 p-3">
              <label
                class="mb-1.5 flex items-center gap-1.5 text-sm font-medium"
                for="stocktake-scan"
              >
                <ScanBarcode class="h-4 w-4 text-primary" /> Načíst čárový kód
              </label>
              <div class="flex gap-2">
                <Input
                  id="stocktake-scan"
                  ref="stocktakeScanInput"
                  v-model="stocktakeScanEan"
                  inputmode="numeric"
                  autocomplete="off"
                  placeholder="HW čtečka nebo ruční EAN"
                  class="min-w-0 flex-1"
                  @keyup.enter="submitStocktakeScan"
                />
                <Button
                  type="button"
                  variant="outline"
                  class="shrink-0"
                  title="Skenovat kamerou"
                  @click="stocktakeScannerOpen = true"
                >
                  <Camera class="h-4 w-4" /> <span class="hidden sm:inline">Kamera</span>
                </Button>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-[1fr_240px]">
              <div class="relative">
                <Search
                  class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input v-model="stocktakeSearch" class="pl-9" placeholder="Název, SKU nebo EAN" />
              </div>
              <Input v-model="stocktakeDraft.note" placeholder="Poznámka k inventuře" />
            </div>

            <div
              class="grid gap-2 rounded-lg border border-border bg-background p-3 text-sm sm:grid-cols-3"
            >
              <div>
                <div class="text-xs text-muted-foreground">První počítání</div>
                <div class="font-semibold tabular-nums">
                  {{ stocktakeCountedCount }} / {{ stocktakeDraft.productIds.length }}
                </div>
              </div>
              <div>
                <div class="text-xs text-muted-foreground">Rozdílů k přepočtu</div>
                <div class="font-semibold tabular-nums">
                  {{ showStocktakeExpected ? stocktakeRecountIds.length : 'Skryto' }}
                </div>
              </div>
              <div>
                <div class="text-xs text-muted-foreground">
                  {{ stocktakeDraft.phase === 'recount' ? 'Zbývá přepočítat' : 'Rozdíl celkem' }}
                </div>
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
                  {{
                    stocktakeDraft.phase === 'recount'
                      ? stocktakeRecountRemaining
                      : showStocktakeExpected
                        ? fmtSigned(stocktakeDifferenceTotal)
                        : 'Skryto'
                  }}
                </div>
              </div>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
            <div class="overflow-hidden rounded-lg border border-border">
              <div
                class="hidden grid-cols-[minmax(0,1.3fr)_100px_120px_120px_100px] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground sm:grid"
              >
                <span>Produkt</span>
                <span class="text-right">Stav má být</span>
                <span class="text-right">1. počet</span>
                <span class="text-right">2. počet</span>
                <span class="text-right">Rozdíl</span>
              </div>
              <div
                v-if="!stocktakeRows.length"
                class="p-8 text-center text-sm text-muted-foreground"
              >
                {{
                  stocktakeDraft.phase === 'recount' && stocktakeRecountIds.length === 0
                    ? 'Všechny položky souhlasí. Inventuru můžete uložit.'
                    : 'Žádná položka neodpovídá hledání.'
                }}
              </div>
              <div
                v-for="row in stocktakeRows"
                :key="row.id"
                class="grid gap-3 border-b border-border px-3 py-3 text-sm last:border-0 sm:grid-cols-[minmax(0,1.3fr)_100px_120px_120px_100px] sm:items-center"
              >
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ row.name }}</div>
                  <div class="text-xs text-muted-foreground">
                    {{ row.sku }}<span v-if="row.ean"> · EAN {{ row.ean }}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3 sm:block sm:text-right">
                  <span class="text-xs text-muted-foreground sm:hidden">Stav má být</span>
                  <span class="font-semibold tabular-nums">
                    {{ showStocktakeExpected ? fmtQty(row.expectedQuantity) : '•••' }}
                  </span>
                </div>
                <label class="space-y-1 text-xs font-medium text-muted-foreground sm:text-right">
                  <span class="sm:hidden">1. počet</span>
                  <Input
                    v-if="stocktakeDraft.phase === 'first'"
                    :model-value="row.firstCount ?? ''"
                    type="number"
                    step="0.001"
                    :min="0"
                    class="text-right"
                    :aria-label="`První počet: ${row.name}`"
                    @update:model-value="setStocktakeCount(row.id, $event)"
                  />
                  <span v-else class="block py-2 font-semibold tabular-nums text-foreground">
                    {{ fmtQty(row.firstCount ?? 0) }}
                  </span>
                </label>
                <label class="space-y-1 text-xs font-medium text-muted-foreground sm:text-right">
                  <span class="sm:hidden">2. počet</span>
                  <Input
                    v-if="stocktakeDraft.phase === 'recount'"
                    :model-value="row.recountCount ?? ''"
                    type="number"
                    step="0.001"
                    :min="0"
                    class="text-right"
                    :aria-label="`Kontrolní počet: ${row.name}`"
                    @update:model-value="setStocktakeCount(row.id, $event)"
                  />
                  <span v-else class="block py-2 text-muted-foreground">—</span>
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
                    {{
                      showStocktakeExpected && row.countedQuantity !== null
                        ? fmtSigned(row.differenceQuantity)
                        : '—'
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter class="border-t border-border px-4 py-3 sm:px-6">
            <span class="mr-auto text-xs text-muted-foreground">
              Ukládáno na tomto zařízení · server při uzavření znovu ověří aktuální stav.
            </span>
            <Button type="button" variant="ghost" @click="stocktakeOpen = false">Zavřít</Button>
            <Button
              v-if="stocktakeDraft.phase === 'first'"
              type="button"
              variant="coral"
              :disabled="busy"
              @click="startStocktakeRecount"
            >
              Zkontrolovat rozdíly
            </Button>
            <Button v-else variant="coral" :disabled="busy" @click="submitStocktake">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit inventuru
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <CameraScanner
      v-model:open="stocktakeScannerOpen"
      description="Sken přičte jeden kus do právě otevřeného kola inventury. Stejný kód držený před kamerou se krátce deduplikuje."
      @detected="(code) => handleStocktakeCode(code, true)"
    />

    <Dialog v-model:open="stocktakeProtocolOpen">
      <DialogContent class="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <div v-if="stocktakeProtocol" class="stocktake-protocol-printable space-y-4 bg-background">
          <DialogHeader>
            <DialogTitle>Inventurní protokol</DialogTitle>
            <DialogDescription>
              Doklad {{ stocktakeProtocol.id }} ·
              {{ new Date(stocktakeProtocol.createdAt).toLocaleString('cs-CZ') }} ·
              {{ stocktakeLocationLabel }}
            </DialogDescription>
          </DialogHeader>
          <div class="grid gap-2 rounded-lg border border-border p-3 text-sm sm:grid-cols-3">
            <div>
              <div class="text-xs text-muted-foreground">Položek</div>
              <div class="font-semibold">{{ stocktakeProtocolRows.length }}</div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">Rozdílů</div>
              <div class="font-semibold">
                {{
                  stocktakeProtocolRows.filter((row) => Math.abs(row.difference) > 0.0001).length
                }}
              </div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">Poznámka</div>
              <div class="font-semibold">{{ stocktakeProtocol.note || '—' }}</div>
            </div>
          </div>
          <div class="overflow-hidden rounded-lg border border-border">
            <div
              class="grid grid-cols-[minmax(0,1fr)_90px_90px_90px] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase text-muted-foreground"
            >
              <span>Produkt</span><span class="text-right">Před</span
              ><span class="text-right">Napočítáno</span><span class="text-right">Rozdíl</span>
            </div>
            <div
              v-for="row in stocktakeProtocolRows"
              :key="row.productId"
              class="grid grid-cols-[minmax(0,1fr)_90px_90px_90px] gap-3 border-b border-border px-3 py-2 text-sm last:border-0"
            >
              <div class="min-w-0">
                <div class="truncate font-medium">{{ row.productName }}</div>
                <div class="text-xs text-muted-foreground">{{ row.productSku }}</div>
              </div>
              <span class="text-right tabular-nums">{{ fmtQty(row.systemQuantity) }}</span>
              <span class="text-right tabular-nums">{{ fmtQty(row.countedQuantity) }}</span>
              <span
                class="text-right font-semibold tabular-nums"
                :class="
                  row.difference > 0 ? 'text-success' : row.difference < 0 ? 'text-destructive' : ''
                "
              >
                {{ fmtSigned(row.difference) }}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" @click="stocktakeProtocolOpen = false">
            Hotovo
          </Button>
          <Button type="button" variant="outline" @click="exportStocktakeProtocol">
            <Download class="h-4 w-4" /> CSV
          </Button>
          <Button type="button" variant="coral" @click="printStocktakeProtocol">
            <Printer class="h-4 w-4" /> Tisk / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
