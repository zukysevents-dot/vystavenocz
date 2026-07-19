<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  Loader2,
  ArrowRightCircle,
  Wrench,
  Send,
  Check,
  X,
  Clock,
  UserPlus,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'
import QuickClientDialog, { type QuickClient } from '@/components/app/QuickClientDialog.vue'
import { useQuotes, type QuoteInput } from '@/composables/useQuotes'
import { useInvoices, type InvoiceInput } from '@/composables/useInvoices'
import { useClients } from '@/composables/useClients'
import { useCompanyStore } from '@/stores/company'
import { calcLine, calcTotals, formatCZK, formatDate } from '@/lib/invoice'
import { quoteTotal, summarizeQuotes, quoteStatusLabel } from '@/lib/quotes'
import type {
  Quote,
  QuoteItem,
  QuoteItemKind,
  QuoteStatus,
  VatRate,
  InvoiceItem,
  SupplierSnapshot,
} from '@/lib/types'

const router = useRouter()
const quotesApi = useQuotes()
const invoicesApi = useInvoices()
const { clients, load: loadClients } = useClients()
const companyStore = useCompanyStore()

const quotes = ref<Quote[]>([])
const loading = ref(true)
const loadError = ref(false)
const dialogOpen = ref(false)
const editing = ref<Quote | null>(null)
const deleteId = ref<string | null>(null)
const submitting = ref(false)
const busyId = ref<string | null>(null)
const quickClientOpen = ref(false)

const vatRates: VatRate[] = [21, 12, 0]
const statuses: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired']
const kinds: { value: QuoteItemKind; label: string }[] = [
  { value: 'work', label: 'Práce' },
  { value: 'material', label: 'Materiál' },
]
const statusVariant: Record<QuoteStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  sent: 'default',
  accepted: 'outline',
  rejected: 'destructive',
  expired: 'outline',
}

const vatPayer = computed(() => companyStore.company?.vatMode === 'payer')

interface FormItem {
  description: string
  quantity: number
  unitPrice: number
  vatRate: VatRate
  kind: QuoteItemKind
}
const emptyItem = (): FormItem => ({
  description: '',
  quantity: 1,
  unitPrice: 0,
  vatRate: 21,
  kind: 'work',
})
const form = reactive({
  number: '',
  clientId: '' as string,
  clientName: '',
  status: 'draft' as QuoteStatus,
  validUntil: '',
  note: '',
  items: [emptyItem()] as FormItem[],
})

watch(
  () => form.clientId,
  (id) => {
    if (id) {
      const c = clients.value.find((x) => x.id === id)
      if (c) form.clientName = c.name
    }
  },
)

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    quotes.value = await quotesApi.list()
    await loadClients()
  } catch (e) {
    console.warn('Načtení nabídek selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(async () => {
  companyStore.init()
  await reload()
})

const summary = computed(() => summarizeQuotes(quotes.value, vatPayer.value))

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const formTotal = computed(
  () =>
    calcTotals(
      form.items.map((i) => ({
        quantity: num(i.quantity),
        unitPrice: num(i.unitPrice),
        vatRate: i.vatRate,
      })),
      vatPayer.value,
    ).total,
)

function suggestNumber(): string {
  const year = new Date().getFullYear()
  const seq = String(quotes.value.length + 1).padStart(4, '0')
  return `NAB-${year}-${seq}`
}

function openNew() {
  editing.value = null
  Object.assign(form, {
    number: suggestNumber(),
    clientId: '',
    clientName: '',
    status: 'draft' as QuoteStatus,
    validUntil: '',
    note: '',
    items: [emptyItem()],
  })
  dialogOpen.value = true
}

function openEdit(q: Quote) {
  editing.value = q
  Object.assign(form, {
    number: q.number,
    clientId: q.clientId ?? '',
    clientName: q.clientName ?? '',
    status: q.status,
    validUntil: q.validUntil ?? '',
    note: q.note ?? '',
    items: q.items.length ? q.items.map((i) => ({ ...i })) : [emptyItem()],
  })
  dialogOpen.value = true
}

function onQuickClient(client: QuickClient, savedClientId: string | null) {
  form.clientName = client.name
  form.clientId = savedClientId ?? ''
  if (savedClientId) void loadClients()
}

function addItem() {
  form.items.push(emptyItem())
}
function removeItem(i: number) {
  form.items.splice(i, 1)
  if (form.items.length === 0) form.items.push(emptyItem())
}

function buildInput(): QuoteInput {
  const items: QuoteItem[] = form.items
    .filter((i) => i.description.trim())
    .map((i) => ({
      description: i.description.trim(),
      quantity: num(i.quantity),
      unitPrice: num(i.unitPrice),
      vatRate: i.vatRate,
      kind: i.kind,
    }))
  return {
    number: form.number.trim(),
    clientId: form.clientId || null,
    clientName: form.clientName.trim() || null,
    status: form.status,
    items,
    validUntil: form.validUntil || null,
    note: form.note.trim() || null,
  }
}

async function save() {
  if (submitting.value) return
  if (!form.number.trim()) {
    toast.error('Zadejte číslo nabídky.')
    return
  }
  const input = buildInput()
  if (input.items.length === 0) {
    toast.error('Přidejte alespoň jednu položku.')
    return
  }
  submitting.value = true
  try {
    if (editing.value) {
      await quotesApi.update(editing.value.id, input)
      toast.success('Nabídka upravena.')
    } else {
      await quotesApi.create(input)
      toast.success('Nabídka vytvořena.')
    }
    dialogOpen.value = false
    await reload()
  } catch {
    toast.error('Uložení se nezdařilo. Zkuste to prosím znovu.')
  } finally {
    submitting.value = false
  }
}

async function onDelete() {
  if (!deleteId.value) return
  try {
    await quotesApi.remove(deleteId.value)
    toast.success('Nabídka smazána.')
    deleteId.value = null
    await reload()
  } catch {
    toast.error('Smazání se nezdařilo.')
  }
}

// --- stavové přechody ---
const canConvert = (q: Quote) => q.status !== 'rejected' && q.status !== 'expired'

async function changeStatus(q: Quote, status: QuoteStatus) {
  if (busyId.value) return
  busyId.value = q.id
  try {
    await quotesApi.setStatus(q.id, status)
    toast.success(`Stav změněn na „${quoteStatusLabel(status)}".`)
    await reload()
  } catch {
    toast.error('Změna stavu se nezdařila.')
  } finally {
    busyId.value = null
  }
}

async function sendEmail(q: Quote) {
  if (busyId.value) return
  if (!window.confirm(`Odeslat nabídku ${q.number} e-mailem odběrateli?`)) return
  busyId.value = q.id
  try {
    await quotesApi.sendEmail(q.id)
    toast.success('Nabídka byla odeslána e-mailem.')
    await reload()
  } catch {
    toast.error('Nabídku se nepodařilo odeslat. Zkontrolujte e-mail u odběratele a SMTP nastavení.')
  } finally {
    busyId.value = null
  }
}

// --- převod na zakázku ---
async function toJob(q: Quote) {
  if (busyId.value) return
  busyId.value = q.id
  try {
    const job = await quotesApi.convertToJob(q.id)
    toast.success('Nabídka převedena na zakázku.')
    router.push(`/app/zakazky/${job.id}`)
  } catch {
    toast.error('Převod na zakázku se nezdařil.')
  } finally {
    busyId.value = null
  }
}

function supplierFromCompany(): SupplierSnapshot {
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
}

/**
 * Převede nabídku na KONCEPT faktury a otevře editor faktury k dokončení.
 * Pozn.: bez idempotence (opakované kliknutí založí další koncept) — vzniká jen nevystavený draft,
 * který obsluha smaže; skutečné číslo doklad dostane až vystavením. Pre-existující chování NabidkyPage.
 */
async function convertToInvoice(q: Quote) {
  if (busyId.value) return
  busyId.value = q.id
  try {
    const payer = vatPayer.value
    const items: InvoiceItem[] = q.items
      .filter((qi) => qi.description.trim())
      .map((qi) => {
        const clean = {
          quantity: num(qi.quantity),
          unitPrice: num(qi.unitPrice),
          vatRate: qi.vatRate,
        }
        const line = calcLine(clean, payer)
        return {
          id: crypto.randomUUID(),
          description: qi.description.trim(),
          quantity: clean.quantity,
          unit: qi.kind === 'work' ? 'h' : 'ks',
          unitPrice: clean.unitPrice,
          vatRate: qi.vatRate,
          lineSubtotal: line.lineSubtotal,
          lineVat: line.lineVat,
          lineTotal: line.lineTotal,
        }
      })
    if (items.length === 0) {
      toast.error('Nabídka nemá platné položky k fakturaci.')
      return
    }
    const now = new Date()
    const issue = now.toISOString().slice(0, 10)
    const due = new Date(now.getTime() + 14 * 86_400_000).toISOString().slice(0, 10)
    const input: InvoiceInput = {
      documentType: 'invoice',
      status: 'draft',
      invoiceNumber: '',
      clientId: q.clientId,
      clientSnapshot: { name: q.clientName || '' },
      supplierSnapshot: supplierFromCompany(),
      items,
      currency: 'CZK',
      issueDate: issue,
      dueDate: due,
      taxableDate: issue,
      paidAt: null,
      variableSymbol: null,
      constantSymbol: null,
      specificSymbol: null,
      paymentMethod: 'bank',
      notes: q.note,
    }
    const created = await invoicesApi.create(input, payer)
    if (q.status !== 'accepted') {
      try {
        await quotesApi.setStatus(q.id, 'accepted')
      } catch {
        /* faktura už existuje, stav nabídky lze doopravit ručně */
      }
    }
    toast.success('Nabídka převedena na koncept faktury.')
    router.push(`/app/faktury/editor?id=${created.id}`)
  } catch {
    toast.error('Převod na fakturu se nezdařil.')
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Nabídky</h1>
        <p class="mt-1 text-muted-foreground">
          Cenové nabídky s položkami práce i materiálu, převod na zakázku nebo fakturu.
        </p>
      </div>
      <Button variant="coral" @click="openNew"> <Plus class="h-4 w-4" /> Nová nabídka </Button>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <div
      v-else-if="quotes.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <FileText class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Zatím žádné nabídky</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Vytvoř nabídku a případně ji převeď na zakázku nebo fakturu.
      </p>
      <Button variant="coral" class="mt-4" @click="openNew">
        <Plus class="h-4 w-4" /> Nová nabídka
      </Button>
    </div>

    <template v-else>
      <!-- Souhrn -->
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Nabídek</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.count }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Přijatých</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.accepted }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Hodnota přijatých</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.acceptedValue) }}</div>
        </div>
      </div>

      <div class="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full min-w-[860px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Číslo</th>
              <th class="px-4 py-3 text-left">Klient</th>
              <th class="px-4 py-3 text-left">Platí do</th>
              <th class="px-4 py-3 text-center">Stav</th>
              <th class="px-4 py-3 text-right">Celkem</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in quotes"
              :key="q.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ q.number }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ q.clientName || '—' }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ formatDate(q.validUntil || '') }}</td>
              <td class="px-4 py-3 text-center">
                <Badge :variant="statusVariant[q.status]">{{ quoteStatusLabel(q.status) }}</Badge>
              </td>
              <td class="px-4 py-3 text-right font-semibold">
                {{ formatCZK(quoteTotal(q, vatPayer)) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center justify-end gap-1">
                  <Button
                    v-if="q.status === 'draft'"
                    variant="ghost"
                    size="sm"
                    :disabled="busyId === q.id"
                    title="Odeslat nabídku e-mailem"
                    @click="sendEmail(q)"
                  >
                    <Send class="h-4 w-4" /> E-mailem
                  </Button>
                  <Button
                    v-if="q.status === 'sent'"
                    variant="ghost"
                    size="sm"
                    :disabled="busyId === q.id"
                    title="Poslat nabídku znovu e-mailem"
                    @click="sendEmail(q)"
                  >
                    <Send class="h-4 w-4" /> E-mailem
                  </Button>
                  <Button
                    v-if="q.status === 'sent'"
                    variant="ghost"
                    size="sm"
                    :disabled="busyId === q.id"
                    title="Označit jako přijatou"
                    @click="changeStatus(q, 'accepted')"
                  >
                    <Check class="h-4 w-4" /> Přijmout
                  </Button>
                  <Button
                    v-if="q.status === 'sent'"
                    variant="ghost"
                    size="sm"
                    :disabled="busyId === q.id"
                    title="Zamítnout"
                    @click="changeStatus(q, 'rejected')"
                  >
                    <X class="h-4 w-4" /> Zamítnout
                  </Button>
                  <Button
                    v-if="q.status === 'sent'"
                    variant="ghost"
                    size="sm"
                    :disabled="busyId === q.id"
                    title="Expirovat"
                    @click="changeStatus(q, 'expired')"
                  >
                    <Clock class="h-4 w-4" /> Expirovat
                  </Button>
                  <Button
                    v-if="canConvert(q)"
                    variant="ghost"
                    size="sm"
                    :disabled="busyId === q.id"
                    title="Převést na zakázku"
                    @click="toJob(q)"
                  >
                    <Wrench class="h-4 w-4" /> Na zakázku
                  </Button>
                  <Button
                    v-if="canConvert(q)"
                    variant="ghost"
                    size="sm"
                    :disabled="busyId === q.id"
                    title="Převést na fakturu"
                    @click="convertToInvoice(q)"
                  >
                    <ArrowRightCircle class="h-4 w-4" /> Na fakturu
                  </Button>
                  <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(q)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Smazat" @click="deleteId = q.id">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Dialog create / edit -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit nabídku' : 'Nová nabídka' }}</DialogTitle>
          <DialogDescription
            >Rozliš práci a materiál — usnadní to pozdější zakázku.</DialogDescription
          >
        </DialogHeader>

        <div class="grid gap-3">
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="q-number">Číslo</Label>
              <Input id="q-number" v-model="form.number" />
            </div>
            <div class="grid gap-1.5">
              <Label for="q-status">Stav</Label>
              <select
                id="q-status"
                v-model="form.status"
                class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <option v-for="s in statuses" :key="s" :value="s">{{ quoteStatusLabel(s) }}</option>
              </select>
            </div>
            <div class="col-span-2 grid gap-1.5">
              <Label for="q-client">Klient</Label>
              <div class="flex gap-2">
                <select
                  id="q-client"
                  v-model="form.clientId"
                  class="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
                >
                  <option value="">— zadat ručně / bez klienta —</option>
                  <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <Button variant="outline" size="sm" @click="quickClientOpen = true">
                  <UserPlus class="h-4 w-4" /> Nový
                </Button>
              </div>
              <Input
                v-if="!form.clientId"
                v-model="form.clientName"
                placeholder="Jméno / firma (volný text)"
              />
            </div>
            <div class="grid gap-1.5">
              <Label for="q-valid">Platí do</Label>
              <Input id="q-valid" v-model="form.validUntil" type="date" />
            </div>
          </div>

          <!-- Položky -->
          <div class="grid gap-2">
            <Label>Položky</Label>
            <div v-for="(it, i) in form.items" :key="i" class="flex flex-wrap items-end gap-2">
              <div class="w-24">
                <select
                  v-model="it.kind"
                  class="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm"
                  :aria-label="`Typ položky ${i + 1}`"
                >
                  <option v-for="k in kinds" :key="k.value" :value="k.value">{{ k.label }}</option>
                </select>
              </div>
              <div class="min-w-[8rem] flex-1">
                <Input v-model="it.description" placeholder="Popis položky" />
              </div>
              <div class="w-16">
                <Input
                  v-model.number="it.quantity"
                  type="number"
                  min="0"
                  step="0.5"
                  title="Množství"
                />
              </div>
              <div class="w-24">
                <Input
                  v-model.number="it.unitPrice"
                  type="number"
                  min="0"
                  title="Cena/j. (bez DPH)"
                />
              </div>
              <div class="w-20">
                <select
                  v-model.number="it.vatRate"
                  class="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm"
                  title="DPH"
                >
                  <option v-for="r in vatRates" :key="r" :value="r">{{ r }} %</option>
                </select>
              </div>
              <Button variant="ghost" size="icon" title="Odebrat" @click="removeItem(i)">
                <X class="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" class="w-fit" @click="addItem">
              <Plus class="h-4 w-4" /> Přidat položku
            </Button>
          </div>

          <div class="grid gap-1.5">
            <Label for="q-note">Poznámka</Label>
            <Textarea id="q-note" v-model="form.note" rows="2" />
          </div>

          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span class="text-muted-foreground">Celkem {{ vatPayer ? 'vč. DPH' : '' }}</span>
            <span class="text-base font-semibold text-primary">{{ formatCZK(formTotal) }}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="submitting" @click="dialogOpen = false"
            >Zrušit</Button
          >
          <Button variant="coral" :disabled="submitting" @click="save">
            {{ editing ? 'Uložit' : 'Vytvořit' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <QuickClientDialog v-model:open="quickClientOpen" @confirm="onQuickClient" />

    <!-- Potvrzení smazání -->
    <AlertDialog :open="!!deleteId" @update:open="(o: boolean) => !o && (deleteId = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat nabídku?</AlertDialogTitle>
          <AlertDialogDescription>Tuto akci nelze vrátit.</AlertDialogDescription>
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
  </div>
</template>
