<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  FileText,
  FileMinus2,
  ArrowRightLeft,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  Ban,
  BadgeCheck,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import PaywallDialog from '@/components/app/PaywallDialog.vue'
import RecordPaymentDialog from '@/components/app/RecordPaymentDialog.vue'
import { ApiError } from '@/lib/http'
import { useInvoices } from '@/composables/useInvoices'
import { useSubscription } from '@/composables/useSubscription'
import {
  documentTypeLabel,
  formatCZK,
  formatDate,
  INVOICE_STATUS_LABELS,
  paymentSummary,
} from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'
import type { DocumentType, Invoice, InvoiceStatus } from '@/lib/types'

const router = useRouter()
const { invoices, loadError, load, remove, creditNote, convertToInvoice, cancel, get, addPayment } =
  useInvoices()
const { canInvoice } = useSubscription()

const loading = ref(true)
const search = ref('')
const typeFilter = ref<'all' | DocumentType>('all')
const busyId = ref<string | null>(null)
const deleteId = ref<string | null>(null)
const deleteOpen = ref(false)
const cancelId = ref<string | null>(null)
const cancelOpen = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)
const creditOpen = ref(false)
const creditSource = ref<Invoice | null>(null)
const creditLineIds = ref<string[]>([])
const creatingCreditNote = ref(false)
const paywallOpen = ref(false)
const paymentTarget = ref<Invoice | null>(null)
const paymentOpen = ref(false)
const savingPayment = ref(false)

const typeFilters = [
  { value: 'all', label: 'Vše' },
  { value: 'invoice', label: 'Faktury' },
  { value: 'proforma', label: 'Zálohové' },
  { value: 'credit_note', label: 'Dobropisy' },
] as const

function askDelete(id: string) {
  deleteId.value = id
  deleteOpen.value = true
}

function askCancel(id: string) {
  cancelId.value = id
  cancelReason.value = ''
  cancelOpen.value = true
}

// Fakturace je podle ceníku zdarma navždy — brání jí jen ručně pozastavený přístup.
function newInvoice() {
  if (!canInvoice.value) {
    paywallOpen.value = true
    return
  }
  router.push('/app/faktury/editor')
}

async function reload(): Promise<void> {
  loading.value = true
  await load()
  loading.value = false
}
onMounted(reload)

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'
type StatusMeta = { label: string; variant: BadgeVariant }

// Slovník je JEDEN pro celou appku (`invoice.ts`) — dřív se „uhrazeno" jmenovalo na každé
// obrazovce jinak (tlačítko „Uhrazeno", seznam „Zaplaceno", přehled „Uhrazené", „Paid").
const statusLabels: Record<InvoiceStatus, StatusMeta> = {
  draft: { label: INVOICE_STATUS_LABELS.draft, variant: 'secondary' },
  issued: { label: INVOICE_STATUS_LABELS.issued, variant: 'default' },
  paid: { label: INVOICE_STATUS_LABELS.paid, variant: 'outline' },
  overdue: { label: INVOICE_STATUS_LABELS.overdue, variant: 'destructive' },
  cancelled: { label: INVOICE_STATUS_LABELS.cancelled, variant: 'secondary' },
}

// Fallback pro neočekávaný status (stará/poškozená data z localStorage), ať render nespadne.
function statusMeta(status: string): StatusMeta {
  return statusLabels[status as InvoiceStatus] ?? { label: status || 'Neznámý', variant: 'outline' }
}

/**
 * Stav řádku bere v potaz i ČÁSTEČNOU úhradu — ta v `InvoiceStatus` vlastní hodnotu nemá
 * (server drží `paidAmount`/`outstandingAmount`), takže by se jinak tvářila jako neuhrazená.
 */
function rowStatus(inv: Invoice): StatusMeta {
  const pay = paymentSummary(inv)
  if (inv.documentType === 'invoice' && pay.isPartial)
    return {
      label: `Částečně uhrazeno (${formatCZK(pay.paid)} z ${formatCZK(inv.total)})`,
      variant: 'outline',
    }
  return statusMeta(inv.status)
}

/**
 * Úhradu lze zaznamenat u vystaveného/částečně uhrazeného daňového dokladu. Dřív se k ní dalo
 * dostat JEN otevřením faktury, přestože je to nejčastější denní úkon.
 */
function canRecordPayment(inv: Invoice): boolean {
  if (inv.documentType !== 'invoice') return false
  if (inv.status !== 'issued' && inv.status !== 'overdue') return false
  return paymentSummary(inv).outstanding > 0
}

/**
 * Aktivní (nestornované) dobropisy k faktuře. Vazbu drží `parentInvoiceId`, ale v UI nebyla vidět
 * NIKDE: plně dobropisovaná faktura dál svítila „Uhrazeno / 10 000 Kč" a druhý plný dobropis šel
 * vystavit bez varování, takže se dalo doklad dobropisovat opakovaně donekonečna.
 */
function creditNotesFor(invoiceId: string): Invoice[] {
  return invoices.value.filter(
    (i) =>
      i.documentType === 'credit_note' &&
      i.parentInvoiceId === invoiceId &&
      i.status !== 'cancelled',
  )
}

/** Součet dobropisů k faktuře jako KLADNÁ částka (doklady mají záporný total). */
function creditNotedAmount(invoiceId: string): number {
  return -creditNotesFor(invoiceId).reduce((sum, i) => sum + i.total, 0)
}

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return invoices.value.filter((inv) => {
    if (typeFilter.value !== 'all' && inv.documentType !== typeFilter.value) return false
    if (!q) return true
    return (
      (inv.invoiceNumber ?? '').toLowerCase().includes(q) ||
      (inv.clientSnapshot?.name || '').toLowerCase().includes(q)
    )
  })
})

// Dobropis smí vzniknout jen z finalizované faktury (ne z konceptu, proformy ani jiného dobropisu).
// Stavy zrcadlí serverový `IsFinalizedInvoice` = Issued | Sent | Overdue | Paid; adapter mapuje
// serverový `Sent` na FE `issued` a `Archived` na `cancelled`.
// Faktura PO SPLATNOSTI tady dřív chyběla, takže u ní tlačítko nebylo, i když by ji server
// dobropisovat nechal — a právě neuhrazená faktura je typický důvod k opravě dokladu.
function canCreditNote(inv: { documentType: DocumentType; status: InvoiceStatus }): boolean {
  return (
    inv.documentType === 'invoice' &&
    (inv.status === 'issued' || inv.status === 'overdue' || inv.status === 'paid')
  )
}

// Smazat lze POUZE koncept — vystavený doklad podléhá účetní retenci a server ho smazat odmítne.
// Dokud se tlačítko nabízelo u všeho, končilo potvrzení chybou a jediná rada mířila na akci,
// která u dokladu vůbec nebyla dostupná.
function canDelete(inv: { status: InvoiceStatus }): boolean {
  return inv.status === 'draft'
}

// Dobropis vzniká rovnou VYSTAVENÝ, takže ho nejde smazat (účetní retence) ani otevřít v editoru
// (ten přepočítává kladné součty, tak ho tvrdý guard odmítá). Bez storna byl omylem vystavený
// dobropis slepá ulička — v seznamu neměl jedinou akci. Účetně správná oprava není smazání,
// ale storno: doklad si nechá své číslo a v evidenci zůstane označený jako stornovaný.
// Stavy odpovídají serverovému `InvoiceStateMachine` (uhrazený, stornovaný ani archivovaný už
// stornovat nejde). Serverový `Sent` mapuje adapter na FE `issued`, takže odeslaný doklad
// spadá pod první větev — vlastní stav pro něj tady není.
function canCancel(inv: { documentType: DocumentType; status: InvoiceStatus }): boolean {
  return inv.documentType === 'credit_note' && (inv.status === 'issued' || inv.status === 'overdue')
}

// Vystavený doklad se v editoru jen prohlíží, koncept se edituje — popisek to musí říct dopředu.
function openLabel(inv: { status: InvoiceStatus }): string {
  return inv.status === 'draft' ? 'Upravit' : 'Otevřít'
}

const deleteTarget = computed(() => invoices.value.find((inv) => inv.id === deleteId.value) ?? null)

// Mazat lze jen koncept, a ten je vždy faktura nebo zálohová (dobropis vzniká rovnou vystavený).
const deleteDialogTitle = computed(() =>
  deleteTarget.value?.documentType === 'proforma' ? 'Smazat zálohovou fakturu?' : 'Smazat fakturu?',
)

/**
 * Otevře výběr položek k dobropisu. Nedobropisuje se vždycky celá faktura — když se reklamuje
 * jedna položka z deseti, plný dobropis by vrátil násobně víc peněz, než má.
 * Detail se dotahuje ze serveru, protože výpis faktur vrací jen souhrn bez řádků.
 */
async function askCreditNote(id: string) {
  if (busyId.value) return
  busyId.value = id
  try {
    const src = await get(id)
    if (!src) {
      toast.error('Fakturu se nepodařilo načíst.')
      return
    }
    creditSource.value = src
    creditLineIds.value = src.items.map((it) => it.id) // výchozí = plný dobropis
    creditOpen.value = true
  } catch {
    toast.error('Fakturu se nepodařilo načíst.')
  } finally {
    busyId.value = null
  }
}

/** Vystaví dobropis k vybraným položkám — doklad vytvoří backend (záporné částky), FE ho jen zobrazí. */
async function onCreditNote() {
  const src = creditSource.value
  if (!src || !creditLineIds.value.length || creatingCreditNote.value) return
  creatingCreditNote.value = true
  try {
    // Plný dobropis = všechny řádky; pak se výběr neposílá, ať se server chová jako dřív.
    const all = creditLineIds.value.length === src.items.length
    const note = await creditNote(src.id, all ? undefined : creditLineIds.value)
    toast.success(`Dobropis vytvořen (${formatCZK(note.total)}).`)
    typeFilter.value = 'all'
    creditOpen.value = false
    creditSource.value = null
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Dobropis lze vystavit jen k vystavené nebo uhrazené faktuře.')
    } else if (e instanceof ApiError && e.status === 422) {
      toast.error('Vybrané položky k faktuře nepatří. Zkuste ji otevřít znovu.')
    } else {
      toast.error('Vystavení dobropisu se nezdařilo.')
    }
  } finally {
    creatingCreditNote.value = false
  }
}

/** Otevře evidenci úhrady rovnou ze seznamu — nejčastější denní úkon nemá nutit otevřít doklad. */
function askPayment(inv: Invoice) {
  paymentTarget.value = inv
  paymentOpen.value = true
}

/**
 * Zaeviduje úhradu. Nový stav dokladu (částečně uhrazeno / uhrazeno) přebíráme AŽ z odpovědi
 * serveru — částky ani přechod stavu se lokálně nehádají.
 */
async function onRecordPayment(payment: { amount: number; method: string; paidAt: string }) {
  const target = paymentTarget.value
  if (!target || savingPayment.value) return
  savingPayment.value = true
  try {
    const updated = await addPayment(target.id, payment)
    const pay = paymentSummary(updated)
    toast.success(
      pay.outstanding > 0
        ? `Úhrada zaznamenána. Zbývá ${formatCZK(pay.outstanding)}.`
        : 'Faktura je uhrazená.',
    )
    paymentOpen.value = false
    paymentTarget.value = null
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Doklad už není ve stavu, kdy lze evidovat úhradu.')
      await load()
    } else if (e instanceof ApiError && e.status === 422) {
      toast.error('Částka úhrady je vyšší, než kolik zbývá uhradit.')
    } else if (e instanceof ApiError && e.status === 403) {
      toast.error('Na evidenci úhrad nemáte oprávnění.')
    } else {
      toast.error('Úhradu se nepodařilo zaznamenat. Stav dokladu se nezměnil.')
    }
  } finally {
    savingPayment.value = false
  }
}

function toggleCreditLine(lineId: string, checked: boolean) {
  creditLineIds.value = checked
    ? [...new Set([...creditLineIds.value, lineId])]
    : creditLineIds.value.filter((id) => id !== lineId)
}

/** Převede zálohovou (proforma) fakturu na daňový doklad a otevře ho k dokončení. */
async function onConvert(id: string) {
  if (busyId.value) return
  busyId.value = id
  try {
    const inv = await convertToInvoice(id)
    toast.success('Zálohová faktura převedena na daňový doklad.')
    router.push('/app/faktury/editor?id=' + inv.id)
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Převést lze jen zálohovou fakturu.')
    } else {
      toast.error('Převod se nezdařil.')
    }
  } finally {
    busyId.value = null
  }
}

const cancelTarget = computed(() => invoices.value.find((inv) => inv.id === cancelId.value) ?? null)
// Server důvod VYŽADUJE (a ukládá ho k dokladu), takže prázdný se ani neodesílá.
const cancelReasonValid = computed(() => cancelReason.value.trim().length >= 5)

/**
 * Stornuje dobropis. Doklad se NEMAŽE — zůstane s číslem i položkami, jen dostane stav
 * „Stornováno" a uložený důvod, takže je v účetnictví dohledatelný.
 * Stav se mění AŽ z odpovědi serveru; žádný lokální „úspěch" dopředu.
 */
async function onCancelCreditNote() {
  const id = cancelId.value
  if (!id || cancelling.value) return
  if (!cancelReasonValid.value) {
    toast.error('Uveďte důvod storna (alespoň 5 znaků) — ukládá se k dokladu.')
    return
  }
  cancelling.value = true
  try {
    await cancel(id, cancelReason.value.trim())
    toast.success('Dobropis stornován.')
    cancelOpen.value = false
    cancelId.value = null
    cancelReason.value = ''
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      // Např. doklad mezitím stornoval nebo uhradil jiný uživatel — načti skutečný stav.
      toast.error('Dobropis už stornovat nelze. Zkontrolujte jeho aktuální stav.')
      await load()
    } else if (e instanceof ApiError && e.status === 403) {
      toast.error('Na storno dokladu nemáte oprávnění.')
    } else {
      toast.error('Storno se nepodařilo dokončit. Stav dokladu se nezměnil.')
    }
  } finally {
    cancelling.value = false
  }
}

async function onDelete() {
  const id = deleteId.value
  if (!id) return
  deleteOpen.value = false
  deleteId.value = null
  try {
    await remove(id)
    toast.success('Faktura smazána.')
  } catch (e) {
    // Vystavenou fakturu server smazat nedovolí (409) — patří ji stornovat, ne mazat.
    if (e instanceof ApiError && e.status === 409) {
      toast.error('Vystavenou fakturu nelze smazat — otevřete ji a stornujte.')
    } else {
      throw e
    }
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Faktury</h1>
        <p class="mt-1 text-muted-foreground">Spravujte své faktury a sledujte platby.</p>
      </div>
      <!-- flex-wrap: na 320px se akce zalomí pod sebe místo horizontálního overflow celé stránky -->
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="router.push('/app/import/faktury')">
          <Upload class="h-4 w-4" /> Import faktur
        </Button>
        <Button variant="coral" @click="newInvoice"> <Plus class="h-4 w-4" /> Nová faktura </Button>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <div class="relative min-w-[12rem] flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="search" placeholder="Hledat fakturu nebo klienta…" class="pl-9" />
      </div>
      <div class="flex flex-wrap gap-1">
        <Button
          v-for="t in typeFilters"
          :key="t.value"
          :variant="typeFilter === t.value ? 'default' : 'outline'"
          size="sm"
          @click="typeFilter = t.value"
        >
          {{ t.label }}
        </Button>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-12" @retry="reload" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <FileText class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">
        {{ invoices.length === 0 ? 'Zatím žádné faktury' : 'Nic nenalezeno' }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{
          invoices.length === 0
            ? 'Vystavte svou první fakturu jediným kliknutím.'
            : 'Zkuste změnit hledaný výraz.'
        }}
      </p>
      <Button v-if="invoices.length === 0" variant="coral" class="mt-4" @click="newInvoice">
        <Plus class="h-4 w-4" /> Nová faktura
      </Button>
    </div>

    <template v-else>
      <!-- Mobil: karty místo tabulky -->
      <div class="mt-6 space-y-3 sm:hidden">
        <div
          v-for="inv in filtered"
          :key="inv.id"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold">{{ inv.invoiceNumber || 'Koncept' }}</span>
                <Badge
                  v-if="inv.documentType !== 'invoice'"
                  variant="outline"
                  class="shrink-0 text-[10px]"
                >
                  {{ documentTypeLabel(inv.documentType) }}
                </Badge>
              </div>
              <div class="truncate text-sm text-muted-foreground">
                {{ inv.clientSnapshot?.name || '—' }}
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <Badge :variant="rowStatus(inv).variant">{{ rowStatus(inv).label }}</Badge>
              <Badge v-if="creditNotedAmount(inv.id) > 0" variant="secondary" class="text-[10px]">
                Dobropisováno {{ formatCZK(creditNotedAmount(inv.id)) }}
              </Badge>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-sm text-muted-foreground">{{ formatDate(inv.issueDate) }}</span>
            <span class="font-semibold">{{ formatCZK(inv.total) }}</span>
          </div>
          <div class="mt-3 flex flex-wrap justify-end gap-1 border-t border-border pt-2">
            <Button
              v-if="canRecordPayment(inv)"
              variant="ghost"
              size="sm"
              data-testid="faktury-zaznamenat-uhradu"
              @click="askPayment(inv)"
            >
              <BadgeCheck class="h-4 w-4" /> Zaznamenat úhradu
            </Button>
            <Button
              v-if="canCreditNote(inv)"
              variant="ghost"
              size="sm"
              :disabled="busyId === inv.id"
              @click="askCreditNote(inv.id)"
            >
              <FileMinus2 class="h-4 w-4" /> Dobropis
            </Button>
            <Button
              v-if="inv.documentType === 'proforma'"
              variant="ghost"
              size="sm"
              :disabled="busyId === inv.id"
              @click="onConvert(inv.id)"
            >
              <ArrowRightLeft class="h-4 w-4" /> Na fakturu
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="router.push('/app/faktury/editor?id=' + inv.id)"
            >
              <Pencil class="h-4 w-4" /> {{ openLabel(inv) }}
            </Button>
            <Button
              v-if="canCancel(inv)"
              variant="ghost"
              size="sm"
              data-testid="faktury-storno-dobropis"
              @click="askCancel(inv.id)"
            >
              <Ban class="h-4 w-4 text-destructive" /> Stornovat
            </Button>
            <Button v-if="canDelete(inv)" variant="ghost" size="sm" @click="askDelete(inv.id)">
              <Trash2 class="h-4 w-4 text-destructive" /> Smazat
            </Button>
          </div>
        </div>
      </div>

      <!-- Desktop: tabulka -->
      <div class="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table class="w-full min-w-[640px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Číslo</th>
              <th class="px-4 py-3 text-left">Odběratel</th>
              <th class="px-4 py-3 text-left">Vystaveno</th>
              <th class="px-4 py-3 text-right">Částka</th>
              <th class="px-4 py-3 text-center">Stav</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in filtered"
              :key="inv.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">
                <div class="flex items-center gap-2">
                  <span>{{ inv.invoiceNumber || 'Koncept' }}</span>
                  <Badge
                    v-if="inv.documentType !== 'invoice'"
                    variant="outline"
                    class="text-[10px]"
                  >
                    {{ documentTypeLabel(inv.documentType) }}
                  </Badge>
                </div>
              </td>
              <td class="px-4 py-3 text-muted-foreground">{{ inv.clientSnapshot?.name || '—' }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ formatDate(inv.issueDate) }}</td>
              <td class="px-4 py-3 text-right font-semibold">{{ formatCZK(inv.total) }}</td>
              <td class="px-4 py-3 text-center">
                <Badge :variant="rowStatus(inv).variant">
                  {{ rowStatus(inv).label }}
                </Badge>
                <Badge
                  v-if="creditNotedAmount(inv.id) > 0"
                  variant="secondary"
                  class="ml-1 text-[10px]"
                >
                  Dobropisováno {{ formatCZK(creditNotedAmount(inv.id)) }}
                </Badge>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    v-if="canRecordPayment(inv)"
                    variant="ghost"
                    size="icon"
                    title="Zaznamenat úhradu"
                    aria-label="Zaznamenat úhradu"
                    data-testid="faktury-zaznamenat-uhradu-desktop"
                    @click="askPayment(inv)"
                  >
                    <BadgeCheck class="h-4 w-4" />
                  </Button>
                  <Button
                    v-if="canCreditNote(inv)"
                    variant="ghost"
                    size="icon"
                    title="Vystavit dobropis"
                    :disabled="busyId === inv.id"
                    @click="askCreditNote(inv.id)"
                  >
                    <FileMinus2 class="h-4 w-4" />
                  </Button>
                  <Button
                    v-if="inv.documentType === 'proforma'"
                    variant="ghost"
                    size="icon"
                    title="Převést na fakturu"
                    :disabled="busyId === inv.id"
                    @click="onConvert(inv.id)"
                  >
                    <ArrowRightLeft class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    :title="openLabel(inv)"
                    :aria-label="openLabel(inv)"
                    data-testid="faktury-otevrit"
                    @click="router.push('/app/faktury/editor?id=' + inv.id)"
                  >
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button
                    v-if="canCancel(inv)"
                    variant="ghost"
                    size="icon"
                    title="Stornovat dobropis"
                    aria-label="Stornovat dobropis"
                    data-testid="faktury-storno-dobropis-desktop"
                    @click="askCancel(inv.id)"
                  >
                    <Ban class="h-4 w-4 text-destructive" />
                  </Button>
                  <Button
                    v-if="canDelete(inv)"
                    variant="ghost"
                    size="icon"
                    title="Smazat"
                    @click="askDelete(inv.id)"
                  >
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="deleteOpen" @update:open="(o) => (deleteOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ deleteDialogTitle }}</AlertDialogTitle>
          <AlertDialogDescription>
            Tuto akci nelze vrátit. Faktura bude trvale smazána.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="onDelete"
          >
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!--
      Výběr položek k dobropisu. Výchozí je celá faktura (dosavadní chování), ale u reklamace
      jedné položky z deseti by plný dobropis vrátil násobně víc peněz, než má.
      Částky NEPOČÍTÁ frontend — po potvrzení je spočítá server z vybraných řádků.
    -->
    <AlertDialog :open="creditOpen" @update:open="(o) => (creditOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vystavit dobropis</AlertDialogTitle>
          <AlertDialogDescription>
            Vyberte položky faktury <strong>{{ creditSource?.invoiceNumber }}</strong
            >, které chcete dobropisovat. Dobropis vznikne rovnou vystavený a částky k němu spočítá
            systém.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <!-- Faktura už dobropis má → řekni to NAHLAS. Bez toho šlo plně uhrazenou fakturu
             dobropisovat opakovaně v plné výši a nic na to neupozornilo. -->
        <p
          v-if="creditSource && creditNotedAmount(creditSource.id) > 0"
          class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-foreground"
          data-testid="dobropis-uz-existuje"
        >
          K této faktuře už existuje dobropis na
          <strong>{{ formatCZK(creditNotedAmount(creditSource.id)) }}</strong>
          <template v-if="creditNotedAmount(creditSource.id) >= creditSource.total">
            — je tedy dobropisovaná v plné výši.
          </template>
          Vystavit další?
        </p>

        <div class="max-h-64 space-y-2 overflow-y-auto" data-testid="dobropis-polozky">
          <label
            v-for="it in creditSource?.items ?? []"
            :key="it.id"
            class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm"
          >
            <Checkbox
              :model-value="creditLineIds.includes(it.id)"
              :aria-label="it.description"
              @update:model-value="(v) => toggleCreditLine(it.id, v === true)"
            />
            <span class="min-w-0 flex-1">
              <span class="block font-medium text-foreground">{{ it.description }}</span>
              <span class="block text-muted-foreground">
                {{ it.quantity }} × {{ formatCZK(it.unitPrice) }}
              </span>
            </span>
            <span class="shrink-0 font-semibold tabular-nums">{{ formatCZK(it.lineTotal) }}</span>
          </label>
        </div>
        <p v-if="!creditLineIds.length" class="text-xs text-destructive">
          Vyberte aspoň jednu položku.
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel :disabled="creatingCreditNote">Zpět</AlertDialogCancel>
          <Button
            variant="coral"
            :disabled="!creditLineIds.length || creatingCreditNote"
            data-testid="dobropis-potvrdit"
            @click="onCreditNote"
          >
            <Loader2 v-if="creatingCreditNote" class="h-4 w-4 animate-spin" />
            {{ creatingCreditNote ? 'Vystavuji…' : 'Vystavit dobropis' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!--
      Storno dobropisu. Není to smazání: doklad zůstane v evidenci s číslem i položkami, jen
      dostane stav „Stornováno" a uložený důvod. Proto povinný důvod a vlastní tlačítko místo
      AlertDialogAction — ta zavírá dialog dřív, než akce doběhne, takže by dvojklik poslal
      dva požadavky a uživatel by neviděl, že se něco děje.
    -->
    <AlertDialog :open="cancelOpen" @update:open="(o) => (cancelOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stornovat dobropis?</AlertDialogTitle>
          <AlertDialogDescription>
            Dobropis
            <strong>{{ cancelTarget?.invoiceNumber }}</strong> zůstane v evidenci se svým číslem,
            označí se jako stornovaný a přestane se počítat do DPH i obratu. Smazat ho nelze —
            vystavený doklad podléhá účetní retenci.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="space-y-2">
          <Label for="storno-duvod">Důvod storna</Label>
          <Input
            id="storno-duvod"
            v-model="cancelReason"
            data-testid="faktury-storno-duvod"
            placeholder="Např. vystaveno omylem k jiné faktuře"
            maxlength="500"
          />
          <p class="text-xs text-muted-foreground">
            Důvod se uloží k dokladu, aby bylo později dohledatelné, proč byl stornován.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel :disabled="cancelling">Zpět</AlertDialogCancel>
          <!-- Tlačítko zůstává AKTIVNÍ i bez důvodu: dřív bylo disabled, klik nic neudělal a nic
               neřeklo, takže uživatel neměl jak zjistit, co mu chybí. Chybějící důvod se ohlásí
               až při odeslání, konkrétní hláškou. -->
          <Button
            variant="destructive"
            :disabled="cancelling"
            data-testid="faktury-storno-potvrdit"
            @click="onCancelCreditNote"
          >
            <Loader2 v-if="cancelling" class="h-4 w-4 animate-spin" />
            {{ cancelling ? 'Stornuji…' : 'Stornovat dobropis' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <RecordPaymentDialog
      v-if="paymentTarget"
      v-model:open="paymentOpen"
      :invoice-number="paymentTarget.invoiceNumber ?? ''"
      :outstanding="paymentSummary(paymentTarget).outstanding"
      :total="paymentTarget.total"
      :saving="savingPayment"
      @confirm="onRecordPayment"
    />

    <PaywallDialog v-model:open="paywallOpen" />
  </div>
</template>
