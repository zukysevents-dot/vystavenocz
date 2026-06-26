<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Loader2,
  Minus,
  Plus,
  Banknote,
  CreditCard,
  ChefHat,
  ArrowLeft,
  Package,
  Ban,
  Printer,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SaleReceipt, { type ReceiptLine } from '@/components/SaleReceipt.vue'
import { useCompanyStore } from '@/stores/company'
import { useFloors } from '@/composables/useFloors'
import { useTables } from '@/composables/useTables'
import { useProducts } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import { useOrders } from '@/composables/useOrders'
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type { Category, DiningTable, Floor, Order, PaymentMethod } from '@/lib/types'

const floorsApi = useFloors()
const tablesApi = useTables()
const ordersApi = useOrders()
const categoriesApi = useCategories()
const { products, load: loadProducts } = useProducts()
const companyStore = useCompanyStore()
const apiMode = isApiMode()

// Účtenka po zaplacení (náhled + tisk/PDF).
interface ReceiptInfo {
  businessName: string
  address?: string
  ico?: string
  dic?: string
  receiptNumber: string
  dateTime: string
  table?: string
  items: ReceiptLine[]
  total: number
  paymentMethod: string
}
const receiptOpen = ref(false)
const receiptData = ref<ReceiptInfo | null>(null)

function buildReceipt(
  order: Order,
  tableName: string | undefined,
  method: PaymentMethod,
  total: number,
): ReceiptInfo {
  const c = companyStore.company
  const address = [c?.street, [c?.zip, c?.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  return {
    businessName: c?.companyName || c?.fullName || 'Účtenka',
    address: address || undefined,
    ico: c?.ico || undefined,
    dic: c?.dic || undefined,
    receiptNumber: order.id.slice(0, 8).toUpperCase(),
    dateTime: new Date().toLocaleString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    table: tableName,
    items: order.items.map((i) => ({ name: i.name, qty: i.quantity, total: i.lineTotal })),
    total,
    paymentMethod: method === 'Cash' ? 'Hotově' : 'Kartou',
  }
}

function printReceipt() {
  window.print()
}

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
  companyStore.init() // profil firmy (název/adresa) pro hlavičku účtenky
  if (!apiMode) {
    loading.value = false
    return
  }
  try {
    await Promise.all([loadProducts(), refreshOpen()])
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
  } catch (e) {
    toast.error('Účet se nepodařilo otevřít.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

function backToMap() {
  mode.value = 'map'
  selectedTable.value = null
  currentOrder.value = null
}

async function addProduct(productId: string) {
  if (!currentOrder.value || busy.value) return
  busy.value = true
  try {
    currentOrder.value = await ordersApi.addItem(currentOrder.value.id, productId, 1)
  } catch (e) {
    toast.error('Položku se nepodařilo přidat.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function changeQty(itemId: string, quantity: number) {
  if (!currentOrder.value || busy.value) return
  busy.value = true
  try {
    currentOrder.value =
      quantity <= 0
        ? await ordersApi.removeItem(currentOrder.value.id, itemId)
        : await ordersApi.updateItem(currentOrder.value.id, itemId, quantity)
  } catch (e) {
    toast.error('Změna položky selhala.')
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
    toast.error('Odeslání objednávky selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function pay(method: PaymentMethod) {
  if (!currentOrder.value || busy.value) return
  const order = currentOrder.value
  const tableName = selectedTable.value?.name
  busy.value = true
  try {
    const paid = await ordersApi.pay(order.id, method)
    receiptData.value = buildReceipt(order, tableName, method, paid.total)
    receiptOpen.value = true // účtenka po zaplacení (náhled + tisk)
    toast.success(`Zaplaceno ${formatCZK(paid.total)} ${method === 'Cash' ? 'hotově' : 'kartou'}.`)
    await refreshOpen()
    backToMap()
  } catch (e) {
    toast.error('Platba selhala.')
    console.error(e)
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
</script>

<template>
  <div class="p-4 sm:p-6">
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

        <div
          class="relative min-h-[560px] overflow-hidden rounded-2xl border border-border bg-muted/20"
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

          <div
            v-if="!tables.length"
            class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
          >
            V této místnosti nejsou stoly.
          </div>
        </div>
      </template>
    </template>

    <!-- ÚČET na stole -->
    <template v-else-if="currentOrder">
      <div class="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="backToMap"
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
                @click="addProduct(p.id)"
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
                <div class="truncate text-sm font-medium">{{ it.name }}</div>
                <div class="text-xs text-muted-foreground tabular-nums">
                  {{ formatCZK(it.unitPrice) }} × {{ it.quantity }}
                  <span
                    v-if="it.kitchenStatus !== 'New'"
                    class="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] text-foreground"
                    >v kuchyni</span
                  >
                </div>
              </div>
              <div v-if="it.kitchenStatus === 'New'" class="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  class="h-8 w-8"
                  :disabled="busy"
                  @click="changeQty(it.id, it.quantity - 1)"
                >
                  <Minus class="h-3.5 w-3.5" />
                </Button>
                <span class="w-5 text-center tabular-nums">{{ it.quantity }}</span>
                <Button
                  variant="outline"
                  size="icon"
                  class="h-8 w-8"
                  :disabled="busy"
                  @click="changeQty(it.id, it.quantity + 1)"
                >
                  <Plus class="h-3.5 w-3.5" />
                </Button>
              </div>
              <div class="w-16 text-right text-sm font-semibold tabular-nums">
                {{ formatCZK(it.lineTotal) }}
              </div>
            </div>
          </div>

          <div class="border-t border-border p-4">
            <div class="mb-3 flex items-center justify-between">
              <span class="text-sm text-muted-foreground">Celkem</span>
              <span class="text-2xl font-bold tabular-nums">{{
                formatCZK(currentOrder.total)
              }}</span>
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

            <div class="grid grid-cols-2 gap-2">
              <Button
                variant="coral"
                :disabled="busy || !currentOrder.items.length"
                @click="pay('Cash')"
              >
                <Banknote class="h-4 w-4" /> Hotově
              </Button>
              <Button
                variant="outline"
                :disabled="busy || !currentOrder.items.length"
                @click="pay('Card')"
              >
                <CreditCard class="h-4 w-4" /> Kartou
              </Button>
            </div>
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
    </template>

    <!-- Účtenka po zaplacení (náhled + tisk/PDF) -->
    <Dialog v-model:open="receiptOpen">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Účtenka</DialogTitle>
        </DialogHeader>
        <div class="max-h-[70vh] overflow-y-auto">
          <SaleReceipt v-if="receiptData" v-bind="receiptData" />
        </div>
        <DialogFooter>
          <Button variant="ghost" @click="receiptOpen = false">Hotovo</Button>
          <Button variant="coral" @click="printReceipt">
            <Printer class="h-4 w-4" /> Vytisknout / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
