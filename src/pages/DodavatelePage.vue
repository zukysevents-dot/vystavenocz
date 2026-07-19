<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Building2, Loader2, Package, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import LoadError from '@/components/app/LoadError.vue'
import { isApiMode } from '@/lib/http'
import { useSuppliers, type Supplier, type SupplierInput } from '@/composables/useSuppliers'
import { useProducts } from '@/composables/useProducts'
import { usePurchaseOrders, type SupplierProduct } from '@/composables/usePurchaseOrders'
import { toast } from '@/components/ui/sonner'

const apiMode = isApiMode()
const suppliersApi = useSuppliers()
const ordersApi = usePurchaseOrders()
const { products, load: loadProducts } = useProducts()
const suppliers = ref<Supplier[]>([])
const loading = ref(apiMode)
const loadError = ref(false)
const saving = ref(false)
const open = ref(false)
const editing = ref<Supplier | null>(null)
const catalogOpen = ref(false)
const catalogSupplier = ref<Supplier | null>(null)
const catalogItems = ref<SupplierProduct[]>([])
const catalogLoading = ref(false)
const catalogSaving = ref(false)
type SupplierForm = { name: string; ico: string; dic: string; email: string; phone: string; street: string; city: string; zip: string; country: string; note: string }
const form = reactive<SupplierForm>({ name: '', ico: '', dic: '', email: '', phone: '', street: '', city: '', zip: '', country: 'CZ', note: '' })
const catalogForm = reactive({ productId: '', supplierSku: '', packQuantity: 1 as number | '', minimumOrderQuantity: 1 as number | '', unitCost: '' as number | '', leadTimeDays: '' as number | '' })

async function load() {
  if (!apiMode) return
  loading.value = true; loadError.value = false
  try { suppliers.value = await suppliersApi.list() } catch { loadError.value = true } finally { loading.value = false }
}
function text(value: string | null) { return value?.trim() || null }
function reset(value: Supplier | null = null) {
  editing.value = value
  Object.assign(form, value ? { name: value.name, ico: value.ico ?? '', dic: value.dic ?? '', email: value.email ?? '', phone: value.phone ?? '', street: value.street ?? '', city: value.city ?? '', zip: value.zip ?? '', country: value.country ?? 'CZ', note: value.note ?? '' } : { name: '', ico: '', dic: '', email: '', phone: '', street: '', city: '', zip: '', country: 'CZ', note: '' })
  open.value = true
}
async function save() {
  if (!form.name.trim()) return toast.error('Zadejte název dodavatele.')
  saving.value = true
  const input: SupplierInput = { ...form, name: form.name.trim(), ico: text(form.ico), dic: text(form.dic), email: text(form.email), phone: text(form.phone), street: text(form.street), city: text(form.city), zip: text(form.zip), country: text(form.country) ?? 'CZ', note: text(form.note) }
  try {
    if (editing.value) await suppliersApi.update(editing.value.id, input)
    else await suppliersApi.create(input)
    toast.success(editing.value ? 'Dodavatel upraven.' : 'Dodavatel založen.')
    open.value = false; await load()
  } catch { toast.error('Dodavatele se nepodařilo uložit.') } finally { saving.value = false }
}
async function archive(supplier: Supplier) {
  if (!window.confirm(`Archivovat dodavatele „${supplier.name}“?`)) return
  try { await suppliersApi.archive(supplier.id); toast.success('Dodavatel archivován.'); await load() } catch { toast.error('Dodavatele se nepodařilo archivovat.') }
}
function resetCatalogForm() {
  Object.assign(catalogForm, { productId: '', supplierSku: '', packQuantity: 1, minimumOrderQuantity: 1, unitCost: '', leadTimeDays: '' })
}
async function openCatalog(supplier: Supplier) {
  catalogSupplier.value = supplier
  resetCatalogForm()
  catalogOpen.value = true
  catalogLoading.value = true
  try { catalogItems.value = await ordersApi.supplierProducts(supplier.id) }
  catch { toast.error('Balení dodavatele se nepodařilo načíst.') }
  finally { catalogLoading.value = false }
}
async function saveCatalogItem() {
  const supplier = catalogSupplier.value
  if (!supplier || !catalogForm.productId) return toast.error('Vyberte položku z vašeho katalogu.')
  if (!Number(catalogForm.packQuantity) || Number(catalogForm.packQuantity) <= 0) return toast.error('Balení musí být větší než nula.')
  if (!Number(catalogForm.minimumOrderQuantity) || Number(catalogForm.minimumOrderQuantity) <= 0) return toast.error('Minimální objednávka musí být větší než nula.')
  catalogSaving.value = true
  try {
    await ordersApi.upsertSupplierProduct(supplier.id, {
      productId: catalogForm.productId,
      supplierSku: text(catalogForm.supplierSku),
      packQuantity: Number(catalogForm.packQuantity),
      minimumOrderQuantity: Number(catalogForm.minimumOrderQuantity),
      unitCost: catalogForm.unitCost === '' ? null : Number(catalogForm.unitCost),
      leadTimeDays: catalogForm.leadTimeDays === '' ? null : Number(catalogForm.leadTimeDays),
    })
    catalogItems.value = await ordersApi.supplierProducts(supplier.id)
    resetCatalogForm()
    toast.success('Položka a balení dodavatele jsou uložené.')
  } catch { toast.error('Položku dodavatele se nepodařilo uložit.') }
  finally { catalogSaving.value = false }
}
async function removeCatalogItem(item: SupplierProduct) {
  const supplier = catalogSupplier.value
  if (!supplier || !window.confirm(`Odebrat ${item.productName} z nabídky dodavatele?`)) return
  try {
    await ordersApi.removeSupplierProduct(supplier.id, item.productId)
    catalogItems.value = catalogItems.value.filter((current) => current.productId !== item.productId)
    toast.success('Položka byla z nabídky dodavatele odebrána.')
  } catch { toast.error('Položku se nepodařilo odebrat.') }
}
onMounted(async () => { await Promise.all([load(), loadProducts()]) })
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-4"><div><h1 class="text-2xl font-bold sm:text-3xl">Dodavatelé</h1><p class="mt-1 text-muted-foreground">Adresář pro nákup a příjem zboží. Dodavatel není odběratel ani faktura.</p></div><Button variant="coral" :disabled="!apiMode" @click="reset()"><Plus class="h-4 w-4" /> Nový dodavatel</Button></div>
    <div v-if="!apiMode" class="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm">Adresář dodavatelů je dostupný po přihlášení do firmy.</div>
    <div v-else-if="loading" class="flex justify-center p-12"><Loader2 class="h-6 w-6 animate-spin" /></div>
    <LoadError v-else-if="loadError" class="mt-6" message="Dodavatele se nepodařilo načíst." @retry="load" />
    <div v-else class="mt-6 overflow-hidden rounded-xl border border-border bg-card"><div v-if="!suppliers.length" class="p-12 text-center text-muted-foreground"><Building2 class="mx-auto h-10 w-10" /><p class="mt-3">Zatím nemáte žádného dodavatele.</p></div><div v-else class="divide-y divide-border"><article v-for="supplier in suppliers" :key="supplier.id" class="flex items-center justify-between gap-4 p-4"><div><strong>{{ supplier.name }}</strong><p class="mt-1 text-sm text-muted-foreground">{{ [supplier.ico && `IČO ${supplier.ico}`, supplier.email, supplier.phone].filter(Boolean).join(' · ') || 'Bez kontaktních údajů' }}</p></div><div class="flex flex-wrap gap-2"><Button size="sm" variant="outline" @click="openCatalog(supplier)"><Package class="h-4 w-4" /> Balení a ceny</Button><Button size="sm" variant="outline" @click="reset(supplier)"><Pencil class="h-4 w-4" /> Upravit</Button><Button size="icon" variant="ghost" :title="`Archivovat ${supplier.name}`" @click="archive(supplier)"><Trash2 class="h-4 w-4 text-destructive" /></Button></div></article></div></div>
    <Dialog v-model:open="open"><DialogContent><DialogHeader><DialogTitle>{{ editing ? 'Upravit dodavatele' : 'Nový dodavatel' }}</DialogTitle><DialogDescription>Údaje se použijí pro nákupní doklady a objednávky.</DialogDescription></DialogHeader><form class="space-y-4" @submit.prevent="save"><div class="space-y-2"><Label for="supplier-name">Název</Label><Input id="supplier-name" v-model="form.name" required /></div><div class="grid gap-3 sm:grid-cols-2"><div class="space-y-2"><Label for="supplier-ico">IČO</Label><Input id="supplier-ico" v-model="form.ico" /></div><div class="space-y-2"><Label for="supplier-dic">DIČ</Label><Input id="supplier-dic" v-model="form.dic" /></div><div class="space-y-2"><Label for="supplier-email">E-mail</Label><Input id="supplier-email" v-model="form.email" type="email" /></div><div class="space-y-2"><Label for="supplier-phone">Telefon</Label><Input id="supplier-phone" v-model="form.phone" /></div><div class="space-y-2 sm:col-span-2"><Label for="supplier-street">Ulice a číslo</Label><Input id="supplier-street" v-model="form.street" /></div><div class="space-y-2"><Label for="supplier-zip">PSČ</Label><Input id="supplier-zip" v-model="form.zip" /></div><div class="space-y-2"><Label for="supplier-city">Město</Label><Input id="supplier-city" v-model="form.city" /></div></div><DialogFooter><Button type="button" variant="ghost" @click="open = false">Zrušit</Button><Button type="submit" variant="coral" :disabled="saving"><Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Uložit</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog v-model:open="catalogOpen"><DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Balení a ceny: {{ catalogSupplier?.name }}</DialogTitle><DialogDescription>Sem zapište, co od tohoto dodavatele berete. Například karton po 24 kusech. Návrh objednávky pak zaokrouhlí množství správně nahoru.</DialogDescription></DialogHeader><div v-if="catalogLoading" class="flex justify-center p-8"><Loader2 class="h-5 w-5 animate-spin" /></div><template v-else><div v-if="catalogItems.length" class="divide-y rounded-lg border"><div v-for="item in catalogItems" :key="item.id" class="flex items-center justify-between gap-3 p-3"><div><p class="text-sm font-medium">{{ item.productName }} <span class="text-muted-foreground">· {{ item.productSku }}</span></p><p class="mt-1 text-xs text-muted-foreground">{{ item.supplierSku ? `Kód dodavatele: ${item.supplierSku} · ` : '' }}balení {{ item.packQuantity }} ks · minimum {{ item.minimumOrderQuantity }} ks{{ item.unitCost !== null ? ` · ${item.unitCost} Kč/ks` : '' }}{{ item.leadTimeDays !== null ? ` · dodání ${item.leadTimeDays} dnů` : '' }}</p></div><Button size="icon" variant="ghost" :title="`Odebrat ${item.productName}`" @click="removeCatalogItem(item)"><Trash2 class="h-4 w-4 text-destructive" /></Button></div></div><p v-else class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Zatím zde není žádná položka. Přidejte první níže.</p><form class="mt-4 space-y-3 border-t pt-4" @submit.prevent="saveCatalogItem"><h3 class="font-medium">Přidat nebo upravit položku</h3><div class="grid gap-3 sm:grid-cols-2"><div class="space-y-2 sm:col-span-2"><Label for="supplier-product">Položka z katalogu</Label><select id="supplier-product" v-model="catalogForm.productId" class="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Vyberte položku</option><option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }} · {{ product.sku }}</option></select></div><div class="space-y-2"><Label for="supplier-sku">Kód u dodavatele</Label><Input id="supplier-sku" v-model="catalogForm.supplierSku" placeholder="Volitelné" /></div><div class="space-y-2"><Label for="supplier-pack">Velikost balení (ks)</Label><Input id="supplier-pack" v-model="catalogForm.packQuantity" min="0.001" step="0.001" type="number" /></div><div class="space-y-2"><Label for="supplier-minimum">Nejméně objednat (ks)</Label><Input id="supplier-minimum" v-model="catalogForm.minimumOrderQuantity" min="0.001" step="0.001" type="number" /></div><div class="space-y-2"><Label for="supplier-price">Cena za kus (Kč)</Label><Input id="supplier-price" v-model="catalogForm.unitCost" min="0" step="0.01" type="number" placeholder="Volitelné" /></div><div class="space-y-2"><Label for="supplier-leadtime">Dodání (dny)</Label><Input id="supplier-leadtime" v-model="catalogForm.leadTimeDays" min="0" step="1" type="number" placeholder="Volitelné" /></div></div><p class="text-xs text-muted-foreground">Příklad: karton 24 ks a minimum 48 ks znamená, že návrh objednávky použije 48, 72, 96… kusů.</p><DialogFooter><Button type="submit" variant="coral" :disabled="catalogSaving"><Loader2 v-if="catalogSaving" class="h-4 w-4 animate-spin" /> Uložit položku</Button></DialogFooter></form></template></DialogContent></Dialog>
  </div>
</template>
