<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Save,
  Loader2,
  UserPlus,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Mail,
  CheckCircle2,
  Ban,
} from 'lucide-vue-next'
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
import QuickClientDialog, { type QuickClient } from '@/components/app/QuickClientDialog.vue'
import InvoiceDocument from '@/components/app/InvoiceDocument.vue'
import SendInvoiceDialog from '@/components/app/SendInvoiceDialog.vue'
import PaywallDialog from '@/components/app/PaywallDialog.vue'
import { downloadInvoicePdf } from '@/lib/invoice-pdf'
import { ApiError, isApiMode } from '@/lib/http'
import { useClients } from '@/composables/useClients'
import {
  useInvoices,
  DuplicateInvoiceNumberError,
  type InvoiceInput,
} from '@/composables/useInvoices'
import { useSubscription } from '@/composables/useSubscription'
import { useCompanyStore } from '@/stores/company'
import {
  buildInvoiceNumber,
  calcLine,
  calcTotals,
  documentTypeLabel,
  formatCZK,
  variableSymbolFromInvoiceNumber,
} from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type {
  ClientSnapshot,
  DocumentType,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  SupplierSnapshot,
  VatRate,
} from '@/lib/types'

const route = useRoute()
const router = useRouter()
const { clients, load: loadClients, getById: getClientById } = useClients()
const { create, update, issue, pay, cancel, get, load: loadInvoices } = useInvoices()
const { hasAccess } = useSubscription()
const companyStore = useCompanyStore()

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const paymentMethods = [
  { value: 'bank_transfer', label: 'Převodem' },
  { value: 'cash', label: 'Hotově' },
  { value: 'card', label: 'Kartou' },
]

const loading = ref(true)
const saving = ref(false)
const quickOpen = ref(false)
const showPreview = ref(true)
const downloadingPdf = ref(false)
const sendOpen = ref(false)
const paywallOpen = ref(false)
const localDraftAvailable = ref(false)
const localDraftSavingEnabled = ref(false)
// Skrytý off-screen render dokumentu pro zachycení do PDF.
const pdfDocEl = ref<HTMLElement | null>(null)

const editingId = ref<string | null>(null)
const status = ref<InvoiceStatus>('draft')
const paidAt = ref<string | null>(null)
// Typ dokladu: editor tvoří jen fakturu / zálohovou (proforma). Dobropis vzniká akcí ze seznamu
// (serverově, se zápornými částkami) a v editoru se needituje. Typ jde měnit jen u konceptu.
const documentType = ref<DocumentType>('invoice')
const documentTypeOptions = [
  { value: 'invoice', label: 'Faktura' },
  { value: 'proforma', label: 'Zálohová faktura' },
] as const
const canChooseType = computed(() => status.value === 'draft')

// Stav hlavičky.
const selectedClientId = ref('')
const adHocClient = ref<ClientSnapshot | null>(null)
const invoiceNumber = ref('')
const issueDate = ref(todayISO())
const dueDate = ref(addDaysISO(14))
const variableSymbol = ref('')
const paymentMethod = ref('bank_transfer')

// Plátce DPH? Neplátce/identifikovaná osoba fakturuje bez DPH.
const vatPayer = computed(() => companyStore.company?.vatMode === 'payer')

type ItemDraft = Pick<
  InvoiceItem,
  'id' | 'description' | 'quantity' | 'unit' | 'unitPrice' | 'vatRate'
>

function newItem(): ItemDraft {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unit: 'ks',
    unitPrice: 0,
    vatRate: 21,
  }
}

const items = ref<ItemDraft[]>([newItem()])

type LocalInvoiceDraft = {
  documentType: DocumentType
  selectedClientId: string
  adHocClient: ClientSnapshot | null
  invoiceNumber: string
  issueDate: string
  dueDate: string
  variableSymbol: string
  paymentMethod: string
  items: ItemDraft[]
}

function localDraftKey(): string {
  return `vystaveno.invoice-editor-draft.v1:${companyStore.company?.id ?? 'unknown'}`
}

function clearLocalDraft(): void {
  try {
    localStorage.removeItem(localDraftKey())
  } catch {
    /* soukromý režim nebo zakázané úložiště — editor funguje bez obnovy */
  }
  localDraftAvailable.value = false
}

function saveLocalDraft(): void {
  if (!localDraftSavingEnabled.value || editingId.value) return
  const meaningful =
    selectedClientId.value ||
    adHocClient.value?.name ||
    items.value.some(
      (item) => item.description.trim() || Number(item.unitPrice) || Number(item.quantity) !== 1,
    )
  if (!meaningful) return
  const draft: LocalInvoiceDraft = {
    documentType: documentType.value,
    selectedClientId: selectedClientId.value,
    adHocClient: adHocClient.value,
    invoiceNumber: invoiceNumber.value,
    issueDate: issueDate.value,
    dueDate: dueDate.value,
    variableSymbol: variableSymbol.value,
    paymentMethod: paymentMethod.value,
    items: items.value,
  }
  try {
    localStorage.setItem(localDraftKey(), JSON.stringify(draft))
  } catch {
    /* plné nebo nedostupné úložiště nesmí blokovat práci s fakturou */
  }
}

function loadLocalDraft(): LocalInvoiceDraft | null {
  try {
    const raw = localStorage.getItem(localDraftKey())
    if (!raw) return null
    const draft = JSON.parse(raw) as Partial<LocalInvoiceDraft>
    if (!Array.isArray(draft.items) || !draft.items.length) return null
    return {
      documentType: draft.documentType === 'proforma' ? 'proforma' : 'invoice',
      selectedClientId: typeof draft.selectedClientId === 'string' ? draft.selectedClientId : '',
      adHocClient: draft.adHocClient?.name ? draft.adHocClient : null,
      invoiceNumber: typeof draft.invoiceNumber === 'string' ? draft.invoiceNumber : '',
      issueDate: typeof draft.issueDate === 'string' ? draft.issueDate : todayISO(),
      dueDate: typeof draft.dueDate === 'string' ? draft.dueDate : addDaysISO(14),
      variableSymbol: typeof draft.variableSymbol === 'string' ? draft.variableSymbol : '',
      paymentMethod:
        typeof draft.paymentMethod === 'string' ? draft.paymentMethod : 'bank_transfer',
      items: draft.items.map((item) => ({
        ...newItem(),
        ...item,
        id: item.id || crypto.randomUUID(),
      })),
    }
  } catch {
    return null
  }
}

function restoreLocalDraft(): void {
  const draft = loadLocalDraft()
  if (!draft) return clearLocalDraft()
  documentType.value = draft.documentType
  selectedClientId.value = draft.selectedClientId
  adHocClient.value = draft.adHocClient
  invoiceNumber.value = draft.invoiceNumber
  issueDate.value = draft.issueDate
  dueDate.value = draft.dueDate
  variableSymbol.value = draft.variableSymbol
  paymentMethod.value = draft.paymentMethod
  items.value = draft.items
  localDraftAvailable.value = false
  toast.success('Rozepsaný koncept obnoven.')
}

// Číselné inputy můžou být dočasně prázdné — pro výpočty je sjednotíme na čísla.
function num(n: number): number {
  return Number(n) || 0
}
function normalizedItems(): ItemDraft[] {
  return items.value.map((it) => ({
    ...it,
    quantity: num(it.quantity),
    unitPrice: num(it.unitPrice),
  }))
}

const totals = computed(() => calcTotals(normalizedItems(), vatPayer.value))
// Položky s číselně sjednocenými hodnotami pro náhled (bez NaN při rozeditovaném poli).
const previewItems = computed(() => normalizedItems())

function lineTotal(it: ItemDraft): number {
  return calcLine(
    { quantity: num(it.quantity), unitPrice: num(it.unitPrice), vatRate: it.vatRate },
    vatPayer.value,
  ).lineTotal
}

function addItem(): void {
  items.value.push(newItem())
}
function removeItem(id: string): void {
  items.value = items.value.filter((it) => it.id !== id)
}

onMounted(async () => {
  companyStore.init()
  await Promise.all([loadClients(), loadInvoices()])

  const id = typeof route.query.id === 'string' ? route.query.id : null
  if (id) {
    // Plný detail (položky/snapshoty/součty) — v API režimu list vrací jen summary bez řádků.
    const inv = await get(id)
    if (inv) {
      // Dobropis je odvozený daňový doklad se zápornými částkami — editor přepočítává KLADNÉ součty,
      // takže by ho zkorumpoval. Tvrdý guard (i proti přímé URL): dobropis se needituje.
      if (inv.documentType === 'credit_note') {
        toast.error('Dobropis je odvozený doklad a needituje se.')
        router.replace('/app/faktury')
        return
      }
      editingId.value = id
      status.value = inv.status
      documentType.value = inv.documentType
      paidAt.value = inv.paidAt
      invoiceNumber.value = inv.invoiceNumber ?? ''
      issueDate.value = inv.issueDate
      dueDate.value = inv.dueDate
      variableSymbol.value = inv.variableSymbol ?? ''
      paymentMethod.value = inv.paymentMethod
      selectedClientId.value = inv.clientId && getClientById(inv.clientId) ? inv.clientId : ''
      if (!selectedClientId.value && inv.clientSnapshot?.name) {
        adHocClient.value = inv.clientSnapshot
      }
      items.value = inv.items.length
        ? inv.items.map((it) => ({
            id: it.id,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            vatRate: it.vatRate,
          }))
        : [newItem()]
    } else {
      toast.error('Faktura nenalezena.')
      router.replace('/app/faktury')
      return
    }
  } else {
    // Nová faktura. V mock režimu předvyplň číslo z profilu firmy + VS; v API režimu
    // koncept číslo nemá — přidělí ho server až při vystavení (issue), tak ho nevymýšlíme.
    const c = companyStore.company
    if (!isApiMode()) {
      invoiceNumber.value = buildInvoiceNumber(
        c?.invoiceNumberPrefix || 'FA',
        c?.invoiceNumberFormat || '{prefix}-{year}-{seq}',
        c?.nextInvoiceSeq || 1,
      )
      variableSymbol.value = variableSymbolFromInvoiceNumber(invoiceNumber.value)
    }
    // Výchozí splatnost z profilu firmy (klient s vlastní splatností ji přepíše níže).
    dueDate.value = addDaysISO(c?.defaultPaymentDays ?? 14)
    const clientIdQ = typeof route.query.clientId === 'string' ? route.query.clientId : null
    if (clientIdQ) selectedClientId.value = clientIdQ
    // Nová faktura bez aktivního tarifu — paywall hned při otevření (i přímou URL).
    if (!hasAccess.value) paywallOpen.value = true
    localDraftAvailable.value = Boolean(loadLocalDraft())
  }

  loading.value = false
  localDraftSavingEnabled.value = true
})

watch(
  [
    documentType,
    selectedClientId,
    adHocClient,
    invoiceNumber,
    issueDate,
    dueDate,
    variableSymbol,
    paymentMethod,
    items,
  ],
  saveLocalDraft,
  { deep: true },
)

// Změna klienta ze seznamu: zruš ad-hoc odběratele a u nové faktury dotáhni splatnost.
watch(selectedClientId, (id) => {
  if (id) adHocClient.value = null
  if (editingId.value) return
  const c = getClientById(id)
  if (c) dueDate.value = addDaysISO(c.defaultPaymentDays)
})

function onQuickConfirm(client: QuickClient, savedClientId: string | null) {
  if (savedClientId) {
    // Klient byl uložen do seznamu — vyber ho (watcher dotáhne splatnost).
    selectedClientId.value = savedClientId
  } else {
    const { defaultPaymentDays, ...snapshot } = client
    adHocClient.value = snapshot
    selectedClientId.value = ''
    if (!editingId.value) dueDate.value = addDaysISO(defaultPaymentDays)
  }
}

const supplierSnapshot = computed<SupplierSnapshot>(() => {
  const c = companyStore.company
  return {
    companyName: c?.companyName ?? null,
    fullName: c?.fullName ?? null,
    ico: c?.ico ?? null,
    dic: c?.dic ?? null,
    vatMode: c?.vatMode,
    street: c?.street ?? null,
    city: c?.city ?? null,
    zip: c?.zip ?? null,
    country: c?.country,
    bankAccount: c?.bankAccount ?? null,
    iban: c?.iban ?? null,
    swift: c?.swift ?? null,
    email: c?.email,
    logoUrl: c?.logoUrl ?? null,
    invoiceColor: c?.invoiceColor ?? null,
  }
})

const clientSnapshot = computed<ClientSnapshot>(() => {
  if (selectedClientId.value) {
    const c = getClientById(selectedClientId.value)
    if (c) {
      return {
        name: c.name,
        ico: c.ico,
        dic: c.dic,
        street: c.street,
        city: c.city,
        zip: c.zip,
        country: c.country,
        email: c.email,
      }
    }
  }
  return adHocClient.value ?? { name: '' }
})

async function onDownloadPdf() {
  if (!pdfDocEl.value) return
  downloadingPdf.value = true
  try {
    await downloadInvoicePdf(pdfDocEl.value, `${invoiceNumber.value.trim() || 'faktura'}.pdf`)
  } catch {
    toast.error('PDF se nepodařilo vygenerovat.')
  } finally {
    downloadingPdf.value = false
  }
}

// Převezme do editoru serverovou pravdu po uložení/přechodu (id, přidělené číslo, stav).
function syncFromSaved(inv: Invoice): void {
  editingId.value = inv.id
  if (inv.invoiceNumber) invoiceNumber.value = inv.invoiceNumber
  status.value = inv.status
  paidAt.value = inv.paidAt
}

// Uloží aktuální stav faktury (create nebo update konceptu). Bez toastu — řeší volající.
async function persist(): Promise<void> {
  // Z konceptových řádků dopočítej součty po řádcích (lib calcLine).
  const builtItems: InvoiceItem[] = normalizedItems().map((it) => {
    const line = calcLine(it, vatPayer.value)
    return {
      ...it,
      lineSubtotal: line.lineSubtotal,
      lineVat: line.lineVat,
      lineTotal: line.lineTotal,
    }
  })
  const input: InvoiceInput = {
    documentType: documentType.value,
    status: status.value,
    invoiceNumber: invoiceNumber.value.trim(),
    clientId: selectedClientId.value || null,
    clientSnapshot: clientSnapshot.value,
    supplierSnapshot: supplierSnapshot.value,
    items: builtItems,
    currency: 'CZK',
    issueDate: issueDate.value,
    dueDate: dueDate.value,
    taxableDate: issueDate.value,
    paidAt: paidAt.value,
    variableSymbol:
      variableSymbol.value.trim() || variableSymbolFromInvoiceNumber(invoiceNumber.value),
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: paymentMethod.value,
    notes: null,
  }

  if (editingId.value) {
    syncFromSaved(await update(editingId.value, input, vatPayer.value))
  } else {
    const created = await create(input, vatPayer.value)
    // Posuň pořadové číslo jen v mock režimu (vodítko pro předvyplnění příští faktury).
    // V API režimu čísla vlastní server (přiděluje je při issue), klientský seq se nepoužívá.
    const c = companyStore.company
    // save() je async; mock-only fire-and-forget (seq je jen klientské vodítko).
    if (!isApiMode() && c) void companyStore.save({ nextInvoiceSeq: (c.nextInvoiceSeq || 1) + 1 })
    syncFromSaved(created)
    // Převezmi id do URL, aby další uložení byla update (ne duplicitní faktura).
    router.replace({ query: { id: created.id } })
  }
}

// Přeloží serverový konflikt stavu (409) na srozumitelnou hlášku; ostatní chyby propustí dál.
function handleLifecycleError(e: unknown, conflictMessage: string): void {
  if (e instanceof ApiError && e.status === 409) {
    toast.error(conflictMessage)
    return
  }
  throw e
}

async function onSave() {
  // Vytvoření/uložení faktury je prémiová akce — bez tarifu paywall (nelze obejít přímou URL).
  if (!hasAccess.value) {
    paywallOpen.value = true
    return
  }
  saving.value = true
  try {
    await persist()
    clearLocalDraft()
    toast.success('Koncept uložen.')
  } catch (e) {
    if (e instanceof DuplicateInvoiceNumberError) {
      toast.error('Faktura s tímto číslem už existuje. Změňte číslo faktury.')
    } else {
      handleLifecycleError(e, 'Vystavenou fakturu už nelze upravovat (jen koncept).')
    }
  } finally {
    saving.value = false
  }
}

// Odeslání faktury je prémiová akce — bez aktivního tarifu ukážeme paywall.
function onSendClick(): void {
  if (!hasAccess.value) {
    paywallOpen.value = true
    return
  }
  sendOpen.value = true
}

// Mock odeslání proběhlo v dialogu — koncept vystavíme (server přidělí číslo, Draft→Issued).
async function onSent() {
  if (status.value !== 'draft' || !editingId.value) return
  saving.value = true
  try {
    await persist() // ulož případné rozeditované změny konceptu
    syncFromSaved(await issue(editingId.value))
  } catch (e) {
    handleLifecycleError(e, 'Fakturu se nepodařilo vystavit — zkuste to znovu.')
  } finally {
    saving.value = false
  }
}

async function onMarkPaid() {
  if (!hasAccess.value) {
    paywallOpen.value = true
    return
  }
  if (!editingId.value) return
  saving.value = true
  try {
    // Uhradit lze jen vystavenou — koncept nejdřív ulož a vystav (přidělí číslo).
    if (status.value === 'draft') {
      await persist()
      clearLocalDraft()
      syncFromSaved(await issue(editingId.value))
    }
    syncFromSaved(await pay(editingId.value))
    clearLocalDraft()
    toast.success('Faktura označena jako uhrazená.')
  } catch (e) {
    handleLifecycleError(e, 'Uhradit lze jen vystavenou fakturu.')
  } finally {
    saving.value = false
  }
}

async function onCancel() {
  if (!editingId.value) return
  saving.value = true
  try {
    syncFromSaved(await cancel(editingId.value))
    toast.success('Faktura stornována.')
  } catch (e) {
    handleLifecycleError(e, 'Tuto fakturu už nelze stornovat.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-4 pb-24 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" title="Zpět" @click="router.push('/app/faktury')">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ documentTypeLabel(documentType) }}
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ editingId ? 'Úprava dokladu' : 'Nový doklad' }}
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          :disabled="loading"
          :aria-label="showPreview ? 'Skrýt náhled' : 'Zobrazit náhled'"
          @click="showPreview = !showPreview"
        >
          <EyeOff v-if="showPreview" class="h-4 w-4" />
          <Eye v-else class="h-4 w-4" />
          <span class="hidden sm:inline">{{ showPreview ? 'Skrýt náhled' : 'Náhled' }}</span>
        </Button>
        <Button variant="outline" :disabled="downloadingPdf || loading" @click="onDownloadPdf">
          <Loader2 v-if="downloadingPdf" class="h-4 w-4 animate-spin" />
          <Download v-else class="h-4 w-4" />
          <span class="hidden sm:inline">PDF</span>
        </Button>
        <Button
          v-if="editingId"
          variant="outline"
          :disabled="saving || loading"
          @click="onSendClick"
        >
          <Mail class="h-4 w-4" />
          <span class="hidden sm:inline">Odeslat</span>
        </Button>
        <Button
          v-if="editingId && (status === 'issued' || status === 'overdue')"
          variant="outline"
          :disabled="saving || loading"
          @click="onCancel"
        >
          <Ban class="h-4 w-4 text-destructive" />
          <span class="hidden sm:inline">Stornovat</span>
        </Button>
        <Button
          v-if="editingId && status !== 'paid' && status !== 'cancelled'"
          variant="outline"
          :disabled="saving || loading"
          @click="onMarkPaid"
        >
          <CheckCircle2 class="h-4 w-4 text-success" />
          <span class="hidden sm:inline">Uhrazeno</span>
        </Button>
        <Button
          class="hidden sm:inline-flex"
          variant="coral"
          :disabled="saving || loading"
          @click="onSave"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Uložit koncept
        </Button>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div v-else class="mt-6 space-y-6">
      <div
        v-if="localDraftAvailable && !editingId"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mint/30 bg-mint/10 p-4"
      >
        <div class="text-sm">
          <div class="font-semibold">Máte rozepsaný koncept</div>
          <div class="text-muted-foreground">Obnovte ho, nebo jej bezpečně zahoďte.</div>
        </div>
        <div class="flex gap-2">
          <Button size="sm" variant="outline" @click="clearLocalDraft">Zahodit</Button>
          <Button size="sm" variant="coral" @click="restoreLocalDraft">Obnovit koncept</Button>
        </div>
      </div>

      <!-- Odběratel -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Odběratel
        </h2>
        <div class="mt-4 space-y-2">
          <Label for="inv-client">Klient</Label>
          <div class="flex gap-2">
            <Select v-model="selectedClientId">
              <SelectTrigger id="inv-client" class="flex-1">
                <SelectValue placeholder="Vyberte klienta…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in clients" :key="c.id" :value="c.id">
                  {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" class="shrink-0" @click="quickOpen = true">
              <UserPlus class="h-4 w-4" /> Nový
            </Button>
          </div>
          <p v-if="adHocClient && !selectedClientId" class="text-xs text-muted-foreground">
            Neuložený odběratel:
            <span class="font-medium text-foreground">{{ adHocClient.name }}</span>
          </p>
        </div>
      </div>

      <!-- Detaily faktury -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Detaily faktury
        </h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="inv-doctype">Typ dokladu</Label>
            <Select v-if="canChooseType" v-model="documentType">
              <SelectTrigger id="inv-doctype">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in documentTypeOptions" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div
              v-else
              class="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground"
            >
              {{ documentTypeLabel(documentType) }}
            </div>
          </div>
          <div class="space-y-2">
            <Label for="inv-number">Číslo faktury</Label>
            <Input id="inv-number" v-model="invoiceNumber" />
          </div>
          <div class="space-y-2">
            <Label for="inv-payment">Způsob úhrady</Label>
            <Select v-model="paymentMethod">
              <SelectTrigger id="inv-payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in paymentMethods" :key="m.value" :value="m.value">
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="inv-issue">Datum vystavení</Label>
            <Input id="inv-issue" v-model="issueDate" type="date" />
          </div>
          <div class="space-y-2">
            <Label for="inv-due">Datum splatnosti</Label>
            <Input id="inv-due" v-model="dueDate" type="date" />
          </div>
          <div class="space-y-2">
            <Label for="inv-vs">Variabilní symbol</Label>
            <Input id="inv-vs" v-model="variableSymbol" inputmode="numeric" />
          </div>
        </div>
      </div>

      <!-- Položky -->
      <div class="rounded-xl border border-border bg-card p-6">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Položky
          </h2>
          <Button type="button" variant="outline" size="sm" class="shrink-0" @click="addItem">
            <Plus class="h-4 w-4" /> Přidat položku
          </Button>
        </div>

        <div class="mt-4 space-y-3">
          <div v-for="(it, idx) in items" :key="it.id" class="rounded-lg border border-border p-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-muted-foreground">#{{ idx + 1 }}</span>
              <Button
                variant="ghost"
                size="icon"
                title="Odebrat položku"
                :disabled="items.length === 1"
                @click="removeItem(it.id)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Label :for="`inv-item-${it.id}-description`" class="sr-only">Popis položky</Label>
            <Input
              :id="`inv-item-${it.id}-description`"
              v-model="it.description"
              placeholder="Popis položky"
              class="mt-2"
            />
            <div
              class="mt-2 grid grid-cols-2 gap-2"
              :class="vatPayer ? 'sm:grid-cols-4' : 'sm:grid-cols-3'"
            >
              <div class="space-y-1">
                <Label :for="`inv-item-${it.id}-quantity`" class="text-xs text-muted-foreground"
                  >Množství</Label
                >
                <Input
                  :id="`inv-item-${it.id}-quantity`"
                  v-model.number="it.quantity"
                  type="number"
                  step="0.01"
                />
              </div>
              <div class="space-y-1">
                <Label :for="`inv-item-${it.id}-unit`" class="text-xs text-muted-foreground"
                  >MJ</Label
                >
                <Input :id="`inv-item-${it.id}-unit`" v-model="it.unit" />
              </div>
              <div class="space-y-1">
                <Label :for="`inv-item-${it.id}-price`" class="text-xs text-muted-foreground"
                  >Cena/MJ</Label
                >
                <Input
                  :id="`inv-item-${it.id}-price`"
                  v-model.number="it.unitPrice"
                  type="number"
                  step="0.01"
                />
              </div>
              <div v-if="vatPayer" class="space-y-1">
                <Label :for="`inv-item-${it.id}-vat`" class="text-xs text-muted-foreground"
                  >DPH %</Label
                >
                <Select
                  :model-value="String(it.vatRate)"
                  @update:model-value="(v) => (it.vatRate = Number(v) as VatRate)"
                >
                  <SelectTrigger :id="`inv-item-${it.id}-vat`">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 %</SelectItem>
                    <SelectItem value="12">12 %</SelectItem>
                    <SelectItem value="21">21 %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div class="mt-2 text-right text-sm text-muted-foreground">
              Řádek:
              <span class="font-medium text-foreground">{{ formatCZK(lineTotal(it)) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Součty -->
      <div class="rounded-xl border border-border bg-card p-6">
        <div class="ml-auto max-w-xs space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Mezisoučet</span>
            <span>{{ formatCZK(totals.subtotal) }}</span>
          </div>
          <template v-if="vatPayer">
            <div
              v-for="(b, rate) in totals.vatBreakdown"
              :key="rate"
              class="flex justify-between text-muted-foreground"
            >
              <span>DPH {{ rate }} %</span>
              <span>{{ formatCZK(b.vat) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">DPH celkem</span>
              <span>{{ formatCZK(totals.vatTotal) }}</span>
            </div>
          </template>
          <div class="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Celkem k úhradě</span>
            <span class="text-primary">{{ formatCZK(totals.total) }}</span>
          </div>
        </div>
      </div>

      <!-- Živý náhled faktury -->
      <div
        v-if="showPreview"
        class="overflow-x-auto rounded-xl border border-border bg-muted/30 p-4"
      >
        <InvoiceDocument
          :supplier="supplierSnapshot"
          :client="clientSnapshot"
          :items="previewItems"
          :invoice-number="invoiceNumber"
          :issue-date="issueDate"
          :due-date="dueDate"
          :taxable-date="issueDate"
          :variable-symbol="variableSymbol"
          :payment-method="paymentMethod"
        />
      </div>
    </div>

    <div
      v-if="!loading"
      class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur sm:hidden"
    >
      <div class="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="text-xs text-muted-foreground">Celkem k úhradě</div>
          <div class="truncate text-lg font-bold text-primary">{{ formatCZK(totals.total) }}</div>
        </div>
        <Button variant="coral" :disabled="saving" @click="onSave">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Uložit koncept
        </Button>
      </div>
    </div>

    <QuickClientDialog v-model:open="quickOpen" @confirm="onQuickConfirm" />

    <SendInvoiceDialog
      v-model:open="sendOpen"
      :recipient-email="clientSnapshot.email"
      :invoice-number="invoiceNumber"
      :supplier-name="supplierSnapshot.companyName"
      @sent="onSent"
    />

    <PaywallDialog v-model:open="paywallOpen" />

    <!-- Skrytý off-screen render dokumentu pro PDF export (vždy v DOM kvůli QR). -->
    <div ref="pdfDocEl" aria-hidden="true" style="position: fixed; left: -10000px; top: 0">
      <InvoiceDocument
        :supplier="supplierSnapshot"
        :client="clientSnapshot"
        :items="previewItems"
        :invoice-number="invoiceNumber"
        :issue-date="issueDate"
        :due-date="dueDate"
        :taxable-date="issueDate"
        :variable-symbol="variableSymbol"
        :payment-method="paymentMethod"
      />
    </div>
  </div>
</template>
