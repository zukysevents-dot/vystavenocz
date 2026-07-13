<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { KeyRound, Pencil, Trash2, Save, Loader2, ShieldCheck } from 'lucide-vue-next'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { ApiError, isApiMode } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import {
  useVerifiedSigning,
  type SigningConnectionMode,
  type SigningConnectionStatus,
  type SigningProviderCatalogItem,
  type SigningProviderConnection,
  type SigningSecretsStatus,
  type UpsertSigningProviderConnectionRequest,
} from '@/composables/useVerifiedSigning'

const auth = useAuthStore()
const signing = useVerifiedSigning()
const apiMode = isApiMode()
// Nastavení poskytovatelů (katalog + credentialy) je manažerská akce; provoz podpisů (obálky) je samostatný.
const canManage = computed(() => auth.hasRole('Owner', 'Admin', 'Manager'))

const providers = ref<SigningProviderCatalogItem[]>([])
const connections = ref<SigningProviderConnection[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const providerDialogOpen = ref(false)
const dialogProvider = ref<SigningProviderCatalogItem | null>(null)
const connectionSaving = ref(false)
const connectionForm = reactive({
  id: null as string | null,
  name: '',
  mode: 'sandbox' as SigningConnectionMode,
  status: 'draft' as SigningConnectionStatus,
  configuredFields: [] as string[],
})

const secretStatus = ref<SigningSecretsStatus | null>(null)
const secretLoading = ref(false)
const secretError = ref<string | null>(null)
const secretInputs = reactive<Record<string, string>>({})
const secretBusyField = ref<string | null>(null)

const STATUS_LABELS: Record<SigningConnectionStatus, string> = {
  draft: 'Rozpracováno',
  awaiting_credentials: 'Čeká na údaje',
  ready: 'Připraveno',
  disabled: 'Vypnuto',
}

function statusLabel(status: SigningConnectionStatus): string {
  return STATUS_LABELS[status]
}
function modeLabel(mode: SigningConnectionMode): string {
  return mode === 'production' ? 'Produkce' : 'Sandbox'
}

async function load(): Promise<void> {
  if (!apiMode) return
  loading.value = true
  error.value = null
  try {
    ;[providers.value, connections.value] = await Promise.all([
      signing.listSigningProviders(),
      loadConnections(),
    ])
  } catch (e) {
    error.value = signingErrorMessage(e)
    providers.value = []
    connections.value = []
  } finally {
    loading.value = false
  }
}

async function loadConnections(): Promise<SigningProviderConnection[]> {
  try {
    return await signing.listProviderConnections()
  } catch {
    return []
  }
}

onMounted(load)

function connectionsForProvider(key: string): SigningProviderConnection[] {
  return connections.value.filter((c) => c.providerKey === key)
}

const dialogCredentialFields = computed<string[]>(
  () => dialogProvider.value?.credentialFields ?? [],
)
// Do checklistu „Potřebné údaje" patří jen NE-tajná setup pole; tajemství řeší trezor.
const dialogChecklistFields = computed<string[]>(() =>
  (dialogProvider.value?.setupFields ?? []).filter(
    (f) => !dialogCredentialFields.value.includes(f),
  ),
)
const showCredentialVault = computed<boolean>(
  () => dialogCredentialFields.value.length > 0 || (secretStatus.value?.fields.length ?? 0) > 0,
)

function resetConnectionForm(): void {
  connectionForm.id = null
  connectionForm.name = ''
  connectionForm.mode = 'sandbox'
  connectionForm.status = 'draft'
  connectionForm.configuredFields = []
  clearSecretVaultState()
}

function clearSecretVaultState(): void {
  secretStatus.value = null
  secretError.value = null
  secretLoading.value = false
  secretBusyField.value = null
  for (const key of Object.keys(secretInputs)) delete secretInputs[key]
}

function openProviderDialog(provider: SigningProviderCatalogItem): void {
  dialogProvider.value = provider
  resetConnectionForm()
  providerDialogOpen.value = true
}

function editConnection(conn: SigningProviderConnection): void {
  connectionForm.id = conn.id
  connectionForm.name = conn.name
  connectionForm.mode = conn.mode
  connectionForm.status = conn.status
  connectionForm.configuredFields = [...conn.configuredFields]
  clearSecretVaultState()
  void loadSecretStatus(conn.id)
}

function toggleConfiguredField(field: string, on: boolean | 'indeterminate' | undefined): void {
  if (on === true) {
    if (!connectionForm.configuredFields.includes(field))
      connectionForm.configuredFields = [...connectionForm.configuredFields, field]
    return
  }
  connectionForm.configuredFields = connectionForm.configuredFields.filter((f) => f !== field)
}

async function saveConnection(): Promise<void> {
  if (!dialogProvider.value || !canManage.value) return
  const name = connectionForm.name.trim()
  if (!name) {
    toast.error('Zadejte název konfigurace.')
    return
  }
  connectionSaving.value = true
  try {
    // Payload NIKDY nenese tajné hodnoty — jen metadata a checklist připravených NE-tajných polí.
    const payload: UpsertSigningProviderConnectionRequest = {
      providerKey: dialogProvider.value.key,
      name,
      mode: connectionForm.mode,
      status: connectionForm.status,
      configuredFields: connectionForm.configuredFields.filter((f) =>
        dialogProvider.value?.setupFields.includes(f),
      ),
    }
    if (connectionForm.id) {
      await signing.updateProviderConnection(connectionForm.id, payload)
      toast.success('Konfigurace uložena.')
    } else {
      await signing.createProviderConnection(payload)
      toast.success('Konfigurace vytvořena.')
    }
    connections.value = await loadConnections()
    resetConnectionForm()
  } catch (e) {
    toast.error(signingErrorMessage(e))
  } finally {
    connectionSaving.value = false
  }
}

async function deleteConnection(conn: SigningProviderConnection): Promise<void> {
  if (!canManage.value) return
  connectionSaving.value = true
  try {
    await signing.deleteProviderConnection(conn.id)
    if (connectionForm.id === conn.id) resetConnectionForm()
    connections.value = await loadConnections()
    toast.success('Konfigurace smazána.')
  } catch (e) {
    toast.error(signingErrorMessage(e))
  } finally {
    connectionSaving.value = false
  }
}

// --- Credential trezor ---

async function loadSecretStatus(connectionId: string): Promise<void> {
  secretLoading.value = true
  secretError.value = null
  try {
    secretStatus.value = await signing.listConnectionSecrets(connectionId)
  } catch (e) {
    secretStatus.value = null
    secretError.value = signingErrorMessage(e)
  } finally {
    secretLoading.value = false
  }
}

async function saveSecret(field: string): Promise<void> {
  if (!connectionForm.id || !canManage.value) return
  const value = (secretInputs[field] ?? '').trim()
  if (!value) {
    toast.error('Zadejte hodnotu klíče.')
    return
  }
  secretBusyField.value = field
  try {
    secretStatus.value = await signing.storeConnectionSecret(connectionForm.id, field, value)
    secretInputs[field] = '' // po úspěšném uložení vstup vždy vyčistit (nikdy neponechat hodnotu v UI)
    toast.success('Klíč uložen do zabezpečeného trezoru.')
  } catch (e) {
    toast.error(signingErrorMessage(e))
  } finally {
    secretBusyField.value = null
  }
}

async function deleteSecret(field: string): Promise<void> {
  if (!connectionForm.id || !canManage.value) return
  secretBusyField.value = field
  try {
    await signing.deleteConnectionSecret(connectionForm.id, field)
    secretInputs[field] = ''
    await loadSecretStatus(connectionForm.id)
    await maybeDowngradeAfterCredentialRemoval()
    toast.success('Klíč odstraněn z trezoru.')
  } catch (e) {
    toast.error(signingErrorMessage(e))
  } finally {
    secretBusyField.value = null
  }
}

async function revokeAllSecrets(): Promise<void> {
  if (!connectionForm.id || !canManage.value) return
  secretBusyField.value = '__all__'
  try {
    await signing.revokeConnectionSecrets(connectionForm.id)
    for (const key of Object.keys(secretInputs)) secretInputs[key] = ''
    await loadSecretStatus(connectionForm.id)
    await maybeDowngradeAfterCredentialRemoval()
    toast.success('Všechny klíče byly z trezoru revokovány.')
  } catch (e) {
    toast.error(signingErrorMessage(e))
  } finally {
    secretBusyField.value = null
  }
}

// Ready vyžaduje kompletní credential set → po odebrání klíče degradujeme konfiguraci na „čeká na údaje".
async function maybeDowngradeAfterCredentialRemoval(): Promise<void> {
  const id = connectionForm.id
  if (!id || connectionForm.status !== 'ready') return
  if (secretStatus.value?.allRequiredPresent) return
  const conn = connections.value.find((c) => c.id === id)
  if (!conn) return
  try {
    await signing.updateProviderConnection(id, {
      providerKey: conn.providerKey,
      name: conn.name,
      mode: conn.mode,
      status: 'awaiting_credentials',
      configuredFields: conn.configuredFields,
    })
    connectionForm.status = 'awaiting_credentials'
    connections.value = await loadConnections()
    toast.info('Konfigurace přepnuta na „Čeká na údaje" — chybí klíč v trezoru.')
  } catch {
    // best-effort; klíč je odstraněný i kdyby se stav nepřepsal
  }
}

function secretUpdatedAtLabel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('cs-CZ')
}

function connectionVaultSummary(conn: SigningProviderConnection): {
  stored: number
  required: number
} {
  return {
    stored: conn.storedCredentialFields?.length ?? 0,
    required: conn.requiredCredentialFields?.length ?? 0,
  }
}

function signingErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.status === 403)
    return 'Modul Ověřené podpisy není povolený nebo nemáte oprávnění.'
  if (e instanceof ApiError && e.status === 503)
    return 'Zabezpečené ukládání tajných klíčů není nastavené. Obraťte se na správce.'
  if (e instanceof ApiError && e.status === 422) return e.message
  if (e instanceof ApiError && e.status === 0) return 'Připojení se nezdařilo. Zkuste to znovu.'
  return 'Nastavení poskytovatelů se nepodařilo načíst.'
}
</script>

<template>
  <div data-testid="signing-providers">
    <!-- Mimo API režim nelze bezpečně spravovat credentialy — trezor žije na backendu. -->
    <div
      v-if="!apiMode"
      class="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
    >
      Nastavení poskytovatelů podpisů a zabezpečené uložení klíčů jsou dostupné v online aplikaci se
      zapnutým modulem Ověřené podpisy. V náhledu lze zobrazit jen ukázkové žádosti.
    </div>

    <template v-else>
      <div class="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p class="text-muted-foreground">
          Napojte poskytovatele ověřených podpisů.
          <strong class="text-foreground">BankID</strong> je připravené k napojení — ostrý podpis se
          zapne až po smlouvě s poskytovatelem a doplnění přístupových údajů. Uložení klíče podpis
          nespouští.
        </p>
      </div>

      <div v-if="loading" class="mt-6 flex justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <div
        v-else-if="error"
        class="mt-6 rounded-xl border border-border bg-card p-6 text-center text-sm"
      >
        <p class="text-muted-foreground">{{ error }}</p>
        <Button variant="outline" class="mt-4" @click="load">Zkusit znovu</Button>
      </div>

      <div v-else class="mt-6 grid gap-3 sm:grid-cols-2">
        <div
          v-for="provider in providers"
          :key="provider.key"
          class="rounded-xl border border-border bg-card p-4"
          :data-testid="`signing-provider-${provider.key}`"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="font-semibold">{{ provider.name }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">{{ provider.category }}</div>
            </div>
            <Badge :variant="provider.isOperational ? 'secondary' : 'outline'">
              {{ provider.isOperational ? 'Aktivní' : 'Připraveno k napojení' }}
            </Badge>
          </div>
          <p class="mt-2 text-xs text-muted-foreground">{{ provider.notes }}</p>
          <ul class="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <li v-if="provider.requiresPartnerContract">• Vyžaduje smlouvu s poskytovatelem</li>
            <li v-if="provider.requiresCredentials">• Vyžaduje přístupové údaje</li>
            <li>{{ connectionsForProvider(provider.key).length }} konfigurací</li>
          </ul>
          <Button
            variant="outline"
            size="sm"
            class="mt-3"
            :disabled="!canManage"
            @click="openProviderDialog(provider)"
          >
            Nastavit
          </Button>
        </div>
      </div>
    </template>

    <!-- Dialog konfigurace + credential trezor -->
    <Dialog v-model:open="providerDialogOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nastavit {{ dialogProvider?.name }}</DialogTitle>
          <DialogDescription>
            Konfigurace nese jen metadata a checklist připravených údajů. Tajné klíče vložíte do
            zabezpečeného trezoru — hodnoty se nikdy nezobrazí a podpis se tím nespouští.
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
                  <span>{{ modeLabel(conn.mode) }}</span>
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
                <Badge variant="outline">{{ statusLabel(conn.status) }}</Badge>
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
              <Label for="sign-conn-name">Název konfigurace</Label>
              <Input
                id="sign-conn-name"
                v-model="connectionForm.name"
                placeholder="např. BankID produkce"
              />
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="sign-conn-mode">Režim</Label>
                <Select
                  :model-value="connectionForm.mode"
                  @update:model-value="(v) => (connectionForm.mode = v as SigningConnectionMode)"
                >
                  <SelectTrigger id="sign-conn-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Produkce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5">
                <Label for="sign-conn-status">Stav</Label>
                <Select
                  :model-value="connectionForm.status"
                  @update:model-value="
                    (v) => (connectionForm.status = v as SigningConnectionStatus)
                  "
                >
                  <SelectTrigger id="sign-conn-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rozpracováno</SelectItem>
                    <SelectItem value="awaiting_credentials">Čeká na údaje</SelectItem>
                    <SelectItem value="ready">Připraveno</SelectItem>
                    <SelectItem value="disabled">Vypnuto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div v-if="dialogChecklistFields.length" class="space-y-2">
              <Label>Potřebné údaje (bez tajných klíčů)</Label>
              <p class="text-xs text-muted-foreground">
                Zaškrtněte, které nastavovací údaje máte připravené. Tajné klíče sem nepatří — ty
                vložíte do trezoru níže.
              </p>
              <div
                v-for="field in dialogChecklistFields"
                :key="field"
                class="flex items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <Checkbox
                  :id="`sign-conn-field-${field}`"
                  :model-value="connectionForm.configuredFields.includes(field)"
                  @update:model-value="(v) => toggleConfiguredField(field, v)"
                />
                <Label :for="`sign-conn-field-${field}`" class="flex-1 text-sm font-medium">{{
                  field
                }}</Label>
              </div>
            </div>

            <!-- Zabezpečený trezor credentialů -->
            <div
              v-if="showCredentialVault"
              class="space-y-2 rounded-md border border-border bg-muted/30 p-3"
              data-testid="signing-credential-vault"
            >
              <div class="flex items-center gap-2">
                <KeyRound class="h-4 w-4 text-muted-foreground" />
                <Label class="text-sm font-semibold">Zabezpečené uložení klíčů</Label>
              </div>
              <p class="text-xs text-muted-foreground">
                Klíče se ukládají zašifrovaně a už se nikdy nezobrazí. Uložení klíče nespouští
                podpis — ostrý podpis zapne až napojený poskytovatel a smlouva.
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
                    :data-testid="`signing-secret-${fieldStatus.fieldName}`"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <Label
                        :for="`signing-secret-input-${fieldStatus.fieldName}`"
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
                          :data-testid="`signing-secret-state-${fieldStatus.fieldName}`"
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
                        :id="`signing-secret-input-${fieldStatus.fieldName}`"
                        v-model="secretInputs[fieldStatus.fieldName]"
                        type="password"
                        autocomplete="off"
                        class="text-xs"
                        :placeholder="
                          fieldStatus.hasSecret
                            ? 'Nová hodnota pro rotaci klíče'
                            : 'Vložte hodnotu klíče'
                        "
                        :disabled="!canManage || secretBusyField === fieldStatus.fieldName"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        :disabled="
                          !canManage ||
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
                        :disabled="!canManage || secretBusyField !== null"
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
                      :disabled="!canManage || secretBusyField !== null"
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
            :disabled="connectionSaving || !canManage"
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
