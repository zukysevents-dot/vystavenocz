<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ChevronRight,
  Copy,
  CreditCard,
  Download,
  FileSpreadsheet,
  ImageUp,
  KeyRound,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
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
  type AccountingExportTarget,
  type AccountingExportType,
  type IntegrationSecretsStatus,
  type PaymentConnectionMode,
  type PaymentConnectionStatus,
  type PaymentProviderCatalogItem,
  type PaymentProviderConnection,
  type PrintAgent,
  type PrintAgentRegistered,
  type PrintJob,
  type TerminalPayment,
  type UpsertPaymentProviderConnectionRequest,
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

const moduleOptions: {
  id: AppModuleId
  label: string
  description: string
  pricingTarget?: string
  locked?: boolean
}[] = [
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
    pricingTarget: 'invoicing',
  },
  {
    id: 'pos',
    label: 'Pokladna',
    description: 'Prodej, platby, účtenky, uzávěrky a Z-reporty.',
    pricingTarget: 'pos',
  },
  {
    id: 'gastro',
    label: 'Gastro',
    description: 'Restaurace, stoly, kuchyně a gastro provoz.',
    pricingTarget: 'restaurant',
  },
  {
    id: 'stock',
    label: 'Sklad',
    description: 'Zásoby, naskladnění, inventury a skladové pohyby.',
    pricingTarget: 'inventory',
  },
  {
    id: 'attendance',
    label: 'Docházka',
    description: 'Zaměstnanci, směny, příchody, odchody a pauzy.',
    pricingTarget: 'attendance',
  },
  {
    id: 'booking',
    label: 'Rezervace',
    description: 'Služby, zdroje a veřejné rezervace.',
    pricingTarget: 'booking',
  },
  {
    id: 'jobs',
    label: 'Zakázky',
    description: 'Výjezdy, práce v terénu a zakázkový provoz.',
    pricingTarget: 'jobs',
  },
  {
    id: 'reporting',
    label: 'Reporty',
    description: 'Konsolidace, manažerské přehledy a porovnání provozoven.',
  },
  {
    id: 'loyalty',
    label: 'Věrnost',
    description: 'Věrnostní programy, návraty zákazníků a marketing.',
    pricingTarget: 'loyalty',
  },
  {
    id: 'ai',
    label: 'AI asistent',
    description: 'Asistent nad doklady, provozem, reporty a doporučeními.',
  },
  {
    id: 'integrations',
    label: 'Integrace',
    description: 'Nahrání a stažení dat, účetní výstupy a propojení dalších služeb.',
  },
]

const integrationReadiness = INTEGRATION_READINESS_ITEMS
const integrationSummary = computed(() => summarizeIntegrationReadiness(integrationReadiness))
const integrationsModuleEnabled = computed(() => enabledModules.value.includes('integrations'))
const integrationRuntimeAvailable = computed(() => apiMode && integrationsModuleEnabled.value)
const canManageIntegrations = computed(() => auth.hasRole('Owner', 'Admin', 'Manager'))
const terminalPayments = ref<TerminalPayment[]>([])
const printJobs = ref<PrintJob[]>([])
const printAgents = ref<PrintAgent[]>([])
const pendingTerminalPayments = ref(0)
const queuedPrintJobs = ref(0)
const integrationsLoading = ref(false)
const integrationsError = ref<string | null>(null)
const accountingExportLoading = ref(false)
const lastAccountingExportFile = ref<string | null>(null)
const printAgentLoading = ref(false)
const registeredPrintAgent = ref<PrintAgentRegistered | null>(null)
const paymentProviders = ref<PaymentProviderCatalogItem[]>([])
const paymentProvidersLoading = ref(false)
const paymentProvidersError = ref<string | null>(null)
const operationalProviderCount = computed(
  () => paymentProviders.value.filter((p) => p.isOperational).length,
)
const paymentConnections = ref<PaymentProviderConnection[]>([])
const providerDialogOpen = ref(false)
const dialogProvider = ref<PaymentProviderCatalogItem | null>(null)
const connectionSaving = ref(false)
const connectionForm = reactive({
  id: null as string | null,
  name: '',
  mode: 'sandbox' as PaymentConnectionMode,
  status: 'draft' as PaymentConnectionStatus,
  locationId: 'all',
  configuredFields: [] as string[],
})
// Zabezpečený trezor credentialů editované konfigurace: stav polí (bez hodnot) + rozepsané vstupy pro uložení/rotaci.
const secretStatus = ref<IntegrationSecretsStatus | null>(null)
const secretLoading = ref(false)
const secretError = ref<string | null>(null)
const secretInputs = reactive<Record<string, string>>({})
const secretBusyField = ref<string | null>(null) // pole (nebo '__all__') s právě probíhající akcí
const accountingExportForm = reactive({
  type: 'ZReports' as AccountingExportType,
  target: 'Generic' as AccountingExportTarget,
  from: monthStartIso(),
  to: todayIso(),
  locationId: 'all',
})
const printAgentForm = reactive({
  name: '',
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
    await Promise.all([
      loadLocations(),
      refreshIntegrationsRuntime(),
      loadPaymentProviderCatalog(),
      loadPaymentConnections(),
    ])
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
    printAgents.value = []
    pendingTerminalPayments.value = 0
    queuedPrintJobs.value = 0
    integrationsError.value = null
    return
  }
  integrationsLoading.value = true
  integrationsError.value = null
  try {
    const [terminals, pendingTerminals, jobs, queuedJobs, agents] = await Promise.all([
      integrationsApi.listTerminalPayments({ pageSize: 5 }),
      integrationsApi.listTerminalPayments({ pageSize: 1, status: 'Pending' }),
      integrationsApi.listPrintJobs({ pageSize: 5 }),
      integrationsApi.listPrintJobs({ pageSize: 1, status: 'Queued' }),
      integrationsApi.listPrintAgents(),
    ])
    terminalPayments.value = terminals.items
    pendingTerminalPayments.value = pendingTerminals.total
    printJobs.value = jobs.items
    queuedPrintJobs.value = queuedJobs.total
    printAgents.value = agents
  } catch (e) {
    integrationsError.value = integrationErrorMessage(e)
    terminalPayments.value = []
    printJobs.value = []
    printAgents.value = []
    pendingTerminalPayments.value = 0
    queuedPrintJobs.value = 0
  } finally {
    integrationsLoading.value = false
  }
}

// Provider-neutral katalog platebních providerů (ČSOB, NFCTRON, Comgate, SumUp, GP webpay, …). Read-only marketplace;
// backend říká, co je reálně napojené vs zatím jen připravený cíl. Vlastní loading/error stav (403 = modul/práva).
async function loadPaymentProviderCatalog(): Promise<void> {
  if (!integrationRuntimeAvailable.value) {
    paymentProviders.value = []
    paymentProvidersError.value = null
    return
  }
  paymentProvidersLoading.value = true
  paymentProvidersError.value = null
  try {
    paymentProviders.value = await integrationsApi.listPaymentProviderCatalog()
  } catch (e) {
    paymentProvidersError.value = integrationErrorMessage(e)
    paymentProviders.value = []
  } finally {
    paymentProvidersLoading.value = false
  }
}

// Konfigurace napojení providerů. Endpoint je zatím budoucí (backend #223 dodal jen katalog) — proto best-effort:
// když chybí, katalog to nerozbije a jen se nezobrazí žádné konfigurace. Payload nikdy nenese tajné hodnoty.
async function loadPaymentConnections(): Promise<void> {
  if (!integrationRuntimeAvailable.value) {
    paymentConnections.value = []
    return
  }
  try {
    paymentConnections.value = await integrationsApi.listPaymentProviderConnections()
  } catch {
    paymentConnections.value = []
  }
}

// Tlačítko Obnovit načte živé fronty, katalog providerů i jejich konfigurace zároveň.
async function refreshIntegrations(): Promise<void> {
  await Promise.all([
    refreshIntegrationsRuntime(),
    loadPaymentProviderCatalog(),
    loadPaymentConnections(),
  ])
}

// Kategorie z katalogu je provider-neutral řetězec; známé přeložíme, jinak zobrazíme, co pošle backend.
function paymentProviderCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    terminal: 'Platební terminál',
    online: 'Online platební brána',
    hybrid: 'Terminál + online',
    wallet: 'Peněženka / QR platby',
  }
  return labels[category.toLowerCase()] ?? category
}

function connectionsForProvider(key: string): PaymentProviderConnection[] {
  return paymentConnections.value.filter((c) => c.providerKey === key)
}

function resetConnectionForm(): void {
  connectionForm.id = null
  connectionForm.name = ''
  connectionForm.mode = 'sandbox'
  connectionForm.status = 'draft'
  connectionForm.locationId = 'all'
  connectionForm.configuredFields = []
  clearSecretVaultState()
}

// Trezor se váže na konkrétní uloženou konfiguraci — při novém formuláři / přepnutí ho vždy vyprázdníme.
function clearSecretVaultState(): void {
  secretStatus.value = null
  secretError.value = null
  secretLoading.value = false
  secretBusyField.value = null
  for (const key of Object.keys(secretInputs)) delete secretInputs[key]
}

function openProviderDialog(provider: PaymentProviderCatalogItem): void {
  dialogProvider.value = provider
  resetConnectionForm()
  providerDialogOpen.value = true
}

function editConnection(conn: PaymentProviderConnection): void {
  connectionForm.id = conn.id
  connectionForm.name = conn.name
  connectionForm.mode = conn.mode
  connectionForm.status = conn.status
  connectionForm.locationId = conn.locationId ?? 'all'
  connectionForm.configuredFields = [...conn.configuredFields]
  clearSecretVaultState()
  void loadSecretStatus(conn.id) // načte stav trezoru credentialů (bez hodnot)
}

// Checklist připravených setup polí. Drží se JEN názvy polí (ne hodnoty) — tajné klíče se do aplikace neukládají.
function toggleConfiguredField(field: string, on: boolean | 'indeterminate' | undefined): void {
  if (on === true) {
    if (!connectionForm.configuredFields.includes(field))
      connectionForm.configuredFields = [...connectionForm.configuredFields, field]
    return
  }
  connectionForm.configuredFields = connectionForm.configuredFields.filter((f) => f !== field)
}

async function saveConnection(): Promise<void> {
  if (!dialogProvider.value || !canManageIntegrations.value) return
  const name = connectionForm.name.trim()
  if (!name) {
    toast.error('Zadejte název konfigurace.')
    return
  }
  connectionSaving.value = true
  try {
    // Payload vědomě BEZ tajných hodnot — jen metadata a checklist připravených polí (filtrovaný na setupFields providera).
    const payload: UpsertPaymentProviderConnectionRequest = {
      providerKey: dialogProvider.value.key,
      name,
      mode: connectionForm.mode,
      status: connectionForm.status,
      locationId: connectionForm.locationId === 'all' ? null : connectionForm.locationId,
      configuredFields: connectionForm.configuredFields.filter((f) =>
        dialogProvider.value?.setupFields.includes(f),
      ),
    }
    if (connectionForm.id) {
      await integrationsApi.updatePaymentProviderConnection(connectionForm.id, payload)
      toast.success('Konfigurace uložena.')
    } else {
      await integrationsApi.createPaymentProviderConnection(payload)
      toast.success('Konfigurace vytvořena.')
    }
    await loadPaymentConnections()
    resetConnectionForm()
  } catch (e) {
    toast.error(integrationErrorMessage(e))
  } finally {
    connectionSaving.value = false
  }
}

async function deleteConnection(conn: PaymentProviderConnection): Promise<void> {
  if (!canManageIntegrations.value) return
  connectionSaving.value = true
  try {
    await integrationsApi.deletePaymentProviderConnection(conn.id)
    if (connectionForm.id === conn.id) resetConnectionForm()
    await loadPaymentConnections()
    toast.success('Konfigurace smazána.')
  } catch (e) {
    toast.error(integrationErrorMessage(e))
  } finally {
    connectionSaving.value = false
  }
}

// --- Zabezpečený trezor credentialů (backend #225) ---
// Credential pole providera z katalogu (podmnožina setupFields se sufixem `Ref`); tyto se ukládají do trezoru,
// ne do checklistu configuredFields. Chybí-li v katalogu (starší backend), trezor pracuje podle backendem
// vráceného stavu polí.
const dialogCredentialFields = computed<string[]>(
  () => dialogProvider.value?.credentialFields ?? [],
)
// Do checklistu „Potřebné údaje" patří jen NE-tajná setup pole; tajemství řeší trezor níže.
const dialogChecklistFields = computed<string[]>(() =>
  (dialogProvider.value?.setupFields ?? []).filter(
    (f) => !dialogCredentialFields.value.includes(f),
  ),
)
// Trezor ukazujeme, když provider má credential pole (katalog) nebo backend vrátil pole ke konkrétní konfiguraci.
const showCredentialVault = computed<boolean>(
  () => dialogCredentialFields.value.length > 0 || (secretStatus.value?.fields.length ?? 0) > 0,
)

async function loadSecretStatus(connectionId: string): Promise<void> {
  if (!integrationRuntimeAvailable.value) return
  secretLoading.value = true
  secretError.value = null
  try {
    secretStatus.value = await integrationsApi.listPaymentProviderSecrets(connectionId)
  } catch (e) {
    secretStatus.value = null
    secretError.value = integrationErrorMessage(e)
  } finally {
    secretLoading.value = false
  }
}

// Uložení/rotace jednoho klíče. Raw hodnota jde na backend jednorázově, zašifruje se a už se nikdy nevrací.
// Po úspěchu vstup VŽDY vyprázdníme, aby v UI nezůstala citlivá hodnota.
async function saveSecret(field: string): Promise<void> {
  if (!connectionForm.id || !canManageIntegrations.value) return
  const value = (secretInputs[field] ?? '').trim()
  if (!value) {
    toast.error('Zadejte hodnotu klíče.')
    return
  }
  secretBusyField.value = field
  try {
    secretStatus.value = await integrationsApi.storePaymentProviderSecret(
      connectionForm.id,
      field,
      value,
    )
    secretInputs[field] = '' // po úspěšném uložení vstup vždy vyčistit (nikdy neponechat hodnotu v UI)
    toast.success('Klíč uložen do zabezpečeného trezoru.')
  } catch (e) {
    toast.error(integrationErrorMessage(e))
  } finally {
    secretBusyField.value = null
  }
}

async function deleteSecret(field: string): Promise<void> {
  if (!connectionForm.id || !canManageIntegrations.value) return
  secretBusyField.value = field
  try {
    await integrationsApi.deletePaymentProviderSecret(connectionForm.id, field)
    secretInputs[field] = ''
    await loadSecretStatus(connectionForm.id)
    await maybeDowngradeAfterCredentialRemoval()
    toast.success('Klíč odstraněn z trezoru.')
  } catch (e) {
    toast.error(integrationErrorMessage(e))
  } finally {
    secretBusyField.value = null
  }
}

async function revokeAllSecrets(): Promise<void> {
  if (!connectionForm.id || !canManageIntegrations.value) return
  secretBusyField.value = '__all__'
  try {
    await integrationsApi.revokePaymentProviderSecrets(connectionForm.id)
    for (const key of Object.keys(secretInputs)) secretInputs[key] = ''
    await loadSecretStatus(connectionForm.id)
    await maybeDowngradeAfterCredentialRemoval()
    toast.success('Všechny klíče byly z trezoru revokovány.')
  } catch (e) {
    toast.error(integrationErrorMessage(e))
  } finally {
    secretBusyField.value = null
  }
}

// Ready vyžaduje kompletní credential set → po odebrání klíče degradujeme konfiguraci na „čeká na údaje"
// (backend Ready gate to vynucuje jen při zápisu, takže konzistenci po smazání dorovná frontend).
async function maybeDowngradeAfterCredentialRemoval(): Promise<void> {
  const id = connectionForm.id
  if (!id || connectionForm.status !== 'ready') return
  if (secretStatus.value?.allRequiredPresent) return
  const conn = paymentConnections.value.find((c) => c.id === id)
  if (!conn) return
  try {
    await integrationsApi.updatePaymentProviderConnection(id, {
      providerKey: conn.providerKey,
      name: conn.name,
      mode: conn.mode,
      status: 'awaiting_credentials',
      locationId: conn.locationId,
      configuredFields: conn.configuredFields,
    })
    connectionForm.status = 'awaiting_credentials'
    await loadPaymentConnections()
    toast.info('Konfigurace přepnuta na „Čeká na údaje" — chybí klíč v trezoru.')
  } catch {
    // Degradace je best-effort; klíč je odstraněný i kdyby se stav nepřepsal.
  }
}

function secretUpdatedAtLabel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('cs-CZ')
}

// Souhrn trezoru pro řádek konfigurace v seznamu (kolik povinných klíčů už je uložených).
function connectionVaultSummary(conn: PaymentProviderConnection): {
  stored: number
  required: number
} {
  return {
    stored: conn.storedCredentialFields?.length ?? 0,
    required: conn.requiredCredentialFields?.length ?? 0,
  }
}

function paymentConnectionModeLabel(mode: PaymentConnectionMode): string {
  return mode === 'production' ? 'Produkce' : 'Sandbox'
}

function paymentConnectionStatusLabel(status: PaymentConnectionStatus): string {
  const labels: Record<PaymentConnectionStatus, string> = {
    draft: 'Rozpracováno',
    awaiting_credentials: 'Čeká na údaje',
    ready: 'Připraveno',
    disabled: 'Vypnuto',
  }
  return labels[status]
}

async function downloadAccountingExport(): Promise<void> {
  if (!integrationRuntimeAvailable.value) return
  accountingExportLoading.value = true
  try {
    const exportResult = await integrationsApi.downloadAccountingExport({
      type: accountingExportForm.type,
      from: accountingExportForm.from,
      to: accountingExportForm.to,
      locationId:
        accountingExportForm.locationId === 'all' ? null : accountingExportForm.locationId,
      target: accountingExportForm.target,
      format: accountingExportFormat(),
    })
    const fileName = exportResult.fileName ?? accountingExportFallbackFileName()
    lastAccountingExportFile.value = fileName
    downloadBlobFile(fileName, exportResult.blob)
    toast.success('Export připraven ke stažení.')
  } catch (e) {
    toast.error(accountingExportErrorMessage(e))
  } finally {
    accountingExportLoading.value = false
  }
}

async function registerPrintAgent(): Promise<void> {
  if (!integrationRuntimeAvailable.value || !canManageIntegrations.value) return
  const name = printAgentForm.name.trim()
  if (!name) {
    toast.error('Zadejte název tiskového agenta.')
    return
  }
  printAgentLoading.value = true
  try {
    const agent = await integrationsApi.registerPrintAgent({
      name,
      locationId: printAgentForm.locationId === 'all' ? null : printAgentForm.locationId,
    })
    registeredPrintAgent.value = agent
    printAgentForm.name = ''
    await refreshIntegrationsRuntime()
    toast.success('Pomocná aplikace pro tisk byla připojena. Přístupový kód si bezpečně uložte.')
  } catch (e) {
    toast.error(integrationErrorMessage(e))
  } finally {
    printAgentLoading.value = false
  }
}

async function revokePrintAgent(agent: PrintAgent): Promise<void> {
  if (!canManageIntegrations.value) return
  printAgentLoading.value = true
  try {
    await integrationsApi.revokePrintAgent(agent.id)
    if (registeredPrintAgent.value?.id === agent.id) registeredPrintAgent.value = null
    await refreshIntegrationsRuntime()
    toast.success('Připojení k tiskárně bylo zrušeno.')
  } catch (e) {
    toast.error(integrationErrorMessage(e))
  } finally {
    printAgentLoading.value = false
  }
}

async function copyPrintAgentToken(): Promise<void> {
  const token = registeredPrintAgent.value?.token
  if (!token) return
  try {
    await navigator.clipboard.writeText(token)
    toast.success('Přístupový kód byl zkopírován.')
  } catch {
    toast.error('Přístupový kód se nepodařilo zkopírovat.')
  }
}

function accountingExportFormat(): 'Csv' | 'Xml' {
  return accountingExportForm.target === 'Pohoda' ? 'Xml' : 'Csv'
}

function accountingExportTargetLabel(): string {
  return accountingExportForm.target === 'Pohoda' ? 'Pohoda XML' : 'Generic CSV'
}

function accountingExportFormatLabel(): string {
  return accountingExportFormat() === 'Xml' ? 'XML' : 'CSV'
}

function accountingExportFallbackFileName(): string {
  const extension = accountingExportFormat() === 'Xml' ? 'xml' : 'csv'
  return `vystaveno-${accountingExportForm.type.toLowerCase()}-${accountingExportForm.from}-${accountingExportForm.to}.${extension}`
}

function downloadBlobFile(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || accountingExportFallbackFileName()
  link.click()
  URL.revokeObjectURL(url)
}

function accountingExportErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 422 && accountingExportForm.target === 'Pohoda')
    return 'Pohoda XML export potřebuje vyplněné IČO firmy. Doplňte ho nahoře v Nastavení firmy.'
  return integrationErrorMessage(e)
}

function integrationErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 403)
    return 'Modul Integrace není povolený nebo nemáte oprávnění.'
  if (e instanceof ApiError && e.status === 503)
    return 'Zabezpečené ukládání tajných klíčů není nastavené. Obraťte se na správce.'
  if (e instanceof ApiError && e.status === 422) return e.message
  if (e instanceof ApiError && e.status === 0) return 'Připojení se nezdařilo. Zkuste to znovu.'
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

function printAgentLocationName(locationId: string | null): string {
  if (!locationId) return 'Všechny provozovny'
  return (
    locations.value.find((location) => location.id === locationId)?.name ?? 'Neznámá provozovna'
  )
}

function printAgentIsOnline(agent: PrintAgent): boolean {
  if (!agent.lastSeenAt) return false
  return Date.now() - new Date(agent.lastSeenAt).getTime() < 2 * 60 * 1000
}

function printAgentSeenLabel(agent: PrintAgent): string {
  if (!agent.lastSeenAt) return 'Ještě se nepřipojil'
  return `Naposledy ${shortDateTime(agent.lastSeenAt)}`
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
              <RouterLink
                v-if="module.pricingTarget"
                :to="`/cenik#pricing-${module.pricingTarget}`"
                class="mt-2 inline-block text-xs font-semibold text-coral underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                @click.stop
              >
                Zobrazit v ceníku
              </RouterLink>
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
            :disabled="integrationsLoading || paymentProvidersLoading"
            @click="refreshIntegrations"
          >
            <RefreshCw
              class="h-4 w-4"
              :class="{ 'animate-spin': integrationsLoading || paymentProvidersLoading }"
            />
            Obnovit
          </Button>
        </div>

        <!-- Veřejné API + webhooky — vlastní stránka (tokeny, subscriptions, historie doručení). -->
        <RouterLink
          to="/app/nastaveni/api-webhooky"
          class="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40"
          data-testid="api-webhooky-link"
        >
          <span>
            <span class="block text-sm font-semibold">Propojení pro vývojáře</span>
            <span class="mt-1 block text-xs text-muted-foreground">
              Pokročilé propojení s e-shopem, zákaznickým systémem nebo automatizací.
            </span>
          </span>
          <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
        </RouterLink>

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
              <Badge variant="secondary">{{ accountingExportTargetLabel() }}</Badge>
            </div>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="integration-export-target">Cíl</Label>
                <Select
                  :model-value="accountingExportForm.target"
                  @update:model-value="
                    (value) => (accountingExportForm.target = value as AccountingExportTarget)
                  "
                >
                  <SelectTrigger id="integration-export-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Generic">Generic CSV</SelectItem>
                    <SelectItem value="Pohoda">Pohoda XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <template v-if="lastAccountingExportFile">{{ lastAccountingExportFile }}</template>
                <template v-else>Bez posledního exportu</template>
              </div>
              <Button
                type="button"
                variant="coral"
                :disabled="accountingExportLoading"
                @click="downloadAccountingExport"
              >
                <Download class="h-4 w-4" />
                Stáhnout {{ accountingExportFormatLabel() }}
              </Button>
            </div>
            <p class="mt-2 text-xs text-muted-foreground">
              Pohoda XML je soubor pro ruční import v Pohodě, ne živá synchronizace.
            </p>
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
                    Bez tiskových úloh.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-border p-4 lg:col-span-2">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 font-medium">
                  <KeyRound class="h-4 w-4 text-primary" />
                  Pomocné aplikace pro tisk
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  Program u místní tiskárny přebírá připravené tiskové úlohy. Přístupový kód se
                  zobrazí jen při vytvoření.
                </p>
              </div>
              <Badge variant="secondary">{{ printAgents.length }} aktivních</Badge>
            </div>

            <div
              v-if="canManageIntegrations"
              class="mt-4 grid gap-3 border-b border-border pb-4 md:grid-cols-[1fr_220px_auto]"
            >
              <div class="space-y-1.5">
                <Label for="print-agent-name">Název připojení</Label>
                <Input
                  id="print-agent-name"
                  v-model="printAgentForm.name"
                  placeholder="Kuchyně tiskárna"
                />
              </div>
              <div class="space-y-1.5">
                <Label for="print-agent-location">Provozovna</Label>
                <Select v-model="printAgentForm.locationId">
                  <SelectTrigger id="print-agent-location">
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
              <div class="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  class="w-full"
                  :disabled="printAgentLoading"
                  @click="registerPrintAgent"
                >
                  <Plus class="h-4 w-4" />
                  Přidat
                </Button>
              </div>
            </div>

            <div
              v-if="registeredPrintAgent"
              class="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div class="text-sm font-medium">
                    Přístupový kód pro {{ registeredPrintAgent.name }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    Uložte ho do pomocné aplikace u tiskárny. Znovu se nezobrazí.
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" @click="copyPrintAgentToken">
                  <Copy class="h-4 w-4" />
                  Kopírovat
                </Button>
              </div>
              <Input
                id="print-agent-token"
                class="mt-3 font-mono text-xs"
                :model-value="registeredPrintAgent.token"
                readonly
              />
            </div>

            <div class="mt-4 grid gap-2">
              <div
                v-for="agent in printAgents"
                :key="agent.id"
                class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <div class="font-medium">{{ agent.name }}</div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    {{ printAgentLocationName(agent.locationId) }} ·
                    {{ printAgentSeenLabel(agent) }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Badge :variant="printAgentIsOnline(agent) ? 'default' : 'outline'">
                    {{ printAgentIsOnline(agent) ? 'Připojeno' : 'Bez připojení' }}
                  </Badge>
                  <Button
                    v-if="canManageIntegrations"
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Zrušit připojení"
                    :disabled="printAgentLoading"
                    @click="revokePrintAgent(agent)"
                  >
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div
                v-if="!printAgents.length && !integrationsLoading"
                class="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground"
              >
                Zatím není připojená žádná pomocná aplikace pro tisk.
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground"
        >
          Aktuální stav propojení zde není dostupný.
        </div>

        <!-- Platební provideri (provider-neutral katalog / marketplace) -->
        <div class="mt-4 rounded-lg border border-border p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2 font-medium">
              <CreditCard class="h-4 w-4 text-primary" />
              Poskytovatelé plateb
            </div>
            <Badge v-if="integrationRuntimeAvailable" variant="secondary">
              {{ operationalProviderCount }} aktivních
            </Badge>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            Přehled platebních bran a terminálů. Platby začnou fungovat až po dokončení propojení,
            uzavření smlouvy a doplnění přístupových údajů poskytovatele.
          </p>

          <div
            v-if="!integrationRuntimeAvailable"
            class="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground"
          >
            Nastavení poskytovatelů plateb zde není dostupné.
          </div>
          <div
            v-else-if="paymentProvidersLoading"
            class="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground"
          >
            Načítání katalogu…
          </div>
          <div
            v-else-if="paymentProvidersError"
            class="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {{ paymentProvidersError }}
          </div>
          <div v-else-if="paymentProviders.length" class="mt-3 grid gap-3 sm:grid-cols-2">
            <div
              v-for="provider in paymentProviders"
              :key="provider.key"
              class="rounded-md border border-border p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="font-medium">{{ provider.name }}</div>
                <Badge :variant="provider.isOperational ? 'default' : 'outline'">
                  {{ provider.isOperational ? 'Aktivní' : 'Připraveno k napojení' }}
                </Badge>
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                {{ paymentProviderCategoryLabel(provider.category) }}
              </div>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <Badge v-if="provider.supportsInPerson" variant="secondary">Terminál</Badge>
                <Badge v-if="provider.supportsOnline" variant="secondary">Online platby</Badge>
                <Badge v-if="provider.supportsWebhooks" variant="secondary">Webhooky</Badge>
              </div>
              <p v-if="provider.notes" class="mt-2 text-xs text-muted-foreground">
                {{ provider.notes }}
              </p>
              <ul class="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <li v-if="provider.requiresPartnerContract">
                  • Vyžaduje smlouvu s poskytovatelem.
                </li>
                <li v-if="provider.requiresCredentials">• Vyžaduje přístupové údaje.</li>
                <li v-if="provider.setupFields.length">
                  • Nastavení: {{ provider.setupFields.join(', ') }}
                </li>
              </ul>
              <div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
                <span class="text-xs text-muted-foreground">
                  {{ connectionsForProvider(provider.key).length }} konfigurací
                </span>
                <Button
                  v-if="canManageIntegrations"
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="openProviderDialog(provider)"
                >
                  <Settings2 class="h-4 w-4" />
                  Nastavit
                </Button>
              </div>
            </div>
          </div>
          <div
            v-else
            class="mt-3 rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground"
          >
            Seznam poskytovatelů plateb je zatím prázdný.
          </div>
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

    <!-- Konfigurace platebního providera (bez ukládání tajných hodnot) -->
    <Dialog v-model:open="providerDialogOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nastavit {{ dialogProvider?.name }}</DialogTitle>
          <DialogDescription>
            Tajné klíče se ukládají pouze zabezpečeně. Platby začnou fungovat až po dokončení
            propojení s poskytovatelem.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div
            v-if="dialogProvider && connectionsForProvider(dialogProvider.key).length"
            class="space-y-2"
          >
            <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Konfigurace
            </div>
            <div
              v-for="conn in connectionsForProvider(dialogProvider.key)"
              :key="conn.id"
              class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <div class="font-medium">{{ conn.name }}</div>
                <div
                  class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span>{{ paymentConnectionModeLabel(conn.mode) }}</span>
                  <Badge
                    v-if="connectionVaultSummary(conn).required > 0"
                    :variant="
                      connectionVaultSummary(conn).stored >= connectionVaultSummary(conn).required
                        ? 'secondary'
                        : 'outline'
                    "
                  >
                    <KeyRound class="mr-1 h-3 w-3" />
                    Trezor {{ connectionVaultSummary(conn).stored }}/{{
                      connectionVaultSummary(conn).required
                    }}
                  </Badge>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Badge variant="outline">{{ paymentConnectionStatusLabel(conn.status) }}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Upravit konfiguraci"
                  @click="editConnection(conn)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Smazat konfiguraci"
                  :disabled="connectionSaving"
                  @click="deleteConnection(conn)"
                >
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>

          <div class="space-y-3 border-t border-border pt-3">
            <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {{ connectionForm.id ? 'Upravit konfiguraci' : 'Nová konfigurace' }}
            </div>
            <div class="space-y-1.5">
              <Label for="conn-name">Název konfigurace</Label>
              <Input
                id="conn-name"
                v-model="connectionForm.name"
                placeholder="např. ČSOB terminál Praha"
              />
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="conn-mode">Režim</Label>
                <Select
                  :model-value="connectionForm.mode"
                  @update:model-value="(v) => (connectionForm.mode = v as PaymentConnectionMode)"
                >
                  <SelectTrigger id="conn-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Produkce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label for="conn-status">Stav</Label>
                <Select
                  :model-value="connectionForm.status"
                  @update:model-value="
                    (v) => (connectionForm.status = v as PaymentConnectionStatus)
                  "
                >
                  <SelectTrigger id="conn-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rozpracováno</SelectItem>
                    <SelectItem value="awaiting_credentials">Čeká na údaje</SelectItem>
                    <SelectItem value="ready">Připraveno</SelectItem>
                    <SelectItem value="disabled">Vypnuto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div class="space-y-1.5">
              <Label for="conn-location">Provozovna</Label>
              <Select v-model="connectionForm.locationId">
                <SelectTrigger id="conn-location"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  <SelectItem v-for="location in locations" :key="location.id" :value="location.id">
                    {{ location.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div v-if="dialogChecklistFields.length" class="space-y-2">
              <Label>Potřebné údaje (bez tajných klíčů)</Label>
              <p class="text-xs text-muted-foreground">
                Zaškrtněte, které nastavovací údaje (např. ID obchodníka, callback URL) máte
                bezpečně připravené. Tajné klíče sem nepatří — ty vložíte do zabezpečeného trezoru
                níže.
              </p>
              <div
                v-for="field in dialogChecklistFields"
                :key="field"
                class="flex items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <Checkbox
                  :id="`conn-field-${field}`"
                  :model-value="connectionForm.configuredFields.includes(field)"
                  @update:model-value="(v) => toggleConfiguredField(field, v)"
                />
                <Label :for="`conn-field-${field}`" class="flex-1 text-sm font-medium">{{
                  field
                }}</Label>
              </div>
            </div>

            <!-- Zabezpečený trezor credentialů (tajné klíče) — backend #225 -->
            <div
              v-if="showCredentialVault"
              class="space-y-2 rounded-md border border-border bg-muted/30 p-3"
              data-testid="credential-vault"
            >
              <div class="flex items-center gap-2">
                <KeyRound class="h-4 w-4 text-muted-foreground" />
                <Label class="text-sm font-semibold">Zabezpečené uložení klíčů</Label>
              </div>
              <p class="text-xs text-muted-foreground">
                Klíče se ukládají zašifrovaně a už se nikdy nezobrazí. Uložení klíče samo platby
                nezapne; nejdřív je potřeba dokončit propojení s poskytovatelem.
              </p>

              <p v-if="!connectionForm.id" class="text-xs text-muted-foreground">
                Nejdřív konfiguraci uložte, pak sem můžete bezpečně vložit klíče do trezoru.
              </p>

              <template v-else>
                <p v-if="secretLoading" class="text-xs text-muted-foreground">
                  Načítám stav trezoru…
                </p>
                <p v-else-if="secretError" class="text-xs text-destructive">{{ secretError }}</p>
                <template v-else-if="secretStatus">
                  <div
                    v-for="fieldStatus in secretStatus.fields"
                    :key="fieldStatus.fieldName"
                    class="space-y-1.5 rounded-md border border-border bg-background px-3 py-2"
                    :data-testid="`secret-field-${fieldStatus.fieldName}`"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <Label
                        :for="`secret-input-${fieldStatus.fieldName}`"
                        class="text-sm font-medium"
                      >
                        {{ fieldStatus.fieldName }}
                      </Label>
                      <div class="flex items-center gap-1.5">
                        <Badge :variant="fieldStatus.required ? 'outline' : 'secondary'">
                          {{ fieldStatus.required ? 'povinné' : 'volitelné' }}
                        </Badge>
                        <Badge
                          :variant="fieldStatus.hasSecret ? 'secondary' : 'outline'"
                          :data-testid="`secret-state-${fieldStatus.fieldName}`"
                        >
                          {{ fieldStatus.hasSecret ? 'Uloženo' : 'Chybí' }}
                        </Badge>
                      </div>
                    </div>
                    <p
                      v-if="fieldStatus.hasSecret && secretUpdatedAtLabel(fieldStatus.updatedAt)"
                      class="text-[11px] text-muted-foreground"
                    >
                      Naposledy uloženo: {{ secretUpdatedAtLabel(fieldStatus.updatedAt) }}
                    </p>
                    <div class="flex items-center gap-2">
                      <Input
                        :id="`secret-input-${fieldStatus.fieldName}`"
                        v-model="secretInputs[fieldStatus.fieldName]"
                        type="password"
                        autocomplete="off"
                        class="text-xs"
                        :placeholder="
                          fieldStatus.hasSecret
                            ? 'Nová hodnota pro rotaci klíče'
                            : 'Vložte hodnotu klíče'
                        "
                        :disabled="
                          !canManageIntegrations || secretBusyField === fieldStatus.fieldName
                        "
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        :disabled="
                          !canManageIntegrations ||
                          secretBusyField !== null ||
                          !(secretInputs[fieldStatus.fieldName] ?? '').trim()
                        "
                        @click="saveSecret(fieldStatus.fieldName)"
                      >
                        {{ fieldStatus.hasSecret ? 'Rotovat klíč' : 'Uložit klíč' }}
                      </Button>
                      <Button
                        v-if="fieldStatus.hasSecret"
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Odstranit klíč z trezoru"
                        :disabled="!canManageIntegrations || secretBusyField !== null"
                        @click="deleteSecret(fieldStatus.fieldName)"
                      >
                        <Trash2 class="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p
                      class="text-xs"
                      :class="
                        secretStatus.allRequiredPresent
                          ? 'text-muted-foreground'
                          : 'text-amber-600 dark:text-amber-500'
                      "
                    >
                      {{
                        secretStatus.allRequiredPresent
                          ? 'Všechny povinné klíče jsou v trezoru — konfiguraci lze přepnout na Připraveno.'
                          : 'Stav Připraveno vyžaduje všechny povinné klíče v trezoru.'
                      }}
                    </p>
                    <Button
                      v-if="secretStatus.fields.some((f) => f.hasSecret)"
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="text-destructive"
                      :disabled="!canManageIntegrations || secretBusyField !== null"
                      @click="revokeAllSecrets"
                    >
                      Revokovat všechny klíče
                    </Button>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" @click="providerDialogOpen = false">Zavřít</Button>
          <Button
            type="button"
            variant="coral"
            :disabled="connectionSaving || !canManageIntegrations"
            @click="saveConnection"
          >
            <Save class="h-4 w-4" />
            {{ connectionForm.id ? 'Uložit změny' : 'Vytvořit konfiguraci' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
