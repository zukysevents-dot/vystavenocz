<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink } from 'vue-router'
import {
  Loader2,
  Minus,
  Plus,
  Banknote,
  ChefHat,
  ArrowLeft,
  ArrowLeftRight,
  Combine,
  Package,
  Ban,
  StickyNote,
  Users,
  Trash2,
  Check,
  UserRound,
  Search,
  LayoutDashboard,
  MoreHorizontal,
  Clock3,
  Wifi,
  WifiOff,
  X,
  SlidersHorizontal,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PaymentDialog from '@/components/PaymentDialog.vue'
import ReceiptDialog from '@/components/ReceiptDialog.vue'
import LoadError from '@/components/app/LoadError.vue'
import ModifierSelectDialog from '@/components/app/ModifierSelectDialog.vue'
import ProductVariantSelectDialog, {
  type SelectableProductVariant,
} from '@/components/app/ProductVariantSelectDialog.vue'
import { buildReceipt, type ReceiptInfo } from '@/lib/receipt'
import { groupItemsByCourse, normalizeOrderCourse, ORDER_COURSES } from '@/lib/order-courses'
import { useCompanyStore } from '@/stores/company'
import { useFloors } from '@/composables/useFloors'
import { useTables } from '@/composables/useTables'
import { useProducts } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import { useOrders } from '@/composables/useOrders'
import { useModifierGroups } from '@/composables/useModifierGroups'
import { useProductVariants } from '@/composables/useProductVariants'
import { usePromotions } from '@/composables/usePromotions'
import { useSales } from '@/composables/useSales'
import { useCustomers, type LoyaltyCustomer } from '@/composables/useCustomers'
import { useLoyalty, type LoyaltySettings } from '@/composables/useLoyalty'
import { ApiError, isApiMode } from '@/lib/http'
import { formatCZK, round2 } from '@/lib/invoice'
import { calcPosTotals, calcSplitGroupPayment, clampAmount, clampPercent } from '@/lib/posCalc'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'
import type { PriceLevel, PromotionCalculation, PromotionLineInput } from '@/lib/promotions'
import type {
  Category,
  DiningTable,
  Floor,
  Order,
  OrderItemLine,
  OrderSplitGroup,
  PaymentMethod,
  Product,
  ProductModifierGroup,
} from '@/lib/types'

const floorsApi = useFloors()
const tablesApi = useTables()
const ordersApi = useOrders()
const categoriesApi = useCategories()
const modifiersApi = useModifierGroups()
const variantsApi = useProductVariants()
const promotions = usePromotions()
const salesApi = useSales()
const customersApi = useCustomers()
const loyaltyApi = useLoyalty()
const { products, load: loadProducts } = useProducts()
const companyStore = useCompanyStore()
const auth = useAuthStore()
const apiMode = isApiMode()
const canCancelOrder = computed(
  () => auth.role !== null && ['Owner', 'Admin', 'Manager'].includes(auth.role),
)

// Účtenka po zaplacení (náhled + tisk/PDF).
const receiptOpen = ref(false)
const receiptData = ref<ReceiptInfo | null>(null)

const modifierDialogOpen = ref(false)
const modifierProduct = ref<Product | null>(null)
const modifierGroups = ref<ProductModifierGroup[]>([])
const productModifierCache = new Map<string, ProductModifierGroup[]>()
const variantDialogOpen = ref(false)
const variantProduct = ref<Product | null>(null)
const variantsForProduct = ref<SelectableProductVariant[]>([])
const pendingModifierGroups = ref<ProductModifierGroup[]>([])
const selectedVariant = ref<SelectableProductVariant | null>(null)
const productVariantCache = new Map<string, SelectableProductVariant[]>()
const modifierDialogProduct = computed(() =>
  modifierProduct.value
    ? {
        id: modifierProduct.value.id,
        name: modifierProduct.value.name,
        salePrice: selectedVariant.value?.priceWithVat ?? modifierProduct.value.salePrice,
      }
    : null,
)

const categories = ref<Category[]>([])
const selectedCat = ref('')
const productQuery = ref('')
const visibleProducts = computed(() => {
  const query = productQuery.value.trim().toLocaleLowerCase('cs')
  return products.value.filter((product) => {
    if (selectedCat.value && product.categoryId !== selectedCat.value) return false
    if (!query) return true
    return [product.name, product.sku, product.ean]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('cs').includes(query))
  })
})

const loading = ref(true)
const initialLoadError = ref(false)
const busy = ref(false)
const connectionState = ref<'online' | 'syncing' | 'offline'>('syncing')
const mode = ref<'map' | 'order'>('map')
const mobileAccountOpen = ref(false)
const accountAdjustmentsOpen = ref(false)
const moreActionsOpen = ref(false)

const floors = ref<Floor[]>([])
const currentFloorId = ref<string | null>(null)
const tables = ref<DiningTable[]>([])
const openOrders = ref<Order[]>([])
const selectedTable = ref<DiningTable | null>(null)
const currentOrder = ref<Order | null>(null)

// tableId → otevřený účet (obsazenost)
const occupancy = computed(() => {
  const map = new Map<string, Order>()
  for (const o of openOrders.value) if (o.tableId) map.set(o.tableId, o)
  return map
})
const occupiedTableCount = computed(() =>
  tables.value.reduce((count, table) => count + (occupancy.value.has(table.id) ? 1 : 0), 0),
)
const freeTableCount = computed(() => Math.max(0, tables.value.length - occupiedTableCount.value))
const openAccountRows = computed(() =>
  openOrders.value
    .map((order) => ({
      order,
      table: tables.value.find((table) => table.id === order.tableId),
    }))
    .filter((row) => row.table)
    .sort((a, b) => new Date(a.order.openedAt).getTime() - new Date(b.order.openedAt).getTime()),
)

function elapsedMinutes(openedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60_000))
}

function tableOperationalMeta(order: Order | undefined) {
  if (!order) {
    return {
      label: 'Volný',
      surface: 'border-border bg-card hover:border-primary hover:bg-primary-soft',
      badge: 'bg-success/15 text-foreground',
    }
  }
  if (elapsedMinutes(order.openedAt) >= 60) {
    return {
      label: 'Čeká dlouho',
      surface: 'border-destructive bg-destructive/10 text-foreground',
      badge: 'bg-destructive/15 text-foreground',
    }
  }
  if (order.items.some((item) => item.kitchenStatus === 'New')) {
    return {
      label: 'Neodesláno',
      surface: 'border-sun bg-sun/10 text-foreground',
      badge: 'bg-sun/20 text-foreground',
    }
  }
  if (order.items.some((item) => item.kitchenStatus === 'Ready')) {
    return {
      label: 'Připraveno',
      surface: 'border-success bg-success/10 text-foreground',
      badge: 'bg-success/15 text-foreground',
    }
  }
  return {
    label: 'V provozu',
    surface: 'border-primary bg-primary-soft text-foreground',
    badge: 'bg-primary/10 text-foreground',
  }
}

const connectionLabel = computed(() => {
  if (connectionState.value === 'offline') return 'Offline'
  if (connectionState.value === 'syncing') return 'Obnovuji'
  return 'Online'
})

let operationalRefreshInFlight = false
let openOrdersRequestSequence = 0
let currentOrderRefreshSequence = 0
let orderMutationSequence = 0

watch(busy, (isBusy) => {
  if (!isBusy) return
  orderMutationSequence++
  currentOrderRefreshSequence++
})

async function loadInitialData() {
  loading.value = true
  try {
    await Promise.all([loadProducts(), refreshOpen(), loadPriceLevels(), loadLoyaltyCheckoutData()])
    categories.value = await categoriesApi.list()
    floors.value = await floorsApi.list()
    if (floors.value.length) currentFloorId.value = floors.value[0].id
    if (currentFloorId.value) await loadTables()
    connectionState.value = 'online'
    initialLoadError.value = false
  } catch (e) {
    // Odchod ze stránky uprostřed načítání není chyba provozu — nešumět do konzole.
    if (disposed) return
    connectionState.value = 'offline'
    initialLoadError.value = true
    console.error(e)
  } finally {
    // Po unmountu polling nestartovat — jinak by 5s interval běžel navždy bez vlastníka.
    if (!disposed && !accountRefreshTimer) {
      accountRefreshTimer = setInterval(() => void refreshOperationalState(), 5000)
    }
    loading.value = false
  }
}

onMounted(async () => {
  auth.init()
  companyStore.init() // profil firmy (název/adresa) pro hlavičku účtenky
  if (!apiMode) {
    loading.value = false
    return
  }
  // Mapa průběžně obnovuje obsazenost; otevřený účet položky/total kvůli QR doobjednávkám.
  await loadInitialData()
})

async function loadTables() {
  tables.value = currentFloorId.value ? await tablesApi.listByFloor(currentFloorId.value) : []
}
async function refreshOpen() {
  const requestSequence = ++openOrdersRequestSequence
  const nextOrders = await ordersApi.listOpen()
  if (requestSequence === openOrdersRequestSequence) openOrders.value = nextOrders
}
async function refreshOperationalState() {
  if (busy.value || operationalRefreshInFlight || document.visibilityState !== 'visible') return
  operationalRefreshInFlight = true
  connectionState.value = 'syncing'
  try {
    if (mode.value === 'map') {
      await refreshOpen()
    } else {
      await Promise.all([refreshOpen(), refreshCurrentOrder()])
    }
    connectionState.value = 'online'
  } catch (e) {
    connectionState.value = 'offline'
    console.error(e)
  } finally {
    operationalRefreshInFlight = false
  }
}
// Host může přes QR doobjednat do otevřeného účtu (backend připíše položky ke stejnému účtu stolu). Aby obsluha
// platila podle skutečného stavu, průběžně (interval) i před platbou znovu načteme aktuální účet ze serveru.
async function refreshCurrentOrder(options: { required?: boolean; allowPayment?: boolean } = {}) {
  const order = currentOrder.value
  if (!order || busy.value) return false
  const refreshSequence = ++currentOrderRefreshSequence
  const mutationSequence = orderMutationSequence
  // Neruš aktivní dialog (částka k platbě / rozdělení účtu) — změna položek pod rukama by mátla.
  if (
    (!options.allowPayment && paymentOpen.value) ||
    splitDialogOpen.value ||
    modifierDialogOpen.value ||
    variantDialogOpen.value ||
    itemDialogOpen.value ||
    moveDialogOpen.value ||
    mergeDialogOpen.value ||
    cancelDialogOpen.value
  )
    return false
  try {
    const fresh = await ordersApi.get(order.id)
    // Obsluha mohla mezitím přepnout stůl nebo spustit akci — aplikuj jen na stále tentýž, needitovaný účet.
    if (
      currentOrder.value?.id !== order.id ||
      busy.value ||
      refreshSequence !== currentOrderRefreshSequence ||
      mutationSequence !== orderMutationSequence
    )
      return false
    if (fresh.status !== 'Open') {
      // Účet mezitím uzavřel/zrušil jiný terminál nebo host doplatil přes QR — zpět na mapu.
      toast.info('Účet byl mezitím uzavřen.')
      await refreshOpen()
      backToMap()
      return false
    }
    // Jen položky/total; lokální slevu/tip (accountDiscountPercent/tipAmount) nepřepisujeme, ať nezrušíme editaci.
    currentOrder.value = fresh
    return true
  } catch (e) {
    if (options.required) {
      toast.error('Aktuální účet se nepodařilo načíst. Platbu zatím nelze bezpečně otevřít.')
    }
    console.error(e)
    return false
  }
}
watch(currentFloorId, () => {
  if (apiMode) loadTables()
})

async function selectTable(table: DiningTable) {
  if (busy.value) return
  selectedTable.value = table
  const existing = occupancy.value.get(table.id)
  busy.value = true
  try {
    if (existing) {
      currentOrder.value = await ordersApi.get(existing.id)
      mode.value = 'order'
    } else {
      // volný stůl → rovnou otevři účet
      currentOrder.value = await ordersApi.open(table.id)
      await refreshOpen()
      mode.value = 'order'
    }
    syncDiscountFromOrder(currentOrder.value)
  } catch (e) {
    toast.error('Účet se nepodařilo otevřít.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

function backToMap() {
  cancelPendingDiscountUpdate() // rozpracovaná sleva/tip pro opuštěný stůl se dál neposílá
  mode.value = 'map'
  selectedTable.value = null
  currentOrder.value = null
  accountDiscountPercent.value = 0
  tipAmount.value = 0
  selectedPriceLevelId.value = STANDARD_PRICE_LEVEL
  selectedCustomerId.value = NO_CUSTOMER
  redeemPoints.value = 0
  pricePreviewSeq++
  pricePreview.value = null
  splitPricePreviewSeq++
  splitPricePreview.value = null
  splitPricePreviewGroupId.value = null
  mobileAccountOpen.value = false
  accountAdjustmentsOpen.value = false
  moreActionsOpen.value = false
  productQuery.value = ''
}

async function discardEmptyOrder(): Promise<void> {
  const order = currentOrder.value
  if (!apiMode || !order || order.status !== 'Open' || order.items.length > 0) return
  try {
    await ordersApi.cancel(order.id)
    await refreshOpen()
  } catch (e) {
    // Účet mohl mezitím zrušit jiný terminál. Při odchodu uživatele neblokujeme navigaci,
    // ale po návratu se obsazenost znovu načte ze serveru.
    console.warn('Prázdný účet se při odchodu nepodařilo automaticky zrušit:', e)
  }
}

async function leaveOrderToMap() {
  await discardEmptyOrder()
  backToMap()
}

onBeforeRouteLeave(async () => {
  await discardEmptyOrder()
  return true
})

function resetProductFilters() {
  productQuery.value = ''
  selectedCat.value = ''
}

function openSplitActions() {
  moreActionsOpen.value = false
  openSplitDialog()
}

function openCancelConfirmation() {
  moreActionsOpen.value = false
  cancelDialogOpen.value = true
}

// --- Sleva na účet + spropitné (ukládá se průběžně, ne až při platbě) ---
const accountDiscountPercent = ref(0)
const tipAmount = ref(0)
const TIP_PRESETS = [10, 15, 20, 25] as const
const STANDARD_PRICE_LEVEL = 'standard'
const NO_CUSTOMER = 'none'
const priceLevels = ref<PriceLevel[]>([])
const selectedPriceLevelId = ref(STANDARD_PRICE_LEVEL)
const loyaltyCustomers = ref<LoyaltyCustomer[]>([])
const selectedCustomerId = ref(NO_CUSTOMER)
const loyaltySettings = ref<LoyaltySettings | null>(null)
const redeemPoints = ref(0)
const pricePreview = ref<PromotionCalculation | null>(null)
const pricePreviewLoading = ref(false)
const pricePreviewError = ref(false)
let pricePreviewSeq = 0
const splitPricePreview = ref<PromotionCalculation | null>(null)
const splitPricePreviewGroupId = ref<string | null>(null)
let splitPricePreviewSeq = 0
const selectedPriceLevel = computed(
  () => priceLevels.value.find((level) => level.id === selectedPriceLevelId.value) ?? null,
)
const loyaltyEnabled = computed(() => auth.hasModule('loyalty'))
const activePriceLevelId = computed(() => selectedPriceLevel.value?.id ?? null)
const selectedCustomer = computed(
  () => loyaltyCustomers.value.find((customer) => customer.id === selectedCustomerId.value) ?? null,
)
const activeCustomerId = computed(() => selectedCustomer.value?.id ?? null)
const priceLevelAdjustment = computed(() =>
  pricePreview.value
    ? round2(pricePreview.value.subtotalOriginal - pricePreview.value.subtotalAfterPriceLevel)
    : 0,
)
const promoDiscount = computed(() => pricePreview.value?.discountTotal ?? 0)
let discountTimer: ReturnType<typeof setTimeout> | null = null
// Poll otevřeného účtu (QR doobjednávky hosta) — běží jen v API módu, spouští se v onMounted.
let accountRefreshTimer: ReturnType<typeof setInterval> | null = null

// Zruší naplánovaný (ještě neodeslaný) update — volat před opuštěním/zrušením/přesunem účtu,
// ať po 500 ms nevystřelí PATCH na už neaktuální/zavřený Order.
function cancelPendingDiscountUpdate() {
  if (discountTimer) {
    clearTimeout(discountTimer)
    discountTimer = null
  }
}
// Odchod z routy (jiná stránka) uprostřed rozpracované změny — timery by běžely dál na pozadí.
let disposed = false
onBeforeUnmount(() => {
  disposed = true
  cancelPendingDiscountUpdate()
  if (accountRefreshTimer) clearInterval(accountRefreshTimer)
})

function syncDiscountFromOrder(order: Order) {
  accountDiscountPercent.value = order.discountPercent
  tipAmount.value = order.tipAmount
}

async function loadPriceLevels() {
  if (!loyaltyEnabled.value) {
    priceLevels.value = []
    selectedPriceLevelId.value = STANDARD_PRICE_LEVEL
    return
  }
  try {
    priceLevels.value = await promotions.listPriceLevels()
  } catch (e) {
    priceLevels.value = []
    console.error(e)
  }
}

async function loadLoyaltyCheckoutData() {
  if (!loyaltyEnabled.value) {
    loyaltyCustomers.value = []
    loyaltySettings.value = null
    selectedCustomerId.value = NO_CUSTOMER
    redeemPoints.value = 0
    return
  }
  try {
    const [customers, settings] = await Promise.all([
      customersApi.list('', 100),
      loyaltyApi.getSettings(),
    ])
    loyaltyCustomers.value = customers.items
    loyaltySettings.value = settings
  } catch (e) {
    loyaltyCustomers.value = []
    loyaltySettings.value = null
    console.error(e)
  }
}

function previewLines(): PromotionLineInput[] {
  return promotionLinesForItems(currentOrder.value?.items ?? [])
}

function promotionLinesForItems(items: OrderItemLine[]): PromotionLineInput[] {
  const productById = new Map(products.value.map((product) => [product.id, product]))
  return items.map((item) => {
    const product = item.productId ? productById.get(item.productId) : null
    return {
      productId: item.productId,
      categoryId: product?.categoryId ?? null,
      name: [item.name, item.variantName].filter(Boolean).join(' · '),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }
  })
}

async function refreshPricePreview() {
  if (!apiMode || !loyaltyEnabled.value || !currentOrder.value?.items.length) {
    pricePreviewSeq++
    pricePreview.value = null
    pricePreviewLoading.value = false
    pricePreviewError.value = false
    return
  }
  const seq = ++pricePreviewSeq
  pricePreview.value = null
  pricePreviewLoading.value = true
  pricePreviewError.value = false
  try {
    const result = await promotions.calculate(
      previewLines(),
      activePriceLevelId.value,
      [],
      selectedPriceLevel.value,
    )
    if (seq === pricePreviewSeq) pricePreview.value = result
  } catch (e) {
    if (seq === pricePreviewSeq) {
      pricePreview.value = null
      pricePreviewError.value = true
    }
    console.error(e)
  } finally {
    if (seq === pricePreviewSeq) pricePreviewLoading.value = false
  }
}

function accountAdjustedBase(baseGross: number): number {
  return round2(baseGross * (1 - clampPercent(accountDiscountPercent.value) / 100))
}

function accountDiscountAmount(baseGross: number): number {
  return round2(baseGross * (clampPercent(accountDiscountPercent.value) / 100))
}

function receiptDiscountAmount(
  originalGross: number,
  afterPriceLevelAndPromo: number,
  accountDiscountBase: number,
): number {
  return round2(
    Math.max(0, originalGross - afterPriceLevelAndPromo) +
      accountDiscountAmount(accountDiscountBase),
  )
}

function formatPriceLevelImpact(value: number): string {
  if (value > 0) return `−${formatCZK(value)}`
  if (value < 0) return `+${formatCZK(Math.abs(value))}`
  return formatCZK(0)
}

// Volá se po každé změně vstupu; no-op pokud hodnoty už odpovídají persistovanému stavu
// (např. těsně po syncDiscountFromOrder) — vyhne se zbytečnému requestu.
function scheduleDiscountUpdate() {
  if (!currentOrder.value) return
  const pct = clampPercent(accountDiscountPercent.value)
  const tip = clampAmount(tipAmount.value)
  if (pct === currentOrder.value.discountPercent && tip === currentOrder.value.tipAmount) return
  cancelPendingDiscountUpdate()
  const orderId = currentOrder.value.id
  discountTimer = setTimeout(() => {
    discountTimer = null
    ordersApi
      .updateDiscount(orderId, { discountPercent: pct, tipAmount: tip })
      .then((updated) => {
        if (currentOrder.value?.id === orderId) currentOrder.value = updated
      })
      .catch((e) => {
        // Účet mezitím opustil/zrušil/přesunul uživatel jinam — nezobrazovat matoucí chybu.
        if (currentOrder.value?.id !== orderId) return
        toast.error('Uložení slevy/spropitného selhalo.')
        console.error(e)
      })
  }, 500)
}
watch([accountDiscountPercent, tipAmount], scheduleDiscountUpdate)

// Před platbou zajistí, že rozpracovaná sleva/tip jsou skutečně uložené na serveru
// (pay() je bere jen z persistovaného stavu Order, ne z requestu).
async function flushDiscountUpdate() {
  if (!currentOrder.value) return
  cancelPendingDiscountUpdate()
  const pct = clampPercent(accountDiscountPercent.value)
  const tip = clampAmount(tipAmount.value)
  if (pct === currentOrder.value.discountPercent && tip === currentOrder.value.tipAmount) return
  currentOrder.value = await ordersApi.updateDiscount(currentOrder.value.id, {
    discountPercent: pct,
    tipAmount: tip,
  })
}

const totals = computed(() =>
  currentOrder.value
    ? calcPosTotals(
        currentOrder.value.items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          vatRate: i.vatRate,
        })),
        accountDiscountPercent.value,
        tipAmount.value,
      )
    : null,
)
const checkoutTotal = computed(() =>
  round2(checkoutBaseBeforeTip.value - redeemDiscount.value + clampAmount(tipAmount.value)),
)
const checkoutBaseBeforeTip = computed(() =>
  pricePreview.value
    ? accountAdjustedBase(pricePreview.value.total)
    : totals.value
      ? round2(totals.value.subtotalGross - totals.value.discountAmount)
      : round2((currentOrder.value?.total ?? 0) - clampAmount(tipAmount.value)),
)
const maxRedeemPoints = computed(() => {
  const customer = selectedCustomer.value
  const settings = loyaltySettings.value
  if (!customer || !settings || settings.pointValueCzk <= 0) return 0
  const byTotal = Math.floor(checkoutBaseBeforeTip.value / settings.pointValueCzk)
  const byLimit =
    settings.maxRedeemPointsPerSale > 0 ? settings.maxRedeemPointsPerSale : Number.MAX_SAFE_INTEGER
  return Math.max(0, Math.min(customer.loyaltyPoints, byLimit, byTotal))
})
const appliedRedeemPoints = computed(() =>
  Math.min(Math.max(0, Number(redeemPoints.value) || 0), maxRedeemPoints.value),
)
const redeemDiscount = computed(() =>
  round2(appliedRedeemPoints.value * (loyaltySettings.value?.pointValueCzk ?? 0)),
)
const earnedPointsPreview = computed(() => {
  const rate = loyaltySettings.value?.earnRateCzkPerPoint ?? 0
  if (!selectedCustomer.value || rate <= 0) return 0
  return Math.max(0, Math.floor((checkoutTotal.value - clampAmount(tipAmount.value)) / rate))
})
const pricingReady = computed(
  () =>
    !apiMode || !loyaltyEnabled.value || (!pricePreviewLoading.value && !pricePreviewError.value),
)

watch(
  [currentOrder, activePriceLevelId, selectedCustomer, loyaltySettings],
  () => {
    if (!selectedCustomer.value) redeemPoints.value = 0
    if (redeemPoints.value > maxRedeemPoints.value) redeemPoints.value = maxRedeemPoints.value
    void refreshPricePreview()
    if (paymentSplitGroup.value) void refreshSplitPricePreview(paymentSplitGroup.value)
  },
  { deep: true },
)

function setTipPercent(pct: number) {
  if (!totals.value) return
  const base = pricePreview.value
    ? accountAdjustedBase(pricePreview.value.total)
    : totals.value.subtotalGross - totals.value.discountAmount
  tipAmount.value = round2(base * (pct / 100))
}

// Účet mezitím uzavřel/zrušil jiný terminál nebo host doplatil přes QR (404/409). Sjednocené zpracování:
// hláška, obnova obsazenosti a návrat na mapu. Vrací true, když šlo o tenhle případ (volající pak přeskočí
// generickou chybu). Používá se u akcí, kde 409 znamená JEN „účet už není otevřený" (add položky, odeslání do kuchyně).
async function handleAccountClosedElsewhere(e: unknown): Promise<boolean> {
  if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 409)) return false
  toast.error('Účet mezitím zaplatil nebo zrušil jiný terminál.')
  await refreshOpen()
  backToMap()
  return true
}

async function productModifiers(productId: string): Promise<ProductModifierGroup[]> {
  const cached = productModifierCache.get(productId)
  if (cached) return cached
  const groups = await modifiersApi.listForProduct(productId)
  productModifierCache.set(productId, groups)
  return groups
}

async function productVariants(product: Product): Promise<SelectableProductVariant[]> {
  const cached = productVariantCache.get(product.id)
  if (cached) return cached
  const variants = await variantsApi.get(product.id)
  const mapped = (variants ?? []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    priceWithVat: variant.salePriceOverride ?? product.salePrice,
    sortOrder: variant.sortOrder,
  }))
  productVariantCache.set(product.id, mapped)
  return mapped
}

async function addProduct(product: Product) {
  if (!currentOrder.value || busy.value) return
  busy.value = true
  try {
    const [groups, variants] = await Promise.all([
      productModifiers(product.id),
      productVariants(product),
    ])
    if (variants.length) {
      variantProduct.value = product
      variantsForProduct.value = variants
      pendingModifierGroups.value = groups
      selectedVariant.value = null
      variantDialogOpen.value = true
      return
    }
    selectedVariant.value = null
    await addSelectedProduct(product, groups, null)
  } catch (e) {
    if (await handleAccountClosedElsewhere(e)) return
    toast.error('Položku se nepodařilo přidat.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function confirmVariant(variant: SelectableProductVariant) {
  if (!variantProduct.value || busy.value) return
  selectedVariant.value = variant
  variantDialogOpen.value = false
  await addSelectedProduct(variantProduct.value, pendingModifierGroups.value, variant)
}

async function addSelectedProduct(
  product: Product,
  groups: ProductModifierGroup[],
  variant: SelectableProductVariant | null,
) {
  if (!currentOrder.value) return
  if (groups.length) {
    modifierProduct.value = product
    modifierGroups.value = groups
    selectedVariant.value = variant
    modifierDialogOpen.value = true
    return
  }
  currentOrder.value = await ordersApi.addItem(currentOrder.value.id, product.id, 1, {
    productVariantId: variant?.id ?? null,
  })
}

async function addProductWithModifiers(modifierOptionIds: string[]) {
  if (!currentOrder.value || !modifierProduct.value || busy.value) return
  busy.value = true
  try {
    currentOrder.value = await ordersApi.addItem(
      currentOrder.value.id,
      modifierProduct.value.id,
      1,
      {
        modifierOptionIds,
        productVariantId: selectedVariant.value?.id ?? null,
      },
    )
    modifierDialogOpen.value = false
  } catch (e) {
    if (await handleAccountClosedElsewhere(e)) return
    toast.error('Položku se nepodařilo přidat.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function changeQty(item: OrderItemLine, quantity: number) {
  if (!currentOrder.value || busy.value) return
  busy.value = true
  try {
    currentOrder.value =
      quantity <= 0
        ? await ordersApi.removeItem(currentOrder.value.id, item.id)
        : // meta posíláme s sebou, jinak by update přepsal poznámku/chod na null
          await ordersApi.updateItem(currentOrder.value.id, item.id, quantity, {
            note: item.note,
            course: item.course,
          })
  } catch (e) {
    toast.error('Změna položky selhala.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Poznámka a pořadí výdeje položky (dokud není odeslaná do kuchyně) ---
const itemDialogOpen = ref(false)
const editingItem = ref<OrderItemLine | null>(null)
const itemNote = ref('')
const itemCourse = ref<string | null>(null)

function openItemMeta(item: OrderItemLine) {
  editingItem.value = item
  itemNote.value = item.note ?? ''
  itemCourse.value = normalizeOrderCourse(item.course)
  itemDialogOpen.value = true
}

const orderCourseGroups = computed(() => groupItemsByCourse(currentOrder.value?.items ?? []))

async function saveItemMeta() {
  if (!currentOrder.value || !editingItem.value || busy.value) return
  // Aktuální položka ze serverového stavu (ne snapshot z dialogu) — robustní vůči mezizměnám.
  const item = currentOrder.value.items.find((i) => i.id === editingItem.value!.id)
  if (!item || item.kitchenStatus !== 'New') {
    itemDialogOpen.value = false
    return
  }
  busy.value = true
  try {
    currentOrder.value = await ordersApi.updateItem(currentOrder.value.id, item.id, item.quantity, {
      note: itemNote.value.trim() || null,
      course: itemCourse.value,
    })
    itemDialogOpen.value = false
  } catch (e) {
    toast.error('Uložení poznámky selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Split účtu — přiřazení položek (i po částech) osobám/skupinám.
// Uložený split je rozpočet nad účtem; tlačítka v dialogu umí zaplatit vybranou skupinu přes pay-items.
const splitDialogOpen = ref(false)
const splitGroups = ref<OrderSplitGroup[]>([])
const savingSplit = ref(false)
const splitPaymentAttempt = ref<{ orderId: string; groupId: string; key: string } | null>(null)

function openSplitDialog() {
  if (!currentOrder.value) return
  // Kopie, ať editace v dialogu neovlivní currentOrder dřív, než se uloží.
  // splitGroups je nové pole — starší/neaktualizovaný backend ho nemusí ještě vracet.
  splitGroups.value = (currentOrder.value.splitGroups ?? []).map((g) => ({
    ...g,
    items: g.items.map((i) => ({ ...i })),
  }))
  splitDialogOpen.value = true
}

function addSplitGroup() {
  splitGroups.value.push({
    id: crypto.randomUUID(),
    label: `Osoba ${splitGroups.value.length + 1}`,
    items: [],
  })
}
function removeSplitGroup(id: string) {
  splitGroups.value = splitGroups.value.filter((g) => g.id !== id)
}

function isAssigned(group: OrderSplitGroup, itemId: string): boolean {
  return group.items.some((i) => i.itemId === itemId)
}
function assignedCount(itemId: string): number {
  return splitGroups.value.filter((g) => g.items.some((i) => i.itemId === itemId)).length
}
// Klik = přepnout, jestli tahle osoba položku platí. Cena se pak rozpočítá ROVNÝM DÍLEM
// mezi všechny osoby, které položku mají (2 → na půl, 3 → na třetiny). Položka je tak vždy
// buď celá přiřazená (součet frakcí = 1), nebo úplně nepřiřazená (společná).
function toggleItem(group: OrderSplitGroup, itemId: string) {
  if (isAssigned(group, itemId)) {
    group.items = group.items.filter((i) => i.itemId !== itemId)
  } else {
    group.items.push({ itemId, fraction: 0 })
  }
  const assigned = splitGroups.value.filter((g) => g.items.some((i) => i.itemId === itemId))
  const share = assigned.length > 0 ? 1 / assigned.length : 0
  for (const g of assigned) {
    const entry = g.items.find((i) => i.itemId === itemId)
    if (entry) entry.fraction = share
  }
}

// Kolik z účtu zůstává nepřiřazené (společné) = celkem − součet částek všech osob.
const unassignedSplitTotal = computed(() => {
  if (!currentOrder.value || !totals.value) return 0
  const assigned = splitGroups.value.reduce((sum, g) => sum + groupTotal(g), 0)
  return round2(totals.value.total - assigned)
})

// Rozpočet části za osobu MUSÍ sedět se server-computed Sale.Total (backend proti němu
// validuje cashReceived) → sdílený calcSplitGroupPayment zrcadlí backendový výpočet.
// Bere se z lokálních refs (accountDiscountPercent/tipAmount), NE z currentOrder.value —
// ty se ukládají na server debounced (viz scheduleDiscountUpdate), takže krátce po změně
// ještě neodpovídají persistovanému stavu. Stejný zdroj jako panel účtu (computed totals).
function splitGroupPayment(group: OrderSplitGroup) {
  if (!currentOrder.value) return null
  return calcSplitGroupPayment(
    currentOrder.value.items.map((i) => ({
      itemId: i.id,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      vatRate: i.vatRate,
    })),
    group,
    accountDiscountPercent.value,
    tipAmount.value,
  )
}

function groupTotal(group: OrderSplitGroup): number {
  return splitGroupPayment(group)?.total ?? 0
}

function splitPaymentItems(group: OrderSplitGroup) {
  return (splitGroupPayment(group)?.items ?? []).map(({ itemId, quantity }) => ({
    itemId,
    quantity,
  }))
}

function splitPreviewLines(group: OrderSplitGroup): PromotionLineInput[] {
  if (!currentOrder.value) return []
  const itemById = new Map(currentOrder.value.items.map((item) => [item.id, item]))
  const splitItems = splitGroupPayment(group)?.items ?? []
  return promotionLinesForItems(
    splitItems
      .map((row) => {
        const item = itemById.get(row.itemId)
        return item ? { ...item, quantity: row.quantity } : null
      })
      .filter((item): item is OrderItemLine => item !== null),
  )
}

async function refreshSplitPricePreview(group: OrderSplitGroup | null) {
  if (!group || !apiMode || !loyaltyEnabled.value) {
    splitPricePreviewSeq++
    splitPricePreview.value = null
    splitPricePreviewGroupId.value = null
    return
  }
  const lines = splitPreviewLines(group)
  if (!lines.length) {
    splitPricePreviewSeq++
    splitPricePreview.value = null
    splitPricePreviewGroupId.value = group.id
    return
  }
  const seq = ++splitPricePreviewSeq
  splitPricePreviewGroupId.value = group.id
  try {
    const result = await promotions.calculate(
      lines,
      activePriceLevelId.value,
      [],
      selectedPriceLevel.value,
    )
    if (seq === splitPricePreviewSeq) splitPricePreview.value = result
  } catch (e) {
    if (seq === splitPricePreviewSeq) {
      splitPricePreview.value = null
    }
    console.error(e)
  }
}

function splitCheckoutTotal(group: OrderSplitGroup): number {
  const payment = splitGroupPayment(group)
  if (!payment) return 0
  if (splitPricePreviewGroupId.value === group.id && splitPricePreview.value) {
    const afterAccountDiscount =
      splitPricePreview.value.total * (1 - clampPercent(accountDiscountPercent.value) / 100)
    return round2(afterAccountDiscount + payment.tipAmount)
  }
  return payment.total
}

function splitDiscountAmount(group: OrderSplitGroup): number {
  const payment = splitGroupPayment(group)
  if (!payment) return 0
  if (splitPricePreviewGroupId.value === group.id && splitPricePreview.value) {
    return receiptDiscountAmount(
      splitPricePreview.value.subtotalOriginal,
      splitPricePreview.value.total,
      splitPricePreview.value.total,
    )
  }
  return payment.discountAmount
}

function splitPaymentReceipt(group: OrderSplitGroup) {
  const payment = splitGroupPayment(group)
  if (!payment || !currentOrder.value) return null
  const itemById = new Map(currentOrder.value.items.map((item) => [item.id, item]))
  return {
    items: payment.items.map((row) => ({
      name: itemById.get(row.itemId)?.name ?? '',
      qty: row.quantity,
      total: row.gross,
      modifiers: itemById.get(row.itemId)?.modifiers ?? [],
    })),
    discountAmount: splitDiscountAmount(group),
    tipAmount: payment.tipAmount,
    total: splitCheckoutTotal(group),
  }
}

function orderReceiptItems(order: Order) {
  const preview = pricePreview.value
  const hasPreviewLines = preview?.lines.length === order.items.length
  return order.items.map((item, index) => ({
    name: [item.name, item.variantName].filter(Boolean).join(' · '),
    qty: item.quantity,
    total: hasPreviewLines ? preview.lines[index].finalTotal : item.lineTotal,
    modifiers: item.modifiers ?? [],
  }))
}

async function paySplitGroup(
  group: OrderSplitGroup,
  method: PaymentMethod,
  cashReceived: number | null = null,
): Promise<boolean> {
  if (!currentOrder.value || busy.value) return false
  const items = splitPaymentItems(group)
  if (!items.length) return false
  const tableName = selectedTable.value?.name
  busy.value = true
  try {
    await flushDiscountUpdate()
    if (!currentOrder.value) return false
    const orderId = currentOrder.value.id
    const receipt = splitPaymentReceipt(group)
    if (
      splitPaymentAttempt.value?.orderId !== orderId ||
      splitPaymentAttempt.value.groupId !== group.id
    ) {
      splitPaymentAttempt.value = { orderId, groupId: group.id, key: crypto.randomUUID() }
    }
    const payment = await ordersApi.payItems(
      orderId,
      method,
      items,
      splitPaymentAttempt.value.key,
      cashReceived,
      activePriceLevelId.value,
    )
    const sale = await salesApi.get(payment.saleId)
    const updated = payment.order
    currentOrder.value = updated
    syncDiscountFromOrder(updated)
    splitGroups.value = []
    splitDialogOpen.value = false
    splitPaymentAttempt.value = null
    if (receipt) {
      paymentOpen.value = false // zavřít PŘED otevřením účtenky — dva otevřené dialogy zamykaly stránku
      receiptData.value = buildReceipt({
        company: companyStore.company,
        items: sale.items.map((item) => ({
          name: [item.description ?? 'Položka', item.variantName].filter(Boolean).join(' · '),
          qty: item.quantity,
          total: item.lineTotal,
          modifiers: item.modifiers ?? [],
        })),
        discountPercent: sale.discountPercent,
        discountAmount: receipt.discountAmount,
        tipAmount: sale.tipAmount,
        total: sale.total,
        method: sale.paymentMethod,
        id: sale.id,
        table: tableName,
        cashReceived: sale.cashReceived,
        cashChange: sale.cashChange,
      })
      receiptOpen.value = true
    }
    toast.success(`Zaplaceno ${formatCZK(sale.total)} za ${group.label}.`)
    await refreshOpen()
    if (updated.status === 'Closed') backToMap()
    return true
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
      toast.error('Účet mezitím zaplatil nebo zrušil jiný terminál.')
      splitDialogOpen.value = false
      await refreshOpen()
      backToMap()
    } else if (e instanceof ApiError && e.status === 422 && cashReceived != null) {
      // Přijatá částka nepokryla server-spočítaný Total; dialog zůstává otevřený.
      toast.error('Přijatá hotovost nepokrývá částku k úhradě. Zadejte vyšší částku.')
    } else {
      toast.error('Platba vybrané části selhala.')
    }
    console.error(e)
    return false
  } finally {
    busy.value = false
  }
}

// --- Jednotný platební dialog (hotově s výpočtem vrácení / karta přes terminálový krok) ---
const paymentOpen = ref(false)
const unsentPaymentConfirmOpen = ref(false)
// null = platba celého účtu; jinak platba části za osobu z rozdělení účtu.
const paymentSplitGroup = ref<OrderSplitGroup | null>(null)
const paymentTotal = computed(() =>
  paymentSplitGroup.value ? splitCheckoutTotal(paymentSplitGroup.value) : checkoutTotal.value,
)
const paymentLabel = computed(() =>
  paymentSplitGroup.value ? paymentSplitGroup.value.label : selectedTable.value?.name,
)

async function openPayment(
  group: OrderSplitGroup | null = null,
  options: { allowUnsent?: boolean } = {},
) {
  // Platba celého účtu: napřed natáhni aktuální stav — host mohl QR doobjednat, obsluha musí platit podle reality.
  // (Split platba se neobnovuje: rozdělení účtu vychází ze známých položek a refresh by ho rozhodil.)
  if (group === null) {
    const refreshed = await refreshCurrentOrder({ required: true })
    if (!refreshed) return
    await refreshPricePreview()
    if (!pricingReady.value) {
      toast.error('Výslednou cenu se nepodařilo ověřit. Zkuste platbu znovu.')
      return
    }
  }
  if (!currentOrder.value) return // účet se mezitím zavřel a refresh nás vrátil na mapu
  if (
    !options.allowUnsent &&
    currentOrder.value.items.some((item) => item.kitchenStatus === 'New')
  ) {
    paymentSplitGroup.value = group
    unsentPaymentConfirmOpen.value = true
    return
  }
  paymentSplitGroup.value = group
  await refreshSplitPricePreview(group)
  if (
    group &&
    apiMode &&
    loyaltyEnabled.value &&
    (splitPricePreviewGroupId.value !== group.id || !splitPricePreview.value)
  ) {
    toast.error('Cenu vybrané části se nepodařilo ověřit. Zkuste platbu znovu.')
    return
  }
  mobileAccountOpen.value = false
  accountAdjustmentsOpen.value = false
  moreActionsOpen.value = false
  paymentOpen.value = true
}

async function confirmPayment(payment: { method: PaymentMethod; cashReceived: number | null }) {
  if (paymentSplitGroup.value) {
    await refreshSplitPricePreview(paymentSplitGroup.value)
    if (
      apiMode &&
      loyaltyEnabled.value &&
      (splitPricePreviewGroupId.value !== paymentSplitGroup.value.id || !splitPricePreview.value)
    ) {
      toast.error('Cenu vybrané části se nepodařilo ověřit. Zkuste platbu znovu.')
      return
    }
  } else {
    const previousTotal = checkoutTotal.value
    const refreshed = await refreshCurrentOrder({ required: true, allowPayment: true })
    if (!refreshed) return
    await refreshPricePreview()
    if (!pricingReady.value) {
      toast.error('Výslednou cenu se nepodařilo ověřit. Zkuste platbu znovu.')
      return
    }
    if (Math.abs(previousTotal - checkoutTotal.value) >= 0.01) {
      toast.info(
        `Účet se změnil z ${formatCZK(previousTotal)} na ${formatCZK(checkoutTotal.value)}. Zkontrolujte novou částku a potvrďte platbu znovu.`,
      )
      return
    }
  }
  const ok = paymentSplitGroup.value
    ? await paySplitGroup(paymentSplitGroup.value, payment.method, payment.cashReceived)
    : await pay(payment.method, payment.cashReceived)
  if (ok) paymentOpen.value = false // při chybě zůstává otevřený, obsluha může zkusit znovu
}

async function saveSplit() {
  if (!currentOrder.value || savingSplit.value) return
  savingSplit.value = true
  try {
    currentOrder.value = await ordersApi.updateSplit(currentOrder.value.id, splitGroups.value)
    toast.success('Rozdělení účtu uloženo.')
    splitDialogOpen.value = false
  } catch (e) {
    // Účet mezitím zaplatil/zrušil jiný terminál — konkrétní hláška, dialog zavřít a odejít na mapu.
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
      toast.error('Účet mezitím zaplatil nebo zrušil jiný terminál.')
      splitDialogOpen.value = false
      await refreshOpen()
      backToMap()
    } else {
      toast.error('Uložení rozdělení selhalo.')
    }
    console.error(e)
  } finally {
    savingSplit.value = false
  }
}

// --- Přesun účtu na jiný stůl (v rámci aktuálního patra) ---
const moveDialogOpen = ref(false)
const freeTables = computed(() => tables.value.filter((t) => !occupancy.value.has(t.id)))

async function openMoveDialog() {
  moreActionsOpen.value = false
  try {
    await refreshOpen()
    moveDialogOpen.value = true
  } catch (e) {
    toast.error('Volné stoly se nepodařilo obnovit.')
    console.error(e)
  }
}

async function moveOrder(targetTableId: string) {
  if (!currentOrder.value || busy.value) return
  busy.value = true
  try {
    currentOrder.value = await ordersApi.move(currentOrder.value.id, targetTableId)
    selectedTable.value = tables.value.find((t) => t.id === targetTableId) ?? selectedTable.value
    await refreshOpen()
    moveDialogOpen.value = false
    toast.success(`Účet přesunut na ${selectedTable.value?.name}.`)
  } catch (e) {
    // 409 = cílový stůl mezitím obsadil jiný terminál → konkrétní hláška a obnov obsazenost.
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Cílový stůl je už obsazený.')
      await refreshOpen()
    } else {
      toast.error('Přesun účtu selhal.')
    }
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Sloučení účtů — položky z jiného obsazeného stolu se přesunou na tento (cílový) účet ---
const mergeDialogOpen = ref(false)
const mergeCandidateTable = ref<DiningTable | null>(null)
watch(mergeDialogOpen, (open) => {
  if (!open) mergeCandidateTable.value = null
})
// Zdrojoví kandidáti = ostatní obsazené stoly na aktuálním patře (vyjma tohoto účtu).
const otherOccupiedTables = computed(() =>
  tables.value.filter((t) => occupancy.value.has(t.id) && t.id !== selectedTable.value?.id),
)

async function openMergeDialog() {
  moreActionsOpen.value = false
  try {
    await refreshOpen()
    mergeDialogOpen.value = true
  } catch (e) {
    toast.error('Otevřené účty se nepodařilo obnovit.')
    console.error(e)
  }
}

async function mergeOrder(sourceTableId: string) {
  if (!currentOrder.value || busy.value) return
  const source = occupancy.value.get(sourceTableId)
  if (!source) {
    mergeCandidateTable.value = null
    toast.info('Zdrojový účet už není otevřený. Vyberte jiný stůl.')
    return
  }
  busy.value = true
  try {
    // currentOrder = cíl; zdrojový účet se do něj sloučí a jeho stůl se uvolní.
    // Backend zdroj nastaví na Cancelled a na cíli resetuje split (rozdělení účtu).
    currentOrder.value = await ordersApi.merge(currentOrder.value.id, source.id)
    syncDiscountFromOrder(currentOrder.value) // sleva/spropitné zůstávají na cílovém účtu
    await refreshOpen() // zdrojový stůl zmizí jako obsazený
    mergeDialogOpen.value = false
    mergeCandidateTable.value = null
    toast.success('Účty sloučeny. Rozdělení účtu (split) je potřeba nastavit znovu.')
  } catch (e) {
    // 404/409 = zdrojový nebo cílový účet mezitím zaplatil/zrušil jiný terminál.
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
      toast.error('Účet mezitím zaplatil nebo zrušil jiný terminál.')
      await refreshOpen()
      mergeCandidateTable.value = null
    } else {
      toast.error('Sloučení účtů selhalo.')
    }
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function sendToKitchen(): Promise<boolean> {
  if (!currentOrder.value || busy.value) return false
  // Rozpad nových položek na stanice (kuchyně/bar) — co kam „vyjede" jako bon.
  const fresh = currentOrder.value.items.filter((i) => i.kitchenStatus === 'New')
  const k = fresh.filter((i) => i.kitchenSection === 'Kitchen').reduce((s, i) => s + i.quantity, 0)
  const b = fresh.filter((i) => i.kitchenSection === 'Bar').reduce((s, i) => s + i.quantity, 0)
  busy.value = true
  try {
    currentOrder.value = await ordersApi.sendToKitchen(currentOrder.value.id)
    const parts: string[] = []
    if (k) parts.push(`kuchyně ${k}`)
    if (b) parts.push(`bar ${b}`)
    toast.success(
      parts.length ? `Objednávka odeslána (${parts.join(', ')}).` : 'Objednávka odeslána.',
    )
    return true
  } catch (e) {
    if (await handleAccountClosedElsewhere(e)) return false
    toast.error('Odeslání objednávky selhalo.')
    console.error(e)
    return false
  } finally {
    busy.value = false
  }
}

async function sendAndContinueToPayment() {
  unsentPaymentConfirmOpen.value = false
  const group = paymentSplitGroup.value
  if (await sendToKitchen()) await openPayment(group, { allowUnsent: true })
}

async function continuePaymentWithoutSending() {
  unsentPaymentConfirmOpen.value = false
  await openPayment(paymentSplitGroup.value, { allowUnsent: true })
}

async function pay(method: PaymentMethod, cashReceived: number | null = null): Promise<boolean> {
  if (!currentOrder.value || busy.value) return false
  const tableName = selectedTable.value?.name
  busy.value = true
  try {
    await flushDiscountUpdate() // sleva/tip musí být uložené na Order, pay() je bere ze serveru
    if (!currentOrder.value) return false
    const order = currentOrder.value
    const discountAmountSnapshot = pricePreview.value
      ? receiptDiscountAmount(
          pricePreview.value.subtotalOriginal,
          pricePreview.value.total,
          pricePreview.value.total,
        )
      : totals.value?.discountAmount
    const paid = await ordersApi.pay(
      order.id,
      method,
      cashReceived,
      activePriceLevelId.value,
      activeCustomerId.value,
      appliedRedeemPoints.value,
    )
    const sale = paid.saleId ? await salesApi.get(paid.saleId) : null
    const paidTotal = sale?.total ?? paid.total
    const change = cashReceived != null ? round2(cashReceived - paidTotal) : null
    receiptData.value = buildReceipt({
      company: companyStore.company,
      items: sale
        ? sale.items.map((item) => ({
            name: [item.description ?? 'Položka', item.variantName].filter(Boolean).join(' · '),
            qty: item.quantity,
            total: item.lineTotal,
            modifiers: item.modifiers ?? [],
          }))
        : orderReceiptItems(order),
      discountPercent: sale?.discountPercent ?? paid.discountPercent,
      discountAmount: round2((discountAmountSnapshot ?? 0) + (sale?.redeemDiscount ?? 0)),
      tipAmount: sale?.tipAmount ?? paid.tipAmount,
      total: paidTotal,
      method,
      id: sale?.id ?? order.id,
      table: tableName,
      customerName: selectedCustomer.value?.name,
      cashReceived: sale?.cashReceived ?? cashReceived,
      cashChange: change,
      loyaltyEarnedPoints: sale?.earnedPoints ?? earnedPointsPreview.value,
      loyaltyRedeemedPoints: sale?.redeemPoints ?? appliedRedeemPoints.value,
    })
    paymentOpen.value = false // zavřít PŘED otevřením účtenky — dva otevřené dialogy zamykaly stránku
    receiptOpen.value = true // účtenka po zaplacení (náhled + tisk)
    toast.success(
      change != null && change > 0
        ? `Zaplaceno ${formatCZK(paidTotal)} hotově, vrátit ${formatCZK(change)}.`
        : `Zaplaceno ${formatCZK(paidTotal)} ${method === 'Cash' ? 'hotově' : 'kartou'}.`,
    )
    await refreshOpen()
    backToMap()
    return true
  } catch (e) {
    // 422 u hotovosti = přijatá částka nepokryla server-spočítaný Total; dialog zůstává otevřený.
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
      paymentOpen.value = false
      toast.error('Účet mezitím zaplatil nebo zrušil jiný terminál.')
      await refreshOpen()
      backToMap()
    } else if (e instanceof ApiError && e.status === 422 && cashReceived != null) {
      toast.error('Přijatá hotovost nepokrývá částku k úhradě. Zadejte vyšší částku.')
    } else {
      toast.error('Platba selhala.')
    }
    console.error(e)
    return false
  } finally {
    busy.value = false
  }
}

const cancelDialogOpen = ref(false)

async function cancelOrder() {
  if (!currentOrder.value || busy.value) return
  busy.value = true
  try {
    await ordersApi.cancel(currentOrder.value.id)
    toast.success('Účet zrušen.')
    cancelDialogOpen.value = false
    await refreshOpen()
    backToMap()
  } catch (e) {
    toast.error('Zrušení účtu selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

const hasNewItems = computed(() =>
  (currentOrder.value?.items ?? []).some((i) => i.kitchenStatus === 'New'),
)
const newItemCount = computed(() =>
  (currentOrder.value?.items ?? [])
    .filter((item) => item.kitchenStatus === 'New')
    .reduce((sum, item) => sum + item.quantity, 0),
)
const currentItemCount = computed(() =>
  (currentOrder.value?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
)

function itemCountLabel(count: number): string {
  if (count === 1) return 'položka'
  if (count >= 2 && count <= 4) return 'položky'
  return 'položek'
}
const currentOrderElapsed = computed(() =>
  currentOrder.value ? elapsedMinutes(currentOrder.value.openedAt) : 0,
)
</script>

<template>
  <div
    data-testid="restaurant-page"
    class="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
  >
    <div
      v-if="!apiMode"
      class="m-4 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <Package class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Stoly a objednávky teď nejsou dostupné</p>
    </div>

    <div v-else-if="loading" class="grid h-full place-items-center">
      <div
        class="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-card"
      >
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
        <span class="font-medium">Připravuji provoz restaurace…</span>
      </div>
    </div>

    <div v-else-if="initialLoadError" class="h-full overflow-y-auto p-4 sm:p-6">
      <LoadError
        message="Provoz restaurace se nepodařilo načíst. Zkontrolujte připojení a zkuste to znovu."
        :retrying="loading"
        @retry="loadInitialData"
      />
    </div>

    <template v-else>
      <header
        class="flex h-[var(--pos-header)] shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:gap-3 sm:px-4"
      >
        <RouterLink
          to="/app"
          class="inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
          aria-label="Zpět do hlavního přehledu"
          data-pos-target="secondary"
        >
          <LayoutDashboard class="h-5 w-5" />
          <span class="hidden sm:inline">Přehled</span>
        </RouterLink>

        <Button
          v-if="mode === 'order'"
          type="button"
          variant="ghost"
          class="h-12 min-w-12 px-3"
          aria-label="Zpět na mapu stolů"
          data-pos-target="secondary"
          @click="leaveOrderToMap"
        >
          <ArrowLeft class="h-5 w-5" />
          <span class="hidden md:inline">Stoly</span>
        </Button>

        <div class="min-w-0 flex-1">
          <div class="truncate text-base font-bold sm:text-lg">
            {{ mode === 'map' ? 'Stoly a objednávky' : selectedTable?.name }}
          </div>
          <div class="truncate text-xs text-muted-foreground">
            <template v-if="mode === 'map'">
              {{ occupiedTableCount }} obsazených · {{ freeTableCount }} volných
            </template>
            <template v-else>
              {{ currentItemCount }} {{ itemCountLabel(currentItemCount) }} · otevřeno
              {{ currentOrderElapsed }} min
            </template>
          </div>
        </div>

        <div
          data-testid="restaurant-connection-status"
          class="inline-flex h-10 items-center gap-2 rounded-full px-3 text-xs font-bold text-foreground"
          :class="
            connectionState === 'offline'
              ? 'bg-destructive/15'
              : connectionState === 'syncing'
                ? 'bg-sun/15'
                : 'bg-success/15'
          "
          :aria-label="'Připojení ' + connectionLabel.toLocaleLowerCase('cs')"
        >
          <WifiOff v-if="connectionState === 'offline'" class="h-4 w-4 text-destructive" />
          <Loader2 v-else-if="connectionState === 'syncing'" class="h-4 w-4 animate-spin" />
          <Wifi v-else class="h-4 w-4 text-success" />
          <span class="hidden sm:inline">{{ connectionLabel }}</span>
        </div>
      </header>

      <main class="min-h-0 flex-1 overflow-hidden">
        <section
          v-if="mode === 'map'"
          data-testid="restaurant-map-view"
          class="flex h-full min-h-0 flex-col"
          aria-label="Mapa restaurace"
        >
          <div
            v-if="floors.length"
            class="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-background px-3 py-2 sm:px-4"
            data-testid="restaurant-floor-tabs"
          >
            <button
              v-for="floor in floors"
              :key="floor.id"
              type="button"
              class="h-12 shrink-0 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="
                currentFloorId === floor.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              "
              :aria-pressed="currentFloorId === floor.id"
              data-pos-target="secondary"
              @click="currentFloorId = floor.id"
            >
              {{ floor.name }}
            </button>
          </div>

          <div v-if="!floors.length" class="grid h-full place-items-center p-4">
            <div class="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
              <Package class="mx-auto h-10 w-10 text-muted-foreground" />
              <p class="mt-3 font-semibold">Zatím žádná mapa stolů</p>
              <p class="mt-1 text-sm text-muted-foreground">Vytvořte ji v sekci Mapa stolů.</p>
            </div>
          </div>

          <div
            v-else-if="tables.length"
            class="min-h-0 flex-1 overflow-auto p-3 sm:p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-3 lg:overflow-hidden"
          >
            <div
              data-testid="restaurant-table-list"
              class="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:hidden"
            >
              <button
                v-for="table in tables"
                :key="table.id"
                type="button"
                class="flex min-h-28 flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :class="tableOperationalMeta(occupancy.get(table.id)).surface"
                :data-testid="'restaurant-table-list-' + table.id"
                data-pos-target="primary"
                @click="selectTable(table)"
              >
                <span class="flex w-full items-start justify-between gap-2">
                  <span class="font-bold">{{ table.name }}</span>
                  <span
                    class="rounded-full px-2 py-1 text-xs font-black"
                    :class="tableOperationalMeta(occupancy.get(table.id)).badge"
                  >
                    {{ tableOperationalMeta(occupancy.get(table.id)).label }}
                  </span>
                </span>
                <span class="text-lg font-black tabular-nums">
                  {{
                    occupancy.get(table.id)
                      ? formatCZK(occupancy.get(table.id)!.total)
                      : 'Otevřít účet'
                  }}
                </span>
              </button>
            </div>

            <div
              data-testid="restaurant-floor-map"
              class="relative hidden min-h-0 overflow-auto rounded-2xl border border-border bg-muted/20 lg:block"
              style="
                background-image:
                  linear-gradient(to right, rgba(120, 120, 120, 0.12) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(120, 120, 120, 0.12) 1px, transparent 1px);
                background-size: 24px 24px;
              "
            >
              <div class="relative min-h-[620px] min-w-[760px]">
                <button
                  v-for="table in tables"
                  :key="table.id"
                  type="button"
                  class="absolute flex min-h-12 min-w-12 flex-col items-center justify-center border-2 text-center shadow-sm transition-all hover:z-10 hover:scale-[1.03] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                  :class="[
                    table.shape === 'Circle' ? 'rounded-full' : 'rounded-xl',
                    tableOperationalMeta(occupancy.get(table.id)).surface,
                    occupancy.get(table.id) ? 'shadow-card' : '',
                  ]"
                  :style="{
                    left: table.x + 'px',
                    top: table.y + 'px',
                    width: table.width + 'px',
                    height: table.height + 'px',
                    transform: 'rotate(' + table.rotation + 'deg)',
                  }"
                  :data-testid="'restaurant-table-map-' + table.id"
                  data-pos-target="primary"
                  @click="selectTable(table)"
                >
                  <span class="px-1 text-xs font-black leading-none">{{ table.name }}</span>
                  <span v-if="occupancy.get(table.id)" class="mt-1 text-xs font-bold tabular-nums">
                    {{ formatCZK(occupancy.get(table.id)!.total) }}
                  </span>
                  <span class="mt-1 text-xs font-bold">
                    {{ tableOperationalMeta(occupancy.get(table.id)).label }}
                  </span>
                </button>
              </div>
            </div>

            <aside
              class="hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:flex"
              aria-label="Otevřené účty"
            >
              <div class="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 class="font-bold">Otevřené účty</h2>
                  <p class="text-xs text-muted-foreground">Nejstarší nahoře</p>
                </div>
                <span class="rounded-full bg-muted px-2.5 py-1 text-xs font-bold tabular-nums">{{
                  openAccountRows.length
                }}</span>
              </div>
              <div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                <button
                  v-for="row in openAccountRows"
                  :key="row.order.id"
                  type="button"
                  class="flex min-h-16 w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-pos-target="primary"
                  @click="selectTable(row.table!)"
                >
                  <span
                    class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground"
                    >{{ row.table!.name.slice(0, 2) }}</span
                  >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-bold">{{ row.table!.name }}</span>
                    <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 class="h-3.5 w-3.5" /> {{ elapsedMinutes(row.order.openedAt) }} min
                    </span>
                  </span>
                  <span class="font-black tabular-nums">{{ formatCZK(row.order.total) }}</span>
                </button>
                <div
                  v-if="!openAccountRows.length"
                  class="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
                >
                  Žádné otevřené účty.
                </div>
              </div>
            </aside>
          </div>

          <div v-else class="grid h-full place-items-center p-4">
            <div
              class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
            >
              V této místnosti nejsou stoly.
            </div>
          </div>
        </section>

        <section
          v-else-if="currentOrder"
          data-testid="restaurant-order-view"
          class="relative flex h-full min-h-0 flex-col overflow-hidden bg-muted/20 lg:grid lg:grid-cols-[var(--pos-category)_minmax(22rem,1fr)_var(--pos-order)] xl:grid-cols-[10rem_minmax(28rem,1fr)_var(--pos-order-xl)]"
          aria-label="Objednávka na stole"
        >
          <nav
            data-testid="restaurant-category-strip"
            class="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-card p-2 lg:min-h-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:border-b-0 lg:border-r"
            aria-label="Kategorie produktů"
          >
            <button
              type="button"
              class="h-12 shrink-0 rounded-xl px-4 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-14 lg:w-full"
              :class="
                selectedCat === ''
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background hover:bg-muted'
              "
              :aria-pressed="selectedCat === ''"
              data-pos-target="secondary"
              @click="selectedCat = ''"
            >
              Vše
            </button>
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              class="h-12 shrink-0 rounded-xl px-4 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-14 lg:w-full"
              :class="
                selectedCat === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background hover:bg-muted'
              "
              :aria-pressed="selectedCat === category.id"
              data-pos-target="secondary"
              @click="selectedCat = category.id"
            >
              <span class="block max-w-28 truncate">{{ category.name }}</span>
            </button>
          </nav>

          <div
            data-testid="restaurant-product-browser"
            class="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3 lg:p-4"
          >
            <div class="relative mb-3 shrink-0">
              <Search
                class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                v-model="productQuery"
                type="search"
                class="h-12 rounded-xl bg-card pl-12 pr-12 text-base"
                placeholder="Hledat podle názvu, skladového nebo čárového kódu…"
                aria-label="Hledat produkt"
                data-testid="restaurant-product-search"
              />
              <button
                v-if="productQuery"
                type="button"
                class="absolute right-0 top-0 grid h-12 w-12 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Vymazat hledání"
                data-pos-target="secondary"
                @click="productQuery = ''"
              >
                <X class="h-5 w-5" />
              </button>
            </div>

            <div
              v-if="products.length === 0"
              class="grid min-h-0 flex-1 place-items-center rounded-2xl border border-dashed border-border bg-card"
            >
              <div class="p-8 text-center text-muted-foreground">
                <Package class="mx-auto h-10 w-10" />
                <p class="mt-3 text-sm">Žádné produkty. Přidejte je v sekci Sklad.</p>
              </div>
            </div>

            <div
              v-else-if="visibleProducts.length"
              data-testid="restaurant-product-grid"
              class="grid min-h-0 flex-1 auto-rows-[6.5rem] grid-cols-2 gap-2 overflow-y-auto pb-24 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3 lg:pb-0 xl:grid-cols-4 2xl:grid-cols-5"
            >
              <button
                v-for="product in visibleProducts"
                :key="product.id"
                type="button"
                :disabled="busy"
                class="flex min-h-[6.5rem] flex-col justify-between rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:border-primary hover:bg-primary-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                :data-testid="'restaurant-product-' + product.id"
                data-pos-target="primary"
                @click="addProduct(product)"
              >
                <span class="line-clamp-2 text-sm font-bold leading-tight">{{ product.name }}</span>
                <span class="text-base font-black text-primary tabular-nums">{{
                  formatCZK(product.salePrice)
                }}</span>
              </button>
            </div>

            <div
              v-else
              class="grid min-h-0 flex-1 place-items-center rounded-2xl border border-dashed border-border bg-card"
              data-testid="restaurant-products-empty"
            >
              <div class="max-w-xs p-8 text-center">
                <Search class="mx-auto h-9 w-9 text-muted-foreground" />
                <p class="mt-3 font-bold">Nic jsme nenašli</p>
                <p class="mt-1 text-sm text-muted-foreground">
                  Zkuste jiné slovo nebo všechny kategorie.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  class="mt-4 h-12"
                  data-pos-target="secondary"
                  @click="resetProductFilters"
                >
                  Zrušit filtry
                </Button>
              </div>
            </div>
          </div>

          <div
            v-if="mobileAccountOpen"
            class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
            @click="mobileAccountOpen = false"
          />

          <aside
            data-testid="restaurant-order-panel"
            class="min-h-0 flex-col overflow-hidden border-l border-border bg-card shadow-2xl lg:static lg:z-auto lg:flex lg:shadow-none"
            :class="
              mobileAccountOpen
                ? 'fixed inset-x-2 bottom-24 top-20 z-50 flex rounded-2xl border border-border'
                : 'hidden'
            "
            aria-label="Účet"
          >
            <div class="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
              <div class="min-w-0 flex-1">
                <h2 class="truncate font-black">Účet · {{ selectedTable?.name }}</h2>
                <p class="text-xs text-muted-foreground">
                  {{ currentItemCount }} položek · {{ currentOrderElapsed }} min
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                class="h-12 w-12 p-0 lg:hidden"
                aria-label="Zavřít účet"
                data-pos-target="secondary"
                @click="mobileAccountOpen = false"
              >
                <X class="h-5 w-5" />
              </Button>
            </div>

            <div
              v-if="!currentOrder.items.length"
              class="grid min-h-0 flex-1 place-items-center p-8 text-center text-sm text-muted-foreground"
            >
              Klepnutím na produkt ho přidáte.
            </div>

            <div
              v-else
              data-testid="restaurant-order-items"
              class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <section v-for="group in orderCourseGroups" :key="group.key">
                <div
                  v-if="group.label"
                  class="sticky top-0 z-10 flex items-center gap-2 border-y border-border bg-muted/95 px-3 py-2 backdrop-blur"
                  :data-testid="'restaurant-course-' + group.key"
                >
                  <span
                    class="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-foreground"
                  >
                    {{ group.label }}
                  </span>
                  <span class="h-px flex-1 bg-border" aria-hidden="true" />
                </div>
                <div
                  v-for="item in group.items"
                  :key="item.id"
                  class="border-b border-border p-3"
                  :data-testid="'restaurant-order-item-' + item.id"
                >
                  <div class="flex items-start gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-bold leading-tight">
                        {{ item.name
                        }}<span v-if="item.variantName"> · {{ item.variantName }}</span>
                      </div>
                      <div class="mt-1 text-xs text-muted-foreground tabular-nums">
                        {{ formatCZK(item.unitPrice) }} × {{ item.quantity }}
                        <span
                          v-if="item.kitchenStatus !== 'New'"
                          class="ml-1 rounded-md bg-muted px-1.5 py-0.5 font-semibold text-foreground"
                          >v kuchyni</span
                        >
                      </div>
                    </div>
                    <div class="shrink-0 text-sm font-black tabular-nums">
                      {{ formatCZK(item.lineTotal) }}
                    </div>
                  </div>

                  <div v-if="item.modifiers?.length || item.note" class="mt-1.5 space-y-1">
                    <div
                      v-for="(modifier, index) in item.modifiers ?? []"
                      :key="item.id + '-' + modifier.groupName + '-' + modifier.name + '-' + index"
                      class="text-xs text-muted-foreground"
                    >
                      ↳ {{ modifier.groupName }}: {{ modifier.name }}
                      <span v-if="modifier.priceDelta" class="tabular-nums"
                        >({{ modifier.priceDelta > 0 ? '+' : ''
                        }}{{ formatCZK(modifier.priceDelta) }})</span
                      >
                    </div>
                    <div
                      v-if="item.note"
                      class="flex items-start gap-1.5 rounded-lg border border-sun bg-sun/10 px-2 py-1.5 text-xs font-semibold text-foreground"
                    >
                      <StickyNote class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{{ item.note }}</span>
                    </div>
                  </div>

                  <div
                    v-if="item.kitchenStatus === 'New'"
                    class="mt-2 flex items-center justify-end gap-1.5"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      class="h-12 px-3"
                      :disabled="busy"
                      :aria-label="'Upravit poznámku a chod položky ' + item.name"
                      data-pos-target="secondary"
                      @click="openItemMeta(item)"
                    >
                      <StickyNote class="h-4 w-4" />
                      <span class="text-xs font-bold">Poznámka · chod</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      class="h-12 w-12"
                      :disabled="busy"
                      :aria-label="'Ubrat kus položky ' + item.name"
                      data-pos-target="secondary"
                      @click="changeQty(item, item.quantity - 1)"
                    >
                      <Minus class="h-4 w-4" />
                    </Button>
                    <span class="w-8 text-center font-black tabular-nums">{{ item.quantity }}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      class="h-12 w-12"
                      :disabled="busy"
                      :aria-label="'Přidat kus položky ' + item.name"
                      data-pos-target="secondary"
                      @click="changeQty(item, item.quantity + 1)"
                    >
                      <Plus class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </section>
            </div>

            <div class="shrink-0 border-t border-border bg-card p-3">
              <div v-if="pricePreviewLoading" class="mb-2 text-xs text-muted-foreground">
                Ověřuji výslednou cenu…
              </div>
              <div v-if="totals?.discountAmount" class="mb-1 flex justify-between text-sm">
                <span class="text-muted-foreground">Sleva</span>
                <span class="font-bold text-primary tabular-nums"
                  >−{{ formatCZK(totals.discountAmount) }}</span
                >
              </div>
              <div v-if="promoDiscount" class="mb-1 flex justify-between text-sm">
                <span class="text-muted-foreground">Akce</span>
                <span class="font-bold text-primary tabular-nums"
                  >−{{ formatCZK(promoDiscount) }}</span
                >
              </div>
              <div class="mb-3 flex items-end justify-between gap-3">
                <span class="text-sm font-semibold text-muted-foreground">Celkem</span>
                <span
                  data-testid="restaurant-total-main"
                  class="text-2xl font-black tabular-nums"
                  >{{ formatCZK(checkoutTotal) }}</span
                >
              </div>

              <div class="mb-2 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  class="h-12"
                  data-pos-target="secondary"
                  @click="accountAdjustmentsOpen = true"
                >
                  <SlidersHorizontal class="h-4 w-4" /> Úpravy
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  class="h-12"
                  data-pos-target="secondary"
                  @click="moreActionsOpen = true"
                >
                  <MoreHorizontal class="h-5 w-5" /> Další
                </Button>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  class="h-14"
                  :disabled="busy || !hasNewItems"
                  data-pos-target="primary"
                  @click="sendToKitchen"
                >
                  <ChefHat class="h-5 w-5" /> Odeslat na stanice
                </Button>
                <Button
                  type="button"
                  variant="coral"
                  class="h-14"
                  :disabled="busy || pricePreviewLoading || !currentOrder.items.length"
                  data-pos-target="primary"
                  data-testid="restaurant-pay-desktop"
                  @click="openPayment()"
                >
                  <Banknote class="h-5 w-5" /> Zaplatit
                </Button>
              </div>
            </div>
          </aside>

          <div
            data-testid="restaurant-mobile-actions"
            class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 pt-2 shadow-2xl backdrop-blur lg:hidden"
            style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
            role="region"
            aria-label="Akce účtu"
          >
            <div class="mx-auto flex max-w-3xl items-center gap-2">
              <button
                type="button"
                class="min-w-0 flex-1 rounded-xl px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-pos-target="secondary"
                @click="mobileAccountOpen = true"
              >
                <span class="block truncate text-xs font-semibold text-muted-foreground"
                  >Účet · {{ selectedTable?.name }}</span
                >
                <span
                  data-testid="restaurant-total-mobile"
                  class="block truncate text-lg font-black tabular-nums"
                  >{{ formatCZK(checkoutTotal) }}</span
                >
              </button>
              <Button
                v-if="hasNewItems"
                type="button"
                variant="outline"
                class="h-14 shrink-0"
                :disabled="busy"
                aria-label="Odeslat na stanice"
                data-pos-target="primary"
                @click="sendToKitchen"
              >
                <ChefHat class="h-5 w-5" /><span class="hidden min-[390px]:inline">Odeslat</span>
              </Button>
              <Button
                type="button"
                variant="coral"
                class="h-14 shrink-0 px-5"
                :disabled="busy || pricePreviewLoading || !currentOrder.items.length"
                data-pos-target="primary"
                data-testid="restaurant-pay-mobile"
                @click="openPayment()"
              >
                <Banknote class="h-5 w-5" /> Zaplatit
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Sheet v-model:open="accountAdjustmentsOpen">
        <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Úpravy účtu</SheetTitle>
            <SheetDescription>Cenová hladina, zákazník, sleva a spropitné.</SheetDescription>
          </SheetHeader>
          <div class="space-y-5 px-4 pb-8">
            <div v-if="priceLevels.length" class="space-y-2">
              <Label>Cenová hladina</Label>
              <Select v-model="selectedPriceLevelId" :disabled="busy">
                <SelectTrigger class="h-12 w-full"
                  ><SelectValue placeholder="Běžná cena"
                /></SelectTrigger>
                <SelectContent>
                  <SelectItem class="min-h-12 px-3 text-base" :value="STANDARD_PRICE_LEVEL"
                    >Běžná cena</SelectItem
                  >
                  <SelectItem
                    v-for="level in priceLevels"
                    :key="level.id"
                    class="min-h-12 px-3 text-base"
                    :value="level.id"
                    >{{ level.name }} ({{ level.adjustmentPercent }} %)</SelectItem
                  >
                </SelectContent>
              </Select>
            </div>

            <div v-if="loyaltyEnabled && loyaltyCustomers.length" class="space-y-2">
              <Label class="inline-flex items-center gap-2"
                ><UserRound class="h-4 w-4" /> Zákazník</Label
              >
              <Select v-model="selectedCustomerId" :disabled="busy">
                <SelectTrigger class="h-12 w-full"
                  ><SelectValue placeholder="Bez zákazníka"
                /></SelectTrigger>
                <SelectContent>
                  <SelectItem class="min-h-12 px-3 text-base" :value="NO_CUSTOMER"
                    >Bez zákazníka</SelectItem
                  >
                  <SelectItem
                    v-for="customer in loyaltyCustomers"
                    :key="customer.id"
                    class="min-h-12 px-3 text-base"
                    :value="customer.id"
                  >
                    {{ customer.name }} · {{ customer.loyaltyPoints }} b
                  </SelectItem>
                </SelectContent>
              </Select>

              <div v-if="selectedCustomer" class="rounded-xl border border-border bg-muted/30 p-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">Dostupné body</span>
                  <span class="font-bold tabular-nums">{{ selectedCustomer.loyaltyPoints }}</span>
                </div>
                <div class="mt-3 flex items-center gap-2">
                  <Label for="restaurant-redeem" class="min-w-0 flex-1">Uplatnit body</Label>
                  <Input
                    id="restaurant-redeem"
                    v-model.number="redeemPoints"
                    type="number"
                    min="0"
                    :max="maxRedeemPoints"
                    class="h-12 w-28 text-right"
                    :disabled="busy || maxRedeemPoints === 0"
                  />
                </div>
                <div class="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Max {{ maxRedeemPoints }} b</span>
                  <span v-if="redeemDiscount" class="font-bold text-primary"
                    >−{{ formatCZK(redeemDiscount) }}</span
                  >
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <Label for="restaurant-discount">Sleva na účet v procentech</Label>
              <div class="relative">
                <Input
                  id="restaurant-discount"
                  v-model.number="accountDiscountPercent"
                  type="number"
                  min="0"
                  max="100"
                  class="h-12 pr-10 text-right text-base"
                  :disabled="busy"
                />
                <span
                  class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  >%</span
                >
              </div>
            </div>

            <div class="space-y-2">
              <Label for="restaurant-tip">Spropitné</Label>
              <div class="relative">
                <Input
                  id="restaurant-tip"
                  v-model.number="tipAmount"
                  type="number"
                  min="0"
                  class="h-12 pr-12 text-right text-base"
                  :disabled="busy"
                />
                <span
                  class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  >Kč</span
                >
              </div>
              <div class="grid grid-cols-4 gap-2">
                <Button
                  v-for="percent in TIP_PRESETS"
                  :key="percent"
                  type="button"
                  variant="outline"
                  class="h-12"
                  :disabled="busy"
                  @click="setTipPercent(percent)"
                >
                  {{ percent }} %
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  class="col-span-4 h-12"
                  :disabled="busy"
                  @click="tipAmount = 0"
                  >Bez spropitného</Button
                >
              </div>
            </div>

            <div
              v-if="
                selectedPriceLevel ||
                priceLevelAdjustment ||
                promoDiscount ||
                redeemDiscount ||
                pricePreviewError
              "
              class="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm"
            >
              <div v-if="selectedPriceLevel" class="flex justify-between gap-2">
                <span class="text-muted-foreground">{{ selectedPriceLevel.name }}</span>
                <span class="font-bold tabular-nums">{{
                  formatPriceLevelImpact(priceLevelAdjustment)
                }}</span>
              </div>
              <div v-if="promoDiscount" class="flex justify-between gap-2">
                <span class="text-muted-foreground">Akce</span>
                <span class="font-bold text-primary tabular-nums"
                  >−{{ formatCZK(promoDiscount) }}</span
                >
              </div>
              <div v-if="redeemDiscount" class="flex justify-between gap-2">
                <span class="text-muted-foreground">Body</span>
                <span class="font-bold text-primary tabular-nums"
                  >−{{ formatCZK(redeemDiscount) }}</span
                >
              </div>
              <p v-if="pricePreviewError" class="text-xs text-muted-foreground">
                Náhled není dostupný; výsledná cena se ověří před platbou.
              </p>
            </div>

            <div
              class="flex items-center justify-between rounded-xl bg-primary p-4 text-primary-foreground"
            >
              <span class="font-semibold">Celkem</span>
              <span class="text-2xl font-black tabular-nums">{{ formatCZK(checkoutTotal) }}</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet v-model:open="moreActionsOpen">
        <SheetContent side="right" class="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Další akce</SheetTitle>
            <SheetDescription>Správa otevřeného účtu {{ selectedTable?.name }}.</SheetDescription>
          </SheetHeader>
          <div class="grid gap-2 px-4">
            <Button
              v-if="currentOrder?.items.length"
              type="button"
              variant="outline"
              class="h-14 justify-start"
              @click="openSplitActions"
            >
              <Users class="h-5 w-5" /> Rozdělit účet
            </Button>
            <Button
              type="button"
              variant="outline"
              class="h-14 justify-start"
              :disabled="busy"
              @click="openMoveDialog"
            >
              <ArrowLeftRight class="h-5 w-5" /> Přesunout na jiný stůl
            </Button>
            <Button
              type="button"
              variant="outline"
              class="h-14 justify-start"
              :disabled="busy"
              @click="openMergeDialog"
            >
              <Combine class="h-5 w-5" /> Sloučit s jiným účtem
            </Button>
            <div v-if="canCancelOrder" class="my-2 border-t border-border" />
            <Button
              v-if="canCancelOrder"
              type="button"
              variant="ghost"
              class="h-14 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              :disabled="busy"
              @click="openCancelConfirmation"
            >
              <Ban class="h-5 w-5" /> Zrušit účet
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </template>

    <!-- Poznámka a chod (jen dokud není položka odeslaná do kuchyně) -->
    <Dialog v-model:open="itemDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Poznámka a chod</DialogTitle>
          <DialogDescription>{{ editingItem?.name }}</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveItemMeta">
          <div class="space-y-2">
            <Label for="item-note">Poznámka pro kuchyni</Label>
            <Input id="item-note" v-model="itemNote" placeholder="bez cibule, dobře propečené…" />
          </div>
          <div class="space-y-2">
            <Label>Chod</Label>
            <p class="text-xs text-muted-foreground">
              Vybraný chod vytvoří na účtu i v kuchyni jednoduchý oddělovač.
            </p>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                :variant="itemCourse === null ? 'coral' : 'outline'"
                class="h-12 min-w-28 flex-1"
                @click="itemCourse = null"
              >
                Bez chodu
              </Button>
              <Button
                v-for="c in ORDER_COURSES"
                :key="c"
                type="button"
                :variant="itemCourse === c ? 'coral' : 'outline'"
                class="h-12 min-w-28 flex-1"
                @click="itemCourse = c"
              >
                {{ c }}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="itemDialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
              Uložit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Přesun účtu na jiný stůl -->
    <Dialog v-model:open="moveDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Přesunout účet</DialogTitle>
          <DialogDescription>Vyberte volný stůl, kam účet přesunout.</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button
            v-for="t in freeTables"
            :key="t.id"
            type="button"
            variant="outline"
            :disabled="busy"
            @click="moveOrder(t.id)"
          >
            {{ t.name }}
          </Button>
        </div>
        <p
          v-if="!freeTables.length"
          class="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
        >
          Na tomto patře teď není žádný volný stůl.
        </p>
        <DialogFooter>
          <Button type="button" variant="ghost" @click="moveDialogOpen = false">Zrušit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Sloučit účet — položky z vybraného stolu se přesunou na tento účet, druhý stůl se uvolní. -->
    <Dialog v-model:open="mergeDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Sloučit účet sem</DialogTitle>
          <DialogDescription>
            Nejdřív vyberte zdrojový stůl. Sloučení provedeme až po dalším potvrzení.
          </DialogDescription>
        </DialogHeader>
        <div v-if="!mergeCandidateTable" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button
            v-for="t in otherOccupiedTables"
            :key="t.id"
            type="button"
            variant="outline"
            class="h-16 flex-col py-2"
            :disabled="busy"
            @click="mergeCandidateTable = t"
          >
            <span class="font-semibold">{{ t.name }}</span>
            <span class="text-xs text-muted-foreground tabular-nums">{{
              formatCZK(occupancy.get(t.id)!.total)
            }}</span>
          </Button>
        </div>
        <p
          v-if="!mergeCandidateTable && !otherOccupiedTables.length"
          class="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
        >
          Není tu žádný další otevřený účet ke sloučení.
        </p>
        <div v-if="mergeCandidateTable" class="space-y-3">
          <div class="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <div class="flex items-center justify-center gap-3 text-lg font-black">
              <span>{{ mergeCandidateTable.name }}</span>
              <ArrowLeftRight class="h-5 w-5 text-muted-foreground" />
              <span>{{ selectedTable?.name }}</span>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">
              Zdrojový účet {{ formatCZK(occupancy.get(mergeCandidateTable.id)?.total ?? 0) }} se
              přesune na cílový účet {{ formatCZK(checkoutTotal) }}. Zdrojový stůl se uvolní.
            </p>
          </div>
          <p class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Rozdělení účtu se po sloučení resetuje a je potřeba ho nastavit znovu.
          </p>
        </div>
        <DialogFooter>
          <Button
            v-if="mergeCandidateTable"
            type="button"
            variant="ghost"
            class="h-12"
            :disabled="busy"
            @click="mergeCandidateTable = null"
          >
            Zpět
          </Button>
          <Button
            v-else
            type="button"
            variant="ghost"
            class="h-12"
            @click="mergeDialogOpen = false"
          >
            Zrušit
          </Button>
          <Button
            v-if="mergeCandidateTable"
            type="button"
            variant="coral"
            class="h-12"
            :disabled="busy"
            @click="mergeOrder(mergeCandidateTable.id)"
          >
            <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
            Sloučit účty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="cancelDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Zrušit účet {{ selectedTable?.name }}?</DialogTitle>
          <DialogDescription>
            Účet obsahuje {{ currentItemCount }} položek v hodnotě {{ formatCZK(checkoutTotal) }}.
            Tuto akci nelze vrátit zpět.
          </DialogDescription>
        </DialogHeader>
        <div
          data-testid="restaurant-cancel-dialog"
          class="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          Účet se uzavře jako zrušený a stůl se uvolní.
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            class="h-12"
            :disabled="busy"
            @click="cancelDialogOpen = false"
          >
            Ponechat účet
          </Button>
          <Button
            type="button"
            variant="destructive"
            class="h-12"
            :disabled="busy"
            data-testid="restaurant-confirm-cancel"
            @click="cancelOrder"
          >
            <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
            Zrušit účet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Rozdělit účet — přiřazení položek (i po částech) osobám a platba vybrané osoby. -->
    <Dialog v-model:open="splitDialogOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rozdělit účet</DialogTitle>
          <DialogDescription>
            Ťukni u položky na osoby, které ji platí — cena se rozdělí rovným dílem. U osoby pak
            můžeš zaplatit její část hotově nebo kartou.
          </DialogDescription>
        </DialogHeader>

        <div class="flex flex-wrap items-center gap-2">
          <div
            v-for="g in splitGroups"
            :key="g.id"
            class="flex items-center gap-1 rounded-lg border border-border py-1 pl-2 pr-1"
          >
            <Input v-model="g.label" class="h-7 w-24 border-0 px-1 text-sm shadow-none" />
            <span class="whitespace-nowrap text-xs text-muted-foreground tabular-nums">{{
              formatCZK(groupTotal(g))
            }}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="h-12 w-12"
              aria-label="Zaplatit tuto část"
              :disabled="busy || splitPaymentItems(g).length === 0"
              @click="openPayment(g)"
            >
              <Banknote class="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="h-12 w-12"
              aria-label="Odebrat osobu"
              @click="removeSplitGroup(g.id)"
            >
              <Trash2 class="h-3 w-3 text-destructive" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" @click="addSplitGroup">
            <Plus class="h-3.5 w-3.5" /> Přidat osobu
          </Button>
        </div>

        <div v-if="splitGroups.length" class="space-y-2">
          <div class="max-h-[45vh] space-y-2 overflow-y-auto rounded-lg border border-border p-2">
            <div
              v-for="it in currentOrder?.items ?? []"
              :key="it.id"
              class="rounded-lg border border-border p-2"
            >
              <div class="mb-2 flex items-center justify-between text-sm font-medium">
                <span>
                  {{ it.name }}
                  <span v-if="it.quantity > 1" class="text-muted-foreground"
                    >×{{ it.quantity }}</span
                  >
                </span>
                <span class="tabular-nums">{{ formatCZK(it.lineTotal) }}</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="g in splitGroups"
                  :key="g.id"
                  type="button"
                  class="inline-flex min-h-11 items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors"
                  :class="
                    isAssigned(g, it.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  "
                  :aria-pressed="isAssigned(g, it.id)"
                  @click="toggleItem(g, it.id)"
                >
                  <Check v-if="isAssigned(g, it.id)" class="h-3 w-3" />
                  {{ g.label }}
                </button>
                <span class="ml-1 text-xs text-muted-foreground">
                  {{
                    assignedCount(it.id) === 0
                      ? 'společné'
                      : assignedCount(it.id) === 1
                        ? 'celé'
                        : `rovným dílem · ${formatCZK(it.lineTotal / assignedCount(it.id))} / os.`
                  }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between px-1 text-sm">
            <span class="text-muted-foreground">Nepřiřazeno (společné)</span>
            <span class="tabular-nums font-medium">{{ formatCZK(unassignedSplitTotal) }}</span>
          </div>
        </div>
        <p
          v-else
          class="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
        >
          Přidejte alespoň jednu osobu, abyste mohli přiřazovat položky.
        </p>

        <DialogFooter>
          <Button type="button" variant="ghost" @click="splitDialogOpen = false">Zavřít</Button>
          <Button
            type="button"
            variant="coral"
            :disabled="savingSplit || !splitGroups.length"
            @click="saveSplit"
          >
            <Loader2 v-if="savingSplit" class="h-4 w-4 animate-spin" />
            Uložit rozdělení
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="unsentPaymentConfirmOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Nejdřív odeslat do kuchyně?</DialogTitle>
          <DialogDescription>
            Na účtu {{ selectedTable?.name }}
            {{
              newItemCount === 1
                ? 'je 1 neodeslaná položka'
                : `jsou ${newItemCount} neodeslané položky`
            }}. Při platbě bez odeslání je kuchyně ani bar neuvidí.
          </DialogDescription>
        </DialogHeader>
        <div class="rounded-xl border border-sun bg-sun/10 p-3 text-sm">
          Doporučeno: odešlete nové položky a potom pokračujte k platbě.
        </div>
        <DialogFooter class="gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            variant="coral"
            class="h-12 w-full"
            :disabled="busy"
            data-testid="restaurant-send-and-pay"
            @click="sendAndContinueToPayment"
          >
            <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
            <ChefHat v-else class="h-4 w-4" /> Odeslat a pokračovat k platbě
          </Button>
          <Button
            type="button"
            variant="outline"
            class="h-12 w-full"
            :disabled="busy"
            data-testid="restaurant-pay-without-sending"
            @click="continuePaymentWithoutSending"
          >
            Zaplatit bez odeslání
          </Button>
          <Button
            type="button"
            variant="ghost"
            class="h-12 w-full"
            :disabled="busy"
            @click="unsentPaymentConfirmOpen = false"
          >
            Vrátit se k účtu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Účtenka po zaplacení (náhled + tisk/PDF) -->
    <PaymentDialog
      v-model:open="paymentOpen"
      :total="paymentTotal"
      :label="paymentLabel"
      :busy="busy || pricePreviewLoading"
      @confirm="confirmPayment"
    />

    <ModifierSelectDialog
      v-model:open="modifierDialogOpen"
      :product="modifierDialogProduct"
      :groups="modifierGroups"
      :busy="busy"
      @confirm="addProductWithModifiers"
    />

    <ProductVariantSelectDialog
      v-model:open="variantDialogOpen"
      :product-name="variantProduct?.name ?? ''"
      :variants="variantsForProduct"
      :busy="busy"
      confirm-label="Pokračovat"
      @confirm="confirmVariant"
    />

    <ReceiptDialog v-model:open="receiptOpen" :receipt="receiptData" />
  </div>
</template>
