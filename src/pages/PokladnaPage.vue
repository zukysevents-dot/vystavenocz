<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Loader2,
  Minus,
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  ShoppingCart,
  Package,
  ReceiptText,
  RotateCcw,
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
import ReceiptDialog from '@/components/ReceiptDialog.vue'
import { useProducts } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import { useSales } from '@/composables/useSales'
import { formatCZK, round2 } from '@/lib/invoice'
import { buildReceipt, type ReceiptInfo } from '@/lib/receipt'
import { calcPosTotals, clampAmount, clampPercent } from '@/lib/posCalc'
import { ApiError, isApiMode } from '@/lib/http'
import { useCompanyStore } from '@/stores/company'
import { toast } from '@/components/ui/sonner'
import type { Category, DailySalesSummary, PaymentMethod, Product, Sale } from '@/lib/types'

const { products, load } = useProducts()
const categoriesApi = useCategories()
const sales = useSales()
const companyStore = useCompanyStore()

const loading = ref(true)
const paying = ref(false)
const apiMode = isApiMode()

// Účtenka po zaplacení (náhled + tisk/PDF).
const receiptOpen = ref(false)
const receiptData = ref<ReceiptInfo | null>(null)

const categories = ref<Category[]>([])
const selectedCat = ref('')
const visibleProducts = computed(() =>
  selectedCat.value
    ? products.value.filter((p) => p.categoryId === selectedCat.value)
    : products.value,
)

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
  tipAmount.value = round2((totals.value.subtotalGross - totals.value.discountAmount) * (pct / 100))
}

onMounted(async () => {
  companyStore.init() // profil firmy (název/adresa) pro hlavičku účtenky
  if (!apiMode) {
    loading.value = false
    return
  }
  loading.value = true
  await load()
  try {
    categories.value = await categoriesApi.list()
  } catch (e) {
    console.error(e)
  }
  loading.value = false
})

function addToCart(p: Product) {
  const line = cart.value.find((l) => l.product.id === p.id)
  if (line) line.quantity++
  else cart.value.push({ product: p, quantity: 1, discountPercent: 0 })
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
}

async function pay(method: PaymentMethod) {
  if (!cart.value.length || paying.value) return
  paying.value = true
  try {
    const receiptLines = cart.value.map((l) => ({
      name: l.product.name,
      qty: l.quantity,
      total: lineTotal(l),
    }))
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
    const discountAmountSnapshot = totals.value.discountAmount
    const sale = await sales.create(method, items, {
      discountPercent: clampPercent(accountDiscountPercent.value),
      tipAmount: clampAmount(tipAmount.value),
    })
    receiptData.value = buildReceipt({
      company: companyStore.company,
      items: receiptLines,
      discountPercent: sale.discountPercent,
      discountAmount: discountAmountSnapshot,
      tipAmount: sale.tipAmount,
      total: sale.total,
      method,
      id: sale.id,
    })
    receiptOpen.value = true // účtenka po zaplacení (náhled + tisk)
    toast.success(`Zaplaceno ${formatCZK(sale.total)} ${method === 'Cash' ? 'hotově' : 'kartou'}.`)
    clearCart()
  } catch (e) {
    toast.error('Prodej se nepodařilo dokončit. Zkontrolujte připojení k serveru.')
    console.error(e)
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
const storning = ref(false)

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
  stornoId.value = null
  storning.value = true
  try {
    await sales.storno(id)
    toast.success('Prodej stornován, zboží vráceno na sklad.')
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
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold tracking-tight">Pokladna</h1>
      <Button v-if="apiMode" variant="outline" size="sm" @click="openSales">
        <ReceiptText class="h-4 w-4" /> Tržby
      </Button>
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
          <div v-if="totals.discountAmount" class="mb-1 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Sleva</span>
            <span class="tabular-nums text-primary">−{{ formatCZK(totals.discountAmount) }}</span>
          </div>
          <div class="mb-3 flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Celkem</span>
            <span class="text-2xl font-bold tabular-nums">{{ formatCZK(totals.total) }}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <Button
              variant="coral"
              size="lg"
              :disabled="!cart.length || paying"
              @click="pay('Cash')"
            >
              <Loader2 v-if="paying" class="h-4 w-4 animate-spin" />
              <Banknote v-else class="h-4 w-4" /> Hotově
            </Button>
            <Button
              variant="outline"
              size="lg"
              :disabled="!cart.length || paying"
              @click="pay('Card')"
            >
              <CreditCard class="h-4 w-4" /> Kartou
            </Button>
          </div>
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
                @click="stornoId = s.id"
              >
                <RotateCcw class="h-3.5 w-3.5" /> Storno
              </Button>
            </div>
          </div>
        </template>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="!!stornoId" @update:open="(o) => !o && (stornoId = null)">
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
    <ReceiptDialog v-model:open="receiptOpen" :receipt="receiptData" />
  </div>
</template>
