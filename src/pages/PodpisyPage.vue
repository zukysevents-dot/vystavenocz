<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { FileSignature, Plus, Loader2, ShieldCheck, Send, Ban, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/sonner'
import { ApiError, isApiMode } from '@/lib/http'
import SigningProviderSettings from '@/components/app/SigningProviderSettings.vue'
import {
  useVerifiedSigning,
  SIGNATURE_PROVIDERS,
  SIGNATURE_DOCUMENT_TYPES,
  type SignatureEnvelope,
  type SignatureEnvelopeStatus,
  type SignatureEvidence,
  type SigningConnectionStatus,
  type SigningProviderConnection,
} from '@/composables/useVerifiedSigning'

const signing = useVerifiedSigning()
const apiMode = isApiMode()

const envelopes = ref<SignatureEnvelope[]>([])
const loading = ref(true)
const loadError = ref(false)
const statusFilter = ref<SignatureEnvelopeStatus | 'all'>('all')

const detailOpen = ref(false)
const detail = ref<SignatureEnvelope | null>(null)
const evidence = ref<SignatureEvidence | null>(null)
const evidenceLoading = ref(false)
const actionBusy = ref(false)

// Runtime seam: odeslání lze nasměrovat přes konkrétní provider connection (jen API režim). '__foundation__' = základní
// odeslání bez konfigurace (jako dosud). Nabízí se jen konfigurace stejného providera jako obálka.
const FOUNDATION_SEND = '__foundation__'
const providerConnections = ref<SigningProviderConnection[]>([])
const selectedConnectionId = ref<string>(FOUNDATION_SEND)

const CONN_STATUS_LABELS: Record<SigningConnectionStatus, string> = {
  draft: 'Rozpracováno',
  awaiting_credentials: 'Čeká na údaje',
  ready: 'Připraveno',
  disabled: 'Vypnuto',
}
function connStatusLabel(status: SigningConnectionStatus): string {
  return CONN_STATUS_LABELS[status]
}

// Konfigurace stejného providera; Ready napřed (nabízí se přednostně).
const matchingConnections = computed<SigningProviderConnection[]>(() => {
  const provider = detail.value?.provider
  if (!provider) return []
  return providerConnections.value
    .filter((c) => c.providerKey === provider)
    .slice()
    .sort((a, b) => Number(b.status === 'ready') - Number(a.status === 'ready'))
})

const createOpen = ref(false)
const creating = ref(false)
// Dokument k podpisu: soubor zůstává lokálně, do evidence jde jen jeho SHA-256 otisk (backend ho vyžaduje).
const documentFile = ref<File | null>(null)
const documentHash = ref<string | null>(null)
const hashing = ref(false)
const emptyForm = () => ({
  documentName: '',
  documentType: 'contract',
  provider: 'bankid',
  externalReference: '',
  signerName: '',
  signerEmail: '',
  signerPhone: '',
  expiresAt: '',
})
const form = reactive(emptyForm())

const STATUS_LABELS: Record<SignatureEnvelopeStatus, string> = {
  draft: 'Rozpracováno',
  ready: 'Připraveno',
  sent: 'Odesláno',
  signed: 'Podepsáno',
  rejected: 'Odmítnuto',
  cancelled: 'Zrušeno',
  expired: 'Vypršelo',
}

const STATUS_VARIANTS: Record<
  SignatureEnvelopeStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'outline',
  ready: 'outline',
  sent: 'secondary',
  signed: 'default',
  rejected: 'destructive',
  cancelled: 'destructive',
  expired: 'destructive',
}

const STATUS_ORDER: SignatureEnvelopeStatus[] = [
  'draft',
  'ready',
  'sent',
  'signed',
  'rejected',
  'cancelled',
  'expired',
]

const visibleEnvelopes = computed(() =>
  statusFilter.value === 'all'
    ? envelopes.value
    : envelopes.value.filter((e) => e.status === statusFilter.value),
)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    envelopes.value = await signing.listEnvelopes()
  } catch {
    loadError.value = true
    envelopes.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)

function statusLabel(status: SignatureEnvelopeStatus): string {
  return STATUS_LABELS[status]
}

function docTypeLabel(key: string | null): string {
  if (!key) return '—'
  return SIGNATURE_DOCUMENT_TYPES.find((t) => t.key === key)?.label ?? key
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('cs-CZ')
}

const canSend = (e: SignatureEnvelope): boolean => e.status === 'draft' || e.status === 'ready'
const canCancel = (e: SignatureEnvelope): boolean =>
  e.status === 'draft' || e.status === 'ready' || e.status === 'sent'

async function openDetail(envelope: SignatureEnvelope): Promise<void> {
  detail.value = envelope
  evidence.value = null
  providerConnections.value = []
  selectedConnectionId.value = FOUNDATION_SEND
  detailOpen.value = true
  evidenceLoading.value = true
  // Provider connections jen v API režimu (endpoint neběží v mock režimu) a jen pro obálky, které lze odeslat.
  if (isApiMode() && canSend(envelope)) void loadSendConnections(envelope.provider)
  try {
    evidence.value = await signing.getEvidence(envelope.id)
  } catch {
    evidence.value = null
  } finally {
    evidenceLoading.value = false
  }
}

async function loadSendConnections(provider: string): Promise<void> {
  try {
    providerConnections.value = await signing.listProviderConnections()
  } catch {
    providerConnections.value = []
  }
  // Předvyber Ready konfiguraci stejného providera, pokud existuje; jinak zůstane základní odeslání.
  const ready = providerConnections.value.find(
    (c) => c.providerKey === provider && c.status === 'ready',
  )
  selectedConnectionId.value = ready?.id ?? FOUNDATION_SEND
}

function refreshInList(updated: SignatureEnvelope): void {
  envelopes.value = envelopes.value.map((e) => (e.id === updated.id ? updated : e))
  if (detail.value?.id === updated.id) detail.value = updated
}

async function doSend(envelope: SignatureEnvelope): Promise<void> {
  const connectionId =
    selectedConnectionId.value === FOUNDATION_SEND ? undefined : selectedConnectionId.value
  actionBusy.value = true
  try {
    const updated = await signing.sendEnvelope(envelope.id, connectionId)
    refreshInList(updated)
    toast.success(
      updated.providerReference
        ? `Žádost byla odeslána přes poskytovatele. Referenční číslo: ${updated.providerReference}.`
        : 'Obálka odeslána k ověřenému podpisu.',
    )
  } catch (e) {
    toast.error(sendErrorMessage(e, Boolean(connectionId)))
  } finally {
    actionBusy.value = false
  }
}

// Chybové stavy odeslání přes provider connection (runtime seam).
function sendErrorMessage(e: unknown, hadConnection: boolean): string {
  if (e instanceof ApiError && e.status === 403)
    return 'Modul Ověřené podpisy není povolený nebo nemáte oprávnění.'
  if (e instanceof ApiError && e.status === 422) {
    const msg = e.message ?? ''
    if (/adapter/i.test(msg)) return 'Podepisování přes BankID zatím není aktivní.'
    if (hadConnection)
      return 'Chybějí přístupové údaje poskytovatele. Doplňte je v části Poskytovatel podpisu.'
    return msg || 'Obálku se nepodařilo odeslat.'
  }
  return 'Obálku se nepodařilo odeslat.'
}

async function doCancel(envelope: SignatureEnvelope): Promise<void> {
  actionBusy.value = true
  try {
    refreshInList(await signing.cancelEnvelope(envelope.id))
    toast.success('Obálka zrušena.')
  } catch {
    toast.error('Obálku se nepodařilo zrušit.')
  } finally {
    actionBusy.value = false
  }
}

function openCreate(): void {
  Object.assign(form, emptyForm())
  documentFile.value = null
  documentHash.value = null
  createOpen.value = true
}

async function onDocumentSelected(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  documentFile.value = file
  documentHash.value = null
  if (!file) return
  hashing.value = true
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    documentHash.value = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    // Předvyplň název dokumentu z názvu souboru, když je pole prázdné.
    if (!form.documentName.trim()) form.documentName = file.name.replace(/\.[^.]+$/, '')
  } catch {
    toast.error('Otisk dokumentu se nepodařilo spočítat. Zkuste soubor vybrat znovu.')
    documentFile.value = null
  } finally {
    hashing.value = false
  }
}

async function submitCreate(): Promise<void> {
  const documentName = form.documentName.trim()
  const signerName = form.signerName.trim()
  if (isApiMode() && !documentHash.value) {
    toast.error('Vyberte dokument k podpisu.')
    return
  }
  if (!documentName) {
    toast.error('Zadejte název dokumentu.')
    return
  }
  if (!signerName) {
    toast.error('Zadejte jméno podepisující osoby.')
    return
  }
  creating.value = true
  try {
    const created = await signing.createEnvelope({
      documentName,
      documentHash: documentHash.value,
      documentType: form.documentType || null,
      externalReference: form.externalReference.trim() || null,
      provider: form.provider,
      signer: {
        name: signerName,
        email: form.signerEmail.trim() || null,
        phone: form.signerPhone.trim() || null,
      },
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    })
    envelopes.value = [created, ...envelopes.value]
    createOpen.value = false
    toast.success('Podpisová obálka vytvořena.')
  } catch {
    toast.error('Obálku se nepodařilo vytvořit.')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8" data-testid="signing-page">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Ověřené podpisy</h1>
      <p class="mt-1 text-muted-foreground">
        Samostatný add-on modul pro ověřený podpis dokumentů přes připojeného poskytovatele.
      </p>
    </div>

    <!-- Provider-neutral disclaimer: netvrdíme právní účinek ani hotové živé podepisování. -->
    <div
      class="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm"
    >
      <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <p class="text-muted-foreground">
        Ověřený podpis probíhá přes
        <strong class="text-foreground">připojeného poskytovatele</strong>
        (např. BankID jako jeden z kanálů). Ostré podepisování se zapne až po dokončení napojení
        poskytovatele a smlouvy — do té doby jde o přípravu obálek a evidence.
      </p>
    </div>

    <Tabs default-value="envelopes" class="mt-6">
      <TabsList>
        <TabsTrigger value="envelopes">Obálky</TabsTrigger>
        <TabsTrigger value="providers">Poskytovatel podpisu</TabsTrigger>
      </TabsList>

      <TabsContent value="envelopes">
        <!-- Toolbar: filtr stavu + akce -->
        <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <Label for="signing-status-filter" class="text-sm text-muted-foreground">Stav</Label>
            <Select v-model="statusFilter">
              <SelectTrigger id="signing-status-filter" class="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem v-for="s in STATUS_ORDER" :key="s" :value="s">
                  {{ STATUS_LABELS[s] }}
                </SelectItem>
              </SelectContent>
            </Select>
            <span class="text-sm text-muted-foreground">
              {{ visibleEnvelopes.length }} z {{ envelopes.length }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="icon" title="Obnovit" :disabled="loading" @click="load">
              <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
            </Button>
            <Button variant="coral" @click="openCreate">
              <Plus class="h-4 w-4" /> Nová obálka
            </Button>
          </div>
        </div>

        <div v-if="loading" class="mt-12 flex justify-center">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>

        <div
          v-else-if="loadError"
          class="mt-6 rounded-2xl border border-border bg-card p-8 text-center"
        >
          <p class="text-sm text-muted-foreground">Podpisy se nepodařilo načíst.</p>
          <Button variant="outline" class="mt-4" @click="load">Zkusit znovu</Button>
        </div>

        <div
          v-else-if="visibleEnvelopes.length === 0"
          class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
        >
          <FileSignature class="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 class="mt-4 text-lg font-semibold">Žádné obálky v tomto stavu</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Založte novou podpisovou obálku, nebo změňte filtr stavu.
          </p>
          <Button variant="coral" class="mt-4" @click="openCreate">
            <Plus class="h-4 w-4" /> Nová obálka
          </Button>
        </div>

        <div v-else class="mt-6 space-y-3">
          <button
            v-for="envelope in visibleEnvelopes"
            :key="envelope.id"
            type="button"
            class="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
            :data-testid="`envelope-${envelope.id}`"
            @click="openDetail(envelope)"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="truncate font-semibold">{{ envelope.documentName }}</div>
                <div class="mt-0.5 text-sm text-muted-foreground">
                  {{ docTypeLabel(envelope.documentType) }} · {{ envelope.signer.name }}
                  <template v-if="envelope.externalReference">
                    · {{ envelope.externalReference }}</template
                  >
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{{ envelope.providerLabel ?? envelope.provider }}</Badge>
                <Badge
                  :variant="STATUS_VARIANTS[envelope.status]"
                  :data-testid="`status-${envelope.id}`"
                >
                  {{ statusLabel(envelope.status) }}
                </Badge>
              </div>
            </div>
            <div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>Vytvořeno: {{ formatDateTime(envelope.createdAt) }}</span>
              <span v-if="envelope.sentAt">Odesláno: {{ formatDateTime(envelope.sentAt) }}</span>
              <span v-if="envelope.signedAt"
                >Podepsáno: {{ formatDateTime(envelope.signedAt) }}</span
              >
            </div>
          </button>
        </div>
      </TabsContent>

      <TabsContent value="providers">
        <SigningProviderSettings class="mt-4" />
      </TabsContent>
    </Tabs>

    <!-- Detail obálky + evidence -->
    <Dialog v-model:open="detailOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle class="pr-6">{{ detail?.documentName }}</DialogTitle>
          <DialogDescription>
            Evidence ověřeného podpisu přes {{ detail?.providerLabel ?? detail?.provider }}. Hodnoty
            jsou přehled stavu, ne potvrzení právního účinku.
          </DialogDescription>
        </DialogHeader>

        <div v-if="detail" class="space-y-4 text-sm">
          <div class="flex flex-wrap items-center gap-2">
            <Badge :variant="STATUS_VARIANTS[detail.status]" data-testid="detail-status">
              {{ statusLabel(detail.status) }}
            </Badge>
            <Badge variant="outline">{{ detail.providerLabel ?? detail.provider }}</Badge>
            <Badge variant="secondary">{{ docTypeLabel(detail.documentType) }}</Badge>
          </div>

          <dl class="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5">
            <dt class="text-muted-foreground">Externí reference</dt>
            <dd>{{ detail.externalReference ?? '—' }}</dd>
            <dt class="text-muted-foreground">Podepisující</dt>
            <dd>{{ detail.signer.name }}</dd>
            <dt class="text-muted-foreground">E-mail</dt>
            <dd>{{ detail.signer.email ?? '—' }}</dd>
            <dt class="text-muted-foreground">Telefon</dt>
            <dd>{{ detail.signer.phone ?? '—' }}</dd>
            <dt class="text-muted-foreground">Vytvořeno</dt>
            <dd>{{ formatDateTime(detail.createdAt) }}</dd>
            <dt class="text-muted-foreground">Odesláno</dt>
            <dd>{{ formatDateTime(detail.sentAt) }}</dd>
            <template v-if="detail.providerReference">
              <dt class="text-muted-foreground">Reference poskytovatele</dt>
              <dd data-testid="provider-reference">{{ detail.providerReference }}</dd>
            </template>
            <dt class="text-muted-foreground">Podepsáno</dt>
            <dd>{{ formatDateTime(detail.signedAt) }}</dd>
            <dt class="text-muted-foreground">Platnost do</dt>
            <dd>{{ formatDateTime(detail.expiresAt) }}</dd>
          </dl>

          <div class="space-y-1.5">
            <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Evidence hash
            </div>
            <code
              class="block break-all rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs"
              data-testid="evidence-hash"
            >
              {{ detail.evidenceHash ?? '—' }}
            </code>
          </div>

          <div class="space-y-2">
            <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Průběh (evidence)
            </div>
            <p v-if="evidenceLoading" class="text-xs text-muted-foreground">Načítám evidenci…</p>
            <ol v-else-if="evidence?.entries.length" class="space-y-2">
              <li
                v-for="(entry, i) in evidence.entries"
                :key="i"
                class="rounded-md border border-border px-3 py-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium">{{ entry.detail ?? entry.event }}</span>
                  <span class="text-xs text-muted-foreground">{{
                    formatDateTime(entry.timestamp)
                  }}</span>
                </div>
                <code
                  v-if="entry.hash"
                  class="mt-1 block break-all text-[11px] text-muted-foreground"
                >
                  {{ entry.hash }}
                </code>
              </li>
            </ol>
            <p v-else class="text-xs text-muted-foreground">Zatím žádné kroky evidence.</p>
          </div>

          <!-- Runtime seam: odeslat přes konkrétní provider connection (Ready) — jen API režim. -->
          <div
            v-if="canSend(detail) && apiMode && matchingConnections.length"
            class="space-y-1.5"
            data-testid="send-connection-picker"
          >
            <Label for="send-connection">Odeslat přes konfiguraci poskytovatele</Label>
            <Select v-model="selectedConnectionId">
              <SelectTrigger id="send-connection"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem :value="FOUNDATION_SEND">
                  Bez konkrétní konfigurace (základní odeslání)
                </SelectItem>
                <SelectItem
                  v-for="c in matchingConnections"
                  :key="c.id"
                  :value="c.id"
                  :disabled="c.status !== 'ready'"
                >
                  {{ c.name }} — {{ connStatusLabel(c.status) }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Konfigurace ve stavu Připraveno odešle přes poskytovatele; bez výběru proběhne
              základní odeslání.
            </p>
          </div>
        </div>

        <DialogFooter class="flex-wrap gap-2">
          <Button
            v-if="detail && canCancel(detail)"
            type="button"
            variant="ghost"
            class="text-destructive"
            :disabled="actionBusy"
            @click="doCancel(detail)"
          >
            <Ban class="h-4 w-4" /> Zrušit
          </Button>
          <Button
            v-if="detail && canSend(detail)"
            type="button"
            variant="coral"
            :disabled="actionBusy"
            @click="doSend(detail)"
          >
            <Send class="h-4 w-4" /> Odeslat k podpisu
          </Button>
          <Button type="button" variant="outline" @click="detailOpen = false">Zavřít</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Nová obálka -->
    <Dialog v-model:open="createOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nová podpisová obálka</DialogTitle>
          <DialogDescription>
            Připravte dokument k ověřenému podpisu přes připojeného poskytovatele. Odeslání ke
            skutečnému podpisu proběhne, až bude poskytovatel napojený.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="sig-doc-file">Dokument k podpisu</Label>
            <Input
              id="sig-doc-file"
              type="file"
              accept="application/pdf,.pdf,image/jpeg,image/png"
              @change="onDocumentSelected"
            />
            <p class="text-xs text-muted-foreground">
              Z dokumentu se spočítá otisk pro evidenci podpisu. Samotný soubor se nikam neodesílá.
            </p>
          </div>
          <div class="space-y-1.5">
            <Label for="sig-doc-name">Název dokumentu</Label>
            <Input
              id="sig-doc-name"
              v-model="form.documentName"
              placeholder="např. Smlouva o cateringu"
            />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label for="sig-doc-type">Typ dokumentu</Label>
              <Select v-model="form.documentType">
                <SelectTrigger id="sig-doc-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="t in SIGNATURE_DOCUMENT_TYPES" :key="t.key" :value="t.key">
                    {{ t.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label for="sig-provider">Poskytovatel / kanál</Label>
              <Select v-model="form.provider">
                <SelectTrigger id="sig-provider"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="p in SIGNATURE_PROVIDERS" :key="p.key" :value="p.key">
                    {{ p.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="sig-ext-ref">Externí reference (volitelné)</Label>
            <Input
              id="sig-ext-ref"
              v-model="form.externalReference"
              placeholder="např. ORDER-2026-0142"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="sig-signer-name">Podepisující osoba</Label>
            <Input id="sig-signer-name" v-model="form.signerName" placeholder="Jméno a příjmení" />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label for="sig-signer-email">E-mail (volitelné)</Label>
              <Input id="sig-signer-email" v-model="form.signerEmail" type="email" />
            </div>
            <div class="space-y-1.5">
              <Label for="sig-signer-phone">Telefon (volitelné)</Label>
              <Input id="sig-signer-phone" v-model="form.signerPhone" />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="sig-expires">Platnost do (volitelné)</Label>
            <Input id="sig-expires" v-model="form.expiresAt" type="date" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" @click="createOpen = false">Zrušit</Button>
          <Button
            type="button"
            variant="coral"
            :disabled="creating || hashing"
            @click="submitCreate"
          >
            <Loader2 v-if="creating || hashing" class="h-4 w-4 animate-spin" />
            <Plus v-else class="h-4 w-4" />
            Vytvořit obálku
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
