<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Download,
  FileSpreadsheet,
  ImageUp,
  Printer,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { useLocations } from '@/composables/useLocations'
import {
  useIntegrations,
  type AccountingExportResult,
  type AccountingExportType,
  type PrintJob,
  type TerminalPayment,
} from '@/composables/useIntegrations'
import { ApiError, isApiMode } from '@/lib/http'
import { buildInvoiceNumber, formatCZK } from '@/lib/invoice'
import {
  INTEGRATION_READINESS_ITEMS,
  integrationBadgeVariant,
  integrationStateLabel,
  summarizeIntegrationReadiness,
} from '@/lib/integration-readiness'
import type { AppModuleId } from '@/lib/modules'
import type { Company, VatMode } from '@/lib/types'

const companyStore = useCompanyStore()
const auth = useAuthStore()
const integrationsApi = useIntegrations()
const { locations, load: loadLocations } = useLocations()
const apiMode = isApiMode()

// Max velikost loga (data URL žije v localStorage, držíme ho malé).
const LOGO_MAX_BYTES = 512 * 1024
// Povolené formáty loga — SVG záměrně ne (neověřený obsah renderovaný jako obrázek).
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const vatModes: { value: VatMode; label: string }[] = [
  { value: 'payer', label: 'Plátce DPH' },
  { value: 'identified', label: 'Identifikovaná osoba' },
  { value: 'non_payer', label: 'Neplátce DPH' },
]

const moduleOptions: { id: AppModuleId; label: string; description: string; locked?: boolean }[] = [
  {
    id: 'core',
    label: 'Jádro',
    description: 'Firma, pobočky, uživatelé, klienti a nastavení.',
    locked: true,
  },
  {
    id: 'invoicing',
    label: 'Fakturace',
    description: 'Faktury, nabídky, DPH, cashflow a účetní výstupy.',
  },
  { id: 'pos', label: 'Pokladna', description: 'Prodej, platby, účtenky, uzávěrky a Z-reporty.' },
  { id: 'gastro', label: 'Gastro', description: 'Restaurace, stoly, kuchyně a gastro provoz.' },
  { id: 'stock', label: 'Sklad', description: 'Zásoby, naskladnění, inventury a skladové pohyby.' },
  {
    id: 'attendance',
    label: 'Docházka',
    description: 'Zaměstnanci, směny, příchody, odchody a pauzy.',
  },
  { id: 'booking', label: 'Rezervace', description: 'Služby, zdroje a veřejné rezervace.' },
  { id: 'jobs', label: 'Zakázky', description: 'Výjezdy, práce v terénu a zakázkový provoz.' },
  {
    id: 'reporting',
    label: 'Reporty',
    description: 'Konsolidace, manažerské přehledy a porovnání provozoven.',
  },
  {
    id: 'loyalty',
    label: 'Věrnost',
    description: 'Věrnostní programy, návraty zákazníků a marketing.',
  },
  {
    id: 'ai',
    label: 'AI asistent',
    description: 'Asistent nad doklady, provozem, reporty a doporučeními.',
  },
  {
    id: 'integrations',
    label: 'Integrace',
    description: 'Importy, exporty, účetnictví, API a napojení služeb.',
  },
]

const integrationReadiness = INTEGRATION_READINESS_ITEMS
const integrationSummary = computed(() => summarizeIntegrationReadiness(integrationReadiness))
const integrationsModuleEnabled = computed(() => enabledModules.value.includes('integrations'))
const integrationRuntimeAvailable = computed(() => apiMode && integrationsModuleEnabled.value)
const terminalPayments = ref<TerminalPayment[]>([])
const printJobs = ref<PrintJob[]>([])
const pendingTerminalPayments = ref(0)
const queuedPrintJobs = ref(0)
const integrationsLoading = ref(false)
const integrationsError = ref<string | null>(null)
const accountingExportLoading = ref(false)
const lastAccountingExport = ref<AccountingExportResult | null>(null)
const accountingExportForm = reactive({
  type: 'ZReports' as AccountingExportType,
  from: monthStartIso(),
  to: todayIso(),
  locationId: 'all',
})

const form = reactive({
  companyName: '',
  fullName: '',
  ico: '',
  dic: '',
  vatMode: 'non_payer' as VatMode,
  street: '',
  city: '',
  zip: '',
  bankAccount: '',
  iban: '',
  swift: '',
  logoUrl: '',
  invoiceNumberPrefix: 'FA',
  invoiceNumberFormat: '{prefix}-{year}-{seq}',
  nextInvoiceSeq: 1,
  defaultPaymentDays: 14,
  publicSlug: '',
})
const enabledModules = ref<AppModuleId[]>([...auth.modules])

onMounted(async () => {
  await companyStore.load()
  try {
    enabledModules.value = await companyStore.loadModules()
  } catch {
    enabledModules.value = auth.modules
  }
  const c = companyStore.company
  if (!c) return
  form.companyName = c.companyName ?? ''
  form.fullName = c.fullName ?? ''
  form.ico = c.ico ?? ''
  form.dic = c.dic ?? ''
  form.vatMode = c.vatMode
  form.street = c.street ?? ''
  form.city = c.city ?? ''
  form.zip = c.zip ?? ''
  form.bankAccount = c.bankAccount ?? ''
  form.iban = c.iban ?? ''
  form.swift = c.swift ?? ''
  form.logoUrl = c.logoUrl ?? ''
  form.invoiceNumberPrefix = c.invoiceNumberPrefix ?? 'FA'
  form.invoiceNumberFormat = c.invoiceNumberFormat ?? '{prefix}-{year}-{seq}'
  form.nextInvoiceSeq = c.nextInvoiceSeq ?? 1
  form.defaultPaymentDays = c.defaultPaymentDays ?? 14
  form.publicSlug = c.publicSlug ?? ''
  if (apiMode) {
    await Promise.all([loadLocations(), refreshIntegrationsRuntime()])
  }
})

function toggleModule(module: AppModuleId, enabled: boolean | 'indeterminate' | undefined): void {
  if (module === 'core') return
  if (enabled === true) {
    if (!enabledModules.value.includes(module))
      enabledModules.value = [...enabledModules.value, module]
    return
  }
  enabledModules.value = enabledModules.value.filter((m) => m !== module)
}

// Živý náhled, jaké číslo dostane příští faktura.
const numberPreview = computed(() =>
  buildInvoiceNumber(
    form.invoiceNumberPrefix || 'FA',
    form.invoiceNumberFormat || '{prefix}-{year}-{seq}',
    Number(form.nextInvoiceSeq) || 1,
  ),
)
const publicOrderPreview = computed(() => {
  const slug = normalizePublicSlug(form.publicSlug)
  return slug ? `${window.location.origin}/objednavka/${slug}` : ''
})

function normalizePublicSlug(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function onLogoChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!LOGO_TYPES.includes(file.type)) {
    toast.error('Nepodporovaný formát loga. Použijte PNG, JPG nebo WebP.')
    input.value = ''
    return
  }
  if (file.size > LOGO_MAX_BYTES) {
    toast.error('Logo je příliš velké (max 512 kB). Zvolte menší obrázek.')
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    form.logoUrl = reader.result as string
  }
  reader.onerror = () => {
    toast.error('Logo se nepodařilo načíst.')
  }
  reader.readAsDataURL(file)
}

function removeLogo(): void {
  form.logoUrl = ''
}

async function refreshIntegrationsRuntime(): Promise<void> {
  if (!integrationRuntimeAvailable.value) {
    terminalPayments.value = []
    printJobs.value = []
    pendingTerminalPayments.value = 0
    queuedPrintJobs.value = 0
    integrationsError.value = null
    return
  }
  integrationsLoading.value = true
  integrationsError.value = null
  try {
    const [terminals, pendingTerminals, jobs, queuedJobs] = await Promise.all([
      integrationsApi.listTerminalPayments({ pageSize: 5 }),
      integrationsApi.listTerminalPayments({ pageSize: 1, status: 'Pending' }),
      integrationsApi.listPrintJobs({ pageSize: 5 }),
      integrationsApi.listPrintJobs({ pageSize: 1, status: 'Queued' }),
    ])
    terminalPayments.value = terminals.items
    pendingTerminalPayments.value = pendingTerminals.total
    printJobs.value = jobs.items
    queuedPrintJobs.value = queuedJobs.total
  } catch (e) {
    integrationsError.value = integrationErrorMessage(e)
    terminalPayments.value = []
    printJobs.value = []
    pendingTerminalPayments.value = 0
    queuedPrintJobs.value = 0
  } finally {
    integrationsLoading.value = false
  }
}

async function downloadAccountingExport(): Promise<void> {
  if (!integrationRuntimeAvailable.value) return
  accountingExportLoading.value = true
  try {
    const exportResult = await integrationsApi.buildAccountingExport({
      type: accountingExportForm.type,
      from: accountingExportForm.from,
      to: accountingExportForm.to,
      locationId:
        accountingExportForm.locationId === 'all' ? null : accountingExportForm.locationId,
      target: 'Generic',
      format: 'Csv',
    })
    lastAccountingExport.value = exportResult
    downloadTextFile(exportResult.fileName, exportResult.content, exportResult.contentType)
    toast.success('Export připraven ke stažení.')
  } catch (e) {
    toast.error(integrationErrorMessage(e))
  } finally {
    accountingExportLoading.value = false
  }
}

function downloadTextFile(fileName: string, content: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType || 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'vystaveno-export.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function integrationErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 403)
    return 'Modul Integrace není povolený nebo nemáte oprávnění.'
  if (e instanceof ApiError && e.status === 422) return e.message
  if (e instanceof ApiError && e.status === 0) return 'API není dostupné.'
  return 'Integrace se nepodařilo načíst.'
}

function terminalStatusLabel(status: TerminalPayment['status']): string {
  const labels: Record<TerminalPayment['status'], string> = {
    Pending: 'Čeká',
    Succeeded: 'Úspěšná',
    Failed: 'Selhala',
    Cancelled: 'Zrušená',
  }
  return labels[status]
}

function printJobStatusLabel(status: PrintJob['status']): string {
  const labels: Record<PrintJob['status'], string> = {
    Queued: 'Ve frontě',
    Printed: 'Vytištěno',
    Failed: 'Selhalo',
  }
  return labels[status]
}

function printJobTypeLabel(type: PrintJob['type']): string {
  const labels: Record<PrintJob['type'], string> = {
    Receipt: 'Účtenka',
    KitchenTicket: 'Bon',
    ZReport: 'Z-report',
  }
  return labels[type]
}

function shortDateTime(value: string): string {
  return new Date(value).toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthStartIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

async function onSubmit(): Promise<void> {
  // Splatnost 0 dní je legitimní (na počkání) — nesmí spadnout do fallbacku přes `|| 14`.
  const dueDays = Number(form.defaultPaymentDays)
  const payload: Partial<Company> = {
    companyName: form.companyName || null,
    fullName: form.fullName || null,
    ico: form.ico || null,
    dic: form.dic || null,
    vatMode: form.vatMode,
    street: form.street || null,
    city: form.city || null,
    zip: form.zip || null,
    bankAccount: form.bankAccount || null,
    iban: form.iban || null,
    swift: form.swift || null,
    logoUrl: form.logoUrl || null,
    invoiceNumberPrefix: form.invoiceNumberPrefix || null,
    invoiceNumberFormat: form.invoiceNumberFormat || null,
    nextInvoiceSeq: Number(form.nextInvoiceSeq) || 1,
    defaultPaymentDays: Number.isFinite(dueDays) && dueDays >= 0 ? Math.floor(dueDays) : 14,
    publicSlug: normalizePublicSlug(form.publicSlug),
    email: auth.user?.email ?? companyStore.company?.email ?? '',
  }
  try {
    await companyStore.save(payload)
    enabledModules.value = await companyStore.saveModules(enabledModules.value)
  } catch (e) {
    // API chyba (validace/síť) nebo localStorage quota (velké logo jako data URL) — neukládej tiše.
    const isQuota = e instanceof Error && e.name === 'QuotaExceededError'
    toast.error(
      isQuota
        ? 'Nastavení se nepodařilo uložit — úložiště je plné. Zmenšete logo.'
        : 'Nastavení se nepodařilo uložit. Zkuste to znovu.',
    )
    return
  }
  toast.success('Nastavení uloženo. Projeví se v nových fakturách.')
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
    <h1 class="text-3xl font-bold tracking-tight">Nastavení firmy</h1>
    <p class="mt-1 text-muted-foreground">
      Tyto údaje se použijí na nových fakturách (dodavatel, logo, číslování, splatnost).
    </p>

    <form class="mt-8 space-y-6" @submit.prevent="onSubmit">
      <!-- Firma -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Firma</h2>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <Label for="company_name">Název firmy</Label>
            <Input id="company_name" v-model="form.companyName" />
          </div>
          <div class="space-y-2">
            <Label for="full_name">Jméno a příjmení (OSVČ)</Label>
            <Input id="full_name" v-model="form.fullName" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="ico">IČO</Label>
              <Input id="ico" v-model="form.ico" />
            </div>
            <div class="space-y-2">
              <Label for="dic">DIČ</Label>
              <Input id="dic" v-model="form.dic" placeholder="CZ12345678" />
            </div>
          </div>
          <div class="space-y-2">
            <Label for="vat_mode">Režim DPH</Label>
            <Select
              :model-value="form.vatMode"
              @update:model-value="(v) => (form.vatMode = v as VatMode)"
            >
              <SelectTrigger id="vat_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in vatModes" :key="m.value" :value="m.value">
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Neplátce a identifikovaná osoba fakturují bez DPH.
            </p>
          </div>
        </div>
      </div>

      <!-- Veřejné odkazy -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Veřejné odkazy
        </h2>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <Label for="public_slug">Veřejný slug</Label>
            <Input
              id="public_slug"
              v-model="form.publicSlug"
              placeholder="moje-bistro"
              @blur="form.publicSlug = normalizePublicSlug(form.publicSlug)"
            />
            <p class="text-xs text-muted-foreground">
              Používá se pro online objednávky, QR stoly a veřejné rezervace.
            </p>
          </div>
          <div v-if="publicOrderPreview" class="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            Online objednávky:
            <span class="break-all font-medium text-foreground">{{ publicOrderPreview }}</span>
          </div>
        </div>
      </div>

      <!-- Sídlo -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sídlo</h2>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <Label for="street">Ulice a č.p.</Label>
            <Input id="street" v-model="form.street" />
          </div>
          <div class="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div class="space-y-2">
              <Label for="city">Město</Label>
              <Input id="city" v-model="form.city" />
            </div>
            <div class="space-y-2">
              <Label for="zip">PSČ</Label>
              <Input id="zip" v-model="form.zip" />
            </div>
          </div>
        </div>
      </div>

      <!-- Moduly -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Moduly</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label
            v-for="module in moduleOptions"
            :key="module.id"
            class="flex gap-3 rounded-lg border border-border p-4"
            :class="module.locked ? 'bg-muted/30' : 'cursor-pointer hover:bg-muted/40'"
          >
            <Checkbox
              class="mt-0.5"
              :model-value="enabledModules.includes(module.id)"
              :disabled="module.locked"
              @update:model-value="(checked) => toggleModule(module.id, checked)"
            />
            <span>
              <span class="block text-sm font-semibold">{{ module.label }}</span>
              <span class="mt-1 block text-xs text-muted-foreground">{{ module.description }}</span>
            </span>
          </label>
        </div>
      </div>

      <!-- Integrace -->
      <div class="rounded-xl border border-border bg-card p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Integrace a exporty
          </h2>
          <Button
            v-if="integrationRuntimeAvailable"
            type="button"
            variant="outline"
            size="sm"
            :disabled="integrationsLoading"
            @click="refreshIntegrationsRuntime"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': integrationsLoading }" />
            Obnovit
          </Button>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg border border-border bg-muted/30 p-3">
            <div class="text-xs text-muted-foreground">Použitelné v provozu</div>
            <div class="mt-1 text-2xl font-semibold">
              {{ integrationSummary.operationallyUsable }}
            </div>
          </div>
          <div class="rounded-lg border border-border bg-muted/30 p-3">
            <div class="text-xs text-muted-foreground">Připravené exporty</div>
            <div class="mt-1 text-2xl font-semibold">{{ integrationSummary.ready }}</div>
          </div>
          <div class="rounded-lg border border-border bg-muted/30 p-3">
            <div class="text-xs text-muted-foreground">Čeká na konektor</div>
            <div class="mt-1 text-2xl font-semibold">{{ integrationSummary.connectorBacklog }}</div>
          </div>
        </div>

        <div v-if="integrationRuntimeAvailable" class="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div class="rounded-lg border border-border p-4">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 font-medium">
                <FileSpreadsheet class="h-4 w-4 text-primary" />
                Účetní export
              </div>
              <Badge variant="secondary">Generic CSV</Badge>
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="integration-export-type">Typ</Label>
                <Select
                  :model-value="accountingExportForm.type"
                  @update:model-value="
                    (value) => (accountingExportForm.type = value as AccountingExportType)
                  "
                >
                  <SelectTrigger id="integration-export-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZReports">Z-reporty</SelectItem>
                    <SelectItem value="Sales">Prodeje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label for="integration-export-location">Provozovna</Label>
                <Select v-model="accountingExportForm.locationId">
                  <SelectTrigger id="integration-export-location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny</SelectItem>
                    <SelectItem
                      v-for="location in locations"
                      :key="location.id"
                      :value="location.id"
                    >
                      {{ location.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label for="integration-export-from">Od</Label>
                <Input
                  id="integration-export-from"
                  v-model="accountingExportForm.from"
                  type="date"
                />
              </div>
              <div class="space-y-1.5">
                <Label for="integration-export-to">Do</Label>
                <Input id="integration-export-to" v-model="accountingExportForm.to" type="date" />
              </div>
            </div>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs text-muted-foreground">
                <template v-if="lastAccountingExport">
                  {{ lastAccountingExport.rowCount }} řádků ·
                  {{ formatCZK(lastAccountingExport.total) }}
                </template>
                <template v-else>Bez posledního exportu</template>
              </div>
              <Button
                type="button"
                variant="coral"
                :disabled="accountingExportLoading"
                @click="downloadAccountingExport"
              >
                <Download class="h-4 w-4" />
                Stáhnout CSV
              </Button>
            </div>
          </div>

          <div class="rounded-lg border border-border p-4">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 font-medium">
                <Printer class="h-4 w-4 text-primary" />
                Provozní fronty
              </div>
              <div class="flex gap-2">
                <Badge variant="secondary">{{ pendingTerminalPayments }} plateb čeká</Badge>
                <Badge variant="secondary">{{ queuedPrintJobs }} tisků čeká</Badge>
              </div>
            </div>
            <div
              v-if="integrationsError"
              class="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              {{ integrationsError }}
            </div>
            <div v-else class="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Terminál
                </div>
                <div class="space-y-2">
                  <div
                    v-for="payment in terminalPayments"
                    :key="payment.id"
                    class="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-medium">{{ formatCZK(payment.amount) }}</span>
                      <Badge :variant="payment.status === 'Failed' ? 'destructive' : 'outline'">
                        {{ terminalStatusLabel(payment.status) }}
                      </Badge>
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ payment.provider }} · {{ shortDateTime(payment.createdAt) }}
                    </div>
                  </div>
                  <div
                    v-if="!terminalPayments.length && !integrationsLoading"
                    class="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground"
                  >
                    Bez platebních transakcí.
                  </div>
                </div>
              </div>

              <div>
                <div class="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tisk
                </div>
                <div class="space-y-2">
                  <div
                    v-for="job in printJobs"
                    :key="job.id"
                    class="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-medium">{{ printJobTypeLabel(job.type) }}</span>
                      <Badge :variant="job.status === 'Failed' ? 'destructive' : 'outline'">
                        {{ printJobStatusLabel(job.status) }}
                      </Badge>
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {{ job.printer }} · {{ shortDateTime(job.createdAt) }}
                    </div>
                  </div>
                  <div
                    v-if="!printJobs.length && !integrationsLoading"
                    class="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground"
                  >
                    Bez tiskových jobů.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground"
        >
          Live stav integrací se zobrazí v API režimu se zapnutým modulem Integrace.
        </div>

        <div class="mt-4 divide-y divide-border">
          <div
            v-for="item in integrationReadiness"
            :key="item.name"
            class="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[170px_1fr]"
          >
            <div>
              <div class="font-medium">{{ item.name }}</div>
              <Badge :variant="integrationBadgeVariant(item.state)" class="mt-1">
                {{ integrationStateLabel(item.state) }}
              </Badge>
            </div>
            <div class="text-sm text-muted-foreground">
              <p>{{ item.description }}</p>
              <p class="mt-1 text-xs">Provoz teď: {{ item.operatorAction }}</p>
              <p class="mt-1 text-xs">Další krok: {{ item.nextStep }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bankovní spojení -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bankovní spojení
        </h2>
        <div class="mt-4 space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="bank_account">Číslo účtu</Label>
              <Input id="bank_account" v-model="form.bankAccount" placeholder="123456789/0100" />
            </div>
            <div class="space-y-2">
              <Label for="iban">IBAN</Label>
              <Input id="iban" v-model="form.iban" placeholder="CZ65 0800 …" />
            </div>
          </div>
          <div class="space-y-2 sm:max-w-[200px]">
            <Label for="swift">SWIFT / BIC</Label>
            <Input id="swift" v-model="form.swift" placeholder="GIBACZPX" />
          </div>
        </div>
      </div>

      <!-- Logo -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Logo</h2>
        <div class="mt-4 flex items-center gap-4">
          <div
            class="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30"
          >
            <img
              v-if="form.logoUrl"
              :src="form.logoUrl"
              alt="Logo firmy"
              class="max-h-16 max-w-36 object-contain"
            />
            <span v-else class="text-xs text-muted-foreground">Bez loga</span>
          </div>
          <div class="space-y-2">
            <Label
              for="logo"
              class="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <ImageUp class="h-4 w-4" /> Nahrát logo
            </Label>
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="sr-only"
              @change="onLogoChange"
            />
            <Button v-if="form.logoUrl" type="button" variant="ghost" size="sm" @click="removeLogo">
              <Trash2 class="h-4 w-4 text-destructive" /> Odebrat
            </Button>
            <p class="text-xs text-muted-foreground">PNG, JPG nebo WebP, max 512 kB.</p>
          </div>
        </div>
      </div>

      <!-- Číselná řada -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Číselná řada faktur
        </h2>
        <div class="mt-4 space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="inv_prefix">Prefix</Label>
              <Input id="inv_prefix" v-model="form.invoiceNumberPrefix" placeholder="FA" />
            </div>
            <div class="space-y-2">
              <Label for="inv_seq">Příští pořadové číslo</Label>
              <Input
                id="inv_seq"
                v-model.number="form.nextInvoiceSeq"
                type="number"
                min="1"
                step="1"
              />
            </div>
          </div>
          <div class="space-y-2">
            <Label for="inv_format">Formát čísla</Label>
            <Input id="inv_format" v-model="form.invoiceNumberFormat" />
            <p class="text-xs text-muted-foreground">
              Zástupné značky: <code>{prefix}</code>, <code>{year}</code>, <code>{seq}</code>.
            </p>
          </div>
          <div class="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            Příští faktura: <span class="font-medium text-foreground">{{ numberPreview }}</span>
          </div>
        </div>
      </div>

      <!-- Splatnost -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Výchozí splatnost
        </h2>
        <div class="mt-4 space-y-2 sm:max-w-[220px]">
          <Label for="due_days">Splatnost (dní)</Label>
          <Input
            id="due_days"
            v-model.number="form.defaultPaymentDays"
            type="number"
            min="0"
            step="1"
          />
          <p class="text-xs text-muted-foreground">
            Použije se u nové faktury bez vybraného klienta. Klient s vlastní splatností má
            přednost.
          </p>
        </div>
      </div>

      <div class="flex justify-end">
        <Button type="submit" variant="coral">
          <Save class="h-4 w-4" />
          Uložit nastavení
        </Button>
      </div>
    </form>
  </div>
</template>
