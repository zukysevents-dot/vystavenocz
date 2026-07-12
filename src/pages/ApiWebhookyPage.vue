<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { History, KeyRound, Loader2, Plus, Send, Trash2, Webhook } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
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
import SecretRevealDialog from '@/components/settings/SecretRevealDialog.vue'
import { ApiError, isApiMode } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { API_TOKEN_SCOPES, useApiTokens, type ApiToken } from '@/composables/useApiTokens'
import {
  WEBHOOK_EVENTS,
  useWebhooks,
  type WebhookDelivery,
  type WebhookSubscription,
} from '@/composables/useWebhooks'

const auth = useAuthStore()
const tokensApi = useApiTokens()
const webhooksApi = useWebhooks()

const apiMode = isApiMode()
// Backend gate je integrations.api (jen Owner/Admin) + modul integrations; UI to zrcadlí, backend vynucuje vždy.
const available = computed(
  () => apiMode && auth.hasModule('integrations') && auth.hasRole('Owner', 'Admin'),
)

const loading = ref(true)
const tokens = ref<ApiToken[]>([])
const subscriptions = ref<WebhookSubscription[]>([])

// --- Jednorázové zobrazení tajné hodnoty (token / signing secret) ---
const reveal = reactive({ open: false, title: '', description: '', secret: '' })

// --- API tokeny ---
const tokenDialogOpen = ref(false)
const tokenSubmitting = ref(false)
const tokenForm = reactive({ name: '', scopes: [] as string[], expiresAt: '' })
const revokeTokenTarget = ref<ApiToken | null>(null)
const revoking = ref(false)

// --- Webhooky ---
const webhookDialogOpen = ref(false)
const webhookSubmitting = ref(false)
const editingWebhook = ref<WebhookSubscription | null>(null)
const webhookForm = reactive({ url: '', events: [] as string[], isEnabled: true })
const deleteWebhookTarget = ref<WebhookSubscription | null>(null)
const deletingWebhook = ref(false)
const testingId = ref<string | null>(null)

// --- Historie doručení ---
const historyFor = ref<WebhookSubscription | null>(null)
const historyLoading = ref(false)
const historyPage = ref(1)
const historyTotal = ref(0)
const historyItems = ref<WebhookDelivery[]>([])

onMounted(async () => {
  if (!available.value) {
    loading.value = false
    return
  }
  await refresh()
  loading.value = false
})

async function refresh() {
  try {
    const [tokenList, subscriptionList] = await Promise.all([tokensApi.list(), webhooksApi.list()])
    tokens.value = tokenList
    subscriptions.value = subscriptionList
  } catch (error) {
    toast.error(errorMessage(error, 'Načtení API tokenů a webhooků se nezdařilo.'))
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Chybí oprávnění nebo je vypnutý modul Integrace.'
    if (error.status === 503)
      return 'Na serveru chybí šifrovací klíč (Integrations__SecretEncryptionKey) — kontaktujte správce.'
    return error.message || fallback
  }
  return fallback
}

function scopeLabel(scope: string): string {
  return API_TOKEN_SCOPES.find((s) => s.value === scope)?.label ?? scope
}

function eventLabel(event: string): string {
  return WEBHOOK_EVENTS.find((e) => e.value === event)?.label ?? event
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })
}

// --- API tokeny ---

function openNewToken() {
  Object.assign(tokenForm, { name: '', scopes: [], expiresAt: '' })
  tokenDialogOpen.value = true
}

// Nejdřívější platná expirace je zítra: backend validuje `> now`, takže „dnes" (půlnoc UTC) by spadlo na 422.
const minExpiry = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
})

function toggleTokenScope(scope: string, checked: boolean | 'indeterminate' | undefined) {
  tokenForm.scopes =
    checked === true
      ? [...new Set([...tokenForm.scopes, scope])]
      : tokenForm.scopes.filter((s) => s !== scope)
}

async function submitToken() {
  if (!tokenForm.name.trim()) return toast.error('Zadejte název tokenu.')
  if (tokenForm.scopes.length === 0) return toast.error('Vyberte alespoň jeden rozsah (scope).')
  tokenSubmitting.value = true
  try {
    const created = await tokensApi.create({
      name: tokenForm.name.trim(),
      scopes: tokenForm.scopes,
      expiresAt: tokenForm.expiresAt ? new Date(tokenForm.expiresAt).toISOString() : null,
    })
    tokenDialogOpen.value = false
    Object.assign(reveal, {
      open: true,
      title: 'API token vytvořen',
      description: `Token „${created.name}" pro napojení externího systému.`,
      secret: created.token,
    })
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error, 'Vytvoření tokenu se nezdařilo.'))
  } finally {
    tokenSubmitting.value = false
  }
}

async function confirmRevokeToken() {
  if (!revokeTokenTarget.value) return
  revoking.value = true
  try {
    await tokensApi.revoke(revokeTokenTarget.value.id)
    toast.success('Token zrušen — okamžitě přestal platit.')
    revokeTokenTarget.value = null
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error, 'Zrušení tokenu se nezdařilo.'))
  } finally {
    revoking.value = false
  }
}

// --- Webhooky ---

function openNewWebhook() {
  editingWebhook.value = null
  Object.assign(webhookForm, { url: '', events: [], isEnabled: true })
  webhookDialogOpen.value = true
}

function openEditWebhook(subscription: WebhookSubscription) {
  editingWebhook.value = subscription
  Object.assign(webhookForm, {
    url: subscription.url,
    events: [...subscription.events],
    isEnabled: subscription.isEnabled,
  })
  webhookDialogOpen.value = true
}

function toggleWebhookEvent(event: string, checked: boolean | 'indeterminate' | undefined) {
  webhookForm.events =
    checked === true
      ? [...new Set([...webhookForm.events, event])]
      : webhookForm.events.filter((e) => e !== event)
}

async function submitWebhook() {
  if (!webhookForm.url.trim().toLowerCase().startsWith('https://'))
    return toast.error('Zadejte platnou https:// adresu.')
  if (webhookForm.events.length === 0) return toast.error('Vyberte alespoň jeden event.')
  webhookSubmitting.value = true
  try {
    if (editingWebhook.value) {
      await webhooksApi.update(editingWebhook.value.id, {
        url: webhookForm.url.trim(),
        events: webhookForm.events,
        isEnabled: webhookForm.isEnabled,
      })
      toast.success('Webhook upraven.')
    } else {
      const created = await webhooksApi.create({
        url: webhookForm.url.trim(),
        events: webhookForm.events,
        isEnabled: webhookForm.isEnabled,
      })
      Object.assign(reveal, {
        open: true,
        title: 'Webhook vytvořen',
        description:
          'Signing secret pro ověření podpisu doručených webhooků (hlavička X-Vystaveno-Signature).',
        secret: created.secret,
      })
    }
    webhookDialogOpen.value = false
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error, 'Uložení webhooku se nezdařilo.'))
  } finally {
    webhookSubmitting.value = false
  }
}

async function toggleWebhookEnabled(subscription: WebhookSubscription, enabled: boolean) {
  try {
    await webhooksApi.update(subscription.id, {
      url: subscription.url,
      events: subscription.events,
      isEnabled: enabled,
    })
    subscription.isEnabled = enabled
    toast.success(enabled ? 'Webhook zapnut.' : 'Webhook vypnut.')
  } catch (error) {
    toast.error(errorMessage(error, 'Změna se nezdařila.'))
  }
}

async function confirmDeleteWebhook() {
  if (!deleteWebhookTarget.value) return
  deletingWebhook.value = true
  try {
    await webhooksApi.remove(deleteWebhookTarget.value.id)
    toast.success('Webhook smazán.')
    deleteWebhookTarget.value = null
    await refresh()
  } catch (error) {
    toast.error(errorMessage(error, 'Smazání se nezdařilo.'))
  } finally {
    deletingWebhook.value = false
  }
}

async function sendTest(subscription: WebhookSubscription) {
  testingId.value = subscription.id
  try {
    await webhooksApi.sendTest(subscription.id)
    toast.success(
      'Testovací event zařazen — doručí se do ~30 sekund. Výsledek uvidíte v historii doručení.',
    )
  } catch (error) {
    toast.error(errorMessage(error, 'Odeslání testovacího eventu se nezdařilo.'))
  } finally {
    testingId.value = null
  }
}

// --- Historie doručení ---

async function openHistory(subscription: WebhookSubscription) {
  historyFor.value = subscription
  historyPage.value = 1
  await loadHistory()
}

async function loadHistory() {
  if (!historyFor.value) return
  historyLoading.value = true
  try {
    const result = await webhooksApi.deliveries(historyFor.value.id, historyPage.value, 20)
    historyItems.value = result.items
    historyTotal.value = result.total
  } catch (error) {
    toast.error(errorMessage(error, 'Načtení historie doručení se nezdařilo.'))
  } finally {
    historyLoading.value = false
  }
}

const historyPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / 20)))

function goHistoryPage(delta: number) {
  historyPage.value += delta
  loadHistory()
}

function closeReveal() {
  reveal.open = false
  reveal.secret = '' // secret nedržet v reactive state po zavření
}

function deliveryBadgeVariant(status: WebhookDelivery['status']) {
  return status === 'Succeeded' ? 'default' : status === 'Failed' ? 'destructive' : 'secondary'
}

function deliveryStatusLabel(status: WebhookDelivery['status']): string {
  return status === 'Succeeded' ? 'Doručeno' : status === 'Failed' ? 'Selhalo' : 'Čeká'
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">API a webhooky</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Propojení Vystaveno s e-shopem, CRM nebo automatizací: API tokeny pro čtení dat a webhooky
        pro okamžité notifikace o změnách.
      </p>
    </div>

    <div
      v-if="!available"
      class="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground"
    >
      Správa API tokenů a webhooků je dostupná v API režimu se zapnutým modulem Integrace a rolí
      Vlastník nebo Admin.
    </div>

    <div v-else-if="loading" class="flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" /> Načítám…
    </div>

    <template v-else>
      <!-- API tokeny -->
      <section class="rounded-xl border border-border bg-card p-6" data-testid="api-tokens-card">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2
            class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <KeyRound class="h-4 w-4" /> API tokeny
          </h2>
          <Button type="button" size="sm" data-testid="new-token" @click="openNewToken">
            <Plus class="h-4 w-4" /> Nový token
          </Button>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          Token se zobrazí jen jednou při vytvoření. Externí systém ho posílá v hlavičce
          <code>Authorization: Bearer vst_…</code>.
        </p>

        <div
          v-if="tokens.length === 0"
          class="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
        >
          Zatím žádné tokeny. Vytvořte první pro napojení e-shopu nebo CRM.
        </div>
        <ul v-else class="mt-4 divide-y divide-border" data-testid="token-list">
          <li
            v-for="token in tokens"
            :key="token.id"
            class="flex flex-wrap items-center gap-3 py-3"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ token.name }}</span>
                <code class="rounded bg-muted px-1.5 py-0.5 text-xs">{{ token.tokenPrefix }}…</code>
              </div>
              <div class="mt-1 flex flex-wrap gap-1">
                <Badge
                  v-for="scope in token.scopes"
                  :key="scope"
                  variant="secondary"
                  class="text-xs"
                >
                  {{ scopeLabel(scope) }}
                </Badge>
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                Naposledy použit: {{ formatDate(token.lastUsedAt) }}
                <template v-if="token.expiresAt">
                  · Expirace: {{ formatDate(token.expiresAt) }}</template
                >
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-destructive"
              :data-testid="`revoke-token-${token.id}`"
              @click="revokeTokenTarget = token"
            >
              <Trash2 class="h-4 w-4" /> Zrušit
            </Button>
          </li>
        </ul>
      </section>

      <!-- Webhooky -->
      <section class="rounded-xl border border-border bg-card p-6" data-testid="webhooks-card">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2
            class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <Webhook class="h-4 w-4" /> Webhooky
          </h2>
          <Button type="button" size="sm" data-testid="new-webhook" @click="openNewWebhook">
            <Plus class="h-4 w-4" /> Nový webhook
          </Button>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          Na vaši https:// adresu pošleme podepsaný požadavek při každé vybrané události. Podpis
          ověříte signing secretem (zobrazí se jen při vytvoření).
        </p>

        <div
          v-if="subscriptions.length === 0"
          class="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
        >
          Zatím žádné webhooky.
        </div>
        <ul v-else class="mt-4 divide-y divide-border" data-testid="webhook-list">
          <li v-for="subscription in subscriptions" :key="subscription.id" class="py-3">
            <div class="flex flex-wrap items-center gap-3">
              <div class="min-w-0 flex-1">
                <code class="block truncate text-sm">{{ subscription.url }}</code>
                <div class="mt-1 flex flex-wrap gap-1">
                  <Badge
                    v-for="event in subscription.events"
                    :key="event"
                    variant="secondary"
                    class="text-xs"
                  >
                    {{ eventLabel(event) }}
                  </Badge>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Switch
                  :model-value="subscription.isEnabled"
                  :aria-label="subscription.isEnabled ? 'Vypnout webhook' : 'Zapnout webhook'"
                  @update:model-value="
                    (value) => toggleWebhookEnabled(subscription, value === true)
                  "
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="testingId === subscription.id || !subscription.isEnabled"
                  :title="!subscription.isEnabled ? 'Nejdřív webhook zapněte' : undefined"
                  :data-testid="`test-webhook-${subscription.id}`"
                  @click="sendTest(subscription)"
                >
                  <component
                    :is="testingId === subscription.id ? Loader2 : Send"
                    class="h-4 w-4"
                    :class="{ 'animate-spin': testingId === subscription.id }"
                  />
                  Test
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="openHistory(subscription)"
                >
                  <History class="h-4 w-4" /> Historie
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="openEditWebhook(subscription)"
                >
                  Upravit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="text-destructive"
                  @click="deleteWebhookTarget = subscription"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- Dialog: nový token -->
    <Dialog v-model:open="tokenDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nový API token</DialogTitle>
          <DialogDescription>
            Token umožní externímu systému číst vybraná data firmy. Zobrazí se jen jednou.
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitToken">
          <div class="space-y-1.5">
            <Label for="token-name">Název</Label>
            <Input
              id="token-name"
              v-model="tokenForm.name"
              placeholder="Např. E-shop Shoptet"
              maxlength="100"
            />
          </div>
          <div class="space-y-1.5">
            <Label>Rozsah přístupu (scopes)</Label>
            <label
              v-for="scope in API_TOKEN_SCOPES"
              :key="scope.value"
              class="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted/40"
            >
              <Checkbox
                :model-value="tokenForm.scopes.includes(scope.value)"
                @update:model-value="(checked) => toggleTokenScope(scope.value, checked)"
              />
              {{ scope.label }}
            </label>
          </div>
          <div class="space-y-1.5">
            <Label for="token-expiry">Expirace (nepovinné)</Label>
            <Input id="token-expiry" v-model="tokenForm.expiresAt" type="date" :min="minExpiry" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="tokenDialogOpen = false">Zrušit</Button>
            <Button type="submit" :disabled="tokenSubmitting" data-testid="submit-token">
              <Loader2 v-if="tokenSubmitting" class="h-4 w-4 animate-spin" />
              Vytvořit token
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog: webhook -->
    <Dialog v-model:open="webhookDialogOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingWebhook ? 'Upravit webhook' : 'Nový webhook' }}</DialogTitle>
          <DialogDescription>
            Zadejte https:// adresu vašeho systému a vyberte události, o kterých chcete vědět.
          </DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitWebhook">
          <div class="space-y-1.5">
            <Label for="webhook-url">URL</Label>
            <Input
              id="webhook-url"
              v-model="webhookForm.url"
              placeholder="https://muj-system.cz/webhooky/vystaveno"
              maxlength="2000"
            />
          </div>
          <div class="space-y-1.5">
            <Label>Události</Label>
            <div class="grid max-h-56 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
              <label
                v-for="event in WEBHOOK_EVENTS"
                :key="event.value"
                class="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted/40"
              >
                <Checkbox
                  :model-value="webhookForm.events.includes(event.value)"
                  @update:model-value="(checked) => toggleWebhookEvent(event.value, checked)"
                />
                {{ event.label }}
              </label>
            </div>
          </div>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              :model-value="webhookForm.isEnabled"
              aria-label="Webhook zapnutý"
              @update:model-value="(value) => (webhookForm.isEnabled = value === true)"
            />
            Zapnutý (události se doručují)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" @click="webhookDialogOpen = false"
              >Zrušit</Button
            >
            <Button type="submit" :disabled="webhookSubmitting" data-testid="submit-webhook">
              <Loader2 v-if="webhookSubmitting" class="h-4 w-4 animate-spin" />
              {{ editingWebhook ? 'Uložit' : 'Vytvořit webhook' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog: historie doručení -->
    <Dialog :open="historyFor !== null" @update:open="(value) => !value && (historyFor = null)">
      <DialogContent class="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historie doručení</DialogTitle>
          <DialogDescription>
            <code class="text-xs">{{ historyFor?.url }}</code> — doručení se opakuje s odstupem (1
            min → 12 h), po 6. neúspěchu je označeno jako selhané.
          </DialogDescription>
        </DialogHeader>

        <div
          v-if="historyLoading"
          class="flex items-center gap-2 p-4 text-sm text-muted-foreground"
        >
          <Loader2 class="h-4 w-4 animate-spin" /> Načítám…
        </div>
        <div
          v-else-if="historyItems.length === 0"
          class="p-4 text-center text-sm text-muted-foreground"
        >
          Zatím žádná doručení.
        </div>
        <ul
          v-else
          class="max-h-96 divide-y divide-border overflow-y-auto"
          data-testid="delivery-history"
        >
          <li
            v-for="delivery in historyItems"
            :key="delivery.id"
            class="flex flex-wrap items-center gap-2 py-2 text-sm"
          >
            <Badge :variant="deliveryBadgeVariant(delivery.status)">{{
              deliveryStatusLabel(delivery.status)
            }}</Badge>
            <span class="font-medium">{{ eventLabel(delivery.eventType) }}</span>
            <span class="text-xs text-muted-foreground">{{
              formatDate(delivery.lastAttemptAt ?? delivery.createdAt)
            }}</span>
            <span v-if="delivery.lastHttpStatus" class="text-xs text-muted-foreground"
              >HTTP {{ delivery.lastHttpStatus }}</span
            >
            <span class="text-xs text-muted-foreground">pokusů: {{ delivery.attemptCount }}</span>
            <span
              v-if="delivery.lastError"
              class="max-w-full truncate text-xs text-destructive"
              :title="delivery.lastError"
              >{{ delivery.lastError }}</span
            >
            <span
              v-if="delivery.status === 'Pending' && delivery.nextAttemptAt"
              class="text-xs text-muted-foreground"
            >
              další pokus: {{ formatDate(delivery.nextAttemptAt) }}
            </span>
          </li>
        </ul>

        <DialogFooter class="items-center sm:justify-between">
          <span class="text-xs text-muted-foreground"
            >Strana {{ historyPage }} z {{ historyPages }}</span
          >
          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="historyPage <= 1 || historyLoading"
              @click="goHistoryPage(-1)"
            >
              Předchozí
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="historyPage >= historyPages || historyLoading"
              @click="goHistoryPage(1)"
            >
              Další
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Potvrzení: revoke tokenu -->
    <AlertDialog
      :open="revokeTokenTarget !== null"
      @update:open="(value) => !value && (revokeTokenTarget = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zrušit token „{{ revokeTokenTarget?.name }}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Token okamžitě přestane platit a napojený systém ztratí přístup. Akci nelze vrátit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="revoking">Zpět</AlertDialogCancel>
          <AlertDialogAction
            :disabled="revoking"
            data-testid="confirm-revoke"
            @click="confirmRevokeToken"
          >
            <Loader2 v-if="revoking" class="h-4 w-4 animate-spin" />
            Zrušit token
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Potvrzení: smazání webhooku -->
    <AlertDialog
      :open="deleteWebhookTarget !== null"
      @update:open="(value) => !value && (deleteWebhookTarget = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat webhook?</AlertDialogTitle>
          <AlertDialogDescription>
            Doručování na <code class="text-xs">{{ deleteWebhookTarget?.url }}</code> okamžitě
            skončí. Historie doručení zůstane zachovaná.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deletingWebhook">Zpět</AlertDialogCancel>
          <AlertDialogAction :disabled="deletingWebhook" @click="confirmDeleteWebhook">
            <Loader2 v-if="deletingWebhook" class="h-4 w-4 animate-spin" />
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <SecretRevealDialog
      :open="reveal.open"
      :title="reveal.title"
      :description="reveal.description"
      :secret="reveal.secret"
      @close="closeReveal"
    />
  </div>
</template>
