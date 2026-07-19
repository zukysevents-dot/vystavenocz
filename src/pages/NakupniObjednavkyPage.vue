<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ClipboardList, Loader2, Mail, PackageCheck, Plus, ReceiptText, Send, Sparkles, Trash2, XCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LoadError from '@/components/app/LoadError.vue'
import { isApiMode } from '@/lib/http'
import { useLocations } from '@/composables/useLocations'
import { useProducts } from '@/composables/useProducts'
import { usePurchaseOrders, type PurchaseOrder, type PurchaseOrderStatus, type SupplierInvoice } from '@/composables/usePurchaseOrders'
import { useSuppliers, type Supplier } from '@/composables/useSuppliers'
import { toast } from '@/components/ui/sonner'

type DraftLine = { productId: string; quantity: number | ''; unitCost: number | '' }
const apiMode = isApiMode()
const router = useRouter()
const ordersApi = usePurchaseOrders()
const suppliersApi = useSuppliers()
const { products, load: loadProducts } = useProducts()
const { locations, load: loadLocations } = useLocations()
const orders = ref<PurchaseOrder[]>([])
const invoices = ref<SupplierInvoice[]>([])
const suppliers = ref<Supplier[]>([])
const loading = ref(apiMode)
const loadError = ref(false)
const saving = ref(false)
const orderDialogOpen = ref(false)
const receiptDialogOpen = ref(false)
const invoiceDialogOpen = ref(false)
const productSearch = ref('')
const receivingOrder = ref<PurchaseOrder | null>(null)
const invoicingOrder = ref<PurchaseOrder | null>(null)
const orderForm = reactive({ supplierId: '', orderedOn: today(), expectedOn: '', destinationLocationId: '', externalReference: '', note: '', lines: [] as DraftLine[] })
const receiptForm = reactive({ documentDate: today(), destinationLocationId: '', externalReference: '', note: '', lines: [] as DraftLine[] })
const invoiceForm = reactive({ invoiceNumber: '', receivedOn: today(), dueOn: '', totalAmount: '' as number | '', note: '' })

const productResults = computed(() => {
  const query = productSearch.value.trim().toLowerCase()
  if (!query) return []
  return products.value.filter((product) => (product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)) && !orderForm.lines.some((line) => line.productId === product.id)).slice(0, 8)
})

function today() { return new Date().toISOString().slice(0, 10) }
function text(value: string) { return value.trim() || null }
function statusLabel(status: PurchaseOrderStatus) {
  return ({ Draft: 'Koncept', Sent: 'Odesláno', PartiallyReceived: 'Částečně přijato', Received: 'Přijato', Cancelled: 'Zrušeno' } as const)[status]
}
function statusClass(status: PurchaseOrderStatus) {
  return status === 'Received' ? 'bg-success/15 text-success' : status === 'Cancelled' ? 'bg-muted text-muted-foreground' : status === 'Draft' ? 'bg-warning/15 text-warning' : 'bg-primary/15 text-primary'
}
function locationName(id: string | null) { return !id ? 'Nezařazený sklad' : locations.value.find((location) => location.id === id)?.name ?? 'Neznámý sklad' }
function productName(id: string) { const product = products.value.find((item) => item.id === id); return product ? `${product.name} · ${product.sku}` : 'Neznámá položka' }
function invoicesFor(orderId: string) { return invoices.value.filter((invoice) => invoice.purchaseOrderId === orderId) }

async function reload() {
  loading.value = true; loadError.value = false
  try {
    const [result, supplierItems, invoiceResult] = await Promise.all([ordersApi.list(), suppliersApi.list(), ordersApi.supplierInvoices(), loadProducts(), loadLocations()])
    orders.value = result.items
    suppliers.value = supplierItems
    invoices.value = invoiceResult.items
  } catch (error) { console.error(error); loadError.value = true } finally { loading.value = false }
}
function resetOrderForm() {
  Object.assign(orderForm, { supplierId: suppliers.value[0]?.id ?? '', orderedOn: today(), expectedOn: '', destinationLocationId: locations.value.length === 1 ? locations.value[0].id : '', externalReference: '', note: '', lines: [] })
  productSearch.value = ''; orderDialogOpen.value = true
}
function addProduct(productId: string) {
  const product = products.value.find((item) => item.id === productId)
  if (!product) return
  orderForm.lines.push({ productId, quantity: 1, unitCost: product.purchasePrice ?? '' })
  productSearch.value = ''
}
async function createOrder() {
  if (!orderForm.supplierId) return toast.error('Vyberte dodavatele.')
  if (!orderForm.lines.length) return toast.error('Přidejte alespoň jednu položku.')
  saving.value = true
  try {
    await ordersApi.create({
      supplierId: orderForm.supplierId, orderedOn: orderForm.orderedOn || null, expectedOn: orderForm.expectedOn || null,
      destinationLocationId: orderForm.destinationLocationId || null, externalReference: text(orderForm.externalReference), note: text(orderForm.note),
      items: orderForm.lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), unitCost: line.unitCost === '' ? null : Number(line.unitCost) })),
    })
    orderDialogOpen.value = false; toast.success('Koncept objednávky uložen. Sklad se nezměnil.'); await reload()
  } catch (error) { console.error(error); toast.error('Objednávku se nepodařilo uložit.') } finally { saving.value = false }
}
async function send(order: PurchaseOrder) {
  if (!window.confirm(`Odeslat objednávku ${order.number ?? 'bez čísla'} dodavateli? Po odeslání z ní půjde vytvořit příjemka.`)) return
  saving.value = true
  try { await ordersApi.send(order.id); toast.success('Objednávka je odeslaná a připravená na příjem.'); await reload() }
  catch (error) { console.error(error); toast.error('Objednávku se nepodařilo odeslat.') } finally { saving.value = false }
}
async function sendEmail(order: PurchaseOrder) {
  if (!window.confirm(`Poslat objednávku ${order.number ?? ''} na e-mail dodavatele?`)) return
  saving.value = true
  try { await ordersApi.sendEmail(order.id, {}); toast.success('Objednávka byla odeslána e-mailem dodavateli.'); await reload() }
  catch (error) { console.error(error); toast.error('E-mail se nepodařilo odeslat. Zkontrolujte e-mail u dodavatele; objednávka ani sklad se nezměnily.') } finally { saving.value = false }
}
async function fillSuggestions() {
  if (!orderForm.supplierId) return toast.error('Nejdřív vyberte dodavatele.')
  saving.value = true
  try {
    const suggestion = await ordersApi.suggestions(orderForm.supplierId, orderForm.destinationLocationId || null)
    if (!suggestion.items.length) return toast.message('Pro tohoto dodavatele nyní není co doobjednat. Přidejte položky a balení v Dodavatelé.')
    orderForm.lines = suggestion.items.map((item) => ({ productId: item.productId, quantity: item.recommendedQuantity, unitCost: item.unitCost ?? '' }))
    toast.success('Návrh byl předvyplněn podle stavu skladu a nastavených balení.')
  } catch (error) { console.error(error); toast.error('Návrh se nepodařilo načíst.') } finally { saving.value = false }
}
async function cancel(order: PurchaseOrder) {
  if (!window.confirm('Zrušit objednávku? Již potvrzené příjemky ani skladové pohyby se tím nezmění.')) return
  saving.value = true
  try { await ordersApi.cancel(order.id); toast.success('Objednávka byla zrušena.'); await reload() }
  catch (error) { console.error(error); toast.error('Objednávku se nepodařilo zrušit.') } finally { saving.value = false }
}
function openReceipt(order: PurchaseOrder) {
  receivingOrder.value = order
  Object.assign(receiptForm, {
    documentDate: today(), destinationLocationId: order.destinationLocationId ?? (locations.value.length === 1 ? locations.value[0].id : ''),
    externalReference: order.externalReference ?? '', note: order.note ?? '',
    lines: order.items.filter((item) => item.quantityReceived < item.quantityOrdered).map((item) => ({ productId: item.productId, quantity: item.quantityOrdered - item.quantityReceived, unitCost: item.unitCost ?? '' })),
  })
  receiptDialogOpen.value = true
}
async function createReceipt() {
  const order = receivingOrder.value
  const lines = receiptForm.lines.filter((line) => Number(line.quantity) > 0)
  if (!order || !lines.length) return toast.error('Zadejte alespoň jedno skutečně převzaté množství.')
  saving.value = true
  try {
    await ordersApi.createReceiptDraft(order.id, {
      documentDate: receiptForm.documentDate || null, destinationLocationId: receiptForm.destinationLocationId || null,
      externalReference: text(receiptForm.externalReference), note: text(receiptForm.note),
      items: lines.map((line) => ({ productId: line.productId, quantity: Number(line.quantity), unitCost: line.unitCost === '' ? null : Number(line.unitCost) })),
    })
    receiptDialogOpen.value = false
    toast.success('Koncept příjemky je připravený. Sklad se změní až po jejím potvrzení.')
    await router.push('/app/skladove-doklady')
  } catch (error) { console.error(error); toast.error('Příjemku se nepodařilo vytvořit. Sklad se nezměnil.') } finally { saving.value = false }
}
function openInvoice(order: PurchaseOrder) {
  invoicingOrder.value = order
  Object.assign(invoiceForm, { invoiceNumber: '', receivedOn: today(), dueOn: '', totalAmount: '', note: '' })
  invoiceDialogOpen.value = true
}
async function createInvoice() {
  const order = invoicingOrder.value
  if (!order || !invoiceForm.invoiceNumber.trim()) return toast.error('Zadejte číslo přijaté faktury.')
  saving.value = true
  try {
    const invoice = await ordersApi.createSupplierInvoice({ supplierId: order.supplierId, purchaseOrderId: order.id, invoiceNumber: invoiceForm.invoiceNumber.trim(), receivedOn: invoiceForm.receivedOn || null, dueOn: invoiceForm.dueOn || null, totalAmount: invoiceForm.totalAmount === '' ? null : Number(invoiceForm.totalAmount), currency: 'CZK', note: text(invoiceForm.note) })
    invoiceDialogOpen.value = false
    await reload()
    toast.success(invoice.amountMatchesConfirmedReceipts === false ? 'Faktura je uložená, ale částka se liší od potvrzených příjemek.' : 'Přijatá faktura je připojena k objednávce.')
  } catch (error) { console.error(error); toast.error('Fakturu se nepodařilo uložit.') } finally { saving.value = false }
}
onMounted(reload)
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div><h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Nákupní objednávky</h1><p class="mt-1 max-w-2xl text-muted-foreground">Objednejte u dodavatele, pak zapište jen to, co skutečně dorazilo. Zásoba se změní až potvrzením příjemky.</p></div>
      <Button variant="coral" :disabled="!apiMode" @click="resetOrderForm"><Plus class="h-4 w-4" /> Nová objednávka</Button>
    </div>
    <div class="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 text-sm md:grid-cols-3"><p><strong>1. Koncept</strong> připravíte a zkontrolujete.</p><p><strong>2. Odesláno</strong> je připravené na příjem.</p><p><strong>3. Příjemka</strong> obsahuje skutečně doručené množství; až její potvrzení změní sklad.</p></div>
    <div v-if="!apiMode" class="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm">Nákupní objednávky jsou dostupné po přihlášení do firmy.</div>
    <div v-else-if="loading" class="flex justify-center p-12"><Loader2 class="h-6 w-6 animate-spin" /></div>
    <LoadError v-else-if="loadError" class="mt-6" message="Objednávky se nepodařilo načíst." @retry="reload" />
    <div v-else class="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <div v-if="!orders.length" class="p-12 text-center text-muted-foreground"><ClipboardList class="mx-auto h-10 w-10" /><p class="mt-3">Zatím nemáte žádnou nákupní objednávku.</p></div>
      <div v-else class="divide-y divide-border"><article v-for="order in orders" :key="order.id" class="flex flex-wrap items-center justify-between gap-4 p-4"><div><div class="flex flex-wrap items-center gap-2"><strong>{{ order.number ?? 'Koncept bez čísla' }}</strong><span class="rounded-full px-2 py-0.5 text-xs" :class="statusClass(order.status)">{{ statusLabel(order.status) }}</span></div><p class="mt-1 text-sm text-muted-foreground">{{ order.supplierName }} · {{ order.orderedOn }} · {{ order.items.length }} položek · {{ locationName(order.destinationLocationId) }}</p><p v-if="order.status === 'PartiallyReceived'" class="mt-1 text-xs text-muted-foreground">Částečně přijato: {{ order.items.reduce((sum, item) => sum + item.quantityReceived, 0) }} ks/j.</p><p v-for="invoice in invoicesFor(order.id)" :key="invoice.id" class="mt-1 text-xs" :class="invoice.amountMatchesConfirmedReceipts === false ? 'text-warning' : 'text-muted-foreground'"><ReceiptText class="mr-1 inline h-3.5 w-3.5" />Faktura {{ invoice.invoiceNumber }}{{ invoice.totalAmount !== null ? ` · ${invoice.totalAmount} ${invoice.currency}` : '' }}<span v-if="invoice.amountMatchesConfirmedReceipts === false"> · částka nesouhlasí s potvrzenými příjemkami</span><span v-else-if="invoice.amountMatchesConfirmedReceipts === true"> · částka souhlasí</span></p></div><div class="flex flex-wrap gap-2"><Button v-if="order.status === 'Draft'" size="sm" variant="outline" :disabled="saving" @click="send(order)"><Send class="h-4 w-4" /> Odeslat</Button><Button v-if="order.status === 'Sent' || order.status === 'PartiallyReceived'" size="sm" variant="outline" :disabled="saving" @click="sendEmail(order)"><Mail class="h-4 w-4" /> E-mailem</Button><Button v-if="order.status === 'Sent' || order.status === 'PartiallyReceived'" size="sm" variant="coral" :disabled="saving" @click="openReceipt(order)"><PackageCheck class="h-4 w-4" /> Zapsat příjem</Button><Button v-if="order.status === 'PartiallyReceived' || order.status === 'Received'" size="sm" variant="outline" :disabled="saving" @click="openInvoice(order)"><ReceiptText class="h-4 w-4" /> Přijatá faktura</Button><Button v-if="order.status === 'Draft' || order.status === 'Sent'" size="sm" variant="ghost" :disabled="saving" @click="cancel(order)"><XCircle class="h-4 w-4" /> Zrušit</Button></div></article></div>
    </div>

    <Dialog v-model:open="orderDialogOpen"><DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Nová nákupní objednávka</DialogTitle><DialogDescription>Objednávka je zatím koncept a nemění zásobu. Odeslání jí přidělí číslo.</DialogDescription></DialogHeader><form class="space-y-4" @submit.prevent="createOrder"><div class="grid gap-3 sm:grid-cols-2"><div class="space-y-2"><Label for="order-supplier">Dodavatel</Label><select id="order-supplier" v-model="orderForm.supplierId" class="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Vyberte dodavatele</option><option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">{{ supplier.name }}</option></select><p v-if="!suppliers.length" class="text-xs text-muted-foreground">Nejdřív založte dodavatele v adresáři.</p></div><div class="space-y-2"><Label for="order-location">Sklad příjmu</Label><select id="order-location" v-model="orderForm.destinationLocationId" class="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Bez určení</option><option v-for="location in locations" :key="location.id" :value="location.id">{{ location.name }}</option></select></div><div class="space-y-2"><Label for="order-date">Datum objednávky</Label><Input id="order-date" v-model="orderForm.orderedOn" type="date" /></div><div class="space-y-2"><Label for="order-expected">Očekávané doručení</Label><Input id="order-expected" v-model="orderForm.expectedOn" type="date" /></div></div><div class="space-y-2"><Label for="order-reference">Číslo / reference dodavatele</Label><Input id="order-reference" v-model="orderForm.externalReference" placeholder="Volitelné" /></div><div class="flex flex-wrap items-end justify-between gap-2"><div class="space-y-2"><Label for="order-product">Přidat položku</Label><Input id="order-product" v-model="productSearch" placeholder="Začněte psát název nebo kód" /></div><Button type="button" size="sm" variant="outline" :disabled="saving" @click="fillSuggestions"><Sparkles class="h-4 w-4" /> Návrh podle skladu</Button></div><div v-if="productResults.length" class="rounded-md border bg-background p-1"><button v-for="product in productResults" :key="product.id" type="button" class="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted" @click="addProduct(product.id)">{{ product.name }} · {{ product.sku }}</button></div><p class="text-xs text-muted-foreground">Návrh pracuje jen s položkami a baleními nastavenými u vybraného dodavatele.</p><div v-if="orderForm.lines.length" class="space-y-2"><div v-for="(line, index) in orderForm.lines" :key="line.productId" class="grid grid-cols-[1fr_90px_110px_auto] items-center gap-2"><span class="text-sm">{{ productName(line.productId) }}</span><Input v-model="line.quantity" min="0.001" step="0.001" type="number" aria-label="Množství" /><Input v-model="line.unitCost" min="0" step="0.01" type="number" aria-label="Nákupní cena" /><Button type="button" size="icon" variant="ghost" :title="`Odebrat ${productName(line.productId)}`" @click="orderForm.lines.splice(index, 1)"><Trash2 class="h-4 w-4 text-destructive" /></Button></div></div><div class="space-y-2"><Label for="order-note">Poznámka</Label><Input id="order-note" v-model="orderForm.note" placeholder="Volitelné" /></div><DialogFooter><Button type="button" variant="ghost" @click="orderDialogOpen = false">Zrušit</Button><Button type="submit" variant="coral" :disabled="saving"><Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Uložit koncept</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog v-model:open="receiptDialogOpen"><DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Zapsat skutečný příjem</DialogTitle><DialogDescription>Upravte množství podle dodávky. Vznikne koncept příjemky; zásoba se nezmění, dokud jej na další obrazovce nepotvrdíte.</DialogDescription></DialogHeader><form class="space-y-4" @submit.prevent="createReceipt"><div class="grid gap-3 sm:grid-cols-2"><div class="space-y-2"><Label for="receipt-date">Datum příjemky</Label><Input id="receipt-date" v-model="receiptForm.documentDate" type="date" /></div><div class="space-y-2"><Label for="receipt-location">Sklad příjmu</Label><select id="receipt-location" v-model="receiptForm.destinationLocationId" class="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Bez určení</option><option v-for="location in locations" :key="location.id" :value="location.id">{{ location.name }}</option></select></div></div><div class="space-y-2"><Label>Převzaté položky</Label><div v-for="line in receiptForm.lines" :key="line.productId" class="grid grid-cols-[1fr_90px_110px] items-center gap-2"><span class="text-sm">{{ productName(line.productId) }}</span><Input v-model="line.quantity" min="0" step="0.001" type="number" aria-label="Převzaté množství" /><Input v-model="line.unitCost" min="0" step="0.01" type="number" aria-label="Nákupní cena" /></div></div><div class="space-y-2"><Label for="receipt-note">Poznámka</Label><Input id="receipt-note" v-model="receiptForm.note" placeholder="Volitelné" /></div><DialogFooter><Button type="button" variant="ghost" @click="receiptDialogOpen = false">Zrušit</Button><Button type="submit" variant="coral" :disabled="saving"><Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Vytvořit koncept příjemky</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog v-model:open="invoiceDialogOpen"><DialogContent><DialogHeader><DialogTitle>Přijatá faktura</DialogTitle><DialogDescription>Uložte fakturu od dodavatele. Systém ji porovná se součtem potvrzených příjemek této objednávky; nemění sklad ani nevytváří platbu.</DialogDescription></DialogHeader><form class="space-y-4" @submit.prevent="createInvoice"><div class="grid gap-3 sm:grid-cols-2"><div class="space-y-2"><Label for="supplier-invoice-number">Číslo faktury</Label><Input id="supplier-invoice-number" v-model="invoiceForm.invoiceNumber" required /></div><div class="space-y-2"><Label for="supplier-invoice-total">Celkem v Kč</Label><Input id="supplier-invoice-total" v-model="invoiceForm.totalAmount" min="0" step="0.01" type="number" /></div><div class="space-y-2"><Label for="supplier-invoice-received">Datum přijetí</Label><Input id="supplier-invoice-received" v-model="invoiceForm.receivedOn" type="date" /></div><div class="space-y-2"><Label for="supplier-invoice-due">Splatnost</Label><Input id="supplier-invoice-due" v-model="invoiceForm.dueOn" type="date" /></div></div><div class="space-y-2"><Label for="supplier-invoice-note">Poznámka</Label><Input id="supplier-invoice-note" v-model="invoiceForm.note" placeholder="Volitelné" /></div><DialogFooter><Button type="button" variant="ghost" @click="invoiceDialogOpen = false">Zrušit</Button><Button type="submit" variant="coral" :disabled="saving"><Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Uložit a porovnat</Button></DialogFooter></form></DialogContent></Dialog>
  </div>
</template>
