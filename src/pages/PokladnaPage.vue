<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Camera,
  Loader2,
  Minus,
  Plus,
  ScanBarcode,
  Search,
  Trash2,
  Banknote,
  ShoppingCart,
  Package,
  ReceiptText,
  RotateCcw,
  FileClock,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PaymentDialog from '@/components/PaymentDialog.vue'
import ReceiptDialog from '@/components/ReceiptDialog.vue'
import CameraScanner from '@/components/app/CameraScanner.vue'
import { useProducts } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import { useLocations } from '@/composables/useLocations'
import { useSales } from '@/composables/useSales'
import { usePromotions } from '@/composables/usePromotions'
import { formatCZK, round2 } from '@/lib/invoice'
import { findByEan } from '@/lib/reorder'
import { buildReceipt, type ReceiptInfo } from '@/lib/receipt'
import { calcPosTotals, clampAmount, clampPercent } from '@/lib/posCalc'
import { ApiError, isApiMode } from '@/lib/http'
import { isApprovalRequest } from '@/lib/types'
import type { PriceLevel, PromotionCalculation, PromotionLineInput } from '@/lib/promotions'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/components/ui/sonner'
import type { Category, DailySalesSummary, PaymentMethod, Product, Sale } from '@/lib/types'

const { products, load } = useProducts()
const categoriesApi = useCategories()
const { locations, load: loadLocations } = useLocations()
const sales = useSales()
const promotions = usePromotions()
const companyStore = useCompanyStore()
const auth = useAuthStore()

// Provozovna, na které pokladna prodává (kvůli uzávěrce per pobočku). Jedna pobočka → automaticky,
// víc → pokladní vybere, žádná → prodává se „bez pobočky" (uzávěrka po provozovnách pak nic neukáže).
// Výběr si pamatujeme, ať ho pokladní nemusí volit po každém načtení.
const POS_LOCATION_KEY = 'vystaveno.pos.locationId'
const currentLocationId = ref<string>('')
watch(currentLocationId, (id) => {
  if (id) localStorage.setItem(POS_LOCATION_KEY, id)
})

const loading = ref(true)
const paying = ref(false)
const apiMode = isApiMode()

// Účtenka po zaplacení (náhled + tisk/PDF).
const receiptOpen = ref(false)
const receiptData = ref<ReceiptInfo | null>(null)

const categories = ref<Category[]>([])
const selectedCat = ref('')
const scanEan = ref('')
const scanInput = ref<InstanceType<typeof Input> | null>(null)
const scannerOpen = ref(false)
const productSearch = ref('')
const visibleProducts = computed(() => {
  const q = productSearch.value.trim().toLocaleLowerCase('cs-CZ')
  return products.value.filter((p) => {
    if (selectedCat.value && p.categoryId !== selectedCat.value) return false
    if (!q) return true
    return [p.name, p.sku, p.ean ?? ''].some((value) =>
      value.toLocaleLowerCase('cs-CZ').includes(q),
    )
  })
})

interface CartLine {
  product: Product
  quantity: number
  discountPercent: number
}
const cart = ref<CartLine[]>([])

/** Sleva na řádek jako platné procento 0–100. */
function clampPct(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0
}
function lineTotal(l: CartLine): number {
  return l.product.salePrice * l.quantity * (1 - clampPct(l.discountPercent) / 100)
}

const itemCount = computed(() => cart.value.reduce((sum, l) => sum + l.quantity, 0))

// Sleva na účet (%) + spropitné (Kč) — nad rámec řádkové slevy, počítané společně přes posCalc.
const accountDiscountPercent = ref(0)
const tipAmount = ref(0)
const TIP_PRESETS = [10, 15, 20, 25] as const
const STANDARD_PRICE_LEVEL = 'standard'
const priceLevels = ref<PriceLevel[]>([])
const selectedPriceLevelId = ref(STANDARD_PRICE_LEVEL)
const pricePreview = ref<PromotionCalculation | null>(null)
const pricePreviewLoading = ref(false)
const pricePreviewError = ref(false)
let pricePreviewSeq = 0

const selectedPriceLevel = computed(
  () => priceLevels.value.find((level) => level.id === selectedPriceLevelId.value) ?? null,
)
const loyaltyEnabled = computed(() => auth.hasModule('loyalty'))
const activePriceLevelId = computed(() => selectedPriceLevel.value?.id ?? null)
const checkoutTotal = computed(() =>
  pricePreview.value ? applyAccountAdjustments(pricePreview.value.total) : totals.value.total,
)
const pricingReady = computed(
  () =>
    !apiMode || !loyaltyEnabled.value || (!pricePreviewLoading.value && !pricePreviewError.value),
)
const priceLevelAdjustment = computed(() =>
  pricePreview.value
    ? round2(pricePreview.value.subtotalOriginal - pricePreview.value.subtotalAfterPriceLevel)
    : 0,
)
const promoDiscount = computed(() => pricePreview.value?.discountTotal ?? 0)

function applyAccountAdjustments(baseGross: number): number {
  return round2(accountAdjustedBase(baseGross) + clampAmount(tipAmount.value))
}

function accountAdjustedBase(baseGross: number): number {
  return round2(baseGross * (1 - clampPercent(accountDiscountPercent.value) / 100))
}

function accountDiscountAmount(baseGross: number): number {
  return round2(baseGross * (clampPercent(accountDiscountPercent.value) / 100))
}

function receiptDiscountAmount(): number {
  if (!pricePreview.value) return totals.value.discountAmount
  return round2(
    Math.max(0, pricePreview.value.subtotalOriginal - pricePreview.value.total) +
      accountDiscountAmount(pricePreview.value.total),
  )
}

function previewLines(): PromotionLineInput[] {
  return cart.value.map((l) => ({
    productId: l.product.id,
    categoryId: l.product.categoryId,
    name: l.product.name,
    quantity: l.quantity,
    unitPrice: round2(l.product.salePrice * (1 - clampPct(l.discountPercent) / 100)),
  }))
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

async function refreshPricePreview() {
  if (!apiMode || !loyaltyEnabled.value || !cart.value.length) {
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

function formatPriceLevelImpact(value: number): string {
  if (value > 0) return `−${formatCZK(value)}`
  if (value < 0) return `+${formatCZK(Math.abs(value))}`
  return formatCZK(0)
}

const totals = computed(() =>
  calcPosTotals(
    cart.value.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.product.salePrice,
      vatRate: l.product.vatRate,
      discountPercent: l.discountPercent,
    })),
    accountDiscountPercent.value,
    tipAmount.value,
  ),
)

function setTipPercent(pct: number) {
  const base = pricePreview.value
    ? accountAdjustedBase(pricePreview.value.total)
    : totals.value.subtotalGross - totals.value.discountAmount
  tipAmount.value = round2(base * (pct / 100))
}

onMounted(async () => {
  auth.init()
  companyStore.init() // profil firmy (název/adresa) pro hlavičku účtenky
  if (!apiMode) {
    loading.value = false
    return
  }
  loading.value = true
  await Promise.all([load(), loadLocations(), loadPriceLevels()])
  try {
    categories.value = await categoriesApi.list()
  } catch (e) {
    console.error(e)
  }
  // Výběr provozovny: zapamatovaná (pokud stále existuje) → jinak první → jinak žádná.
  const stored = localStorage.getItem(POS_LOCATION_KEY)
  if (stored && locations.value.some((l) => l.id === stored)) currentLocationId.value = stored
  else if (locations.value.length) currentLocationId.value = locations.value[0].id
  loading.value = false
  focusScan()
})

function addToCart(p: Product) {
  const line = cart.value.find((l) => l.product.id === p.id)
  if (line) line.quantity++
  else cart.value.push({ product: p, quantity: 1, discountPercent: 0 })
}

function focusScan() {
  nextTick(() => {
    const el = scanInput.value?.$el as HTMLInputElement | undefined
    el?.focus()
  })
}

function handleCode(raw: string) {
  const code = raw.trim()
  if (!code) return
  const product = findByEan(products.value, code)
  if (!product) {
    toast.error(`EAN „${code}“ nenalezen v katalogu.`)
  } else if (products.value.filter((p) => p.ean === code).length > 1) {
    toast.error(`Víc produktů se stejným EAN „${code}“ — vyberte položku ručně.`)
  } else {
    addToCart(product)
    toast.success(`${product.name} přidáno na účtenku.`)
  }
  scanEan.value = ''
  focusScan()
}

function onScan() {
  handleCode(scanEan.value)
}

function inc(line: CartLine) {
  line.quantity++
}
function dec(line: CartLine) {
  line.quantity--
  if (line.quantity <= 0) cart.value = cart.value.filter((l) => l !== line)
}
function removeLine(line: CartLine) {
  cart.value = cart.value.filter((l) => l !== line)
}
function clearCart() {
  cart.value = []
  accountDiscountPercent.value = 0
  tipAmount.value = 0
  selectedPriceLevelId.value = STANDARD_PRICE_LEVEL
  pricePreviewSeq++
  pricePreview.value = null
}

watch(
  [cart, activePriceLevelId],
  () => {
    void refreshPricePreview()
  },
  { deep: true },
)

// --- Jednotný platební dialog (hotově s výpočtem vrácení / karta přes terminálový krok) ---
const paymentOpen = ref(false)

async function openPaymentDialog() {
  if (!cart.value.length || paying.value) return
  await refreshPricePreview()
  if (!pricingReady.value) {
    toast.error('Cenu se nepodařilo ověřit na serveru. Zkuste platbu znovu.')
    return
  }
  paymentOpen.value = true
}

async function confirmPayment(payment: { method: PaymentMethod; cashReceived: number | null }) {
  await refreshPricePreview()
  if (!pricingReady.value) {
    toast.error('Cenu se nepodařilo ověřit na serveru. Zkuste platbu znovu.')
    return
  }
  const ok = await pay(payment.method, payment.cashReceived)
  if (ok) paymentOpen.value = false // při chybě zůstává otevřený, obsluha může zkusit znovu
}

async function pay(method: PaymentMethod, cashReceived: number | null = null): Promise<boolean> {
  if (!cart.value.length || paying.value) return false
  paying.value = true
  try {
    const items = cart.value.map((l) => ({
      productId: l.product.id,
      description: l.product.name,
      quantity: l.quantity,
      unitPrice: l.product.salePrice,
      vatRate: l.product.vatRate,
      discountPercent: clampPct(l.discountPercent),
    }))
    // Kč hodnota slevy na účet nejde odvodit ze Sale response (ta nese jen totaly PO slevě),
    // proto se bere z FE snapshotu před odesláním — jen pro zobrazení na účtence.
    const discountAmountSnapshot = receiptDiscountAmount()
    const sale = await sales.create(method, items, {
      discountPercent: clampPercent(accountDiscountPercent.value),
      tipAmount: clampAmount(tipAmount.value),
      locationId: currentLocationId.value || null,
      cashReceived,
      priceLevelId: activePriceLevelId.value,
    })
    const receiptLines = sale.items?.length
      ? sale.items.map((item) => ({
          name: item.description ?? 'Položka',
          qty: item.quantity,
          total: item.lineTotal,
          modifiers: item.modifiers ?? [],
        }))
      : cart.value.map((l) => ({
          name: l.product.name,
          qty: l.quantity,
          total: lineTotal(l),
        }))
    receiptData.value = buildReceipt({
      company: companyStore.company,
      items: receiptLines,
      discountPercent: sale.discountPercent,
      discountAmount: discountAmountSnapshot,
      tipAmount: sale.tipAmount,
      total: sale.total,
      method,
      id: sale.id,
      cashReceived: sale.cashReceived,
      cashChange: sale.cashChange,
    })
    paymentOpen.value = false // zavřít PŘED otevřením účtenky — dva otevřené dialogy zamykaly stránku
    receiptOpen.value = true // účtenka po zaplacení (náhled + tisk)
    toast.success(
      sale.cashChange != null && sale.cashChange > 0
        ? `Zaplaceno ${formatCZK(sale.total)} hotově, vrátit ${formatCZK(sale.cashChange)}.`
        : `Zaplaceno ${formatCZK(sale.total)} ${method === 'Cash' ? 'hotově' : 'kartou'}.`,
    )
    clearCart()
    return true
  } catch (e) {
    // 422 u hotovosti = přijatá částka nepokryla server-spočítaný Total; dialog zůstává otevřený.
    if (e instanceof ApiError && e.status === 422 && cashReceived != null) {
      toast.error('Přijatá hotovost nepokrývá částku k úhradě. Zadejte vyšší částku.')
    } else {
      toast.error('Prodej se nepodařilo dokončit. Zkontrolujte připojení k serveru.')
    }
    console.error(e)
    return false
  } finally {
    paying.value = false
  }
}

// --- Tržby: denní uzávěrka + historie + storno ---
const salesDialogOpen = ref(false)
const loadingSales = ref(false)
const salesList = ref<Sale[]>([])
const summary = ref<DailySalesSummary | null>(null)
const stornoId = ref<string | null>(null)
const stornoOpen = ref(false)
const storning = ref(false)

function askStorno(id: string) {
  stornoId.value = id
  stornoOpen.value = true
}

async function loadSales() {
  const [s, l] = await Promise.all([sales.summaryToday(), sales.list()])
  summary.value = s
  salesList.value = l
}

async function openSales() {
  salesDialogOpen.value = true
  loadingSales.value = true
  try {
    await loadSales()
  } catch (e) {
    toast.error('Načtení tržeb selhalo.')
    console.error(e)
  } finally {
    loadingSales.value = false
  }
}

async function doStorno() {
  if (!stornoId.value || storning.value) return
  const id = stornoId.value
  stornoOpen.value = false
  stornoId.value = null
  storning.value = true
  try {
    const result = await sales.storno(id)
    if (isApprovalRequest(result)) {
      toast.success('Storno čeká na schválení managerem.')
    } else {
      toast.success('Prodej stornován, zboží vráceno na sklad.')
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) toast.error('Prodej je už stornovaný.')
    else toast.error('Storno selhalo.')
    console.error(e)
  } finally {
    await loadSales() // sesynchronizuj uzávěrku i seznam (i po 409 se objeví štítek Stornováno)
    storning.value = false
  }
}

function saleTime(iso: string): string {
  return new Date(iso).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold tracking-tight">Pokladna</h1>
      <div v-if="apiMode" class="flex items-center gap-2">
        <!-- Výběr provozovny (jen když jich má klient víc) — určuje, kam prodej spadne v uzávěrce. -->
        <Select v-if="locations.length > 1" v-model="currentLocationId">
          <SelectTrigger class="h-9 w-48" aria-label="Provozovna">
            <SelectValue placeholder="Vyberte provozovnu…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" @click="openSales">
          <ReceiptText class="h-4 w-4" /> Tržby
        </Button>
        <Button as-child variant="coral" size="lg">
          <RouterLink to="/app/uzaverka"> <FileClock class="h-5 w-5" /> Uzávěrka </RouterLink>
        </Button>
      </div>
    </div>

    <!-- Klient nemá žádnou provozovnu → uzávěrka po provozovnách nebude mít co ukázat. -->
    <div
      v-if="apiMode && !loading && locations.length === 0"
      class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
    >
      <span>
        Pro uzávěrku po provozovnách si nejdřív přidejte provozovnu. Bez ní se prodeje uloží „bez
        pobočky" a v uzávěrce se neobjeví.
      </span>
      <RouterLink
        to="/app/pobocky"
        class="font-medium text-primary underline-offset-2 hover:underline"
      >
        Přidat provozovnu
      </RouterLink>
    </div>

    <!-- POS funguje jen proti reálnému backendu -->
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <ShoppingCart class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Pokladna potřebuje připojení k serveru</p>
      <p class="mt-1 text-sm">
        Nastavte <code>VITE_API_URL</code> a spusťte backend (vystaveno-api).
      </p>
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <!-- Dlaždice produktů -->
      <div class="rounded-2xl border border-border bg-card p-4">
        <div v-if="loading" class="flex justify-center p-12">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>
        <div
          v-else-if="products.length === 0"
          class="flex flex-col items-center p-12 text-center text-muted-foreground"
        >
          <Package class="h-10 w-10" />
          <p class="mt-3 font-semibold text-foreground">Zatím žádné produkty</p>
          <p class="mt-1 text-sm">Nejdřív přidejte produkty do katalogu.</p>
          <Button as-child variant="coral" class="mt-4">
            <RouterLink to="/app/sklad"><Plus class="h-4 w-4" /> Přidat produkty</RouterLink>
          </Button>
        </div>
        <template v-else>
          <div class="mb-3 rounded-xl border border-border bg-muted/30 p-3">
            <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium" for="pos-scan">
              <ScanBarcode class="h-4 w-4 text-primary" /> Sken / EAN
            </label>
            <div class="flex gap-2">
              <Input
                id="pos-scan"
                ref="scanInput"
                v-model="scanEan"
                inputmode="numeric"
                autocomplete="off"
                placeholder="Naskenujte kód nebo zadejte EAN a Enter"
                class="flex-1"
                @keyup.enter="onScan"
              />
              <Button
                type="button"
                variant="outline"
                class="shrink-0"
                title="Skenovat kamerou"
                @click="scannerOpen = true"
              >
                <Camera class="h-4 w-4" /> Kamera
              </Button>
            </div>
          </div>

          <div class="mb-3">
            <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium" for="pos-search">
              <Search class="h-4 w-4 text-muted-foreground" /> Hledat produkt
            </label>
            <Input
              id="pos-search"
              v-model="productSearch"
              autocomplete="off"
              placeholder="Název, SKU nebo EAN"
            />
          </div>

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
          <div
            v-if="visibleProducts.length === 0"
            class="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
          >
            Žádný produkt neodpovídá hledání.
          </div>
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              v-for="p in visibleProducts"
              :key="p.id"
              type="button"
              class="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft active:scale-[0.98]"
              @click="addToCart(p)"
            >
              <span class="font-semibold leading-tight">{{ p.name }}</span>
              <span class="mt-2 text-sm font-bold text-primary tabular-nums">{{
                formatCZK(p.salePrice)
              }}</span>
            </button>
          </div>
        </template>
      </div>

      <!-- Košík -->
      <div class="flex h-fit flex-col rounded-2xl border border-border bg-card lg:sticky lg:top-4">
        <div class="flex items-center justify-between border-b border-border p-4">
          <div class="flex items-center gap-2 font-semibold">
            <ShoppingCart class="h-5 w-5" /> Účtenka
            <span v-if="itemCount" class="text-sm text-muted-foreground">({{ itemCount }})</span>
          </div>
          <Button
            v-if="cart.length"
            variant="ghost"
            size="sm"
            class="text-muted-foreground"
            @click="clearCart"
          >
            Vyprázdnit
          </Button>
        </div>

        <div v-if="!cart.length" class="p-8 text-center text-sm text-muted-foreground">
          Klepnutím na produkt ho přidáte na účtenku.
        </div>
        <div v-else class="divide-y divide-border">
          <div v-for="line in cart" :key="line.product.id" class="flex items-center gap-2 p-3">
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ line.product.name }}</div>
              <div class="text-xs text-muted-foreground tabular-nums">
                {{ formatCZK(line.product.salePrice) }} × {{ line.quantity }}
                <span v-if="clampPct(line.discountPercent) > 0" class="text-primary">
                  · −{{ clampPct(line.discountPercent) }}% = {{ formatCZK(lineTotal(line)) }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                class="h-8 w-8"
                aria-label="Ubrat kus"
                @click="dec(line)"
              >
                <Minus class="h-3.5 w-3.5" />
              </Button>
              <span class="w-6 text-center tabular-nums">{{ line.quantity }}</span>
              <Button
                variant="outline"
                size="icon"
                class="h-8 w-8"
                aria-label="Přidat kus"
                @click="inc(line)"
              >
                <Plus class="h-3.5 w-3.5" />
              </Button>
              <div class="flex items-center">
                <Input
                  v-model.number="line.discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  class="h-8 w-12 px-1 text-center"
                  title="Sleva v %"
                  aria-label="Sleva v procentech"
                />
                <span class="ml-0.5 text-xs text-muted-foreground">%</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                title="Odebrat"
                @click="removeLine(line)"
              >
                <Trash2 class="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <div v-if="cart.length" class="space-y-2 border-t border-border p-4">
          <div v-if="priceLevels.length" class="flex items-center justify-between gap-2">
            <span class="text-sm text-muted-foreground">Cenová hladina</span>
            <Select v-model="selectedPriceLevelId" :disabled="paying">
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
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-muted-foreground">Sleva na účet</span>
            <div class="flex items-center">
              <Input
                v-model.number="accountDiscountPercent"
                type="number"
                min="0"
                max="100"
                class="h-8 w-16 px-1 text-center"
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
              @click="setTipPercent(pct)"
            >
              {{ pct }} %
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-7 px-2 text-xs text-muted-foreground"
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
            <div v-if="pricePreviewError" class="text-muted-foreground">
              Náhled ceny není dostupný, finální cenu dopočítá server při platbě.
            </div>
          </div>
          <div v-if="totals.discountAmount" class="mb-1 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Sleva</span>
            <span class="tabular-nums text-primary">−{{ formatCZK(totals.discountAmount) }}</span>
          </div>
          <div class="mb-3 flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Celkem</span>
            <span class="text-2xl font-bold tabular-nums">{{ formatCZK(checkoutTotal) }}</span>
          </div>
          <Button
            variant="coral"
            size="lg"
            class="w-full"
            :disabled="!cart.length || paying || pricePreviewLoading"
            @click="openPaymentDialog"
          >
            <Loader2 v-if="paying" class="h-4 w-4 animate-spin" />
            <Banknote v-else class="h-4 w-4" /> Zaplatit
          </Button>
        </div>
      </div>
    </div>

    <!-- Tržby: denní uzávěrka + historie + storno -->
    <Dialog v-model:open="salesDialogOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tržby</DialogTitle>
          <DialogDescription>Dnešní uzávěrka a historie prodejů.</DialogDescription>
        </DialogHeader>

        <div v-if="loadingSales" class="flex justify-center p-8">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>
        <template v-else>
          <div
            v-if="summary"
            class="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/30 p-3 text-center"
          >
            <div>
              <div class="text-xs text-muted-foreground">Tržba dnes</div>
              <div class="font-bold tabular-nums">{{ formatCZK(summary.total) }}</div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">Hotově</div>
              <div class="font-semibold tabular-nums">{{ formatCZK(summary.cashTotal) }}</div>
            </div>
            <div>
              <div class="text-xs text-muted-foreground">Kartou</div>
              <div class="font-semibold tabular-nums">{{ formatCZK(summary.cardTotal) }}</div>
            </div>
          </div>
          <p v-if="summary" class="mt-1 text-center text-xs text-muted-foreground">
            {{ summary.count }} prodejů · DPH {{ formatCZK(summary.totalVat) }}
          </p>

          <div
            class="mt-3 max-h-[45vh] divide-y divide-border overflow-y-auto rounded-xl border border-border"
          >
            <div v-if="!salesList.length" class="p-6 text-center text-sm text-muted-foreground">
              Zatím žádné prodeje.
            </div>
            <div v-for="s in salesList" :key="s.id" class="flex items-center gap-3 p-3">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium tabular-nums">
                  {{ formatCZK(s.total) }}
                  <span class="ml-1 text-xs font-normal text-muted-foreground">{{
                    s.paymentMethod === 'Cash' ? 'hotově' : 'kartou'
                  }}</span>
                </div>
                <div class="text-xs text-muted-foreground">{{ saleTime(s.soldAt) }}</div>
              </div>
              <span
                v-if="s.status === 'Cancelled'"
                class="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
                >Stornováno</span
              >
              <Button
                v-else
                variant="ghost"
                size="sm"
                class="text-destructive"
                @click="askStorno(s.id)"
              >
                <RotateCcw class="h-3.5 w-3.5" /> Storno
              </Button>
            </div>
          </div>
        </template>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="stornoOpen" @update:open="(o) => (stornoOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stornovat prodej?</AlertDialogTitle>
          <AlertDialogDescription>
            Prodej se označí jako stornovaný a zboží se vrátí na sklad. Z denní uzávěrky vypadne.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zpět</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="doStorno"
          >
            Stornovat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Účtenka po zaplacení (náhled + tisk/PDF) -->
    <PaymentDialog
      v-model:open="paymentOpen"
      :total="checkoutTotal"
      :busy="paying || pricePreviewLoading"
      @confirm="confirmPayment"
    />

    <ReceiptDialog v-model:open="receiptOpen" :receipt="receiptData" />
    <CameraScanner
      v-model:open="scannerOpen"
      description="Namiř čárový kód na kameru — položka se přidá na účtenku automaticky."
      @detected="handleCode"
    />
  </div>
</template>
