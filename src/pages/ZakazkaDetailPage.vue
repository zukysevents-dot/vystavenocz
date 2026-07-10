<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Search,
  Check,
  FileText,
  Wrench,
  Package,
  ListChecks,
  Clock,
  FileSignature,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'
import { useJobs } from '@/composables/useJobs'
import { useServiceItems } from '@/composables/useServiceItems'
import { useProducts } from '@/composables/useProducts'
import { useLocations } from '@/composables/useLocations'
import { useApi } from '@/composables/useApi'
import { useVerifiedSigning, SIGNATURE_PROVIDERS } from '@/composables/useVerifiedSigning'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { isApiMode, ApiError } from '@/lib/http'
import { calcLine, round2, formatCZK, formatDate } from '@/lib/invoice'
import { jobStatusLabel, jobPriorityLabel, jobNextStatuses, computeJobTotals } from '@/lib/jobs'
import type {
  Employee,
  Job,
  JobChecklistItem,
  JobPriority,
  JobStatus,
  Product,
  ServiceItem,
  VatRate,
} from '@/lib/types'

const route = useRoute()
const router = useRouter()
const jobId = route.params.id as string

const jobsApi = useJobs()
const svcApi = useServiceItems()
const { products, load: loadProducts } = useProducts()
const { locations, load: loadLocations } = useLocations()
const employeesApi = useApi<Employee>('employees')
const signing = useVerifiedSigning()
const companyStore = useCompanyStore()
const auth = useAuthStore()

const job = ref<Job | null>(null)
const serviceItems = ref<ServiceItem[]>([])
const employees = ref<Employee[]>([])
const loading = ref(true)
const loadError = ref(false)
const busy = ref(false)

const vatPayer = computed(() => companyStore.company?.vatMode === 'payer')
// Podpisy jsou samostatný add-on; předání jde k podpisu jen když je modul zapnutý (BankID = jen jeden z kanálů).
const signingEnabled = computed(() => auth.hasModule('verified_signing'))
// Pracovní list/checklist/status/předání = jobs.manage — technik (Employee) ano, účetní ne (jen čtení).
const canManage = computed(() => auth.hasRole('Owner', 'Admin', 'Manager', 'Employee'))
// Faktura ze zakázky = invoices.write — technik (Employee) NE, účetní ano.
const canInvoice = computed(() => auth.hasRole('Owner', 'Admin', 'Manager', 'Accountant'))

const vatRates: VatRate[] = [21, 12, 0]

const statusVariant: Record<JobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  scheduled: 'secondary',
  in_progress: 'default',
  waiting: 'outline',
  done: 'outline',
  cancelled: 'destructive',
}
const priorityVariant: Record<JobPriority, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  normal: 'secondary',
  high: 'default',
  urgent: 'destructive',
}
// Akční sloveso pro tlačítko přechodu stavu (cílový stav → co obsluha dělá).
const STATUS_ACTION: Record<JobStatus, string> = {
  scheduled: 'Naplánovat',
  in_progress: 'Zahájit',
  waiting: 'Pozastavit',
  done: 'Dokončit',
  cancelled: 'Zrušit',
}
const EVENT_LABELS: Record<string, string> = {
  created: 'Zakázka vytvořena',
  status: 'Změna stavu',
  work_added: 'Přidána práce',
  material_added: 'Přidán materiál',
  handover_created: 'Předávací protokol vytvořen',
  handover_signed: 'Odesláno k podpisu',
  invoiced: 'Vyfakturováno',
}
function eventLabel(kind: string): string {
  return EVENT_LABELS[kind] ?? kind
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const employeeName = (id: string | null): string =>
  id ? (employees.value.find((e) => e.id === id)?.fullName ?? '—') : '—'
const locationName = (id: string | null): string | null =>
  id ? (locations.value.find((l) => l.id === id)?.name ?? null) : null

// Součty pracovního listu: v API režimu preferuj serverem vrácené `totals`, jinak spočítej živě z položek.
const totals = computed(() => {
  const j = job.value
  if (!j) return null
  if (j.totals) return j.totals
  return computeJobTotals(j.workItems ?? [], j.materialItems ?? [], vatPayer.value)
})
const nextStatuses = computed(() => (job.value ? jobNextStatuses(job.value.status) : []))
const isInvoiced = computed(() => Boolean(job.value?.invoiceId))

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    const [j, svc, emp] = await Promise.all([
      jobsApi.get(jobId),
      svcApi.list().catch(() => [] as ServiceItem[]),
      employeesApi.list().catch(() => [] as Employee[]),
    ])
    job.value = j
    serviceItems.value = svc
    employees.value = emp
    await Promise.all([loadProducts(), loadLocations().catch(() => {})])
  } catch (e) {
    console.warn('Načtení zakázky selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  companyStore.init()
  reload()
})

// --- Stavový přechod ---
async function changeStatus(status: JobStatus): Promise<void> {
  if (busy.value || !job.value) return
  busy.value = true
  try {
    job.value = await jobsApi.setStatus(job.value.id, status)
    toast.success(`Stav: ${jobStatusLabel(status)}.`)
  } catch {
    toast.error('Změna stavu se nezdařila.')
  } finally {
    busy.value = false
  }
}

// --- Pracovní list: práce ---
const workDialogOpen = ref(false)
const workForm = reactive({
  serviceItemId: '' as string,
  description: '',
  quantity: 1,
  unitPrice: 0,
  vatRate: 21 as VatRate,
})
const activeServiceItems = computed(() => serviceItems.value.filter((s) => s.isActive))
const workPreview = computed(() =>
  calcLine(
    {
      quantity: num(workForm.quantity),
      unitPrice: num(workForm.unitPrice),
      vatRate: workForm.vatRate,
    },
    vatPayer.value,
  ),
)
watch(
  () => workForm.serviceItemId,
  (id) => {
    const s = serviceItems.value.find((x) => x.id === id)
    if (s) {
      workForm.description = s.name
      workForm.unitPrice = s.unitPrice
      workForm.vatRate = s.vatRate
    }
  },
)
function openWorkDialog(): void {
  Object.assign(workForm, {
    serviceItemId: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 21,
  })
  workDialogOpen.value = true
}
async function addWork(): Promise<void> {
  if (!job.value || busy.value) return
  if (!workForm.description.trim()) {
    toast.error('Zadejte popis práce.')
    return
  }
  busy.value = true
  try {
    job.value = await jobsApi.addWorkItem(job.value.id, {
      serviceItemId: workForm.serviceItemId || null,
      description: workForm.description.trim(),
      quantity: num(workForm.quantity),
      unitPrice: num(workForm.unitPrice),
      vatRate: workForm.vatRate,
    })
    workDialogOpen.value = false
    toast.success('Práce přidána.')
  } catch {
    toast.error('Přidání práce se nezdařilo.')
  } finally {
    busy.value = false
  }
}
async function removeWork(itemId: string): Promise<void> {
  if (!job.value || busy.value) return
  busy.value = true
  try {
    job.value = await jobsApi.removeWorkItem(job.value.id, itemId)
  } catch {
    toast.error('Odebrání se nezdařilo.')
  } finally {
    busy.value = false
  }
}

// --- Pracovní list: materiál (odečet skladu v API režimu) ---
const matDialogOpen = ref(false)
const matSearch = ref('')
const matForm = reactive({
  productId: '' as string,
  description: '',
  quantity: 1,
  unitPrice: 0,
  vatRate: 21 as VatRate,
})
const matResults = computed<Product[]>(() => {
  const q = matSearch.value.toLowerCase().trim()
  if (!q) return []
  return products.value
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.ean ?? '').includes(q),
    )
    .slice(0, 8)
})
const matPreview = computed(() =>
  calcLine(
    {
      quantity: num(matForm.quantity),
      unitPrice: num(matForm.unitPrice),
      vatRate: matForm.vatRate,
    },
    vatPayer.value,
  ),
)
function openMatDialog(): void {
  Object.assign(matForm, { productId: '', description: '', quantity: 1, unitPrice: 0, vatRate: 21 })
  matSearch.value = ''
  matDialogOpen.value = true
}
function pickProduct(p: Product): void {
  matForm.productId = p.id
  matForm.description = p.name
  // Product.salePrice je s DPH (retail) → odvoď NET prodejní jako výchozí (obsluha může upravit).
  const rate = ([21, 12, 0] as number[]).includes(p.vatRate) ? p.vatRate : 21
  matForm.vatRate = rate as VatRate
  matForm.unitPrice = round2(p.salePrice / (1 + rate / 100))
  matSearch.value = p.name
}
async function addMaterial(): Promise<void> {
  if (!job.value || busy.value) return
  if (!matForm.productId) {
    toast.error('Vyberte produkt ze skladu.')
    return
  }
  busy.value = true
  try {
    job.value = await jobsApi.addMaterial(job.value.id, {
      productId: matForm.productId,
      description: matForm.description.trim() || 'Materiál',
      quantity: num(matForm.quantity),
      unitPrice: num(matForm.unitPrice),
      vatRate: matForm.vatRate,
    })
    matDialogOpen.value = false
    toast.success('Materiál přidán.')
  } catch (e) {
    toast.error(
      e instanceof ApiError && e.status === 409
        ? 'Na skladě není dostatek materiálu.'
        : 'Přidání materiálu se nezdařilo.',
    )
  } finally {
    busy.value = false
  }
}
async function removeMaterial(itemId: string): Promise<void> {
  if (!job.value || busy.value) return
  busy.value = true
  try {
    job.value = await jobsApi.removeMaterial(job.value.id, itemId)
  } catch {
    toast.error('Odebrání se nezdařilo.')
  } finally {
    busy.value = false
  }
}

// --- Checklist ---
const checklistLabel = ref('')
async function addChecklist(): Promise<void> {
  if (!job.value || busy.value) return
  const label = checklistLabel.value.trim()
  if (!label) return
  busy.value = true
  try {
    job.value = await jobsApi.addChecklistItem(job.value.id, label)
    checklistLabel.value = ''
  } catch {
    toast.error('Přidání se nezdařilo.')
  } finally {
    busy.value = false
  }
}
async function toggleChecklist(item: JobChecklistItem): Promise<void> {
  if (!job.value) return
  try {
    job.value = await jobsApi.toggleChecklistItem(job.value.id, item.id, !item.isDone)
  } catch {
    toast.error('Změna se nezdařila.')
  }
}
async function removeChecklist(itemId: string): Promise<void> {
  if (!job.value || busy.value) return
  busy.value = true
  try {
    job.value = await jobsApi.removeChecklistItem(job.value.id, itemId)
  } catch {
    toast.error('Odebrání se nezdařilo.')
  } finally {
    busy.value = false
  }
}

// --- Předání (handover) + podpis (seam) ---
async function createHandover(): Promise<void> {
  if (!job.value || busy.value) return
  busy.value = true
  try {
    job.value = await jobsApi.createHandover(job.value.id)
    toast.success('Předávací protokol vytvořen.')
  } catch {
    toast.error('Vytvoření protokolu se nezdařilo.')
  } finally {
    busy.value = false
  }
}
async function signHandover(): Promise<void> {
  if (!job.value || busy.value) return
  busy.value = true
  try {
    // Seam přes modul verified_signing: v mock režimu založ viditelnou obálku v Podpisech (documentType handover,
    // externí reference = číslo zakázky). V API režimu obálku naváže backend přes /jobs/{id}/handover/sign.
    if (!isApiMode() && signingEnabled.value) {
      const envelope = await signing.createEnvelope({
        documentName: `Předávací protokol — ${job.value.number}`,
        documentType: 'handover',
        externalReference: job.value.number,
        provider: SIGNATURE_PROVIDERS[0].key,
        signer: { name: job.value.clientName || 'Zákazník', email: null, phone: null },
      })
      await signing.sendEnvelope(envelope.id)
    }
    job.value = await jobsApi.signHandover(job.value.id)
    toast.success('Předání odesláno k podpisu.')
  } catch {
    toast.error('Odeslání k podpisu se nezdařilo.')
  } finally {
    busy.value = false
  }
}

// --- Faktura ze zakázky ---
async function createInvoice(): Promise<void> {
  if (!job.value || busy.value) return
  // Už vyfakturováno → jen otevři existující koncept.
  if (job.value.invoiceId) {
    router.push(`/app/faktury/editor?id=${job.value.invoiceId}`)
    return
  }
  busy.value = true
  try {
    const invoiceId = await jobsApi.invoice(job.value.id)
    toast.success('Koncept faktury vytvořen.')
    router.push(`/app/faktury/editor?id=${invoiceId}`)
  } catch (e) {
    const msg =
      e instanceof ApiError && e.status === 422
        ? 'Zakázka nemá zákazníka — doplňte klienta před fakturací.'
        : e instanceof ApiError && e.status === 409
          ? 'Zakázka už je vyfakturovaná.'
          : 'Vytvoření faktury se nezdařilo.'
    toast.error(msg)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 pb-24 sm:p-6 md:p-8 lg:pb-8">
    <RouterLink
      to="/app/zakazky"
      class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" /> Zpět na zakázky
    </RouterLink>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <template v-else-if="job">
      <!-- Hlavička -->
      <div class="mt-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-mono text-xs text-muted-foreground">{{ job.number }}</div>
            <h1 class="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{{ job.name }}</h1>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <Badge :variant="statusVariant[job.status]">{{ jobStatusLabel(job.status) }}</Badge>
              <Badge :variant="priorityVariant[job.priority]">
                {{ jobPriorityLabel(job.priority) }}
              </Badge>
            </div>
          </div>
          <!-- Přechody stavu (řízené stavovým automatem) -->
          <div v-if="canManage && nextStatuses.length" class="flex flex-wrap gap-2">
            <Button
              v-for="s in nextStatuses"
              :key="s"
              :variant="s === 'cancelled' ? 'outline' : 'coral'"
              size="sm"
              :disabled="busy"
              @click="changeStatus(s)"
            >
              {{ STATUS_ACTION[s] }}
            </Button>
          </div>
        </div>

        <dl class="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div class="flex gap-2">
            <dt class="w-28 shrink-0 text-muted-foreground">Zákazník</dt>
            <dd class="font-medium">{{ job.clientName || '—' }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-28 shrink-0 text-muted-foreground">Adresa</dt>
            <dd>{{ job.siteAddress || '—' }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-28 shrink-0 text-muted-foreground">Termín</dt>
            <dd>{{ job.scheduledAt ? formatDate(job.scheduledAt) : '—' }}</dd>
          </div>
          <div class="flex gap-2">
            <dt class="w-28 shrink-0 text-muted-foreground">Technik</dt>
            <dd>{{ employeeName(job.assignedEmployeeId) }}</dd>
          </div>
          <div v-if="locationName(job.locationId)" class="flex gap-2">
            <dt class="w-28 shrink-0 text-muted-foreground">Pobočka</dt>
            <dd>{{ locationName(job.locationId) }}</dd>
          </div>
          <div v-if="job.note" class="flex gap-2 sm:col-span-2">
            <dt class="w-28 shrink-0 text-muted-foreground">Poznámka</dt>
            <dd class="whitespace-pre-wrap">{{ job.note }}</dd>
          </div>
        </dl>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div class="space-y-4">
          <!-- Pracovní list -->
          <div class="rounded-2xl border border-border bg-card">
            <div class="flex items-center justify-between border-b border-border p-4">
              <h2 class="flex items-center gap-1.5 font-semibold">
                <Wrench class="h-4 w-4 text-primary" /> Pracovní list
              </h2>
            </div>

            <!-- Práce -->
            <div class="p-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-muted-foreground">Práce</h3>
                <Button v-if="canManage" variant="outline" size="sm" @click="openWorkDialog">
                  <Plus class="h-4 w-4" /> Přidat práci
                </Button>
              </div>
              <div v-if="!job.workItems?.length" class="mt-3 text-sm text-muted-foreground">
                Zatím žádná práce.
              </div>
              <div v-else class="mt-3 overflow-x-auto">
                <table class="w-full min-w-[420px] text-sm">
                  <tbody>
                    <tr
                      v-for="w in job.workItems"
                      :key="w.id"
                      class="border-b border-border last:border-0"
                    >
                      <td class="py-2 pr-2">
                        <div class="font-medium">{{ w.description }}</div>
                        <div class="text-xs text-muted-foreground">
                          {{ w.quantity }} × {{ formatCZK(w.unitPrice) }}
                          <span v-if="vatPayer"> · {{ w.vatRate }} %</span>
                        </div>
                      </td>
                      <td class="py-2 text-right font-medium">
                        {{ formatCZK(calcLine(w, vatPayer).lineTotal) }}
                      </td>
                      <td class="py-2 pl-2 text-right">
                        <Button
                          v-if="canManage"
                          variant="ghost"
                          size="icon"
                          title="Odebrat"
                          :disabled="busy"
                          @click="removeWork(w.id)"
                        >
                          <Trash2 class="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Materiál -->
            <div class="border-t border-border p-4">
              <div class="flex items-center justify-between">
                <h3 class="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <Package class="h-4 w-4" /> Materiál
                </h3>
                <Button v-if="canManage" variant="outline" size="sm" @click="openMatDialog">
                  <Plus class="h-4 w-4" /> Přidat materiál
                </Button>
              </div>
              <div v-if="!job.materialItems?.length" class="mt-3 text-sm text-muted-foreground">
                Zatím žádný materiál.
              </div>
              <div v-else class="mt-3 overflow-x-auto">
                <table class="w-full min-w-[420px] text-sm">
                  <tbody>
                    <tr
                      v-for="m in job.materialItems"
                      :key="m.id"
                      class="border-b border-border last:border-0"
                    >
                      <td class="py-2 pr-2">
                        <div class="font-medium">{{ m.description }}</div>
                        <div class="text-xs text-muted-foreground">
                          {{ m.quantity }} × {{ formatCZK(m.unitPrice) }}
                          <span v-if="vatPayer"> · {{ m.vatRate }} %</span>
                        </div>
                      </td>
                      <td class="py-2 text-right font-medium">
                        {{ formatCZK(calcLine(m, vatPayer).lineTotal) }}
                      </td>
                      <td class="py-2 pl-2 text-right">
                        <Button
                          v-if="canManage"
                          variant="ghost"
                          size="icon"
                          title="Odebrat"
                          :disabled="busy"
                          @click="removeMaterial(m.id)"
                        >
                          <Trash2 class="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Součty -->
            <div v-if="totals" class="space-y-1 border-t border-border bg-muted/30 p-4 text-sm">
              <div class="flex justify-between text-muted-foreground">
                <span>Práce</span><span>{{ formatCZK(totals.workNet) }}</span>
              </div>
              <div class="flex justify-between text-muted-foreground">
                <span>Materiál</span><span>{{ formatCZK(totals.materialNet) }}</span>
              </div>
              <div v-if="vatPayer" class="flex justify-between text-muted-foreground">
                <span>Základ / DPH</span>
                <span>{{ formatCZK(totals.net) }} / {{ formatCZK(totals.vat) }}</span>
              </div>
              <div class="flex justify-between pt-1 text-base font-semibold">
                <span>Celkem {{ vatPayer ? 'vč. DPH' : '' }}</span>
                <span class="text-primary">{{ formatCZK(totals.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Checklist -->
          <div class="rounded-2xl border border-border bg-card p-4">
            <h2 class="flex items-center gap-1.5 font-semibold">
              <ListChecks class="h-4 w-4 text-primary" /> Kontrolní seznam
            </h2>
            <div v-if="canManage" class="mt-3 flex gap-2">
              <Input
                v-model="checklistLabel"
                placeholder="Přidat úkol…"
                aria-label="Nový úkol"
                @keyup.enter="addChecklist"
              />
              <Button
                variant="outline"
                :disabled="busy || !checklistLabel.trim()"
                @click="addChecklist"
              >
                <Plus class="h-4 w-4" /> Přidat
              </Button>
            </div>
            <div v-if="!job.checklist?.length" class="mt-3 text-sm text-muted-foreground">
              Zatím žádné úkoly.
            </div>
            <ul v-else class="mt-3 space-y-1.5">
              <li
                v-for="c in job.checklist"
                :key="c.id"
                class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
              >
                <Checkbox
                  :model-value="c.isDone"
                  :aria-label="c.label"
                  @update:model-value="toggleChecklist(c)"
                />
                <span
                  class="flex-1 text-sm"
                  :class="c.isDone ? 'text-muted-foreground line-through' : ''"
                >
                  {{ c.label }}
                </span>
                <Button
                  v-if="canManage"
                  variant="ghost"
                  size="icon"
                  title="Odebrat"
                  :disabled="busy"
                  @click="removeChecklist(c.id)"
                >
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </li>
            </ul>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Faktura ze zakázky -->
          <div class="rounded-2xl border border-border bg-card p-4">
            <h2 class="flex items-center gap-1.5 font-semibold">
              <FileText class="h-4 w-4 text-primary" /> Fakturace
            </h2>
            <p v-if="isInvoiced" class="mt-2 text-sm text-muted-foreground">
              Zakázka je vyfakturovaná.
            </p>
            <p v-else class="mt-2 text-sm text-muted-foreground">
              Vytvoř koncept faktury z pracovního listu a doplň ho v editoru.
            </p>
            <Button
              v-if="canInvoice"
              variant="coral"
              class="mt-3 w-full"
              :disabled="busy"
              @click="createInvoice"
            >
              <FileText class="h-4 w-4" />
              {{ isInvoiced ? 'Otevřít fakturu' : 'Vytvořit fakturu' }}
            </Button>
            <p v-else class="mt-3 text-xs text-muted-foreground">
              Fakturaci provede vedení nebo účetní.
            </p>
          </div>

          <!-- Předání + podpis -->
          <div class="rounded-2xl border border-border bg-card p-4">
            <h2 class="flex items-center gap-1.5 font-semibold">
              <FileSignature class="h-4 w-4 text-primary" /> Předání
            </h2>
            <template v-if="!job.handover">
              <p class="mt-2 text-sm text-muted-foreground">
                Vytvoř předávací protokol se snímkem práce a materiálu.
              </p>
              <Button
                v-if="canManage"
                variant="outline"
                class="mt-3 w-full"
                :disabled="busy"
                @click="createHandover"
              >
                <Plus class="h-4 w-4" /> Vytvořit protokol
              </Button>
            </template>
            <template v-else>
              <div class="mt-2 flex items-center gap-2">
                <Badge :variant="job.handover.state === 'signed' ? 'default' : 'secondary'">
                  {{ job.handover.state === 'signed' ? 'Odesláno k podpisu' : 'Koncept' }}
                </Badge>
                <span class="text-xs text-muted-foreground">
                  {{ job.handover.items.length }} položek
                </span>
              </div>
              <Button
                v-if="canManage && signingEnabled && job.handover.state === 'draft'"
                variant="outline"
                class="mt-3 w-full"
                :disabled="busy"
                @click="signHandover"
              >
                <FileSignature class="h-4 w-4" /> Odeslat k podpisu
              </Button>
              <p
                v-else-if="job.handover.state === 'draft' && !signingEnabled"
                class="mt-3 text-xs text-muted-foreground"
              >
                Ověřený podpis vyžaduje modul Podpisy (připraveno k napojení).
              </p>
              <p v-else class="mt-3 text-xs text-muted-foreground">
                Protokol byl odeslán k ověřenému podpisu.
              </p>
            </template>
          </div>

          <!-- Časová osa -->
          <div class="rounded-2xl border border-border bg-card p-4">
            <h2 class="flex items-center gap-1.5 font-semibold">
              <Clock class="h-4 w-4 text-primary" /> Časová osa
            </h2>
            <div v-if="!job.events?.length" class="mt-3 text-sm text-muted-foreground">
              Zatím žádné události.
            </div>
            <ol v-else class="mt-3 space-y-2">
              <li v-for="ev in job.events" :key="ev.id" class="flex gap-2 text-sm">
                <div class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <div class="min-w-0">
                  <div class="font-medium">{{ eventLabel(ev.kind) }}</div>
                  <div v-if="ev.detail" class="truncate text-xs text-muted-foreground">
                    {{ ev.detail }}
                  </div>
                  <div class="text-xs text-muted-foreground">{{ formatDate(ev.createdAt) }}</div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Mobil: sticky spodní lišta se součtem a hlavní akcí -->
      <div
        class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur lg:hidden"
      >
        <div class="mx-auto flex max-w-3xl items-center gap-3">
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">{{ jobStatusLabel(job.status) }}</div>
            <div class="text-xs text-muted-foreground">
              Celkem {{ formatCZK(totals?.total ?? 0) }}
            </div>
          </div>
          <Button
            v-if="canInvoice"
            variant="coral"
            size="sm"
            class="shrink-0"
            :disabled="busy"
            @click="createInvoice"
          >
            <FileText class="h-4 w-4" /> {{ isInvoiced ? 'Faktura' : 'Vytvořit fakturu' }}
          </Button>
        </div>
      </div>
    </template>

    <!-- Dialog: přidat práci -->
    <Dialog v-model:open="workDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Přidat práci</DialogTitle>
          <DialogDescription
            >Vyber z ceníku služeb nebo zadej volný text. Ceny jsou bez DPH.</DialogDescription
          >
        </DialogHeader>
        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="wk-svc">Z ceníku služeb</Label>
            <select
              id="wk-svc"
              v-model="workForm.serviceItemId"
              class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="">— volný text —</option>
              <option v-for="s in activeServiceItems" :key="s.id" :value="s.id">
                {{ s.name }} ({{ formatCZK(s.unitPrice) }}/{{ s.unit }})
              </option>
            </select>
          </div>
          <div class="grid gap-1.5">
            <Label for="wk-desc">Popis</Label>
            <Input id="wk-desc" v-model="workForm.description" placeholder="Např. Montáž" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div class="grid gap-1.5">
              <Label for="wk-qty">Množství</Label>
              <Input
                id="wk-qty"
                v-model.number="workForm.quantity"
                type="number"
                min="0"
                step="0.5"
              />
            </div>
            <div class="grid gap-1.5">
              <Label for="wk-price">Cena/j. (bez DPH)</Label>
              <Input id="wk-price" v-model.number="workForm.unitPrice" type="number" min="0" />
            </div>
            <div class="grid gap-1.5">
              <Label for="wk-vat">DPH</Label>
              <select
                id="wk-vat"
                v-model.number="workForm.vatRate"
                class="h-9 rounded-lg border border-border bg-card px-2 text-sm"
              >
                <option v-for="r in vatRates" :key="r" :value="r">{{ r }} %</option>
              </select>
            </div>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span class="text-muted-foreground">Řádek {{ vatPayer ? 'vč. DPH' : '' }}</span>
            <span class="font-semibold text-primary">{{ formatCZK(workPreview.lineTotal) }}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="busy" @click="workDialogOpen = false">Zrušit</Button>
          <Button variant="coral" :disabled="busy" @click="addWork">Přidat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Dialog: přidat materiál (výběr produktu ze skladu) -->
    <Dialog v-model:open="matDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Přidat materiál</DialogTitle>
          <DialogDescription
            >Vyber produkt ze skladu — odečte se ze zásob. Cena je bez DPH.</DialogDescription
          >
        </DialogHeader>
        <div class="grid gap-3">
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="matSearch"
              placeholder="Hledat produkt (název / SKU / EAN)"
              aria-label="Hledat produkt"
              class="pl-9"
            />
            <div
              v-if="matResults.length && !matForm.productId"
              class="mt-1 overflow-hidden rounded-lg border border-border"
            >
              <button
                v-for="p in matResults"
                :key="p.id"
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                @click="pickProduct(p)"
              >
                <span class="truncate">{{ p.name }}</span>
                <span class="ml-2 shrink-0 text-xs text-muted-foreground">{{ p.sku }}</span>
              </button>
            </div>
          </div>

          <div v-if="matForm.productId" class="grid gap-3">
            <div class="grid gap-1.5">
              <Label for="mt-desc">Popis</Label>
              <Input id="mt-desc" v-model="matForm.description" />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="grid gap-1.5">
                <Label for="mt-qty">Množství</Label>
                <Input
                  id="mt-qty"
                  v-model.number="matForm.quantity"
                  type="number"
                  min="0"
                  step="0.5"
                />
              </div>
              <div class="grid gap-1.5">
                <Label for="mt-price">Cena/j. (bez DPH)</Label>
                <Input id="mt-price" v-model.number="matForm.unitPrice" type="number" min="0" />
              </div>
              <div class="grid gap-1.5">
                <Label for="mt-vat">DPH</Label>
                <select
                  id="mt-vat"
                  v-model.number="matForm.vatRate"
                  class="h-9 rounded-lg border border-border bg-card px-2 text-sm"
                >
                  <option v-for="r in vatRates" :key="r" :value="r">{{ r }} %</option>
                </select>
              </div>
            </div>
            <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span class="text-muted-foreground">Řádek {{ vatPayer ? 'vč. DPH' : '' }}</span>
              <span class="font-semibold text-primary">{{ formatCZK(matPreview.lineTotal) }}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="busy" @click="matDialogOpen = false">Zrušit</Button>
          <Button variant="coral" :disabled="busy || !matForm.productId" @click="addMaterial">
            <Check class="h-4 w-4" /> Přidat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
