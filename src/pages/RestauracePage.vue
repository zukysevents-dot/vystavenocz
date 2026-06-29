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
  ArrowLeftRight,
  Package,
  Ban,
  StickyNote,
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
import ReceiptDialog from '@/components/ReceiptDialog.vue'
import { buildReceipt, type ReceiptInfo } from '@/lib/receipt'
import { useCompanyStore } from '@/stores/company'
import { useFloors } from '@/composables/useFloors'
import { useTables } from '@/composables/useTables'
import { useProducts } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import { useOrders } from '@/composables/useOrders'
import { ApiError, isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type { Category, DiningTable, Floor, Order, OrderItemLine, PaymentMethod } from '@/lib/types'

const floorsApi = useFloors()
const tablesApi = useTables()
const ordersApi = useOrders()
const categoriesApi = useCategories()
const { products, load: loadProducts } = useProducts()
const companyStore = useCompanyStore()
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
    receiptData.value = buildReceipt({
      company: companyStore.company,
      items: order.items.map((i) => ({ name: i.name, qty: i.quantity, total: i.lineTotal })),
      total: paid.total,
      method,
      id: order.id,
      table: tableName,
    })
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
                <div v-if="it.course || it.note" class="mt-1 space-y-0.5">
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
              v-if="freeTables.length"
              variant="ghost"
              class="mt-2 w-full"
              :disabled="busy"
              @click="moveDialogOpen = true"
            >
              <ArrowLeftRight class="h-4 w-4" /> Přesunout na jiný stůl
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

    <!-- Účtenka po zaplacení (náhled + tisk/PDF) -->
    <ReceiptDialog v-model:open="receiptOpen" :receipt="receiptData" />
  </div>
</template>
