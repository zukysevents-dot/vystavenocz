<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  CalendarClock,
  History,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from '@/components/ui/sonner'
import { useInventory } from '@/composables/useInventory'
import {
  isApprovalRequest,
  type Location,
  type Product,
  type StockLot,
  type StockLotStatus,
  type StockLotStatusEvent,
} from '@/lib/types'

const props = defineProps<{
  products: Product[]
  locations: Location[]
  initialLocationId?: string | null
}>()

const inventory = useInventory()
const ALL_PRODUCTS = '__all_products__'
const ALL_LOCATIONS = '__all_locations__'
const ALL_STATUSES = '__all_statuses__'
const productId = ref(ALL_PRODUCTS)
const locationId = ref(props.initialLocationId || ALL_LOCATIONS)
const search = ref('')
const expiresTo = ref('')
const status = ref<StockLotStatus | typeof ALL_STATUSES>(ALL_STATUSES)
const lots = ref<StockLot[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(100)
const loading = ref(false)
const error = ref('')

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const trackedProducts = computed(() =>
  props.products.filter((product) => product.lotTrackingEnabled),
)
const STATUS_OPTIONS: Array<{ value: StockLotStatus; label: string; description: string }> = [
  { value: 'Active', label: 'Uvolněná', description: 'Lze ji prodávat, vydávat a přesouvat.' },
  {
    value: 'Quarantined',
    label: 'Karanténa',
    description: 'Dočasně se nesmí použít, dokud neproběhne kontrola.',
  },
  {
    value: 'Blocked',
    label: 'Blokovaná',
    description: 'Nesmí se použít ani objednat do stejné šarže.',
  },
  {
    value: 'Recalled',
    label: 'Reklamovaná',
    description: 'Trvale stažená z oběhu; tento stav už nelze vrátit.',
  },
]

function statusLabel(value: StockLotStatus): string {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function statusTone(value: StockLotStatus): string {
  if (value === 'Active') return 'border-success/30 bg-success/10 text-success'
  if (value === 'Quarantined')
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'border-destructive/30 bg-destructive/10 text-destructive'
}

function fmtQuantity(value: number): string {
  return value.toLocaleString('cs-CZ', { maximumFractionDigits: 3 })
}

function fmtDate(value: string | null): string {
  if (!value) return 'Bez expirace'
  return new Date(`${value}T00:00:00`).toLocaleDateString('cs-CZ')
}

function expiryLabel(lot: StockLot): string {
  if (lot.daysToExpiry == null) return 'Bez expirace'
  if (lot.daysToExpiry < 0) return `${Math.abs(lot.daysToExpiry)} dní po expiraci`
  if (lot.daysToExpiry === 0) return 'Expiruje dnes'
  return `${lot.daysToExpiry} dní do expirace`
}

function expiryTone(lot: StockLot): string {
  if (lot.daysToExpiry == null) return 'text-muted-foreground'
  if (lot.daysToExpiry <= 0) return 'text-destructive'
  if (lot.daysToExpiry <= 30) return 'text-amber-700 dark:text-amber-300'
  return 'text-muted-foreground'
}

async function load(targetPage = page.value) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const result = await inventory.stockLots({
      page: targetPage,
      pageSize: 100,
      productId: productId.value === ALL_PRODUCTS ? null : productId.value,
      locationId: locationId.value === ALL_LOCATIONS ? null : locationId.value,
      expiresTo: expiresTo.value || null,
      search: search.value,
      positiveOnly: true,
      status: status.value === ALL_STATUSES ? null : status.value,
    })
    lots.value = result.items
    total.value = result.total
    page.value = result.page
    pageSize.value = result.pageSize
  } catch (cause) {
    console.error(cause)
    error.value = 'Šarže a expirace se nepodařilo načíst.'
  } finally {
    loading.value = false
  }
}

const statusOpen = ref(false)
const statusLot = ref<StockLot | null>(null)
const targetStatus = ref<StockLotStatus>('Quarantined')
const statusReason = ref('')
const statusSaving = ref(false)
const allowedStatusOptions = computed(() => {
  const current = statusLot.value?.status
  if (!current || current === 'Recalled') return []
  return STATUS_OPTIONS.filter((option) => option.value !== current)
})

function openStatusChange(lot: StockLot) {
  if (lot.status === 'Recalled') return
  statusLot.value = lot
  targetStatus.value = lot.status === 'Active' ? 'Quarantined' : 'Active'
  statusReason.value = ''
  statusOpen.value = true
}

async function submitStatusChange() {
  const lot = statusLot.value
  if (!lot || !statusReason.value.trim()) {
    toast.error('Uveďte důvod změny stavu šarže.')
    return
  }
  statusSaving.value = true
  try {
    await inventory.changeStockLotStatus(lot.id, targetStatus.value, statusReason.value.trim())
    statusOpen.value = false
    toast.success(`Šarže je nyní: ${statusLabel(targetStatus.value)}.`)
    await load()
  } catch (cause) {
    console.error(cause)
    toast.error('Stav šarže se nepodařilo změnit.')
  } finally {
    statusSaving.value = false
  }
}

const historyOpen = ref(false)
const historyLot = ref<StockLot | null>(null)
const historyRows = ref<StockLotStatusEvent[]>([])
const historyLoading = ref(false)

async function openHistory(lot: StockLot) {
  historyLot.value = lot
  historyRows.value = []
  historyOpen.value = true
  historyLoading.value = true
  try {
    historyRows.value = await inventory.stockLotStatusHistory(lot.id)
  } catch (cause) {
    console.error(cause)
    toast.error('Historii stavu šarže se nepodařilo načíst.')
  } finally {
    historyLoading.value = false
  }
}

function fmtDateTime(value: string): string {
  return new Date(value).toLocaleString('cs-CZ')
}

watch(
  () => props.initialLocationId,
  (value) => {
    locationId.value = value || ALL_LOCATIONS
    void load(1)
  },
)

onMounted(() => void load())

const writeOffOpen = ref(false)
const writeOffLot = ref<StockLot | null>(null)
const writeOffQuantity = ref<number | ''>('')
const writeOffNote = ref('Expirace šarže')
const writeOffSaving = ref(false)

function openWriteOff(lot: StockLot) {
  writeOffLot.value = lot
  writeOffQuantity.value = lot.quantity
  writeOffNote.value = `Expirace šarže ${lot.lotNumber}`
  writeOffOpen.value = true
}

async function submitWriteOff() {
  const lot = writeOffLot.value
  const quantity = Number(writeOffQuantity.value)
  if (!lot || !(quantity > 0) || quantity > lot.quantity) {
    toast.error('Zadejte množství, které je v šarži skutečně skladem.')
    return
  }
  writeOffSaving.value = true
  let saved = false
  try {
    const result = await inventory.issue(
      lot.productId,
      quantity,
      writeOffNote.value.trim() || null,
      'Expiration',
      lot.locationId,
      lot.id,
    )
    writeOffOpen.value = false
    if (isApprovalRequest(result)) toast.success('Odpis čeká na schválení managerem.')
    else toast.success('Expirace byla odepsána z vybrané šarže.')
    saved = true
  } catch (cause) {
    console.error(cause)
    toast.error('Odpis šarže se nepodařilo uložit.')
  } finally {
    writeOffSaving.value = false
  }
  if (saved) {
    await load()
    if (error.value) toast.warning('Odpis je uložený, ale přehled šarží se nepodařilo obnovit.')
  }
}
</script>

<template>
  <section class="mt-4 space-y-4" aria-labelledby="stock-lots-title">
    <div class="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="stock-lots-title" class="flex items-center gap-2 text-lg font-semibold">
            <CalendarClock class="h-5 w-5 text-primary" /> Šarže a expirace
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Aktuální množství podle šarže. Výdej bez výběru používá nejbližší expiraci jako první.
          </p>
        </div>
        <Button type="button" variant="outline" :disabled="loading" @click="load(1)">
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <RefreshCw v-else class="h-4 w-4" /> Načíst
        </Button>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div class="grid gap-1.5">
          <Label for="lot-search">Hledat</Label>
          <Input
            id="lot-search"
            v-model="search"
            placeholder="Produkt nebo šarže"
            @keyup.enter="load(1)"
          />
        </div>
        <div class="grid gap-1.5">
          <Label for="lot-product">Produkt</Label>
          <Select v-model="productId">
            <SelectTrigger id="lot-product"
              ><SelectValue placeholder="Všechny produkty"
            /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_PRODUCTS">Všechny produkty</SelectItem>
              <SelectItem v-for="product in trackedProducts" :key="product.id" :value="product.id">
                {{ product.name }} · {{ product.sku }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div v-if="locations.length > 1" class="grid gap-1.5">
          <Label for="lot-location">Pobočka</Label>
          <Select v-model="locationId">
            <SelectTrigger id="lot-location"
              ><SelectValue placeholder="Všechny pobočky"
            /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_LOCATIONS">Všechny pobočky</SelectItem>
              <SelectItem v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-1.5">
          <Label for="lot-expiry">Expiruje nejpozději</Label>
          <Input id="lot-expiry" v-model="expiresTo" type="date" />
        </div>
        <div class="grid gap-1.5">
          <Label for="lot-status">Stav</Label>
          <Select v-model="status">
            <SelectTrigger id="lot-status"
              ><SelectValue placeholder="Všechny stavy"
            /></SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_STATUSES">Všechny stavy</SelectItem>
              <SelectItem
                v-for="option in STATUS_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <div
      v-if="error"
      class="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-destructive"
    >
      {{ error }}
    </div>
    <div v-else-if="loading" class="flex justify-center rounded-2xl border bg-card p-12">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>
    <div
      v-else-if="!lots.length"
      class="rounded-2xl border bg-card p-10 text-center text-muted-foreground"
    >
      <CalendarClock class="mx-auto mb-3 h-8 w-8" />
      Žádná kladná zásoba v šaržích neodpovídá výběru.
    </div>
    <div v-else class="grid gap-3 md:grid-cols-2">
      <article
        v-for="lot in lots"
        :key="`${lot.id}-${lot.locationId}`"
        class="rounded-2xl border bg-card p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="truncate font-semibold">{{ lot.productName }}</h3>
            <p class="text-xs text-muted-foreground">
              {{ lot.productSku }} · {{ lot.locationName || 'Nezařazeno' }}
            </p>
          </div>
          <div class="shrink-0 text-right">
            <strong class="block text-lg tabular-nums">{{ fmtQuantity(lot.quantity) }}</strong>
            <Badge variant="outline" :class="statusTone(lot.status)">
              {{ statusLabel(lot.status) }}
            </Badge>
          </div>
        </div>
        <div class="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
          <div class="font-medium">{{ lot.lotNumber }}</div>
          <div class="mt-1 flex items-center gap-1.5" :class="expiryTone(lot)">
            <AlertTriangle
              v-if="lot.daysToExpiry != null && lot.daysToExpiry <= 30"
              class="h-4 w-4"
            />
            {{ fmtDate(lot.expiresOn) }} · {{ expiryLabel(lot) }}
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            v-if="lot.expiresOn && lot.status === 'Active'"
            type="button"
            variant="outline"
            size="sm"
            class="col-span-2 sm:w-auto"
            @click="openWriteOff(lot)"
          >
            <Trash2 class="h-4 w-4" /> Odepsat expiraci
          </Button>
          <Button
            v-if="lot.status !== 'Recalled'"
            type="button"
            variant="outline"
            size="sm"
            @click="openStatusChange(lot)"
          >
            <ShieldAlert class="h-4 w-4" /> Změnit stav
          </Button>
          <Button type="button" variant="ghost" size="sm" @click="openHistory(lot)">
            <History class="h-4 w-4" /> Historie
          </Button>
        </div>
      </article>
    </div>

    <nav
      v-if="pageCount > 1"
      class="flex items-center justify-center gap-3"
      aria-label="Stránkování šarží"
    >
      <Button variant="outline" size="sm" :disabled="page <= 1 || loading" @click="load(page - 1)"
        >Předchozí</Button
      >
      <span class="text-sm text-muted-foreground">Strana {{ page }} z {{ pageCount }}</span>
      <Button
        variant="outline"
        size="sm"
        :disabled="page >= pageCount || loading"
        @click="load(page + 1)"
        >Další</Button
      >
    </nav>
  </section>

  <Dialog v-model:open="writeOffOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Odepsat expiraci</DialogTitle>
        <DialogDescription>
          {{ writeOffLot?.productName }} · šarže {{ writeOffLot?.lotNumber }}. Odečte se pouze tato
          šarže.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="lot-write-off-quantity">Množství</Label>
          <Input
            id="lot-write-off-quantity"
            v-model.number="writeOffQuantity"
            type="number"
            min="0.001"
            step="0.001"
          />
        </div>
        <div class="space-y-2">
          <Label for="lot-write-off-note">Důvod</Label>
          <Input id="lot-write-off-note" v-model="writeOffNote" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" @click="writeOffOpen = false">Zrušit</Button>
        <Button variant="coral" :disabled="writeOffSaving" @click="submitWriteOff">
          <Loader2 v-if="writeOffSaving" class="h-4 w-4 animate-spin" /> Odepsat
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="statusOpen">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Změnit stav šarže</DialogTitle>
        <DialogDescription>
          {{ statusLot?.productName }} · {{ statusLot?.lotNumber }}. Blokovaný stav okamžitě odebere
          šarži z disponibilní zásoby i automatického FEFO výdeje.
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="lot-target-status">Nový stav</Label>
          <Select v-model="targetStatus">
            <SelectTrigger id="lot-target-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in allowedStatusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">
            {{ STATUS_OPTIONS.find((option) => option.value === targetStatus)?.description }}
          </p>
        </div>
        <div class="space-y-2">
          <Label for="lot-status-reason">Důvod</Label>
          <Textarea
            id="lot-status-reason"
            v-model="statusReason"
            maxlength="500"
            placeholder="Např. poškozený obal, kontrola kvality nebo stažení série"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" @click="statusOpen = false">Zrušit</Button>
        <Button :disabled="statusSaving || !statusReason.trim()" @click="submitStatusChange">
          <Loader2 v-if="statusSaving" class="h-4 w-4 animate-spin" /> Uložit stav
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="historyOpen">
    <DialogContent class="max-h-[85vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Historie stavu šarže</DialogTitle>
        <DialogDescription>
          {{ historyLot?.productName }} · {{ historyLot?.lotNumber }}. Historie je neměnná.
        </DialogDescription>
      </DialogHeader>
      <div v-if="historyLoading" class="flex justify-center p-8">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div
        v-else-if="!historyRows.length"
        class="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground"
      >
        Stav této šarže zatím nebyl změněn.
      </div>
      <ol v-else class="space-y-3">
        <li v-for="entry in historyRows" :key="entry.id" class="rounded-xl border p-3">
          <div class="flex flex-wrap items-center gap-2 text-sm font-medium">
            <Badge variant="outline" :class="statusTone(entry.fromStatus)">
              {{ statusLabel(entry.fromStatus) }}
            </Badge>
            <span aria-hidden="true">→</span>
            <Badge variant="outline" :class="statusTone(entry.toStatus)">
              {{ statusLabel(entry.toStatus) }}
            </Badge>
          </div>
          <p class="mt-2 text-sm">{{ entry.reason }}</p>
          <time class="mt-1 block text-xs text-muted-foreground" :datetime="entry.changedAt">
            {{ fmtDateTime(entry.changedAt) }}
          </time>
        </li>
      </ol>
    </DialogContent>
  </Dialog>
</template>
