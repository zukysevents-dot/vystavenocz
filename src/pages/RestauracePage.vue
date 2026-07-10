<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
  Gift,
  UserRound,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PaymentDialog from '@/components/PaymentDialog.vue'
import ReceiptDialog from '@/components/ReceiptDialog.vue'
import ModifierSelectDialog from '@/components/app/ModifierSelectDialog.vue'
import ProductVariantSelectDialog, {
  type SelectableProductVariant,
} from '@/components/app/ProductVariantSelectDialog.vue'
import { buildReceipt, type ReceiptInfo } from '@/lib/receipt'
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
const visibleProducts = computed(() =>
  selectedCat.value
    ? products.value.filter((p) => p.categoryId === selectedCat.value)
    : products.value,
)

const loading = ref(true)
const busy = ref(false)
const mode = ref<'map' | 'order'>('map')

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

onMounted(async () => {
  auth.init()
  companyStore.init() // profil firmy (název/adresa) pro hlavičku účtenky
  if (!apiMode) {
    loading.value = false
    return
  }
  // Průběžně obnovuj otevřený účet (QR doobjednávky). refreshCurrentOrder si sám ohlídá, kdy je bezpečné načíst.
  accountRefreshTimer = setInterval(() => void refreshCurrentOrder(), 5000)
  try {
    await Promise.all([loadProducts(), refreshOpen(), loadPriceLevels(), loadLoyaltyCheckoutData()])
    categories.value = await categoriesApi.list()
    floors.value = await floorsApi.list()
    if (floors.value.length) currentFloorId.value = floors.value[0].id
    if (currentFloorId.value) await loadTables()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function loadTables() {
  tables.value = currentFloorId.value ? await tablesApi.listByFloor(currentFloorId.value) : []
}
async function refreshOpen() {
  openOrders.value = await ordersApi.listOpen()
}
// Host může přes QR doobjednat do otevřeného účtu (backend připíše položky ke stejnému účtu stolu). Aby obsluha
// platila podle skutečného stavu, průběžně (interval) i před platbou znovu načteme aktuální účet ze serveru.
async function refreshCurrentOrder() {
  const order = currentOrder.value
  if (!order || busy.value) return
  // Neruš aktivní dialog (částka k platbě / rozdělení účtu) — změna položek pod rukama by mátla.
  if (paymentOpen.value || splitDialogOpen.value || modifierDialogOpen.value) return
  try {
    const fresh = await ordersApi.get(order.id)
    // Obsluha mohla mezitím přepnout stůl nebo spustit akci — aplikuj jen na stále tentýž, needitovaný účet.
    if (currentOrder.value?.id !== order.id || busy.value) return
    if (fresh.status !== 'Open') {
      // Účet mezitím uzavřel/zrušil jiný terminál nebo host doplatil přes QR — zpět na mapu.
      toast.info('Účet byl mezitím uzavřen.')
      await refreshOpen()
      backToMap()
      return
    }
    // Jen položky/total; lokální slevu/tip (accountDiscountPercent/tipAmount) nepřepisujeme, ať nezrušíme editaci.
    currentOrder.value = fresh
  } catch (e) {
    console.error(e) // tiché selhání — další kolo intervalu to zkusí znovu
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
onBeforeUnmount(() => {
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

// --- Poznámka a chod položky (dokud není odeslaná do kuchyně) ---
const COURSES = ['1. chod', '2. chod', '3. chod'] as const
const itemDialogOpen = ref(false)
const editingItem = ref<OrderItemLine | null>(null)
const itemNote = ref('')
const itemCourse = ref<string | null>(null)

function openItemMeta(item: OrderItemLine) {
  editingItem.value = item
  itemNote.value = item.note ?? ''
  itemCourse.value = item.course
  itemDialogOpen.value = true
}

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
    const updated = await ordersApi.payItems(
      orderId,
      method,
      items,
      cashReceived,
      activePriceLevelId.value,
    )
    currentOrder.value = updated
    syncDiscountFromOrder(updated)
    splitGroups.value = []
    splitDialogOpen.value = false
    if (receipt) {
      const change = cashReceived != null ? round2(cashReceived - receipt.total) : null
      paymentOpen.value = false // zavřít PŘED otevřením účtenky — dva otevřené dialogy zamykaly stránku
      receiptData.value = buildReceipt({
        company: companyStore.company,
        items: receipt.items,
        discountPercent: accountDiscountPercent.value,
        discountAmount: receipt.discountAmount,
        tipAmount: receipt.tipAmount,
        total: receipt.total,
        method,
        id: orderId,
        table: tableName,
        cashReceived,
        cashChange: change,
      })
      receiptOpen.value = true
    }
    toast.success(`Zaplaceno ${formatCZK(receipt?.total ?? 0)} za ${group.label}.`)
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
// null = platba celého účtu; jinak platba části za osobu z rozdělení účtu.
const paymentSplitGroup = ref<OrderSplitGroup | null>(null)
const paymentTotal = computed(() =>
  paymentSplitGroup.value ? splitCheckoutTotal(paymentSplitGroup.value) : checkoutTotal.value,
)
const paymentLabel = computed(() =>
  paymentSplitGroup.value ? paymentSplitGroup.value.label : selectedTable.value?.name,
)

async function openPayment(group: OrderSplitGroup | null = null) {
  // Platba celého účtu: napřed natáhni aktuální stav — host mohl QR doobjednat, obsluha musí platit podle reality.
  // (Split platba se neobnovuje: rozdělení účtu vychází ze známých položek a refresh by ho rozhodil.)
  if (group === null) {
    await refreshCurrentOrder()
    await refreshPricePreview()
    if (!pricingReady.value) {
      toast.error('Cenu se nepodařilo ověřit na serveru. Zkuste platbu znovu.')
      return
    }
  }
  if (!currentOrder.value) return // účet se mezitím zavřel a refresh nás vrátil na mapu
  paymentSplitGroup.value = group
  await refreshSplitPricePreview(group)
  if (
    group &&
    apiMode &&
    loyaltyEnabled.value &&
    (splitPricePreviewGroupId.value !== group.id || !splitPricePreview.value)
  ) {
    toast.error('Cenu vybrané části se nepodařilo ověřit na serveru. Zkuste platbu znovu.')
    return
  }
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
      toast.error('Cenu vybrané části se nepodařilo ověřit na serveru. Zkuste platbu znovu.')
      return
    }
  } else {
    await refreshPricePreview()
    if (!pricingReady.value) {
      toast.error('Cenu se nepodařilo ověřit na serveru. Zkuste platbu znovu.')
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
// Zdrojoví kandidáti = ostatní obsazené stoly na aktuálním patře (vyjma tohoto účtu).
const otherOccupiedTables = computed(() =>
  tables.value.filter((t) => occupancy.value.has(t.id) && t.id !== selectedTable.value?.id),
)

async function mergeOrder(sourceTableId: string) {
  if (!currentOrder.value || busy.value) return
  const source = occupancy.value.get(sourceTableId)
  if (!source) return
  busy.value = true
  try {
    // currentOrder = cíl; zdrojový účet se do něj sloučí a jeho stůl se uvolní.
    // Backend zdroj nastaví na Cancelled a na cíli resetuje split (rozdělení účtu).
    currentOrder.value = await ordersApi.merge(currentOrder.value.id, source.id)
    syncDiscountFromOrder(currentOrder.value) // sleva/spropitné zůstávají na cílovém účtu
    await refreshOpen() // zdrojový stůl zmizí jako obsazený
    mergeDialogOpen.value = false
    toast.success('Účty sloučeny. Rozdělení účtu (split) je potřeba nastavit znovu.')
  } catch (e) {
    // 404/409 = zdrojový nebo cílový účet mezitím zaplatil/zrušil jiný terminál.
    if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
      toast.error('Účet mezitím zaplatil nebo zrušil jiný terminál.')
      await refreshOpen()
    } else {
      toast.error('Sloučení účtů selhalo.')
    }
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function sendToKitchen() {
  if (!currentOrder.value || busy.value) return
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
  } catch (e) {
    if (await handleAccountClosedElsewhere(e)) return
    toast.error('Odeslání objednávky selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
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
    if (e instanceof ApiError && e.status === 422 && cashReceived != null) {
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

async function cancelOrder() {
  if (!currentOrder.value || busy.value) return
  busy.value = true
  try {
    await ordersApi.cancel(currentOrder.value.id)
    toast.success('Účet zrušen.')
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
const currentItemCount = computed(() =>
  (currentOrder.value?.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
)
</script>

<template>
  <div class="p-4 sm:p-6" :class="mode === 'order' && currentOrder ? 'pb-28 lg:pb-6' : ''">
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <Package class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Restaurace potřebuje připojení k serveru</p>
    </div>

    <div v-else-if="loading" class="flex justify-center p-12">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <!-- MAPA s obsazeností -->
    <template v-else-if="mode === 'map'">
      <h1 class="mb-1 text-2xl font-bold tracking-tight">Restaurace</h1>
      <p class="mb-4 text-sm text-muted-foreground">Klepněte na stůl — otevře nebo zobrazí účet.</p>

      <div v-if="!floors.length" class="rounded-2xl border border-border bg-card p-8 text-center">
        <p class="font-semibold">Zatím žádná mapa stolů</p>
        <p class="mt-1 text-sm text-muted-foreground">Vytvořte mapu v sekci „Mapa stolů".</p>
      </div>

      <template v-else>
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            v-for="f in floors"
            :key="f.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              currentFloorId === f.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            "
            @click="currentFloorId = f.id"
          >
            {{ f.name }}
          </button>
        </div>

        <div v-if="tables.length" class="grid gap-2 lg:hidden">
          <button
            v-for="t in tables"
            :key="t.id"
            type="button"
            class="flex min-h-16 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors active:scale-[0.99]"
            :class="
              occupancy.get(t.id)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:border-primary'
            "
            @click="selectTable(t)"
          >
            <span class="min-w-0">
              <span class="block truncate font-semibold">{{ t.name }}</span>
              <span
                class="mt-0.5 block text-xs"
                :class="
                  occupancy.get(t.id) ? 'text-primary-foreground/80' : 'text-muted-foreground'
                "
              >
                {{ occupancy.get(t.id) ? 'obsazeno' : 'volný' }}
              </span>
            </span>
            <span class="shrink-0 text-sm font-bold tabular-nums">
              {{ occupancy.get(t.id) ? formatCZK(occupancy.get(t.id)!.total) : '—' }}
            </span>
          </button>
        </div>

        <div
          v-if="tables.length"
          class="relative hidden min-h-[560px] overflow-hidden rounded-2xl border border-border bg-muted/20 lg:block"
          style="
            background-image:
              linear-gradient(to right, rgba(120, 120, 120, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(120, 120, 120, 0.12) 1px, transparent 1px);
            background-size: 24px 24px;
          "
        >
          <button
            v-for="t in tables"
            :key="t.id"
            type="button"
            class="absolute flex flex-col items-center justify-center border-2 text-center shadow-sm transition-colors"
            :class="[
              t.shape === 'Circle' ? 'rounded-full' : 'rounded-lg',
              occupancy.get(t.id)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:border-primary',
            ]"
            :style="{
              left: t.x + 'px',
              top: t.y + 'px',
              width: t.width + 'px',
              height: t.height + 'px',
              transform: `rotate(${t.rotation}deg)`,
            }"
            @click="selectTable(t)"
          >
            <span class="px-1 text-xs font-semibold leading-none">{{ t.name }}</span>
            <span v-if="occupancy.get(t.id)" class="mt-1 text-[10px] font-bold">
              {{ formatCZK(occupancy.get(t.id)!.total) }}
            </span>
            <span v-else class="mt-1 text-[10px] text-muted-foreground">volný</span>
          </button>
        </div>

        <div
          v-else
          class="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          V této místnosti nejsou stoly.
        </div>
      </template>
    </template>

    <!-- ÚČET na stole -->
    <template v-else-if="currentOrder">
      <div class="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Zpět na mapu stolů" @click="backToMap"
          ><ArrowLeft class="h-5 w-5"
        /></Button>
        <h1 class="text-2xl font-bold tracking-tight">Účet — {{ selectedTable?.name }}</h1>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1fr_360px]">
        <!-- Dlaždice produktů -->
        <div class="rounded-2xl border border-border bg-card p-4">
          <div
            v-if="products.length === 0"
            class="flex flex-col items-center p-12 text-center text-muted-foreground"
          >
            <Package class="h-10 w-10" />
            <p class="mt-3 text-sm">Žádné produkty. Přidejte je v sekci Sklad.</p>
          </div>
          <template v-else>
            <div v-if="categories.length" class="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                :class="
                  selectedCat === ''
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                "
                @click="selectedCat = ''"
              >
                Vše
              </button>
              <button
                v-for="c in categories"
                :key="c.id"
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                :class="
                  selectedCat === c.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                "
                @click="selectedCat = c.id"
              >
                {{ c.name }}
              </button>
            </div>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                v-for="p in visibleProducts"
                :key="p.id"
                type="button"
                :disabled="busy"
                class="flex min-h-20 flex-col justify-between rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft active:scale-[0.98] disabled:opacity-50"
                @click="addProduct(p)"
              >
                <span class="text-sm font-semibold leading-tight">{{ p.name }}</span>
                <span class="mt-1 text-sm font-bold text-primary tabular-nums">{{
                  formatCZK(p.salePrice)
                }}</span>
              </button>
            </div>
          </template>
        </div>

        <!-- Účet -->
        <div
          class="flex h-fit flex-col rounded-2xl border border-border bg-card lg:sticky lg:top-4"
        >
          <div class="border-b border-border p-4 font-semibold">Účet</div>

          <div
            v-if="!currentOrder.items.length"
            class="p-8 text-center text-sm text-muted-foreground"
          >
            Klepnutím na produkt ho přidáte.
          </div>
          <div v-else class="max-h-[40vh] divide-y divide-border overflow-y-auto">
            <div v-for="it in currentOrder.items" :key="it.id" class="flex items-center gap-2 p-3">
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium">
                  {{ it.name }}<span v-if="it.variantName"> · {{ it.variantName }}</span>
                </div>
                <div class="text-xs text-muted-foreground tabular-nums">
                  {{ formatCZK(it.unitPrice) }} × {{ it.quantity }}
                  <span
                    v-if="it.kitchenStatus !== 'New'"
                    class="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] text-foreground"
                    >v kuchyni</span
                  >
                </div>
                <div v-if="it.modifiers?.length || it.course || it.note" class="mt-1 space-y-0.5">
                  <div v-if="it.modifiers?.length" class="space-y-0.5">
                    <div
                      v-for="(modifier, index) in it.modifiers"
                      :key="`${it.id}-${modifier.groupName}-${modifier.name}-${index}`"
                      class="text-xs text-muted-foreground"
                    >
                      ↳ {{ modifier.groupName }}: {{ modifier.name }}
                      <span v-if="modifier.priceDelta" class="tabular-nums">
                        ({{ modifier.priceDelta > 0 ? '+' : ''
                        }}{{ formatCZK(modifier.priceDelta) }})
                      </span>
                    </div>
                  </div>
                  <span
                    v-if="it.course"
                    class="inline-block rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary"
                    >{{ it.course }}</span
                  >
                  <div v-if="it.note" class="text-xs text-muted-foreground">↳ {{ it.note }}</div>
                </div>
              </div>
              <div v-if="it.kitchenStatus === 'New'" class="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  title="Poznámka / chod"
                  :disabled="busy"
                  @click="openItemMeta(it)"
                >
                  <StickyNote class="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  class="h-8 w-8"
                  :disabled="busy"
                  aria-label="Ubrat kus"
                  @click="changeQty(it, it.quantity - 1)"
                >
                  <Minus class="h-3.5 w-3.5" />
                </Button>
                <span class="w-5 text-center tabular-nums">{{ it.quantity }}</span>
                <Button
                  variant="outline"
                  size="icon"
                  class="h-8 w-8"
                  :disabled="busy"
                  aria-label="Přidat kus"
                  @click="changeQty(it, it.quantity + 1)"
                >
                  <Plus class="h-3.5 w-3.5" />
                </Button>
              </div>
              <div class="w-16 text-right text-sm font-semibold tabular-nums">
                {{ formatCZK(it.lineTotal) }}
              </div>
            </div>
          </div>

          <div class="space-y-2 border-t border-border p-4">
            <div v-if="priceLevels.length" class="flex items-center justify-between gap-2">
              <span class="text-sm text-muted-foreground">Cenová hladina</span>
              <Select v-model="selectedPriceLevelId" :disabled="busy">
                <SelectTrigger class="h-8 w-44">
                  <SelectValue placeholder="Běžná cena" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="STANDARD_PRICE_LEVEL">Běžná cena</SelectItem>
                  <SelectItem v-for="level in priceLevels" :key="level.id" :value="level.id">
                    {{ level.name }} ({{ level.adjustmentPercent }} %)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div v-if="loyaltyEnabled && loyaltyCustomers.length" class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <UserRound class="h-3.5 w-3.5" /> Zákazník
                </span>
                <Select v-model="selectedCustomerId" :disabled="busy">
                  <SelectTrigger class="h-8 w-44">
                    <SelectValue placeholder="Bez zákazníka" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem :value="NO_CUSTOMER">Bez zákazníka</SelectItem>
                    <SelectItem
                      v-for="customer in loyaltyCustomers"
                      :key="customer.id"
                      :value="customer.id"
                    >
                      {{ customer.name }} · {{ customer.loyaltyPoints }} b
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div
                v-if="selectedCustomer"
                class="rounded-lg border border-border bg-muted/30 p-2 text-xs"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-muted-foreground">Body</span>
                  <span class="font-medium tabular-nums">{{ selectedCustomer.loyaltyPoints }}</span>
                </div>
                <div class="mt-2 flex items-center justify-between gap-2">
                  <span class="inline-flex items-center gap-1 text-muted-foreground">
                    <Gift class="h-3.5 w-3.5" /> Uplatnit
                  </span>
                  <div class="flex items-center gap-1">
                    <Input
                      v-model.number="redeemPoints"
                      type="number"
                      min="0"
                      :max="maxRedeemPoints"
                      class="h-7 w-20 px-1 text-right text-xs"
                      :disabled="busy || maxRedeemPoints === 0"
                      aria-label="Uplatnit věrnostní body"
                    />
                    <span class="text-muted-foreground">b</span>
                  </div>
                </div>
                <div class="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
                  <span>Max {{ maxRedeemPoints }} b</span>
                  <span v-if="redeemDiscount" class="text-primary tabular-nums"
                    >−{{ formatCZK(redeemDiscount) }}</span
                  >
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm text-muted-foreground">Sleva na účet</span>
              <div class="flex items-center">
                <Input
                  v-model.number="accountDiscountPercent"
                  type="number"
                  min="0"
                  max="100"
                  class="h-8 w-16 px-1 text-center"
                  :disabled="busy"
                  aria-label="Sleva na účet v procentech"
                />
                <span class="ml-1 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm text-muted-foreground">Spropitné</span>
              <div class="flex items-center gap-1">
                <Input
                  v-model.number="tipAmount"
                  type="number"
                  min="0"
                  class="h-8 w-20 px-1 text-right"
                  :disabled="busy"
                  aria-label="Spropitné v Kč"
                />
                <span class="text-xs text-muted-foreground">Kč</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <Button
                v-for="pct in TIP_PRESETS"
                :key="pct"
                type="button"
                variant="outline"
                size="sm"
                class="h-7 px-2 text-xs"
                :disabled="busy"
                @click="setTipPercent(pct)"
              >
                {{ pct }} %
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-7 px-2 text-xs text-muted-foreground"
                :disabled="busy"
                @click="tipAmount = 0"
              >
                Bez spropitného
              </Button>
            </div>
          </div>

          <div class="border-t border-border p-4">
            <div
              v-if="
                pricePreviewLoading ||
                pricePreviewError ||
                selectedPriceLevel ||
                priceLevelAdjustment ||
                promoDiscount
              "
              class="mb-3 space-y-1 rounded-lg border border-border bg-muted/30 p-2 text-xs"
            >
              <div v-if="pricePreviewLoading" class="text-muted-foreground">
                Počítám cenu na serveru…
              </div>
              <div v-if="selectedPriceLevel" class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">{{ selectedPriceLevel.name }}</span>
                <span
                  class="tabular-nums"
                  :class="priceLevelAdjustment >= 0 ? 'text-primary' : 'text-destructive'"
                >
                  {{ formatPriceLevelImpact(priceLevelAdjustment) }}
                </span>
              </div>
              <div v-if="promoDiscount" class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">Akce</span>
                <span class="tabular-nums text-primary">−{{ formatCZK(promoDiscount) }}</span>
              </div>
              <div v-if="redeemDiscount" class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">Body</span>
                <span class="tabular-nums text-primary">−{{ formatCZK(redeemDiscount) }}</span>
              </div>
              <div v-if="earnedPointsPreview" class="flex items-center justify-between gap-2">
                <span class="text-muted-foreground">Získá bodů</span>
                <span class="tabular-nums">+{{ earnedPointsPreview }}</span>
              </div>
              <div v-if="pricePreviewError" class="text-muted-foreground">
                Náhled ceny není dostupný, finální cenu dopočítá server při platbě.
              </div>
            </div>
            <div
              v-if="totals?.discountAmount"
              class="mb-1 flex items-center justify-between text-sm"
            >
              <span class="text-muted-foreground">Sleva</span>
              <span class="tabular-nums text-primary">−{{ formatCZK(totals.discountAmount) }}</span>
            </div>
            <div class="mb-3 flex items-center justify-between">
              <span class="text-sm text-muted-foreground">Celkem</span>
              <span class="text-2xl font-bold tabular-nums">{{ formatCZK(checkoutTotal) }}</span>
            </div>

            <Button
              v-if="hasNewItems"
              variant="outline"
              class="mb-2 w-full"
              :disabled="busy"
              @click="sendToKitchen"
            >
              <ChefHat class="h-4 w-4" /> Odeslat objednávku
            </Button>

            <Button
              variant="coral"
              size="lg"
              class="w-full"
              :disabled="busy || pricePreviewLoading || !currentOrder.items.length"
              @click="openPayment()"
            >
              <Banknote class="h-4 w-4" /> Zaplatit
            </Button>
            <Button
              v-if="currentOrder.items.length"
              variant="ghost"
              class="mt-2 w-full"
              :disabled="busy"
              @click="openSplitDialog"
            >
              <Users class="h-4 w-4" /> Rozdělit účet
            </Button>
            <Button
              v-if="freeTables.length"
              variant="ghost"
              class="mt-2 w-full"
              :disabled="busy"
              @click="moveDialogOpen = true"
            >
              <ArrowLeftRight class="h-4 w-4" /> Přesunout na jiný stůl
            </Button>
            <Button
              v-if="otherOccupiedTables.length"
              variant="ghost"
              class="mt-2 w-full"
              :disabled="busy"
              @click="mergeDialogOpen = true"
            >
              <Combine class="h-4 w-4" /> Sloučit s jiným účtem
            </Button>
            <Button
              variant="ghost"
              class="mt-2 w-full text-destructive"
              :disabled="busy"
              @click="cancelOrder"
            >
              <Ban class="h-4 w-4" /> Zrušit účet
            </Button>
          </div>
        </div>
      </div>

      <div
        class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur lg:hidden"
      >
        <div class="mx-auto flex max-w-3xl items-center gap-3">
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">{{ selectedTable?.name }}</div>
            <div class="text-xs text-muted-foreground">
              {{ currentItemCount }} {{ currentItemCount === 1 ? 'položka' : 'položek' }} ·
              {{ formatCZK(totals?.total ?? currentOrder.total) }}
            </div>
          </div>
          <Button
            v-if="hasNewItems"
            variant="outline"
            size="sm"
            class="shrink-0"
            :disabled="busy"
            @click="sendToKitchen"
          >
            <ChefHat class="h-4 w-4" /> Odeslat
          </Button>
          <Button
            variant="coral"
            size="sm"
            class="shrink-0"
            :disabled="busy || !currentOrder.items.length"
            @click="openPayment()"
          >
            <Banknote class="h-4 w-4" /> Zaplatit
          </Button>
        </div>
      </div>
    </template>

    <!-- Poznámka a chod položky (jen dokud není odeslaná do kuchyně) -->
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
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                :variant="itemCourse === null ? 'coral' : 'outline'"
                class="flex-1"
                @click="itemCourse = null"
              >
                Bez chodu
              </Button>
              <Button
                v-for="c in COURSES"
                :key="c"
                type="button"
                :variant="itemCourse === c ? 'coral' : 'outline'"
                class="flex-1"
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
            Vyberte stůl, jehož účet se sloučí na „{{ selectedTable?.name }}". Položky se přesunou
            na tento účet a druhý stůl se uvolní. Rozdělení účtu (split) je potřeba po sloučení
            nastavit znovu.
          </DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button
            v-for="t in otherOccupiedTables"
            :key="t.id"
            type="button"
            variant="outline"
            class="h-auto flex-col py-2"
            :disabled="busy"
            @click="mergeOrder(t.id)"
          >
            <span class="font-semibold">{{ t.name }}</span>
            <span class="text-xs text-muted-foreground tabular-nums">{{
              formatCZK(occupancy.get(t.id)!.total)
            }}</span>
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" @click="mergeDialogOpen = false">Zrušit</Button>
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
              class="h-6 w-6"
              title="Zaplatit tuto část"
              :disabled="busy || splitPaymentItems(g).length === 0"
              @click="openPayment(g)"
            >
              <Banknote class="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              title="Odebrat osobu"
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
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
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
