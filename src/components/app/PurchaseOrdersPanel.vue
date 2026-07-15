<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  Archive,
  Building2,
  Check,
  ClipboardList,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  Truck,
  Users,
  X,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { usePurchaseOrders } from '@/composables/usePurchaseOrders'
import type {
  InventorySupplier,
  InventorySupplierInput,
  Location,
  Product,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderStatus,
} from '@/lib/types'

const props = defineProps<{
  products: Product[]
  locations: Location[]
  locationId: string | null
}>()

const emit = defineEmits<{
  received: []
}>()

const api = usePurchaseOrders()
const ALL_STATUSES = '__all__'
const NO_LOCATION = '__none__'

const loading = ref(true)
const loadError = ref(false)
const suppliers = ref<InventorySupplier[]>([])
const orders = ref<PurchaseOrder[]>([])
const orderPage = ref(1)
const orderTotal = ref(0)
const loadingMore = ref(false)
const statusFilter = ref<PurchaseOrderStatus | typeof ALL_STATUSES>(ALL_STATUSES)
let orderRequestId = 0

const activeSuppliers = computed(() => suppliers.value.filter((supplier) => !supplier.isArchived))

const statusOptions: Array<{ value: PurchaseOrderStatus | typeof ALL_STATUSES; label: string }> = [
  { value: ALL_STATUSES, label: 'Všechny stavy' },
  { value: 'Draft', label: 'Návrhy' },
  { value: 'Ordered', label: 'Objednané' },
  { value: 'PartiallyReceived', label: 'Částečně přijaté' },
  { value: 'Received', label: 'Přijaté' },
  { value: 'Cancelled', label: 'Zrušené' },
]

const statusMeta: Record<
  PurchaseOrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  Draft: { label: 'Návrh', variant: 'outline' },
  Ordered: { label: 'Objednáno', variant: 'secondary' },
  PartiallyReceived: { label: 'Částečně přijato', variant: 'default' },
  Received: { label: 'Přijato', variant: 'default' },
  Cancelled: { label: 'Zrušeno', variant: 'destructive' },
}

async function loadSuppliers(includeArchived = false) {
  suppliers.value = await api.suppliers(includeArchived)
}

async function loadOrders(append = false, page = orderPage.value): Promise<boolean> {
  const requestId = ++orderRequestId
  let response: Awaited<ReturnType<typeof api.orders>>
  try {
    response = await api.orders({
      page,
      status: statusFilter.value === ALL_STATUSES ? null : statusFilter.value,
      locationId: props.locationId,
    })
  } catch (error) {
    if (requestId !== orderRequestId) return false
    throw error
  }
  if (requestId !== orderRequestId) return false
  orders.value = append ? [...orders.value, ...response.items] : response.items
  orderTotal.value = response.total
  return true
}

async function resetAndLoadOrders() {
  orderPage.value = 1
  await loadOrders()
}

async function loadMoreOrders() {
  if (loadingMore.value || orders.value.length >= orderTotal.value) return
  loadingMore.value = true
  const page = orderPage.value + 1
  orderPage.value = page
  try {
    await loadOrders(true, page)
  } catch (error) {
    if (orderPage.value === page) orderPage.value = page - 1
    console.error(error)
    toast.error('Další objednávky se nepodařilo načíst.')
  } finally {
    loadingMore.value = false
  }
}

function upsertOrder(order: PurchaseOrder) {
  const index = orders.value.findIndex((current) => current.id === order.id)
  if (index >= 0) orders.value[index] = order
  else {
    orders.value.unshift(order)
    orderTotal.value += 1
  }
}

async function refreshOrdersAfterMutation() {
  try {
    await resetAndLoadOrders()
  } catch (error) {
    console.error(error)
    toast.error('Změna je uložená, ale seznam objednávek se nepodařilo obnovit.')
  }
}

async function reload() {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([loadSuppliers(), resetAndLoadOrders()])
  } catch (error) {
    console.error(error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(reload)
watch([() => props.locationId, statusFilter], async () => {
  try {
    await resetAndLoadOrders()
  } catch (error) {
    console.error(error)
    toast.error('Nákupní objednávky se nepodařilo načíst.')
  }
})

function locationName(id: string | null): string | null {
  if (!id) return null
  return props.locations.find((location) => location.id === id)?.name ?? 'Neznámá pobočka'
}

function fmtMoney(value: number | null): string {
  return value == null
    ? 'Bez ceny'
    : value.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })
}

function fmtDate(value: string | null): string {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('cs-CZ')
}

function fmtQuantity(value: number): string {
  return value.toLocaleString('cs-CZ', { maximumFractionDigits: 3 })
}

function today(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// --- Dodavatelé ---
const supplierDialogOpen = ref(false)
const supplierDialogLoading = ref(false)
const supplierSaving = ref(false)
const editingSupplierId = ref<string | null>(null)

interface SupplierForm {
  name: string
  ico: string
  dic: string
  email: string
  phone: string
  contactPerson: string
  note: string
}

const supplierForm = reactive<SupplierForm>({
  name: '',
  ico: '',
  dic: '',
  email: '',
  phone: '',
  contactPerson: '',
  note: '',
})

function resetSupplierForm() {
  editingSupplierId.value = null
  Object.assign(supplierForm, {
    name: '',
    ico: '',
    dic: '',
    email: '',
    phone: '',
    contactPerson: '',
    note: '',
  })
}

async function openSupplierDialog() {
  supplierDialogOpen.value = true
  supplierDialogLoading.value = true
  resetSupplierForm()
  try {
    await loadSuppliers(true)
  } catch (error) {
    console.error(error)
    toast.error('Dodavatele se nepodařilo načíst.')
  } finally {
    supplierDialogLoading.value = false
  }
}

function editSupplier(supplier: InventorySupplier) {
  editingSupplierId.value = supplier.id
  Object.assign(supplierForm, {
    name: supplier.name,
    ico: supplier.ico ?? '',
    dic: supplier.dic ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    contactPerson: supplier.contactPerson ?? '',
    note: supplier.note ?? '',
  })
}

function supplierInput(): InventorySupplierInput {
  const optional = (value: string) => value.trim() || null
  return {
    name: supplierForm.name.trim(),
    ico: optional(supplierForm.ico),
    dic: optional(supplierForm.dic),
    email: optional(supplierForm.email),
    phone: optional(supplierForm.phone),
    contactPerson: optional(supplierForm.contactPerson),
    note: optional(supplierForm.note),
  }
}

async function saveSupplier() {
  if (!supplierForm.name.trim()) return toast.error('Zadejte název dodavatele.')
  supplierSaving.value = true
  try {
    if (editingSupplierId.value) {
      await api.updateSupplier(editingSupplierId.value, supplierInput())
      toast.success('Dodavatel byl upraven.')
    } else {
      await api.createSupplier(supplierInput())
      toast.success('Dodavatel byl přidán.')
    }
    resetSupplierForm()
    await loadSuppliers(true)
  } catch (error) {
    console.error(error)
    toast.error('Dodavatele se nepodařilo uložit.')
  } finally {
    supplierSaving.value = false
  }
}

async function toggleSupplierArchive(supplier: InventorySupplier) {
  if (!supplier.isArchived && !window.confirm(`Archivovat dodavatele ${supplier.name}?`)) return
  try {
    if (supplier.isArchived) await api.restoreSupplier(supplier.id)
    else await api.archiveSupplier(supplier.id)
    await loadSuppliers(true)
    if (editingSupplierId.value === supplier.id) resetSupplierForm()
    toast.success(supplier.isArchived ? 'Dodavatel byl obnoven.' : 'Dodavatel byl archivován.')
  } catch (error) {
    console.error(error)
    toast.error('Stav dodavatele se nepodařilo změnit.')
  }
}

function closeSupplierDialog(open: boolean) {
  supplierDialogOpen.value = open
  if (!open) {
    resetSupplierForm()
    void loadSuppliers()
  }
}

// --- Návrh objednávky ---
interface OrderLineForm {
  productId: string
  name: string
  sku: string
  quantity: number | ''
  unitCost: number | ''
}

const orderDialogOpen = ref(false)
const orderSaving = ref(false)
const editingOrderId = ref<string | null>(null)
const productSearch = ref('')
const orderLines = ref<OrderLineForm[]>([])
const orderForm = reactive({
  supplierId: '',
  locationId: NO_LOCATION,
  orderedOn: today(),
  expectedOn: '',
  note: '',
})

const productResults = computed(() => {
  const query = productSearch.value.trim().toLocaleLowerCase('cs-CZ')
  if (!query) return []
  const used = new Set(orderLines.value.map((line) => line.productId))
  return props.products
    .filter(
      (product) =>
        !used.has(product.id) &&
        (product.name.toLocaleLowerCase('cs-CZ').includes(query) ||
          product.sku.toLocaleLowerCase('cs-CZ').includes(query) ||
          (product.ean ?? '').includes(query)),
    )
    .slice(0, 8)
})

function defaultLocation(): string {
  return props.locationId ?? (props.locations.length === 1 ? props.locations[0]!.id : NO_LOCATION)
}

function resetOrderForm() {
  editingOrderId.value = null
  orderForm.supplierId = activeSuppliers.value[0]?.id ?? ''
  orderForm.locationId = defaultLocation()
  orderForm.orderedOn = today()
  orderForm.expectedOn = ''
  orderForm.note = ''
  orderLines.value = []
  productSearch.value = ''
}

function openNewOrder() {
  if (activeSuppliers.value.length === 0) {
    toast.error('Nejdřív přidejte alespoň jednoho dodavatele.')
    void openSupplierDialog()
    return
  }
  resetOrderForm()
  orderDialogOpen.value = true
}

function editOrder(order: PurchaseOrder) {
  editingOrderId.value = order.id
  orderForm.supplierId = order.supplierId
  orderForm.locationId = order.locationId ?? NO_LOCATION
  orderForm.orderedOn = order.orderedOn
  orderForm.expectedOn = order.expectedOn ?? ''
  orderForm.note = order.note ?? ''
  orderLines.value = order.items.map((item) => ({
    productId: item.productId,
    name: item.productName,
    sku: item.productSku,
    quantity: item.orderedQuantity,
    unitCost: item.unitCost ?? '',
  }))
  productSearch.value = ''
  orderDialogOpen.value = true
}

function addOrderProduct(product: Product) {
  orderLines.value.push({
    productId: product.id,
    name: product.name,
    sku: product.sku,
    quantity: 1,
    unitCost: product.purchasePrice ?? '',
  })
  productSearch.value = ''
}

function removeOrderLine(productId: string) {
  orderLines.value = orderLines.value.filter((line) => line.productId !== productId)
}

function orderInput(): PurchaseOrderInput {
  return {
    supplierId: orderForm.supplierId,
    locationId: orderForm.locationId === NO_LOCATION ? null : orderForm.locationId,
    orderedOn: orderForm.orderedOn || null,
    expectedOn: orderForm.expectedOn || null,
    note: orderForm.note.trim() || null,
    items: orderLines.value.map((line) => ({
      productId: line.productId,
      orderedQuantity: Number(line.quantity),
      unitCost: line.unitCost === '' ? null : Number(line.unitCost),
    })),
  }
}

async function saveOrder() {
  if (!orderForm.supplierId) return toast.error('Vyberte dodavatele.')
  if (props.locations.length > 1 && orderForm.locationId === NO_LOCATION)
    return toast.error('Vyberte pobočku, pro kterou objednávku vytváříte.')
  if (orderLines.value.length === 0) return toast.error('Přidejte alespoň jednu položku.')
  if (orderLines.value.some((line) => !(Number(line.quantity) > 0)))
    return toast.error('Množství musí být kladné.')
  if (orderLines.value.some((line) => line.unitCost !== '' && Number(line.unitCost) < 0))
    return toast.error('Nákupní cena nesmí být záporná.')

  orderSaving.value = true
  try {
    let saved: PurchaseOrder
    if (editingOrderId.value) {
      saved = await api.updateOrder(editingOrderId.value, orderInput())
      toast.success('Návrh objednávky byl upraven.')
    } else {
      saved = await api.createOrder(orderInput())
      toast.success('Návrh objednávky byl vytvořen.')
    }
    upsertOrder(saved)
    orderDialogOpen.value = false
    await refreshOrdersAfterMutation()
  } catch (error) {
    console.error(error)
    toast.error('Objednávku se nepodařilo uložit.')
  } finally {
    orderSaving.value = false
  }
}

async function placeOrder(order: PurchaseOrder) {
  if (!window.confirm(`Označit ${order.number} jako objednanou u dodavatele?`)) return
  try {
    upsertOrder(await api.placeOrder(order.id))
    toast.success(`${order.number} je objednaná.`)
    await refreshOrdersAfterMutation()
  } catch (error) {
    console.error(error)
    toast.error('Objednávku se nepodařilo odeslat.')
  }
}

async function cancelOrder(order: PurchaseOrder) {
  if (!window.confirm(`Zrušit objednávku ${order.number}?`)) return
  try {
    upsertOrder(await api.cancelOrder(order.id, null))
    toast.success('Objednávka byla zrušena.')
    await refreshOrdersAfterMutation()
  } catch (error) {
    console.error(error)
    toast.error('Objednávku se nepodařilo zrušit.')
  }
}

function canCancel(order: PurchaseOrder): boolean {
  return (
    (order.status === 'Draft' || order.status === 'Ordered') &&
    order.items.every((item) => item.receivedQuantity === 0)
  )
}

// --- Částečný / úplný příjem objednávky ---
interface ReceiveLineForm {
  allocationId: string
  id: string
  productId: string
  name: string
  sku: string
  remaining: number
  quantity: number | ''
  unitCost: number | ''
  lotTrackingEnabled: boolean
  lotNumber: string
  expiresOn: string
}

const receiveDialogOpen = ref(false)
const receiveSaving = ref(false)
const receivingOrder = ref<PurchaseOrder | null>(null)
const receiveLines = ref<ReceiveLineForm[]>([])
const receiveIdempotencyKey = ref('')
const receiveForm = reactive({ documentNumber: '', receivedOn: today(), note: '' })

function openReceive(order: PurchaseOrder) {
  receivingOrder.value = order
  receiveForm.documentNumber = ''
  receiveForm.receivedOn = today()
  receiveForm.note = ''
  receiveLines.value = order.items
    .filter((item) => item.remainingQuantity > 0)
    .map((item) => ({
      allocationId: crypto.randomUUID(),
      id: item.id,
      productId: item.productId,
      name: item.productName,
      sku: item.productSku,
      remaining: item.remainingQuantity,
      quantity: 0,
      unitCost: item.unitCost ?? '',
      lotTrackingEnabled:
        props.products.find((product) => product.id === item.productId)?.lotTrackingEnabled ??
        false,
      lotNumber: '',
      expiresOn: '',
    }))
  // Klíč se při neúspěšném pokusu nemění. Stejné kliknutí po timeoutu proto nemůže vytvořit
  // druhou příjemku ani druhý skladový pohyb.
  receiveIdempotencyKey.value = crypto.randomUUID()
  receiveDialogOpen.value = true
}

function receiveAllRemaining() {
  const filled = new Set<string>()
  for (const line of receiveLines.value) {
    line.quantity = filled.has(line.id) ? 0 : line.remaining
    filled.add(line.id)
  }
}

function addReceiveLot(line: ReceiveLineForm) {
  receiveLines.value.push({
    ...line,
    allocationId: crypto.randomUUID(),
    quantity: 0,
    lotNumber: '',
    expiresOn: '',
  })
}

async function receiveOrder() {
  const order = receivingOrder.value
  if (!order) return
  const selected = receiveLines.value.filter((line) => Number(line.quantity) > 0)
  if (selected.length === 0) return toast.error('Zadejte množství alespoň u jedné položky.')
  const receivedByItem = new Map<string, number>()
  for (const line of selected)
    receivedByItem.set(line.id, (receivedByItem.get(line.id) ?? 0) + Number(line.quantity))
  if (selected.some((line) => (receivedByItem.get(line.id) ?? 0) > line.remaining))
    return toast.error('Nelze přijmout více než zbývá na objednávce.')
  if (selected.some((line) => line.unitCost !== '' && Number(line.unitCost) < 0))
    return toast.error('Nákupní cena nesmí být záporná.')
  if (selected.some((line) => line.lotTrackingEnabled && !line.lotNumber.trim()))
    return toast.error('U produktů se sledováním šarží vyplňte číslo šarže.')

  receiveSaving.value = true
  try {
    const result = await api.receiveOrder(order.id, {
      idempotencyKey: receiveIdempotencyKey.value,
      documentNumber: receiveForm.documentNumber.trim() || null,
      receivedOn: receiveForm.receivedOn || null,
      note: receiveForm.note.trim() || null,
      items: selected.map((line) => ({
        purchaseOrderItemId: line.id,
        quantity: Number(line.quantity),
        unitCost: line.unitCost === '' ? null : Number(line.unitCost),
        lotNumber: line.lotNumber.trim() || null,
        expiresOn: line.expiresOn || null,
      })),
    })
    receiveDialogOpen.value = false
    receiveIdempotencyKey.value = ''
    receivingOrder.value = null
    upsertOrder(result.order)
    emit('received')
    toast.success(
      result.order.status === 'Received'
        ? `${result.order.number} je kompletně přijatá.`
        : 'Částečná dodávka byla přijata.',
    )
    await refreshOrdersAfterMutation()
  } catch (error) {
    console.error(error)
    toast.error('Dodávku se nepodařilo přijmout. Můžete bezpečně zkusit znovu.')
  } finally {
    receiveSaving.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl border border-border bg-card" data-testid="purchase-orders-panel">
    <div
      class="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h2 class="flex items-center gap-2 font-semibold">
          <Truck class="h-4 w-4 text-primary" /> Nákupní objednávky
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Od návrhu přes objednání až po jednu nebo více dodávek na sklad.
        </p>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:flex">
        <Button variant="outline" class="w-full" @click="openSupplierDialog">
          <Users class="h-4 w-4" /> Dodavatelé
        </Button>
        <Button class="w-full" data-testid="new-purchase-order" @click="openNewOrder">
          <Plus class="h-4 w-4" /> Nová objednávka
        </Button>
      </div>
    </div>

    <div class="border-b border-border p-4">
      <Label for="purchase-order-status" class="sr-only">Stav objednávek</Label>
      <Select v-model="statusFilter">
        <SelectTrigger id="purchase-order-status" class="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="loading" class="flex justify-center p-10">
      <Loader2 class="h-5 w-5 animate-spin text-primary" />
    </div>
    <div v-else-if="loadError" class="p-6 text-center">
      <p class="text-sm text-muted-foreground">Objednávky se nepodařilo načíst.</p>
      <Button variant="outline" size="sm" class="mt-3" @click="reload">
        <RotateCcw class="h-4 w-4" /> Zkusit znovu
      </Button>
    </div>
    <div v-else-if="orders.length === 0" class="p-8 text-center text-sm text-muted-foreground">
      <ClipboardList class="mx-auto mb-2 h-8 w-8" />
      V tomto výběru zatím není žádná nákupní objednávka.
    </div>
    <div v-else class="divide-y divide-border">
      <article v-for="order in orders" :key="order.id" class="p-4" :data-order-id="order.id">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold">{{ order.number }}</span>
              <Badge :variant="statusMeta[order.status].variant">
                {{ statusMeta[order.status].label }}
              </Badge>
            </div>
            <div class="mt-1 text-sm text-muted-foreground">
              {{ order.supplierName }} · {{ fmtDate(order.orderedOn) }}
              <template v-if="locationName(order.locationId)">
                · {{ locationName(order.locationId) }}
              </template>
            </div>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{{ order.items.length }} položek</span>
              <span>{{ fmtMoney(order.totalCost) }}</span>
              <span v-if="order.expectedOn">Dodání {{ fmtDate(order.expectedOn) }}</span>
              <span v-if="order.receipts.length">{{ order.receipts.length }} příjemek</span>
            </div>
            <div
              v-if="order.status === 'PartiallyReceived'"
              class="mt-2 text-xs font-medium text-primary"
            >
              Přijato
              {{ fmtQuantity(order.items.reduce((sum, item) => sum + item.receivedQuantity, 0)) }}
              z {{ fmtQuantity(order.items.reduce((sum, item) => sum + item.orderedQuantity, 0)) }}
              jednotek
            </div>
          </div>
          <div class="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            <Button
              v-if="order.status === 'Draft'"
              variant="outline"
              size="sm"
              @click="editOrder(order)"
            >
              <Pencil class="h-4 w-4" /> Upravit
            </Button>
            <Button v-if="order.status === 'Draft'" size="sm" @click="placeOrder(order)">
              <Send class="h-4 w-4" /> Objednat
            </Button>
            <Button
              v-if="order.status === 'Ordered' || order.status === 'PartiallyReceived'"
              size="sm"
              data-testid="receive-purchase-order"
              @click="openReceive(order)"
            >
              <PackageCheck class="h-4 w-4" /> Přijmout
            </Button>
            <Button
              v-if="canCancel(order)"
              variant="ghost"
              size="sm"
              class="text-destructive"
              @click="cancelOrder(order)"
            >
              <X class="h-4 w-4" /> Zrušit
            </Button>
          </div>
        </div>
      </article>
      <div v-if="orders.length < orderTotal" class="flex justify-center p-4">
        <Button variant="outline" :disabled="loadingMore" @click="loadMoreOrders">
          <Loader2 v-if="loadingMore" class="h-4 w-4 animate-spin" />
          <Plus v-else class="h-4 w-4" /> Načíst další objednávky
        </Button>
      </div>
    </div>
  </section>

  <!-- Dodavatelé: jeden dialog obsahuje adresář i rychlé vytvoření/editaci. -->
  <Dialog :open="supplierDialogOpen" @update:open="closeSupplierDialog">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Dodavatelé</DialogTitle>
        <DialogDescription>
          Udržujte kontakty pro nákupní objednávky. Archivovaný dodavatel zůstane v historii.
        </DialogDescription>
      </DialogHeader>

      <div v-if="supplierDialogLoading" class="flex justify-center py-10">
        <Loader2 class="h-5 w-5 animate-spin text-primary" />
      </div>
      <div v-else class="grid gap-5 md:grid-cols-[1fr_1.1fr]">
        <div class="order-2 space-y-2 md:order-1">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">Adresář</h3>
            <Button v-if="editingSupplierId" variant="ghost" size="sm" @click="resetSupplierForm">
              <Plus class="h-4 w-4" /> Nový
            </Button>
          </div>
          <p
            v-if="suppliers.length === 0"
            class="rounded-lg border p-4 text-sm text-muted-foreground"
          >
            Zatím nemáte žádného dodavatele.
          </p>
          <div v-else class="max-h-80 space-y-2 overflow-y-auto pr-1">
            <div
              v-for="supplier in suppliers"
              :key="supplier.id"
              class="flex items-center justify-between gap-2 rounded-lg border p-3"
              :class="supplier.isArchived ? 'opacity-60' : ''"
            >
              <button
                type="button"
                class="min-w-0 flex-1 text-left disabled:cursor-default"
                :disabled="supplier.isArchived"
                @click="editSupplier(supplier)"
              >
                <span class="block truncate text-sm font-medium">{{ supplier.name }}</span>
                <span class="block truncate text-xs text-muted-foreground">
                  {{ supplier.contactPerson || supplier.email || supplier.ico || 'Bez kontaktu' }}
                  <template v-if="supplier.isArchived"> · archivováno</template>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                :title="supplier.isArchived ? 'Obnovit' : 'Archivovat'"
                @click="toggleSupplierArchive(supplier)"
              >
                <RotateCcw v-if="supplier.isArchived" class="h-4 w-4" />
                <Archive v-else class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <form class="order-1 space-y-3 md:order-2" @submit.prevent="saveSupplier">
          <h3 class="text-sm font-semibold">
            {{ editingSupplierId ? 'Upravit dodavatele' : 'Nový dodavatel' }}
          </h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1.5 text-sm font-medium sm:col-span-2">
              <span>Název *</span>
              <Input v-model="supplierForm.name" autocomplete="organization" />
            </label>
            <label class="space-y-1.5 text-sm font-medium">
              <span>IČO</span>
              <Input v-model="supplierForm.ico" inputmode="numeric" />
            </label>
            <label class="space-y-1.5 text-sm font-medium">
              <span>DIČ</span>
              <Input v-model="supplierForm.dic" />
            </label>
            <label class="space-y-1.5 text-sm font-medium">
              <span>Kontaktní osoba</span>
              <Input v-model="supplierForm.contactPerson" autocomplete="name" />
            </label>
            <label class="space-y-1.5 text-sm font-medium">
              <span>Telefon</span>
              <Input v-model="supplierForm.phone" type="tel" autocomplete="tel" />
            </label>
            <label class="space-y-1.5 text-sm font-medium sm:col-span-2">
              <span>E-mail</span>
              <Input v-model="supplierForm.email" type="email" autocomplete="email" />
            </label>
            <label class="space-y-1.5 text-sm font-medium sm:col-span-2">
              <span>Poznámka</span>
              <Textarea v-model="supplierForm.note" rows="2" />
            </label>
          </div>
          <Button type="submit" class="w-full sm:w-auto" :disabled="supplierSaving">
            <Loader2 v-if="supplierSaving" class="h-4 w-4 animate-spin" />
            <Check v-else class="h-4 w-4" />
            {{ editingSupplierId ? 'Uložit změny' : 'Přidat dodavatele' }}
          </Button>
        </form>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Návrh objednávky -->
  <Dialog v-model:open="orderDialogOpen">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{{
          editingOrderId ? 'Upravit návrh' : 'Nová nákupní objednávka'
        }}</DialogTitle>
        <DialogDescription>
          Návrh můžete upravovat, dokud ho neoznačíte jako objednaný.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="po-supplier">Dodavatel *</Label>
          <Select v-model="orderForm.supplierId">
            <SelectTrigger id="po-supplier"
              ><SelectValue placeholder="Vyberte dodavatele"
            /></SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="supplier in activeSuppliers"
                :key="supplier.id"
                :value="supplier.id"
              >
                {{ supplier.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div v-if="locations.length > 0" class="space-y-1.5">
          <Label for="po-location">Pobočka</Label>
          <Select v-model="orderForm.locationId">
            <SelectTrigger id="po-location"
              ><SelectValue placeholder="Vyberte pobočku"
            /></SelectTrigger>
            <SelectContent>
              <SelectItem v-if="locations.length <= 1" :value="NO_LOCATION">Bez pobočky</SelectItem>
              <SelectItem v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label class="space-y-1.5 text-sm font-medium">
          <span>Datum objednávky</span>
          <Input v-model="orderForm.orderedOn" type="date" />
        </label>
        <label class="space-y-1.5 text-sm font-medium">
          <span>Očekávané dodání</span>
          <Input v-model="orderForm.expectedOn" type="date" />
        </label>
        <label class="space-y-1.5 text-sm font-medium sm:col-span-2">
          <span>Poznámka</span>
          <Textarea v-model="orderForm.note" rows="2" />
        </label>
      </div>

      <div class="space-y-3">
        <div>
          <Label for="po-product-search">Položky *</Label>
          <div class="relative mt-1.5">
            <Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="po-product-search"
              v-model="productSearch"
              class="pl-9"
              placeholder="Hledat produkt podle názvu, kódu nebo EAN"
            />
          </div>
          <div v-if="productResults.length" class="mt-1 overflow-hidden rounded-lg border">
            <button
              v-for="product in productResults"
              :key="product.id"
              type="button"
              class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
              @click="addOrderProduct(product)"
            >
              <span class="truncate">{{ product.name }}</span>
              <span class="ml-2 text-xs text-muted-foreground">{{ product.sku }}</span>
            </button>
          </div>
        </div>

        <p
          v-if="orderLines.length === 0"
          class="rounded-lg border p-4 text-sm text-muted-foreground"
        >
          Vyhledejte a přidejte zboží, které chcete objednat.
        </p>
        <div v-else class="divide-y rounded-lg border">
          <div
            v-for="line in orderLines"
            :key="line.productId"
            class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_100px_130px_40px] sm:items-end"
          >
            <div class="min-w-0">
              <div class="truncate text-sm font-medium">{{ line.name }}</div>
              <div class="text-xs text-muted-foreground">{{ line.sku }}</div>
            </div>
            <label class="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Množství</span>
              <Input v-model.number="line.quantity" type="number" min="0.001" step="0.001" />
            </label>
            <label class="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Nákup / ks</span>
              <Input v-model.number="line.unitCost" type="number" min="0" step="0.01" />
            </label>
            <Button
              variant="ghost"
              size="icon"
              title="Odebrat"
              @click="removeOrderLine(line.productId)"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="orderDialogOpen = false">Zavřít</Button>
        <Button :disabled="orderSaving" data-testid="save-purchase-order" @click="saveOrder">
          <Loader2 v-if="orderSaving" class="h-4 w-4 animate-spin" />
          <Check v-else class="h-4 w-4" /> Uložit návrh
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Příjem objednávky -->
  <Dialog v-model:open="receiveDialogOpen">
    <DialogContent class="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Přijmout dodávku {{ receivingOrder?.number }}</DialogTitle>
        <DialogDescription>
          Zadejte skutečně dodané množství. Zbytek zůstane otevřený pro další příjemku.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-3 sm:grid-cols-3">
        <label class="space-y-1.5 text-sm font-medium">
          <span>Číslo dokladu</span>
          <Input v-model="receiveForm.documentNumber" placeholder="Dodací list / faktura" />
        </label>
        <label class="space-y-1.5 text-sm font-medium">
          <span>Datum příjmu</span>
          <Input v-model="receiveForm.receivedOn" type="date" />
        </label>
        <label class="space-y-1.5 text-sm font-medium">
          <span>Poznámka</span>
          <Input v-model="receiveForm.note" />
        </label>
      </div>

      <div class="flex justify-end">
        <Button type="button" variant="outline" size="sm" @click="receiveAllRemaining">
          <PackageCheck class="h-4 w-4" /> Vyplnit vše zbývající
        </Button>
      </div>

      <div class="divide-y rounded-lg border">
        <div
          v-for="line in receiveLines"
          :key="line.allocationId"
          class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_120px_130px] sm:items-end"
        >
          <div class="min-w-0">
            <div class="truncate text-sm font-medium">{{ line.name }}</div>
            <div class="text-xs text-muted-foreground">
              {{ line.sku }} · zbývá {{ fmtQuantity(line.remaining) }}
            </div>
            <div v-if="line.lotTrackingEnabled" class="mt-2 grid gap-2 sm:grid-cols-2">
              <label class="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Číslo šarže *</span>
                <Input v-model="line.lotNumber" placeholder="Např. 2026-07-A" />
              </label>
              <label class="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Expirace</span>
                <Input v-model="line.expiresOn" type="date" />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="justify-start sm:col-span-2"
                @click="addReceiveLot(line)"
              >
                <Plus class="h-4 w-4" /> Rozdělit do další šarže
              </Button>
            </div>
          </div>
          <label class="space-y-1 text-xs font-medium text-muted-foreground">
            <span>Přijato nyní</span>
            <Input
              v-model.number="line.quantity"
              type="number"
              min="0"
              :max="line.remaining"
              step="0.001"
            />
          </label>
          <label class="space-y-1 text-xs font-medium text-muted-foreground">
            <span>Nákup / ks</span>
            <Input v-model.number="line.unitCost" type="number" min="0" step="0.01" />
          </label>
        </div>
      </div>

      <p class="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Building2 class="mt-0.5 h-4 w-4 shrink-0" />
        Příjemka se zapíše na pobočku objednávky a pro každý přijatý řádek vytvoří jeden
        dohledatelný pohyb ve skladové kartě. Opakování po výpadku nevytvoří duplicitu.
      </p>

      <DialogFooter>
        <Button variant="outline" @click="receiveDialogOpen = false">Zavřít</Button>
        <Button
          :disabled="receiveSaving"
          data-testid="confirm-purchase-order-receipt"
          @click="receiveOrder"
        >
          <Loader2 v-if="receiveSaving" class="h-4 w-4 animate-spin" />
          <PackageCheck v-else class="h-4 w-4" /> Přijmout na sklad
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
