<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
  FileCheck2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DateField from '@/components/app/DateField.vue'
import QuickClientDialog, { type QuickClient } from '@/components/app/QuickClientDialog.vue'
import InvoiceDocument from '@/components/app/InvoiceDocument.vue'
import SendInvoiceDialog from '@/components/app/SendInvoiceDialog.vue'
import CancelInvoiceDialog from '@/components/app/CancelInvoiceDialog.vue'
import PaywallDialog from '@/components/app/PaywallDialog.vue'
import RecordPaymentDialog from '@/components/app/RecordPaymentDialog.vue'
import { downloadInvoicePdf } from '@/lib/invoice-pdf'
import { ApiError, isApiMode, saveErrorMessage } from '@/lib/http'
import { useClients } from '@/composables/useClients'
import {
  useInvoices,
  DuplicateInvoiceNumberError,
  type InvoiceInput,
} from '@/composables/useInvoices'
import { useSubscription } from '@/composables/useSubscription'
import { useCompanyStore } from '@/stores/company'
import {
  DEFAULT_INVOICE_NUMBER_FORMAT,
  buildInvoiceNumber,
  calcLine,
  calcTotals,
  documentTypeLabel,
  formatCZK,
  formatDate,
  paymentSummary,
  variableSymbolFromInvoiceNumber,
} from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type {
  ClientSnapshot,
  DocumentType,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  InvoiceStatus,
  SupplierSnapshot,
  VatRate,
} from '@/lib/types'

const route = useRoute()
const router = useRouter()
const { clients, load: loadClients, getById: getClientById } = useClients()
const {
  create,
  update,
  issue,
  addPayment,
  removePayment,
  cancel,
  get,
  getById: getInvoiceById,
  load: loadInvoices,
} = useInvoices()
const { canInvoice } = useSubscription()
const companyStore = useCompanyStore()

// Datum se skládá z MÍSTNÍCH složek, ne přes toISOString() — ten převádí do UTC, takže po půlnoci
// (v létě do 02:00) vracel včerejší den a nová faktura se předvyplnila datem o den zpět.
function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function todayISO(): string {
  return toIsoDate(new Date())
}
function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

const paymentMethods = [
  { value: 'bank_transfer', label: 'Převodem' },
  { value: 'cash', label: 'Hotově' },
  { value: 'card', label: 'Kartou' },
]

/** Šířka vykresleného dokladu (A4 @ 96 dpi) — musí odpovídat `.invoice-doc` v InvoiceDocument.vue. */
const DOC_WIDTH_PX = 794

const loading = ref(true)
const saving = ref(false)
const quickOpen = ref(false)
const showPreview = ref(true)
const fullPreviewOpen = ref(false)
const downloadingPdf = ref(false)
const sendOpen = ref(false)
const cancelOpen = ref(false)
const paywallOpen = ref(false)
// Skrytý off-screen render dokumentu pro zachycení do PDF.
const pdfDocEl = ref<HTMLElement | null>(null)

const editingId = ref<string | null>(null)
const status = ref<InvoiceStatus>('draft')
const paidAt = ref<string | null>(null)
// Zmražený snapshot dodavatele k okamžiku vystavení (server ho znovu snímkuje při issue) —
// null u nové/rozpracované faktury, kde ještě dává smysl živý profil firmy.
const loadedSupplierSnapshot = ref<SupplierSnapshot | null>(null)
// Typ dokladu: editor tvoří jen fakturu / zálohovou (proforma). Dobropis vzniká akcí ze seznamu
// (serverově, se zápornými částkami) a v editoru se needituje. Typ jde měnit jen u konceptu.
const documentType = ref<DocumentType>('invoice')
const documentTypeOptions = [
  { value: 'invoice', label: 'Faktura' },
  { value: 'proforma', label: 'Zálohová faktura' },
] as const
const canChooseType = computed(() => status.value === 'draft')

// Vystavený doklad se needituje — číslo, částky i odběratel jsou daňově zmražené a server každou
// změnu stejně odmítne. Editor proto přepne do čtení; změnu řeší storno a nové vystavení.
const isLocked = computed(() => Boolean(editingId.value) && status.value !== 'draft')
// Dobropis se otevírá jen ke čtení (vzniká rovnou vystavený), ale musí jít zobrazit, vytisknout,
// odeslat klientovi i stornovat — dřív ho editor odmítal otevřít úplně a byl to slepý doklad.
const isCreditNote = computed(() => documentType.value === 'credit_note')

// Hlavičková pole (číslo, datum vystavení, VS, způsob úhrady) needituje ani vystavený doklad —
// jinak by UI nabízelo změnu údaje, který je daňově zmražený a server ho stejně nepřijme.
const headerReadOnly = computed(() => serverOwnedFields || isLocked.value)

// V API režimu tiskne PDF vždy bankovní převod (entita způsob úhrady nemá); v mock režimu ukaž zvolený.
const paymentMethodLabel = computed(
  () =>
    (serverOwnedFields
      ? undefined
      : paymentMethods.find((m) => m.value === paymentMethod.value)?.label) ?? 'Převodem',
)

// V ostrém režimu vlastní číslo dokladu, datum vystavení, variabilní symbol i způsob úhrady SERVER:
// číslo se přiděluje z číselné řady až při vystavení, datum vystavení se doplní tamtéž, VS se odvozuje
// z čísla a doklad se tiskne s bankovním převodem. Jako editovatelná pole to byla lež — uživatel je
// vyplnil, uložení je zahodilo a po návratu do dokladu byla prázdná. Proto je jen zobrazujeme.
const serverOwnedFields = isApiMode()
const variableSymbolDisplay = computed(
  () => variableSymbol.value.trim() || variableSymbolFromInvoiceNumber(invoiceNumber.value),
)

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

// Součty serverem uzavřeného dokladu, převzaté při načtení. U dobropisu jsou ZÁPORNÉ.
const loadedTotals = ref<{ subtotal: number; vatTotal: number; total: number } | null>(null)

// Úhrady dokladu ze serveru (VYS-03). Faktura má 0–N úhrad; stav i zbývající částku počítá server.
const loadedPayments = ref<InvoicePayment[]>([])
const loadedPaidAmount = ref<number | null>(null)
const loadedOutstanding = ref<number | null>(null)
const paymentOpen = ref(false)
const removingPaymentId = ref<string | null>(null)

// Dobropis vzniká z konkrétní faktury a musí na ni odkazovat — v UI i na dokladu (§ 45 ZDPH).
// Dřív ta vazba nebyla vidět nikde: z papíru ani z obrazovky nešlo zjistit, co doklad opravuje.
const loadedParentInvoiceId = ref<string | null>(null)
const correctsInvoiceNumber = computed(() =>
  loadedParentInvoiceId.value
    ? (getInvoiceById(loadedParentInvoiceId.value)?.invoiceNumber ?? null)
    : null,
)

const payment = computed(() =>
  paymentSummary({
    status: status.value,
    total: totals.value.total,
    paidAmount: loadedPaidAmount.value ?? undefined,
    outstandingAmount: loadedOutstanding.value ?? undefined,
  }),
)

/** Způsob úhrady je na serveru volný text — neznámou hodnotu ukážeme, jak přišla. */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Převodem',
  cash: 'Hotově',
  card: 'Kartou',
  other: 'Jiné',
}
function paymentMethodName(method: string | null): string {
  if (!method) return 'Neuvedeno'
  return PAYMENT_METHOD_LABELS[method] ?? method
}

/** Úhrady se evidují jen u daňového dokladu — dobropis se neplatí, ten peníze vrací. */
const canRecordPayment = computed(
  () =>
    Boolean(editingId.value) &&
    !isCreditNote.value &&
    status.value !== 'cancelled' &&
    payment.value.outstanding > 0,
)

/**
 * Součty dokladu. Rozpracovaný koncept se počítá živě (uživatel píše do polí), ale u dokladu,
 * který už vlastní server, se berou JEHO čísla — jinak by editor v náhledu i v PDF ukázal jinou
 * částku, než jaká je doopravdy na dokladu (typicky u dobropisu, kde jsou částky záporné,
 * a u firmy, jejíž plátcovství DPH frontend zná jen z lokálního profilu).
 */
const totals = computed(() => {
  const live = calcTotals(normalizedItems(), vatPayer.value)
  if (!isLocked.value || !loadedTotals.value) return live
  return { ...live, ...loadedTotals.value }
})
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
      editingId.value = id
      status.value = inv.status
      documentType.value = inv.documentType
      paidAt.value = inv.paidAt
      loadedSupplierSnapshot.value = inv.supplierSnapshot ?? null
      loadedTotals.value = { subtotal: inv.subtotal, vatTotal: inv.vatTotal, total: inv.total }
      loadedPayments.value = inv.payments ?? []
      loadedPaidAmount.value = inv.paidAmount ?? null
      loadedOutstanding.value = inv.outstandingAmount ?? null
      loadedParentInvoiceId.value = inv.parentInvoiceId ?? null
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
        c?.invoiceNumberPrefix ?? '',
        c?.invoiceNumberFormat ?? DEFAULT_INVOICE_NUMBER_FORMAT,
        c?.nextInvoiceSeq || 1,
      )
      variableSymbol.value = variableSymbolFromInvoiceNumber(invoiceNumber.value)
    }
    // Výchozí splatnost z profilu firmy (klient s vlastní splatností ji přepíše níže).
    dueDate.value = addDaysISO(c?.defaultPaymentDays ?? 14)
    const clientIdQ = typeof route.query.clientId === 'string' ? route.query.clientId : null
    if (clientIdQ) selectedClientId.value = clientIdQ
    // Pozastavený přístup — vysvětlení hned při otevření (i přímou URL).
    if (!canInvoice.value) paywallOpen.value = true
  }

  loading.value = false
})

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
  // Vystavený doklad (status !== draft) má právní/platební údaje dodavatele zmražené k okamžiku
  // vystavení — firma je mohla mezitím změnit (účet, adresa, DPH režim), ale historický doklad musí
  // zůstat jak byl. Koncept ještě nic nezmrazuje, takže dál ukazuje živý profil firmy. Logo a barva
  // jsou jen vizuální branding, který backend nesnímkuje — bere se vždy aktuální profil firmy.
  if (status.value !== 'draft' && loadedSupplierSnapshot.value) {
    return {
      ...loadedSupplierSnapshot.value,
      logoUrl: c?.logoUrl ?? null,
      invoiceColor: c?.invoiceColor ?? null,
    }
  }
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

// Jeden zdroj vlastností dokladu pro všechny tři vykreslení (náhled, náhled přes celou obrazovku, PDF).
const documentProps = computed(() => ({
  supplier: supplierSnapshot.value,
  client: clientSnapshot.value,
  items: previewItems.value,
  invoiceNumber: invoiceNumber.value,
  issueDate: issueDate.value,
  dueDate: dueDate.value,
  taxableDate: issueDate.value,
  variableSymbol: variableSymbolDisplay.value,
  paymentMethod: paymentMethod.value,
  documentType: documentType.value,
  correctsInvoiceNumber: correctsInvoiceNumber.value,
}))

// Náhled je pevná A4 (794 px). Na užší obrazovce ho zmenšíme přesně na dostupnou šířku, ať je
// vidět celý doklad; nikdy nezvětšujeme (na desktopu tedy zůstává 1:1 jako dřív).
const previewBox = ref<HTMLElement | null>(null)
const previewZoom = ref(1)
function fitPreview(): void {
  const width = previewBox.value?.clientWidth ?? 0
  previewZoom.value = width ? Math.min(1, width / DOC_WIDTH_PX) : 1
}
// Náhled se do stránky přidá až po načtení dokladu a dá se schovat — přeměř po každé změně.
watch([showPreview, loading], () => void nextTick(fitPreview))
onMounted(() => window.addEventListener('resize', fitPreview, { passive: true }))
onUnmounted(() => window.removeEventListener('resize', fitPreview))

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

// Převezme do editoru serverovou pravdu po uložení/přechodu (id, přidělené číslo, datumy, stav).
function syncFromSaved(inv: Invoice): void {
  editingId.value = inv.id
  if (inv.invoiceNumber) invoiceNumber.value = inv.invoiceNumber
  // Datum vystavení i splatnost doplňuje server při vystavení — bez převzetí by editor (a náhled
  // i PDF) dál ukazoval svoji původní hodnotu, případně „Doplní se při vystavení“ u už vystavené faktury.
  if (inv.issueDate) issueDate.value = inv.issueDate
  if (inv.dueDate) dueDate.value = inv.dueDate
  status.value = inv.status
  paidAt.value = inv.paidAt
  loadedPayments.value = inv.payments ?? []
  loadedPaidAmount.value = inv.paidAmount ?? null
  loadedOutstanding.value = inv.outstandingAmount ?? null
  loadedParentInvoiceId.value = inv.parentInvoiceId ?? null
  loadedSupplierSnapshot.value = inv.supplierSnapshot ?? null
  adoptServerLineIds(inv)
}

// Řádky si po uložení převezmou serverová id (pořadí odpovídá editoru). Bez toho by editor
// držel klientská uuid a KAŽDÉ další uložení by existující řádky smazalo a založilo znovu —
// při selhání toho DELETE by na dokladu zůstaly obě kopie (zdvojené částky).
// Počet se liší jen když uživatel psal během ukládání; pak si server id vezme až příští uložení.
function adoptServerLineIds(inv: Invoice): void {
  if (!isApiMode() || inv.items.length !== items.value.length) return
  // Párujeme podle pořadí, takže se musí shodovat i popisy — jinak by si řádek vzal cizí
  // serverové id a příští uložení by přepsalo jiný řádek. Když to nesedí, id nepřebíráme.
  const sameOrder = items.value.every((it, i) => inv.items[i]?.description === it.description)
  if (!sameOrder) return
  items.value.forEach((it, i) => {
    const serverId = inv.items[i]?.id
    if (serverId) it.id = serverId
  })
}

// Uloží aktuální stav faktury (create nebo update konceptu). Bez toastu — řeší volající.
async function persist(): Promise<void> {
  // Pojistka ke skrytým tlačítkům: vystavený doklad se neukládá. Server by změnu stejně odmítl (409)
  // a z konceptu vystaveného dokladu by se nechtěně přepočítaly zmražené částky.
  if (isLocked.value) return
  // Server odběratele vyžaduje (CreateInvoiceRequest.ClientId). Bez tohoto guardu odešle editor
  // clientId: null, backend vrátí nesrozumitelnou validační chybu a rozdělaný doklad se ztratí.
  if (isApiMode() && !selectedClientId.value) {
    throw new ApiError(422, 'Vyberte klienta — bez něj doklad nelze uložit.')
  }
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
    try {
      syncFromSaved(await update(editingId.value, input, vatPayer.value))
      return
    } catch (e) {
      // Doklad mezitím někdo smazal (jiná záložka/terminál) → server nemá co upravit (404) a každé
      // další uložení by selhalo napořád. Rozdělanou fakturu nezahazujeme — uložíme ji jako NOVOU.
      if (!(e instanceof ApiError && e.status === 404)) throw e
      editingId.value = null
      toast.info('Původní doklad byl mezitím smazán — ukládáme ho znovu jako nový.')
    }
  }

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

// Přeloží serverový konflikt stavu (409) na srozumitelnou hlášku; ostatní chyby ohlásí obecně.
// Chybu NIKDY nepropouštěj dál — nezachycená by skončila jen v konzoli a uživatel by
// po kliknutí na Uložit neviděl vůbec nic (falešný dojem, že se doklad uložil).
function handleLifecycleError(e: unknown, conflictMessage: string): void {
  if (e instanceof ApiError && e.status === 409) {
    toast.error(conflictMessage)
    return
  }
  toast.error(saveErrorMessage(e, 'Fakturu se nepodařilo uložit.'))
  console.error(e)
}

async function onSave() {
  // Fakturace je zdarma navždy, zavírá ji až pozastavený přístup (nelze obejít přímou URL).
  if (!canInvoice.value) {
    paywallOpen.value = true
    return
  }
  saving.value = true
  try {
    await persist()
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

// Vystavení = z rozdělaného konceptu se stane hotová faktura: uloží se a server jí přidělí číslo
// z číselné řady i datum vystavení. Bez této akce zůstal doklad navždy konceptem bez čísla.
async function onIssue(): Promise<void> {
  if (!canInvoice.value) {
    paywallOpen.value = true
    return
  }
  saving.value = true
  try {
    await persist()
    if (!editingId.value) return
    syncFromSaved(await issue(editingId.value))
    toast.success(
      invoiceNumber.value ? `Faktura vystavena — č. ${invoiceNumber.value}.` : 'Faktura vystavena.',
    )
  } catch (e) {
    if (e instanceof DuplicateInvoiceNumberError) {
      toast.error('Faktura s tímto číslem už existuje. Změňte číslo faktury.')
    } else {
      handleLifecycleError(e, 'Fakturu se nepodařilo vystavit — zkuste to znovu.')
    }
  } finally {
    saving.value = false
  }
}

// Odeslání faktury zavře jen pozastavený přístup — fakturace sama je podle ceníku zdarma.
// V API režimu server odesílá jen VYSTAVENOU fakturu — koncept se před otevřením dialogu
// uloží a vystaví (uživatel odesláním vystavení zjevně chce; mock flow to dělá stejně).
async function onSendClick(): Promise<void> {
  if (!canInvoice.value) {
    paywallOpen.value = true
    return
  }
  if (isApiMode() && status.value === 'draft' && editingId.value) {
    saving.value = true
    try {
      await persist()
      syncFromSaved(await issue(editingId.value))
    } catch (e) {
      handleLifecycleError(e, 'Fakturu se nepodařilo vystavit — zkuste to znovu.')
      return
    } finally {
      saving.value = false
    }
  }
  sendOpen.value = true
}

// Po odeslání: API režim přenačte doklad ze serveru (Issued→Sent); mock vystaví koncept jako dřív.
async function onSent() {
  if (!editingId.value) return
  if (isApiMode()) {
    try {
      const fresh = await get(editingId.value)
      if (fresh) syncFromSaved(fresh)
    } catch (e) {
      console.warn('Obnovení faktury po odeslání selhalo:', e)
    }
    return
  }
  if (status.value !== 'draft') return
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

/**
 * Otevře evidenci úhrady. Dřív tohle tlačítko rovnou zaplatilo CELOU částku bez data, částky
 * i způsobu a nešlo to vzít zpět — teď se jen posbírá vstup a rozhodne server.
 * Koncept se před tím uloží a vystaví (jinak nemá číslo a server platbu odmítne).
 */
async function onRecordPaymentClick() {
  if (!canInvoice.value) {
    paywallOpen.value = true
    return
  }
  if (!editingId.value) return
  if (status.value === 'draft') {
    saving.value = true
    try {
      await persist()
      syncFromSaved(await issue(editingId.value))
    } catch (e) {
      handleLifecycleError(e, 'Fakturu se nepodařilo vystavit.')
      return
    } finally {
      saving.value = false
    }
  }
  paymentOpen.value = true
}

async function onRecordPayment(input: { amount: number; method: string; paidAt: string }) {
  if (!editingId.value || saving.value) return
  saving.value = true
  try {
    syncFromSaved(await addPayment(editingId.value, input))
    paymentOpen.value = false
    toast.success(
      payment.value.outstanding > 0
        ? `Úhrada zaznamenána. Zbývá ${formatCZK(payment.value.outstanding)}.`
        : 'Faktura je uhrazená.',
    )
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) {
      toast.error('Částka úhrady je vyšší, než kolik zbývá uhradit.')
    } else {
      handleLifecycleError(e, 'Úhradu se nepodařilo zaznamenat. Stav dokladu se nezměnil.')
    }
  } finally {
    saving.value = false
  }
}

/**
 * Smaže zaevidovanou úhradu — doklad se vrátí do předchozího stavu a zpátky do pohledávek.
 * Bez toho byl omylem odklikaný „Uhrazeno" nevratný a uhrazenou fakturu už nešlo ani stornovat.
 */
async function onRemovePayment(paymentId: string) {
  if (!editingId.value || removingPaymentId.value) return
  removingPaymentId.value = paymentId
  try {
    syncFromSaved(await removePayment(editingId.value, paymentId))
    toast.success('Úhrada smazána, doklad se vrátil mezi neuhrazené.')
  } catch (e) {
    handleLifecycleError(e, 'Úhradu se nepodařilo smazat. Stav dokladu se nezměnil.')
  } finally {
    removingPaymentId.value = null
  }
}

function onCancelClick(): void {
  cancelOpen.value = true
}

async function onCancelConfirm(reason: string) {
  if (!editingId.value) return
  saving.value = true
  try {
    syncFromSaved(await cancel(editingId.value, reason))
    cancelOpen.value = false
    toast.success(isCreditNote.value ? 'Dobropis stornován.' : 'Faktura stornována.')
  } catch (e) {
    handleLifecycleError(e, 'Tuto fakturu už nelze stornovat.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
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
            {{ isLocked ? 'Jen ke čtení' : editingId ? 'Úprava dokladu' : 'Nový doklad' }}
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
          @click="onCancelClick"
        >
          <Ban class="h-4 w-4 text-destructive" />
          <span class="hidden sm:inline">Stornovat</span>
        </Button>
        <Button
          v-if="canRecordPayment"
          variant="outline"
          :disabled="saving || loading"
          data-testid="editor-zaznamenat-uhradu"
          @click="onRecordPaymentClick"
        >
          <CheckCircle2 class="h-4 w-4 text-success" />
          <span class="hidden sm:inline">Zaznamenat úhradu</span>
        </Button>
        <Button v-if="!isLocked" variant="outline" :disabled="saving || loading" @click="onSave">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Uložit koncept
        </Button>
        <Button
          v-if="status === 'draft'"
          variant="coral"
          :disabled="saving || loading"
          @click="onIssue"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <FileCheck2 v-else class="h-4 w-4" />
          Vystavit fakturu
        </Button>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div v-else class="mt-6 space-y-6">
      <div
        v-if="isLocked"
        class="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
      >
        <span class="font-medium text-foreground">Doklad je vystavený, proto se už needituje.</span>
        Údaje i částky jsou zmražené k datu vystavení.
        <template v-if="isCreditNote">
          Dobropis navíc vychází z původní faktury<template v-if="correctsInvoiceNumber">
            <strong class="text-foreground"> {{ correctsInvoiceNumber }}</strong> </template
          >— pokud je špatně, stornujte ho a vystavte k té faktuře nový.
        </template>
        <template v-else> Potřebujete-li je změnit, doklad stornujte a vystavte znovu. </template>
      </div>

      <!-- Úhrady (VYS-03). Faktura má 0–N úhrad; zbývající částku i stav počítá server.
           Jednotlivá úhrada jde smazat, takže omylem odklikaná platba není nevratná —
           a uhrazená faktura, kterou server odmítá stornovat, se tím vrátí mezi neuhrazené. -->
      <div
        v-if="editingId && !isCreditNote && status !== 'draft' && status !== 'cancelled'"
        class="rounded-xl border border-border bg-card p-6"
        data-testid="editor-uhrady"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Úhrady
          </h2>
          <p class="text-sm">
            <template v-if="payment.outstanding > 0">
              Uhrazeno
              <strong>{{ formatCZK(payment.paid) }}</strong>
              z {{ formatCZK(totals.total) }} — zbývá
              <strong class="text-destructive">{{ formatCZK(payment.outstanding) }}</strong>
            </template>
            <template v-else-if="payment.overpaid > 0">
              <strong class="text-destructive">
                Přeplaceno o {{ formatCZK(payment.overpaid) }}
              </strong>
            </template>
            <template v-else>
              <strong class="text-success">Uhrazeno v plné výši</strong>
            </template>
          </p>
        </div>

        <ul v-if="loadedPayments.length" class="mt-4 divide-y divide-border">
          <li
            v-for="p in loadedPayments"
            :key="p.id"
            class="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span>
              <strong>{{ formatCZK(p.amount) }}</strong>
              <span class="text-muted-foreground">
                · {{ formatDate(p.paidAt) }} · {{ paymentMethodName(p.method) }}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              :disabled="removingPaymentId === p.id"
              :aria-label="`Smazat úhradu ${formatCZK(p.amount)}`"
              @click="onRemovePayment(p.id)"
            >
              <Loader2 v-if="removingPaymentId === p.id" class="h-4 w-4 animate-spin" />
              <Trash2 v-else class="h-4 w-4 text-destructive" />
              Smazat
            </Button>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-muted-foreground">
          Zatím žádná úhrada. Tlačítkem „Zaznamenat úhradu" nahoře přidáte i částečnou platbu.
        </p>
      </div>

      <!-- Odběratel -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Odběratel
        </h2>
        <div class="mt-4 space-y-2">
          <Label for="inv-client">Klient</Label>
          <div class="flex gap-2">
            <Select v-model="selectedClientId" :disabled="isLocked">
              <SelectTrigger id="inv-client" class="flex-1">
                <SelectValue placeholder="Vyberte klienta…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in clients" :key="c.id" :value="c.id">
                  {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              v-if="!isLocked"
              type="button"
              variant="outline"
              class="shrink-0"
              @click="quickOpen = true"
            >
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
            <Input v-if="!headerReadOnly" id="inv-number" v-model="invoiceNumber" />
            <div
              v-else
              class="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground"
            >
              {{ invoiceNumber || (isLocked ? '—' : 'Přidělí se při vystavení') }}
            </div>
          </div>
          <div class="space-y-2">
            <Label for="inv-payment">Způsob úhrady</Label>
            <Select v-if="!headerReadOnly" v-model="paymentMethod">
              <SelectTrigger id="inv-payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in paymentMethods" :key="m.value" :value="m.value">
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div
              v-else
              class="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground"
            >
              {{ paymentMethodLabel }}
            </div>
          </div>
          <div class="space-y-2">
            <Label>Datum vystavení</Label>
            <DateField
              v-if="!headerReadOnly"
              v-model="issueDate"
              label="Datum vystavení"
              test-id="inv-issue"
            />
            <div
              v-else
              class="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground"
            >
              {{ issueDate ? formatDate(issueDate) : isLocked ? '—' : 'Doplní se při vystavení' }}
            </div>
          </div>
          <div class="space-y-2">
            <Label>Datum splatnosti</Label>
            <DateField
              v-if="!isLocked"
              v-model="dueDate"
              label="Datum splatnosti"
              test-id="inv-due"
            />
            <div
              v-else
              class="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground"
            >
              {{ dueDate ? formatDate(dueDate) : '—' }}
            </div>
          </div>
          <div class="space-y-2">
            <Label for="inv-vs">Variabilní symbol</Label>
            <Input
              v-if="!headerReadOnly"
              id="inv-vs"
              v-model="variableSymbol"
              inputmode="numeric"
            />
            <div
              v-else
              class="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground"
            >
              {{ variableSymbolDisplay || (isLocked ? '—' : 'Odvodí se z čísla faktury') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Položky -->
      <div class="rounded-xl border border-border bg-card p-6">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Položky
          </h2>
          <Button
            v-if="!isLocked"
            type="button"
            variant="outline"
            size="sm"
            class="shrink-0"
            @click="addItem"
          >
            <Plus class="h-4 w-4" /> Přidat položku
          </Button>
        </div>

        <div class="mt-4 space-y-3">
          <div v-for="(it, idx) in items" :key="it.id" class="rounded-lg border border-border p-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-muted-foreground">#{{ idx + 1 }}</span>
              <Button
                v-if="!isLocked"
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
              :disabled="isLocked"
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
                  :disabled="isLocked"
                />
              </div>
              <div class="space-y-1">
                <Label :for="`inv-item-${it.id}-unit`" class="text-xs text-muted-foreground"
                  >MJ</Label
                >
                <Input :id="`inv-item-${it.id}-unit`" v-model="it.unit" :disabled="isLocked" />
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
                  :disabled="isLocked"
                />
              </div>
              <div v-if="vatPayer" class="space-y-1">
                <Label :for="`inv-item-${it.id}-vat`" class="text-xs text-muted-foreground"
                  >DPH %</Label
                >
                <Select
                  :model-value="String(it.vatRate)"
                  :disabled="isLocked"
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

      <!-- Živý náhled faktury. Doklad má pevnou šířku A4 (794 px) — na mobilu se do obrazovky
           nevešel a byla vidět jen jeho levá část, proto ho zmenšíme na dostupnou šířku a
           klepnutím se otevře přes celou obrazovku v čitelné velikosti. -->
      <div v-if="showPreview" class="rounded-xl border border-border bg-muted/30 p-4">
        <button
          ref="previewBox"
          type="button"
          class="block w-full overflow-hidden rounded-lg"
          aria-label="Zobrazit fakturu přes celou obrazovku"
          @click="fullPreviewOpen = true"
        >
          <div :style="{ zoom: previewZoom }">
            <InvoiceDocument v-bind="documentProps" />
          </div>
        </button>
        <p class="mt-3 text-center text-xs text-muted-foreground">
          Klepnutím zobrazíte fakturu přes celou obrazovku
        </p>
      </div>
    </div>

    <QuickClientDialog v-model:open="quickOpen" @confirm="onQuickConfirm" />

    <SendInvoiceDialog
      v-model:open="sendOpen"
      :invoice-id="editingId"
      :recipient-email="clientSnapshot.email"
      :invoice-number="invoiceNumber"
      :supplier-name="supplierSnapshot.companyName"
      @sent="onSent"
    />

    <CancelInvoiceDialog
      v-model:open="cancelOpen"
      :invoice-number="invoiceNumber"
      :cancelling="saving"
      @confirm="onCancelConfirm"
    />

    <RecordPaymentDialog
      v-model:open="paymentOpen"
      :invoice-number="invoiceNumber"
      :outstanding="payment.outstanding"
      :total="totals.total"
      :saving="saving"
      @confirm="onRecordPayment"
    />

    <PaywallDialog v-model:open="paywallOpen" />

    <!-- Faktura přes celou obrazovku — hlavně pro mobil, kde se A4 do šířky nevejde.
         Doklad je tu v plné velikosti a scrolluje se v obou osách, aby šel přečíst. -->
    <Dialog v-model:open="fullPreviewOpen">
      <DialogContent
        class="flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:h-[90vh] sm:max-w-4xl sm:rounded-lg"
      >
        <DialogHeader class="border-b border-border px-4 py-3 pr-14 text-left">
          <DialogTitle class="text-base">Náhled faktury</DialogTitle>
          <DialogDescription class="text-xs">
            Doklad je ve skutečné velikosti — posunutím si prohlédnete celou stranu.
          </DialogDescription>
        </DialogHeader>
        <div class="min-h-0 flex-1 overflow-auto bg-muted/30 p-4">
          <InvoiceDocument v-if="fullPreviewOpen" v-bind="documentProps" />
        </div>
      </DialogContent>
    </Dialog>

    <!-- Skrytý off-screen render dokumentu pro PDF export (vždy v DOM kvůli QR). -->
    <div ref="pdfDocEl" aria-hidden="true" style="position: fixed; left: -10000px; top: 0">
      <InvoiceDocument v-bind="documentProps" />
    </div>
  </div>
</template>
