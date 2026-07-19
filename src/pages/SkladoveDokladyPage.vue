<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { CheckCircle2, Download, FilePlus2, Loader2, PackageSearch, Paperclip, Plus, Trash2, XCircle } from 'lucide-vue-next'
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
import LoadError from '@/components/app/LoadError.vue'
import EntityAttachmentsPanel from '@/components/app/EntityAttachmentsPanel.vue'
import { useInventory } from '@/composables/useInventory'
import { useLocations } from '@/composables/useLocations'
import { useProducts } from '@/composables/useProducts'
import { toast } from '@/components/ui/sonner'
import { isApiMode } from '@/lib/http'
import type { CreateStockDocumentRequest, StockDocument, StockDocumentType } from '@/lib/types'

type DraftLine = { productId: string; quantity: number; unitCost: number | '' }

const inventory = useInventory()
const { locations, load: loadLocations } = useLocations()
const { products, load: loadProducts } = useProducts()
const apiMode = isApiMode()
const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const documents = ref<StockDocument[]>([])
const dialogOpen = ref(false)
const attachmentsOpen = ref(false)
const selectedDocument = ref<StockDocument | null>(null)
const productSearch = ref('')

const documentTypes: { value: StockDocumentType; label: string; description: string }[] = [
  { value: 'PurchaseReceipt', label: 'Příjemka', description: 'Přijmout zboží od dodavatele na sklad.' },
  { value: 'IssueNote', label: 'Výdejka', description: 'Vydat materiál ze skladu například na středisko nebo zakázku.' },
  { value: 'TransferNote', label: 'Převodka', description: 'Přesunout položky mezi dvěma sklady nebo provozovnami.' },
  { value: 'ReturnToSupplier', label: 'Vratka dodavateli', description: 'Vrátit zboží zpět dodavateli.' },
  { value: 'CustomerReturn', label: 'Vratka od zákazníka', description: 'Vrátit položky zákazníkem zpět na sklad.' },
  { value: 'DeliveryNote', label: 'Dodací list', description: 'Potvrdit výdej zboží pro odběratele.' },
]

const form = reactive({
  type: 'PurchaseReceipt' as StockDocumentType,
  documentDate: today(),
  sourceLocationId: '',
  destinationLocationId: '',
  counterpartyName: '',
  externalReference: '',
  note: '',
  lines: [] as DraftLine[],
})

const selectedType = computed(() => documentTypes.find((item) => item.value === form.type)!)
const needsSource = computed(() => ['IssueNote', 'ReturnToSupplier', 'DeliveryNote', 'TransferNote'].includes(form.type))
const needsDestination = computed(() => ['PurchaseReceipt', 'CustomerReturn', 'TransferNote'].includes(form.type))
const productResults = computed(() => {
  const query = productSearch.value.trim().toLowerCase()
  if (!query) return []
  return products.value
    .filter((product) => product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query))
    .filter((product) => !form.lines.some((line) => line.productId === product.id))
    .slice(0, 8)
})

watch(
  () => form.type,
  () => {
    if (!needsSource.value) form.sourceLocationId = ''
    if (!needsDestination.value) form.destinationLocationId = ''
  },
)

onMounted(async () => {
  if (!apiMode) {
    loading.value = false
    return
  }
  await reload()
})

async function reload() {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([loadLocations(), loadProducts()])
    documents.value = (await inventory.stockDocuments()).items
  } catch (error) {
    console.error(error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function typeLabel(type: StockDocumentType): string {
  return documentTypes.find((item) => item.value === type)?.label ?? type
}

function statusLabel(document: StockDocument): string {
  if (document.status === 'Confirmed') return 'Potvrzeno'
  if (document.status === 'Cancelled') return 'Zrušeno'
  return 'Koncept'
}

function locationName(id: string | null): string {
  if (!id) return 'Nezařazený sklad'
  return locations.value.find((location) => location.id === id)?.name ?? 'Neznámý sklad'
}

function resetForm() {
  form.type = 'PurchaseReceipt'
  form.documentDate = today()
  form.sourceLocationId = ''
  form.destinationLocationId = ''
  form.counterpartyName = ''
  form.externalReference = ''
  form.note = ''
  form.lines = []
  productSearch.value = ''
}

function openCreate() {
  resetForm()
  dialogOpen.value = true
}

function openAttachments(document: StockDocument) {
  selectedDocument.value = document
  attachmentsOpen.value = true
}

function addProduct(productId: string) {
  const product = products.value.find((item) => item.id === productId)
  if (!product) return
  form.lines.push({ productId, quantity: 1, unitCost: product.purchasePrice ?? '' })
  productSearch.value = ''
}

function productName(productId: string): string {
  const product = products.value.find((item) => item.id === productId)
  return product ? `${product.name} · ${product.sku}` : 'Neznámý produkt'
}

async function saveDraft() {
  if (form.lines.length === 0) {
    toast.error('Přidejte alespoň jednu položku.')
    return
  }
  if (form.type === 'TransferNote' && form.sourceLocationId === form.destinationLocationId) {
    toast.error('Zdrojový a cílový sklad převodky musí být různé.')
    return
  }
  const request: CreateStockDocumentRequest = {
    type: form.type,
    documentDate: form.documentDate || null,
    sourceLocationId: needsSource.value ? form.sourceLocationId || null : null,
    destinationLocationId: needsDestination.value ? form.destinationLocationId || null : null,
    counterpartyName: form.counterpartyName.trim() || null,
    externalReference: form.externalReference.trim() || null,
    note: form.note.trim() || null,
    items: form.lines.map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity),
      unitCost: line.unitCost === '' ? null : Number(line.unitCost),
    })),
  }
  submitting.value = true
  try {
    await inventory.createStockDocument(request)
    dialogOpen.value = false
    toast.success('Koncept dokladu uložen. Zásoba se změní až po potvrzení.')
    await reload()
  } catch (error) {
    console.error(error)
    toast.error('Doklad se nepodařilo uložit. Sklad se nezměnil.')
  } finally {
    submitting.value = false
  }
}

async function confirm(document: StockDocument) {
  submitting.value = true
  try {
    await inventory.confirmStockDocument(document.id)
    toast.success(`${typeLabel(document.type)} potvrzena. Skladové pohyby jsou zapsané.`)
    await reload()
  } catch (error) {
    console.error(error)
    toast.error('Doklad se nepotvrdil. Zásoba zůstala beze změny.')
  } finally {
    submitting.value = false
  }
}

async function cancel(document: StockDocument) {
  submitting.value = true
  try {
    await inventory.cancelStockDocument(document.id)
    toast.success('Koncept dokladu zrušen.')
    await reload()
  } catch (error) {
    console.error(error)
    toast.error('Doklad se nepodařilo zrušit.')
  } finally {
    submitting.value = false
  }
}

async function downloadPdf(document: StockDocument) {
  try {
    const response = await inventory.downloadStockDocumentPdf(document.id)
    const url = URL.createObjectURL(response.blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = response.fileName ?? `skladovy-doklad-${document.number ?? 'koncept'}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
    toast.error('PDF dokladu se nepodařilo připravit.')
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Skladové doklady</h1>
        <p class="mt-1 max-w-2xl text-muted-foreground">
          Příjemky, výdejky, převodky, vratky a dodací listy. Nejdřív je uložte jako koncept;
          až potvrzení změní skutečný stav skladu.
        </p>
      </div>
      <Button variant="coral" :disabled="!apiMode" @click="openCreate">
        <FilePlus2 class="h-4 w-4" /> Nový doklad
      </Button>
    </div>

    <div class="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 text-sm md:grid-cols-3">
      <p><strong>Koncept</strong> můžete zkontrolovat nebo zrušit. Zásoba se ještě nemění.</p>
      <p><strong>Potvrzeno</strong> má číslo a atomicky zapíše všechny položky do historie skladu.</p>
      <p><strong>Výdejka ani dodací list nejsou faktura.</strong> Fakturu vystavte v modulu Faktury.</p>
    </div>

    <div v-if="!apiMode" class="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm">
      Skladové doklady jsou dostupné po přihlášení do vaší firmy. Ukázka je nezobrazuje, aby nevytvářela dojem trvalého uložení.
    </div>
    <div v-else-if="loading" class="flex justify-center p-12"><Loader2 class="h-6 w-6 animate-spin text-primary" /></div>
    <LoadError v-else-if="loadError" class="mt-6" message="Skladové doklady se nepodařilo načíst." @retry="reload" />
    <div v-else class="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <div v-if="documents.length === 0" class="flex flex-col items-center p-12 text-center">
        <PackageSearch class="h-10 w-10 text-muted-foreground" />
        <h2 class="mt-3 font-semibold">Zatím žádné skladové doklady</h2>
        <p class="mt-1 max-w-md text-sm text-muted-foreground">Začněte příjemkou nebo výdejkou. Nejprve se uloží koncept, který můžete před potvrzením zkontrolovat.</p>
      </div>
      <div v-else class="divide-y divide-border">
        <article v-for="document in documents" :key="document.id" class="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <strong>{{ document.number ?? 'Koncept bez čísla' }}</strong>
              <span class="rounded-full bg-muted px-2 py-0.5 text-xs">{{ typeLabel(document.type) }}</span>
              <span class="rounded-full px-2 py-0.5 text-xs" :class="document.status === 'Confirmed' ? 'bg-success/15 text-success' : document.status === 'Cancelled' ? 'bg-muted text-muted-foreground' : 'bg-warning/15 text-warning'">{{ statusLabel(document) }}</span>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ document.documentDate }} · {{ document.items.length }} položek ·
              {{ locationName(document.sourceLocationId) }} → {{ locationName(document.destinationLocationId) }}
            </p>
            <p v-if="document.counterpartyName || document.externalReference" class="mt-1 text-xs text-muted-foreground">
              {{ document.counterpartyName ?? 'Bez protistrany' }}<span v-if="document.externalReference"> · {{ document.externalReference }}</span>
            </p>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" @click="downloadPdf(document)"><Download class="h-4 w-4" /> PDF</Button>
            <Button variant="outline" size="sm" @click="openAttachments(document)"><Paperclip class="h-4 w-4" /> Přílohy</Button>
            <template v-if="document.status === 'Draft'">
              <Button variant="outline" size="sm" :disabled="submitting" @click="cancel(document)"><XCircle class="h-4 w-4" /> Zrušit</Button>
              <Button variant="coral" size="sm" :disabled="submitting" @click="confirm(document)"><CheckCircle2 class="h-4 w-4" /> Potvrdit</Button>
            </template>
          </div>
        </article>
      </div>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nový skladový doklad</DialogTitle>
          <DialogDescription>{{ selectedType.description }} Doklad vytvoříte jako koncept; sklad se změní až potvrzením.</DialogDescription>
        </DialogHeader>
        <form class="space-y-5" @submit.prevent="saveDraft">
          <div class="space-y-2"><Label for="document-type">Typ dokladu</Label><select id="document-type" v-model="form.type" class="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"><option v-for="item in documentTypes" :key="item.value" :value="item.value">{{ item.label }}</option></select></div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2"><Label for="document-date">Datum</Label><Input id="document-date" v-model="form.documentDate" type="date" required /></div>
            <div class="space-y-2"><Label for="document-reference">Externí číslo</Label><Input id="document-reference" v-model="form.externalReference" placeholder="např. DL-2026-15" /></div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div v-if="needsSource" class="space-y-2"><Label for="document-source">Zdrojový sklad</Label><select id="document-source" v-model="form.sourceLocationId" class="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">Nezařazený sklad</option><option v-for="location in locations" :key="location.id" :value="location.id">{{ location.name }}</option></select></div>
            <div v-if="needsDestination" class="space-y-2"><Label for="document-destination">Cílový sklad</Label><select id="document-destination" v-model="form.destinationLocationId" class="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"><option value="">Nezařazený sklad</option><option v-for="location in locations" :key="location.id" :value="location.id">{{ location.name }}</option></select></div>
          </div>
          <div class="space-y-2"><Label for="document-counterparty">Dodavatel / odběratel</Label><Input id="document-counterparty" v-model="form.counterpartyName" placeholder="volitelné" /></div>
          <div class="space-y-2"><Label for="document-products">Přidat položku</Label><Input id="document-products" v-model="productSearch" placeholder="Hledejte podle názvu nebo skladového kódu" /><div v-if="productResults.length" class="rounded-md border border-border"><button v-for="product in productResults" :key="product.id" type="button" class="block w-full px-3 py-2 text-left text-sm hover:bg-muted" @click="addProduct(product.id)">{{ product.name }} · {{ product.sku }}</button></div></div>
          <div v-if="form.lines.length" class="space-y-2"><div v-for="(line, index) in form.lines" :key="line.productId" class="grid items-center gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_110px_130px_auto]"><span class="text-sm font-medium">{{ productName(line.productId) }}</span><Input v-model.number="line.quantity" min="0.001" step="0.001" type="number" required /><Input v-model.number="line.unitCost" min="0" step="0.01" type="number" placeholder="Nákupní cena" /><Button variant="ghost" size="icon" type="button" title="Odebrat položku" @click="form.lines.splice(index, 1)"><Trash2 class="h-4 w-4 text-destructive" /></Button></div></div>
          <div class="space-y-2"><Label for="document-note">Poznámka</Label><textarea id="document-note" v-model="form.note" class="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="volitelné" /></div>
          <DialogFooter><Button type="button" variant="ghost" @click="dialogOpen = false">Zrušit</Button><Button type="submit" variant="coral" :disabled="submitting || !form.lines.length"><Loader2 v-if="submitting" class="h-4 w-4 animate-spin" /><Plus v-else class="h-4 w-4" /> Uložit koncept</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="attachmentsOpen">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Přílohy skladového dokladu</DialogTitle>
          <DialogDescription>
            Připojte například dodací list, přijatou fakturu nebo fotodokumentaci. Příloha sama nemění zásobu ani nevystavuje fakturu.
          </DialogDescription>
        </DialogHeader>
        <EntityAttachmentsPanel
          v-if="selectedDocument"
          :key="selectedDocument.id"
          :entity-id="selectedDocument.id"
          entity-segment="stock-documents"
          :can-manage="true"
          heading="Dokumenty k tomuto dokladu"
          empty-text="K tomuto skladovému dokladu zatím nejsou přiložené žádné soubory."
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
