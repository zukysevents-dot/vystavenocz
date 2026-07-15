<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  BookmarkPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Undo2,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/components/ui/sonner'
import { useInventory } from '@/composables/useInventory'
import { ApiError } from '@/lib/http'
import type {
  Location,
  Product,
  StockReservation,
  StockReservationStatus,
} from '@/lib/types'

const props = defineProps<{
  products: Product[]
  locations: Location[]
  initialLocationId?: string | null
}>()
const emit = defineEmits<{ changed: [] }>()

const inventory = useInventory()
const ALL_STATUSES = '__all_statuses__'
const ALL_LOCATIONS = '__all_locations__'
const status = ref<StockReservationStatus | typeof ALL_STATUSES>('Active')
const locationId = ref(props.initialLocationId || ALL_LOCATIONS)
const search = ref('')
const reservations = ref<StockReservation[]>([])
const PAGE_SIZE = 25
const page = ref(1)
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const loading = ref(false)
const error = ref('')

function fmtQuantity(value: number): string {
  return value.toLocaleString('cs-CZ', { maximumFractionDigits: 3 })
}

function fmtDate(value: string): string {
  return new Date(value).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })
}

function locationLabel(reservation: StockReservation): string {
  return reservation.locationName ?? (reservation.locationId ? 'Archivovaná pobočka' : 'Nezařazeno')
}

function statusLabel(value: StockReservationStatus): string {
  if (value === 'Active') return 'Aktivní'
  if (value === 'Released') return 'Uvolněná'
  return 'Vyskladněná'
}

function statusVariant(value: StockReservationStatus): 'default' | 'secondary' | 'outline' {
  if (value === 'Active') return 'default'
  if (value === 'Fulfilled') return 'secondary'
  return 'outline'
}

async function load(requestedPage = page.value) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    let result = await inventory.stockReservations({
      status: status.value === ALL_STATUSES ? null : status.value,
      locationId: locationId.value === ALL_LOCATIONS ? null : locationId.value,
      search: search.value,
      page: requestedPage,
      pageSize: PAGE_SIZE,
    })
    const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
    if (requestedPage > lastPage) {
      requestedPage = lastPage
      result = await inventory.stockReservations({
        status: status.value === ALL_STATUSES ? null : status.value,
        locationId: locationId.value === ALL_LOCATIONS ? null : locationId.value,
        search: search.value,
        page: requestedPage,
        pageSize: PAGE_SIZE,
      })
    }
    reservations.value = result.items
    page.value = requestedPage
    total.value = result.total
  } catch (cause) {
    console.error(cause)
    error.value = 'Rezervace se nepodařilo načíst.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.initialLocationId,
  (value) => {
    locationId.value = value || ALL_LOCATIONS
    void load(1)
  },
)

onMounted(() => void load(1))

const createOpen = ref(false)
const createSaving = ref(false)
const createForm = reactive({
  productId: '',
  locationId: '',
  quantity: 0,
  reservedFor: '',
  note: '',
})
const selectedProduct = computed(() => props.products.find((item) => item.id === createForm.productId))

function openCreate() {
  createForm.productId = props.products[0]?.id ?? ''
  createForm.locationId =
    props.initialLocationId || (props.locations.length === 1 ? (props.locations[0]?.id ?? '') : '')
  createForm.quantity = 0
  createForm.reservedFor = ''
  createForm.note = ''
  createOpen.value = true
}

async function submitCreate() {
  if (!createForm.productId) return toast.error('Vyberte produkt.')
  if (createForm.quantity <= 0) return toast.error('Zadejte kladné množství.')
  if (!createForm.reservedFor.trim()) return toast.error('Uveďte, pro koho nebo pro co zásobu držíte.')
  if (props.locations.length > 1 && !createForm.locationId)
    return toast.error('Vyberte pobočku skladu.')

  createSaving.value = true
  try {
    await inventory.createStockReservation({
      productId: createForm.productId,
      quantity: createForm.quantity,
      reservedFor: createForm.reservedFor,
      locationId: createForm.locationId || null,
      note: createForm.note,
    })
    createOpen.value = false
    status.value = 'Active'
    await load(1)
    emit('changed')
    toast.success('Zásoba je rezervovaná.')
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409)
      toast.error('Pro rezervaci není dost množství k dispozici.')
    else toast.error('Rezervaci se nepodařilo vytvořit.')
    console.error(cause)
  } finally {
    createSaving.value = false
  }
}

const resolveOpen = ref(false)
const resolveMode = ref<'release' | 'fulfill'>('release')
const selected = ref<StockReservation | null>(null)
const resolutionNote = ref('')
const resolving = ref(false)

function openResolve(reservation: StockReservation, mode: 'release' | 'fulfill') {
  selected.value = reservation
  resolveMode.value = mode
  resolutionNote.value = ''
  resolveOpen.value = true
}

async function submitResolve() {
  if (!selected.value) return
  resolving.value = true
  try {
    if (resolveMode.value === 'release')
      await inventory.releaseStockReservation(selected.value.id, resolutionNote.value)
    else await inventory.fulfillStockReservation(selected.value.id, resolutionNote.value)
    resolveOpen.value = false
    await load(page.value)
    emit('changed')
    toast.success(resolveMode.value === 'release' ? 'Rezervace je uvolněná.' : 'Rezervace je vyskladněná.')
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 409)
      toast.error('Rezervaci už mezitím vyřídil jiný uživatel.')
    else toast.error('Rezervaci se nepodařilo vyřídit.')
    console.error(cause)
  } finally {
    resolving.value = false
  }
}
</script>

<template>
  <section class="mt-4 space-y-4" aria-labelledby="stock-reservations-title">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h2 id="stock-reservations-title" class="font-semibold">Rezervace zásob</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Držte zboží pro zakázku nebo zákazníka a sledujte, kolik skutečně zbývá k dispozici.
        </p>
      </div>
      <Button type="button" variant="coral" :disabled="!products.length" @click="openCreate">
        <BookmarkPlus class="h-4 w-4" /> Nová rezervace
      </Button>
    </div>

    <div class="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_180px_200px_auto]">
      <div class="relative">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="search" class="pl-9" placeholder="Produkt, kód nebo účel…" @keyup.enter="load(1)" />
      </div>
      <Select v-model="status">
        <SelectTrigger aria-label="Stav rezervace"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Active">Aktivní</SelectItem>
          <SelectItem value="Released">Uvolněné</SelectItem>
          <SelectItem value="Fulfilled">Vyskladněné</SelectItem>
          <SelectItem :value="ALL_STATUSES">Všechny stavy</SelectItem>
        </SelectContent>
      </Select>
      <Select v-if="locations.length > 1" v-model="locationId">
        <SelectTrigger aria-label="Pobočka rezervace"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL_LOCATIONS">Všechny pobočky</SelectItem>
          <SelectItem v-for="location in locations" :key="location.id" :value="location.id">
            {{ location.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" :disabled="loading" @click="load(1)">
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
        <RefreshCw v-else class="h-4 w-4" />
        Načíst
      </Button>
    </div>

    <div v-if="loading && !reservations.length" class="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
      <Loader2 class="mx-auto mb-3 h-5 w-5 animate-spin text-primary" /> Načítám rezervace.
    </div>
    <div v-else-if="error" class="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
      {{ error }}
    </div>
    <div v-else-if="!reservations.length" class="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
      Žádné rezervace pro zvolený filtr.
    </div>
    <div v-else class="space-y-2">
      <article v-for="reservation in reservations" :key="reservation.id" class="rounded-2xl border border-border bg-card p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-semibold text-foreground">{{ reservation.productName }}</h3>
              <Badge :variant="statusVariant(reservation.status)">{{ statusLabel(reservation.status) }}</Badge>
            </div>
            <p class="mt-1 text-sm font-medium">{{ reservation.reservedFor }}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ reservation.productSku }} · {{ locationLabel(reservation) }} · {{ fmtDate(reservation.createdAt) }}
            </p>
            <p v-if="reservation.note" class="mt-2 text-sm text-muted-foreground">{{ reservation.note }}</p>
            <p v-if="reservation.resolutionNote" class="mt-2 text-xs text-muted-foreground">
              Vyřízení: {{ reservation.resolutionNote }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-3">
            <div class="text-right">
              <div class="text-xs uppercase tracking-wide text-muted-foreground">Rezervováno</div>
              <div class="text-xl font-bold tabular-nums">{{ fmtQuantity(reservation.quantity) }}</div>
            </div>
            <div v-if="reservation.status === 'Active'" class="flex flex-wrap justify-end gap-2">
              <Button type="button" size="sm" variant="outline" @click="openResolve(reservation, 'release')">
                <Undo2 class="h-4 w-4" /> Uvolnit
              </Button>
              <Button type="button" size="sm" variant="coral" @click="openResolve(reservation, 'fulfill')">
                <Check class="h-4 w-4" /> Vyskladnit
              </Button>
            </div>
          </div>
        </div>
      </article>
    </div>
    <nav
      v-if="total > PAGE_SIZE"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
      aria-label="Stránkování rezervací"
    >
      <p class="text-sm text-muted-foreground">Strana {{ page }} z {{ totalPages }} · {{ total }} rezervací</p>
      <div class="flex gap-2">
        <Button type="button" size="sm" variant="outline" :disabled="loading || page <= 1" @click="load(page - 1)">
          <ChevronLeft class="h-4 w-4" /> Předchozí
        </Button>
        <Button type="button" size="sm" variant="outline" :disabled="loading || page >= totalPages" @click="load(page + 1)">
          Další <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
    </nav>
  </section>

  <Dialog v-model:open="createOpen">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Nová rezervace zásoby</DialogTitle>
        <DialogDescription>Rezervované množství zůstane fyzicky skladem, ale nebude dostupné pro jiný výdej.</DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="submitCreate">
        <div class="space-y-2">
          <Label for="reservation-product">Produkt</Label>
          <Select v-model="createForm.productId">
            <SelectTrigger id="reservation-product"><SelectValue placeholder="Vyberte produkt" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="product in products" :key="product.id" :value="product.id">
                {{ product.name }} · {{ product.sku }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="selectedProduct" class="text-xs text-muted-foreground">Skladový kód {{ selectedProduct.sku }}</p>
        </div>
        <div v-if="locations.length" class="space-y-2">
          <Label for="reservation-location">Pobočka</Label>
          <Select v-model="createForm.locationId">
            <SelectTrigger id="reservation-location"><SelectValue placeholder="Vyberte pobočku" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="location in locations" :key="location.id" :value="location.id">{{ location.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <Label for="reservation-quantity">Množství</Label>
          <Input id="reservation-quantity" v-model.number="createForm.quantity" type="number" min="0" step="0.001" inputmode="decimal" />
        </div>
        <div class="space-y-2">
          <Label for="reservation-for">Pro koho nebo pro co *</Label>
          <Input id="reservation-for" v-model="createForm.reservedFor" maxlength="200" placeholder="Např. Zakázka Z-104" />
        </div>
        <div class="space-y-2">
          <Label for="reservation-note">Poznámka</Label>
          <Input id="reservation-note" v-model="createForm.note" maxlength="500" placeholder="Volitelné" />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" @click="createOpen = false">Zrušit</Button>
          <Button type="submit" variant="coral" :disabled="createSaving">
            <Loader2 v-if="createSaving" class="h-4 w-4 animate-spin" /> Rezervovat
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="resolveOpen">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ resolveMode === 'release' ? 'Uvolnit rezervaci' : 'Vyskladnit rezervaci' }}</DialogTitle>
        <DialogDescription v-if="resolveMode === 'release'">
          Množství se znovu zpřístupní pro ostatní výdeje. Fyzický stav skladu se nezmění.
        </DialogDescription>
        <DialogDescription v-else>
          Celé rezervované množství se odečte ze skladu. Tuto akci nelze vrátit úpravou rezervace.
        </DialogDescription>
      </DialogHeader>
      <div class="rounded-lg bg-muted/40 p-3 text-sm">
        <div class="font-semibold">{{ selected?.productName }}</div>
        <div class="text-muted-foreground">{{ selected?.reservedFor }} · {{ fmtQuantity(selected?.quantity ?? 0) }}</div>
      </div>
      <div class="space-y-2">
        <Label for="resolution-note">Poznámka k vyřízení</Label>
        <Input id="resolution-note" v-model="resolutionNote" maxlength="500" placeholder="Volitelné" />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" @click="resolveOpen = false">Zpět</Button>
        <Button type="button" :variant="resolveMode === 'release' ? 'outline' : 'coral'" :disabled="resolving" @click="submitResolve">
          <Loader2 v-if="resolving" class="h-4 w-4 animate-spin" />
          {{ resolveMode === 'release' ? 'Uvolnit' : 'Vyskladnit' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
