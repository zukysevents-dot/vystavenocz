<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Repeat, Loader2, Search, Trash2, Play, Pause, Zap, UserPlus } from 'lucide-vue-next'
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
import {
  useRecurringInvoices,
  type RecurringInvoiceInput,
} from '@/composables/useRecurringInvoices'
import { useClients } from '@/composables/useClients'
import { ApiError } from '@/lib/http'
import { recurringModeLabel, recurringStatusLabel } from '@/lib/recurring'
import { formatCZK, formatDate } from '@/lib/invoice'
import type {
  RecurringInvoiceRun,
  RecurringInvoiceStatus,
  RecurringInvoiceTemplate,
  VatRate,
} from '@/lib/types'

const router = useRouter()
const api = useRecurringInvoices()
const { clients, load: loadClients } = useClients()

const templates = ref<RecurringInvoiceTemplate[]>([])
const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const busyId = ref<string | null>(null)
const dialogOpen = ref(false)
const quickClientOpen = ref(false)
const deleteTarget = ref<RecurringInvoiceTemplate | null>(null)

const vatRates: VatRate[] = [21, 12, 0]
const filterStatus = ref<RecurringInvoiceStatus | ''>('')
const search = ref('')

const statusVariant: Record<RecurringInvoiceStatus, 'default' | 'outline'> = {
  active: 'default',
  paused: 'outline',
}

const filtered = computed(() =>
  templates.value.filter((t) => {
    if (filterStatus.value && t.status !== filterStatus.value) return false
    const q = search.value.trim().toLowerCase()
    if (q && !`${t.name} ${t.clientName ?? ''}`.toLowerCase().includes(q)) return false
    return true
  }),
)

const clientName = (t: RecurringInvoiceTemplate): string =>
  t.clientName ?? clients.value.find((c) => c.id === t.clientId)?.name ?? '—'

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    ;[templates.value] = await Promise.all([api.list(), loadClients()])
  } catch (e) {
    console.warn('Načtení opakovaných faktur selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(reload)

// --- Formulář (nová i úprava) ---
type ItemRow = {
  description: string
  quantity: number
  unitPrice: number
  vatRate: VatRate
  unit: string
}
function emptyItem(): ItemRow {
  return { description: '', quantity: 1, unitPrice: 0, vatRate: 21, unit: '' }
}
const emptyForm = () => ({
  id: '' as string,
  clientId: '' as string,
  name: '',
  intervalMonths: 1,
  dayOfMonth: 1,
  dueDays: 14,
  autoIssue: false,
  note: '',
  items: [emptyItem()] as ItemRow[],
})

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
}
// Serverovou hlášku (422 pole, 404 klient) propustíme; 500/neznámé skryjeme za obecný text.
function apiErrorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError && e.status !== 500 && e.message ? e.message : fallback
}
const form = reactive(emptyForm())
const editRuns = ref<RecurringInvoiceRun[]>([])
const isEdit = computed(() => Boolean(form.id))

const netTotal = computed(() =>
  form.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
)

function openNew() {
  Object.assign(form, emptyForm())
  editRuns.value = []
  dialogOpen.value = true
}

async function openEdit(t: RecurringInvoiceTemplate) {
  try {
    const detail = await api.get(t.id) // detail nese položky + historii běhů
    Object.assign(form, {
      id: detail.id,
      clientId: detail.clientId,
      name: detail.name,
      intervalMonths: detail.intervalMonths, // zachovat frekvenci (UI needituje, ale nesmí ji přepsat na 1)
      dayOfMonth: detail.dayOfMonth,
      dueDays: detail.dueDays,
      autoIssue: detail.autoIssue,
      note: detail.note ?? '',
      items: (detail.items ?? []).map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: i.vatRate,
        unit: i.unit ?? '',
      })),
    })
    if (form.items.length === 0) form.items.push(emptyItem())
    editRuns.value = detail.runs ?? []
    dialogOpen.value = true
  } catch {
    toast.error('Detail šablony se nepodařilo načíst.')
  }
}

function addItem() {
  form.items.push(emptyItem())
}
function removeItem(idx: number) {
  form.items.splice(idx, 1)
  if (form.items.length === 0) form.items.push(emptyItem())
}

function onQuickClient(_client: QuickClient, savedClientId: string | null) {
  if (savedClientId) {
    form.clientId = savedClientId
    void loadClients()
  }
}

async function save() {
  if (submitting.value) return
  if (!form.name.trim()) return toast.error('Zadejte název šablony.')
  if (!form.clientId) return toast.error('Vyberte odběratele.')
  const items = form.items.filter((i) => i.description.trim())
  if (items.length === 0) return toast.error('Přidejte aspoň jednu položku s popisem.')
  if (items.some((i) => !(Number(i.quantity) > 0)))
    return toast.error('Množství u položky musí být větší než 0.')
  if (items.some((i) => Number(i.unitPrice) < 0))
    return toast.error('Cena položky nesmí být záporná.')

  const input: RecurringInvoiceInput = {
    clientId: form.clientId,
    name: form.name.trim(),
    intervalMonths: form.intervalMonths,
    dayOfMonth: clampInt(form.dayOfMonth, 1, 31), // prázdný/mimo rozsah vstup nepustíme na server jako '' / 400
    dueDays: clampInt(form.dueDays, 0, 365),
    autoIssue: form.autoIssue,
    note: form.note.trim() || null,
    items: items.map((i) => ({
      description: i.description.trim(),
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      vatRate: i.vatRate,
      unit: i.unit.trim() || null,
    })),
  }
  submitting.value = true
  try {
    if (form.id) await api.update(form.id, input)
    else await api.create(input)
    toast.success(form.id ? 'Šablona uložena.' : 'Šablona vytvořena.')
    dialogOpen.value = false
    await reload()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Uložení se nezdařilo. Zkuste to prosím znovu.'))
  } finally {
    submitting.value = false
  }
}

async function togglePause(t: RecurringInvoiceTemplate) {
  busyId.value = t.id
  try {
    if (t.status === 'active') await api.pause(t.id)
    else await api.resume(t.id)
    await reload()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Změna stavu se nezdařila.'))
  } finally {
    busyId.value = null
  }
}

async function generateNow(t: RecurringInvoiceTemplate) {
  busyId.value = t.id
  try {
    const invoice = await api.generateNow(t.id)
    toast.success(t.autoIssue ? 'Faktura vygenerována a vystavena.' : 'Koncept faktury vytvořen.', {
      action: {
        label: 'Otevřít doklad',
        onClick: () => router.push(`/app/faktury/editor?id=${invoice.id}`),
      },
    })
    await reload()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Vygenerování se nezdařilo.'))
  } finally {
    busyId.value = null
  }
}

async function confirmDelete() {
  const t = deleteTarget.value
  if (!t) return
  try {
    await api.remove(t.id)
    toast.success('Šablona smazána.')
    deleteTarget.value = null
    await reload()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Smazání se nezdařilo.'))
  }
}

function openInvoice(run: RecurringInvoiceRun) {
  router.push(`/app/faktury/editor?id=${run.invoiceId}`)
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Opakované faktury</h1>
        <p class="mt-1 text-muted-foreground">
          Nastav pravidelnou fakturu (např. měsíční paušál) a systém ji vytvoří ve správný den.
        </p>
      </div>
      <Button variant="coral" @click="openNew"> <Plus class="h-4 w-4" /> Nová šablona </Button>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <template v-else>
      <!-- Filtry -->
      <div class="mt-6 grid gap-2 sm:grid-cols-3">
        <div class="relative sm:col-span-2">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="search" placeholder="Hledat šablonu nebo odběratele" class="pl-9" />
        </div>
        <select
          v-model="filterStatus"
          class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          aria-label="Filtr stavu"
        >
          <option value="">Všechny stavy</option>
          <option value="active">Aktivní</option>
          <option value="paused">Pozastavené</option>
        </select>
      </div>

      <div
        v-if="filtered.length === 0"
        class="mt-6 rounded-2xl border border-border bg-card p-12 text-center"
      >
        <Repeat class="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 class="mt-4 text-lg font-semibold">
          {{ templates.length === 0 ? 'Zatím žádné opakované faktury' : 'Nic neodpovídá filtru' }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            templates.length === 0
              ? 'Založ šablonu pro pravidelnou fakturu — třeba měsíční paušál pro klienta.'
              : 'Zkus upravit filtry.'
          }}
        </p>
        <Button v-if="templates.length === 0" variant="coral" class="mt-4" @click="openNew">
          <Plus class="h-4 w-4" /> Nová šablona
        </Button>
      </div>

      <template v-else>
        <!-- Mobil: karty -->
        <div class="mt-6 space-y-3 lg:hidden">
          <div
            v-for="t in filtered"
            :key="t.id"
            class="rounded-xl border border-border bg-card p-4"
          >
            <div class="flex items-start justify-between gap-2">
              <button type="button" class="min-w-0 text-left" @click="openEdit(t)">
                <div class="truncate font-semibold">{{ t.name }}</div>
                <div class="truncate text-xs text-muted-foreground">{{ clientName(t) }}</div>
              </button>
              <Badge :variant="statusVariant[t.status]" class="shrink-0">
                {{ recurringStatusLabel(t.status) }}
              </Badge>
            </div>
            <div
              class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
            >
              <span>📅 Další běh: {{ formatDate(t.nextRunDate) }}</span>
              <span>{{ recurringModeLabel(t.autoIssue) }}</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="busyId === t.id"
                @click="generateNow(t)"
              >
                <Zap class="h-3.5 w-3.5" /> Vygenerovat teď
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="busyId === t.id"
                @click="togglePause(t)"
              >
                <component :is="t.status === 'active' ? Pause : Play" class="h-3.5 w-3.5" />
                {{ t.status === 'active' ? 'Pozastavit' : 'Obnovit' }}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Smazat šablonu"
                @click="deleteTarget = t"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Desktop: tabulka -->
        <div class="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
          <table class="w-full min-w-[820px] text-sm">
            <thead
              class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Šablona</th>
                <th class="px-4 py-3 text-left">Odběratel</th>
                <th class="px-4 py-3 text-left">Další běh</th>
                <th class="px-4 py-3 text-center">Režim</th>
                <th class="px-4 py-3 text-center">Stav</th>
                <th class="px-4 py-3 text-right">Akce</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="t in filtered"
                :key="t.id"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3">
                  <button type="button" class="font-medium hover:underline" @click="openEdit(t)">
                    {{ t.name }}
                  </button>
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ clientName(t) }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(t.nextRunDate) }}</td>
                <td class="px-4 py-3 text-center text-muted-foreground">
                  {{ recurringModeLabel(t.autoIssue) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <Badge :variant="statusVariant[t.status]">{{
                    recurringStatusLabel(t.status)
                  }}</Badge>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      :disabled="busyId === t.id"
                      title="Vygenerovat teď"
                      @click="generateNow(t)"
                    >
                      <Zap class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      :disabled="busyId === t.id"
                      :title="t.status === 'active' ? 'Pozastavit' : 'Obnovit'"
                      @click="togglePause(t)"
                    >
                      <component :is="t.status === 'active' ? Pause : Play" class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Smazat" @click="deleteTarget = t">
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- Dialog nová / úprava šablony -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ isEdit ? 'Upravit šablonu' : 'Nová opakovaná faktura' }}</DialogTitle>
          <DialogDescription>
            Systém vytvoří fakturu ve zvolený den každý měsíc. Bez auto-vystavení vzniká koncept ke
            kontrole.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="rec-name">Název šablony</Label>
            <Input
              id="rec-name"
              v-model="form.name"
              placeholder="Např. Měsíční paušál — správa webu"
            />
          </div>

          <div class="grid gap-1.5">
            <Label for="rec-client">Odběratel</Label>
            <div class="flex gap-2">
              <select
                id="rec-client"
                v-model="form.clientId"
                class="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <option value="">— vyberte klienta —</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <Button variant="outline" size="sm" @click="quickClientOpen = true">
                <UserPlus class="h-4 w-4" /> Nový
              </Button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="rec-day">Den v měsíci</Label>
              <Input id="rec-day" v-model.number="form.dayOfMonth" type="number" min="1" max="31" />
            </div>
            <div class="grid gap-1.5">
              <Label for="rec-due">Splatnost (dní)</Label>
              <Input id="rec-due" v-model.number="form.dueDays" type="number" min="0" max="365" />
            </div>
          </div>

          <label
            class="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm"
          >
            <input v-model="form.autoIssue" type="checkbox" class="mt-0.5 h-4 w-4" />
            <span>
              <span class="font-medium">Automaticky vystavit</span>
              — jinak vznikne koncept, který před odesláním zkontrolujete.
            </span>
          </label>

          <!-- Položky -->
          <div class="grid gap-2">
            <div class="flex items-center justify-between">
              <Label>Položky faktury</Label>
              <span class="text-xs text-muted-foreground">Ceny bez DPH; DPH dopočítá systém.</span>
            </div>
            <div
              v-for="(item, idx) in form.items"
              :key="idx"
              class="grid grid-cols-12 items-end gap-2 rounded-lg border border-border p-2"
            >
              <div class="col-span-12 grid gap-1 sm:col-span-5">
                <Label :for="`rec-item-desc-${idx}`" class="text-xs">Popis</Label>
                <Input
                  :id="`rec-item-desc-${idx}`"
                  v-model="item.description"
                  placeholder="Práce / služba"
                />
              </div>
              <div class="col-span-4 grid gap-1 sm:col-span-2">
                <Label :for="`rec-item-qty-${idx}`" class="text-xs">Množství</Label>
                <Input
                  :id="`rec-item-qty-${idx}`"
                  v-model.number="item.quantity"
                  type="number"
                  min="0"
                  step="0.001"
                />
              </div>
              <div class="col-span-5 grid gap-1 sm:col-span-2">
                <Label :for="`rec-item-price-${idx}`" class="text-xs">Cena/ks</Label>
                <Input
                  :id="`rec-item-price-${idx}`"
                  v-model.number="item.unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
              <div class="col-span-3 grid gap-1 sm:col-span-2">
                <Label :for="`rec-item-vat-${idx}`" class="text-xs">DPH %</Label>
                <select
                  :id="`rec-item-vat-${idx}`"
                  v-model.number="item.vatRate"
                  class="h-9 rounded-lg border border-border bg-card px-2 text-sm"
                >
                  <option v-for="r in vatRates" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
              <div class="col-span-12 flex justify-end sm:col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  :aria-label="`Odebrat položku ${idx + 1}`"
                  @click="removeItem(idx)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <Button variant="outline" size="sm" @click="addItem">
                <Plus class="h-4 w-4" /> Přidat položku
              </Button>
              <span class="text-sm text-muted-foreground"
                >Základ:
                <span class="font-medium text-foreground">{{ formatCZK(netTotal) }}</span></span
              >
            </div>
          </div>

          <div class="grid gap-1.5">
            <Label for="rec-note">Poznámka na faktuře</Label>
            <Textarea id="rec-note" v-model="form.note" rows="2" placeholder="Volitelné" />
          </div>

          <!-- Vytvořené doklady (jen při úpravě) -->
          <div v-if="isEdit && editRuns.length > 0" class="grid gap-1.5">
            <Label>Vytvořené doklady</Label>
            <div class="rounded-lg border border-border">
              <button
                v-for="run in editRuns"
                :key="run.id"
                type="button"
                class="flex w-full items-center justify-between border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-muted/30"
                @click="openInvoice(run)"
              >
                <span>{{ run.invoiceNumber || 'Koncept' }} · {{ run.periodKey }}</span>
                <span class="text-xs text-primary hover:underline">Otevřít doklad →</span>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="submitting" @click="dialogOpen = false"
            >Zrušit</Button
          >
          <Button variant="coral" :disabled="submitting" @click="save">
            {{ isEdit ? 'Uložit' : 'Vytvořit' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <QuickClientDialog v-model:open="quickClientOpen" @confirm="onQuickClient" />

    <AlertDialog
      :open="deleteTarget !== null"
      @update:open="(v: boolean) => !v && (deleteTarget = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat šablonu?</AlertDialogTitle>
          <AlertDialogDescription>
            Šablona „{{ deleteTarget?.name }}" se archivuje a přestane generovat faktury. Už
            vytvořené doklady zůstanou.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="deleteTarget = null">Zrušit</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">Smazat</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
