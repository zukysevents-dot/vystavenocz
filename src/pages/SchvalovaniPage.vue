<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LoadError from '@/components/app/LoadError.vue'
import { toast } from '@/components/ui/sonner'
import { useApprovals } from '@/composables/useApprovals'
import { ApiError, isApiMode } from '@/lib/http'
import type { ApprovalRequest, ApprovalSettings, ApprovalStatus, ApprovalType } from '@/lib/types'

const apiMode = isApiMode()
const approvals = useApprovals()

const loading = ref(true)
const loadError = ref(false)
const savingSettings = ref(false)
const resolvingId = ref<string | null>(null)
const status = ref<ApprovalStatus>('Pending')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const items = ref<ApprovalRequest[]>([])

const settingsForm = reactive<Record<keyof ApprovalSettings, string>>({
  stornoLimit: '',
  writeOffLimit: '',
  stocktakeLimit: '',
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const STATUS_OPTIONS: Array<{ value: ApprovalStatus; label: string }> = [
  { value: 'Pending', label: 'Čeká' },
  { value: 'Approved', label: 'Schválené' },
  { value: 'Rejected', label: 'Zamítnuté' },
]

const TYPE_LABEL: Record<ApprovalType, string> = {
  SaleStorno: 'Storno prodeje',
  StockIssue: 'Výdej / odpis skladu',
  Stocktake: 'Inventura',
}

function applySettings(settings: ApprovalSettings): void {
  settingsForm.stornoLimit = formatInput(settings.stornoLimit)
  settingsForm.writeOffLimit = formatInput(settings.writeOffLimit)
  settingsForm.stocktakeLimit = formatInput(settings.stocktakeLimit)
}

function formatInput(value: number | null): string {
  return value == null ? '' : String(value)
}

function parseLimit(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatMoney(value: number): string {
  return value.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function actorName(request: ApprovalRequest): string {
  return request.requestedByName ?? 'Neznámý uživatel'
}

async function load(targetPage = page.value): Promise<void> {
  if (!apiMode) {
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = false
  try {
    const [settings, list] = await Promise.all([
      approvals.settings(),
      approvals.list({ page: targetPage, pageSize, status: status.value }),
    ])
    applySettings(settings)
    items.value = list.items
    total.value = list.total
    page.value = list.page
  } catch (e) {
    loadError.value = true
    console.warn('Načtení schvalování selhalo:', e)
  } finally {
    loading.value = false
  }
}

async function saveSettings(): Promise<void> {
  savingSettings.value = true
  try {
    const saved = await approvals.updateSettings({
      stornoLimit: parseLimit(settingsForm.stornoLimit),
      writeOffLimit: parseLimit(settingsForm.writeOffLimit),
      stocktakeLimit: parseLimit(settingsForm.stocktakeLimit),
    })
    applySettings(saved)
    toast.success('Limity schvalování uloženy.')
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) toast.error('Zkontrolujte částky limitů.')
    else toast.error('Limity se nepodařilo uložit.')
    console.error(e)
  } finally {
    savingSettings.value = false
  }
}

function selectStatus(next: ApprovalStatus): void {
  if (status.value === next) return
  status.value = next
  load(1)
}

async function approve(id: string): Promise<void> {
  resolvingId.value = id
  try {
    await approvals.approve(id)
    toast.success('Žádost schválena a akce provedena.')
    await load(page.value)
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) toast.error('Žádost už byla vyřízena.')
    else toast.error('Schválení selhalo.')
    console.error(e)
  } finally {
    resolvingId.value = null
  }
}

async function reject(id: string): Promise<void> {
  resolvingId.value = id
  try {
    await approvals.reject(id, null)
    toast.success('Žádost zamítnuta.')
    await load(page.value)
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) toast.error('Žádost už byla vyřízena.')
    else toast.error('Zamítnutí selhalo.')
    console.error(e)
  } finally {
    resolvingId.value = null
  }
}

onMounted(() => load())
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <ShieldCheck class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Schvalování teď není dostupné</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Schvalování</h1>
          <p class="mt-1 text-muted-foreground">
            Fronta storen, odpisů a inventur, které překročily nastavený limit.
          </p>
        </div>
        <Button variant="outline" :disabled="loading" @click="load(1)">
          <RefreshCw class="h-4 w-4" /> Obnovit
        </Button>
      </div>

      <div class="mt-6 rounded-xl border border-border bg-card p-4">
        <div class="grid gap-3 md:grid-cols-4">
          <div class="space-y-1.5">
            <Label for="approval-storno">Limit storna</Label>
            <Input
              id="approval-storno"
              v-model="settingsForm.stornoLimit"
              inputmode="decimal"
              placeholder="vypnuto"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="approval-write-off">Limit výdeje/odpisu</Label>
            <Input
              id="approval-write-off"
              v-model="settingsForm.writeOffLimit"
              inputmode="decimal"
              placeholder="vypnuto"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="approval-stocktake">Limit inventury</Label>
            <Input
              id="approval-stocktake"
              v-model="settingsForm.stocktakeLimit"
              inputmode="decimal"
              placeholder="vypnuto"
            />
          </div>
          <div class="flex items-end">
            <Button class="w-full" :disabled="savingSettings" @click="saveSettings">
              <Loader2 v-if="savingSettings" class="h-4 w-4 animate-spin" />
              Uložit limity
            </Button>
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          v-for="option in STATUS_OPTIONS"
          :key="option.value"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            status === option.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="selectStatus(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <LoadError v-else-if="loadError" class="mt-6" :retrying="loading" @retry="load()" />

      <div
        v-else-if="!items.length"
        class="mt-6 rounded-xl border border-border bg-card p-10 text-center text-muted-foreground"
      >
        <ShieldCheck class="mx-auto h-10 w-10" />
        <p class="mt-3 font-semibold text-foreground">Žádné žádosti v tomhle stavu</p>
      </div>

      <template v-else>
        <div class="mt-6 space-y-3">
          <article
            v-for="request in items"
            :key="request.id"
            class="rounded-xl border border-border bg-card p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-base font-semibold">{{ request.summary }}</span>
                  <span class="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {{ TYPE_LABEL[request.type] }}
                  </span>
                </div>
                <div class="mt-1 text-sm text-muted-foreground">
                  {{ actorName(request) }} · {{ formatDateTime(request.createdAt) }}
                </div>
              </div>
              <div class="text-right">
                <div class="font-semibold tabular-nums">
                  {{ formatMoney(request.estimatedValue) }}
                </div>
                <div v-if="request.resolvedAt" class="text-xs text-muted-foreground">
                  {{ request.resolvedByName ?? 'Vyřízeno' }} ·
                  {{ formatDateTime(request.resolvedAt) }}
                </div>
              </div>
            </div>

            <div v-if="request.status === 'Pending'" class="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                :disabled="resolvingId === request.id"
                @click="reject(request.id)"
              >
                <XCircle class="h-4 w-4" /> Zamítnout
              </Button>
              <Button :disabled="resolvingId === request.id" @click="approve(request.id)">
                <Loader2 v-if="resolvingId === request.id" class="h-4 w-4 animate-spin" />
                <CheckCircle2 v-else class="h-4 w-4" />
                Schválit
              </Button>
            </div>
          </article>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <div class="text-sm text-muted-foreground">
            Strana {{ page }} / {{ totalPages }} · {{ total }} žádostí
          </div>
          <div class="flex gap-2">
            <Button variant="outline" :disabled="loading || page <= 1" @click="load(page - 1)">
              Předchozí
            </Button>
            <Button
              variant="outline"
              :disabled="loading || page >= totalPages"
              @click="load(page + 1)"
            >
              Další
            </Button>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
