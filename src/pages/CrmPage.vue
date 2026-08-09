<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Search, Loader2, Check, X, Plus, ExternalLink } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { http, isApiMode } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'

// --- Serverové tvary (zrcadlí backend CRM DTO; peníze/součty počítá výhradně backend) ---
interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
interface ClientSummary {
  id: string
  name: string
  ico: string | null
  email: string | null
  openTaskCount: number
  nextTaskDueAt: string | null
  lastActivityAt: string | null
  outstandingAmount: number
  currency: string
}
interface Task {
  id: string
  clientId: string
  title: string
  description: string | null
  dueAt: string | null
  priority: 'low' | 'normal' | 'high'
  status: 'open' | 'completed' | 'cancelled'
  completedAt: string | null
  createdAt: string
}
interface OutstandingByCurrency {
  currency: string
  amount: number
  invoiceCount: number
}
interface SourceLink {
  sourceType: string
  sourceId: string
  label: string
  deepLink: string
  occurredAt: string
}
interface ClientDetail {
  id: string
  name: string
  ico: string | null
  dic: string | null
  email: string | null
  phone: string | null
  openTasks: Task[]
  outstanding: OutstandingByCurrency[]
  links: SourceLink[]
}
interface TimelineItem {
  stableId: string
  occurredAt: string
  kind: string
  sourceType: string
  sourceId: string | null
  label: string
  body: string | null
  deepLink: string | null
  taskId: string | null
}
interface TimelinePage {
  items: TimelineItem[]
  nextCursor: string | null
}

// CRM čte klienty, poznámky a úkoly výhradně z online provozu — v náhledu jen pravdivá poznámka.
const apiMode = isApiMode()
const loading = ref(true)
const loadError = ref(false)
const clients = ref<ClientSummary[]>([])
const search = ref('')
const selectedId = ref<string | null>(null)

const detail = ref<ClientDetail | null>(null)
const timeline = ref<TimelineItem[]>([])
const detailLoading = ref(false)
const detailError = ref(false)

const noteBody = ref('')
const noteSubmitting = ref(false)
const taskTitle = ref('')
const taskDue = ref('')
const taskPriority = ref<'low' | 'normal' | 'high'>('normal')
const taskSubmitting = ref(false)

async function loadClients() {
  loading.value = true
  loadError.value = false
  try {
    const q = search.value.trim()
    const res = await http.get<PagedResult<ClientSummary>>(
      `/crm/clients?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ''}`,
    )
    clients.value = res.items
    if (!selectedId.value && res.items.length > 0) selectClient(res.items[0].id)
    else if (selectedId.value && !res.items.some((c) => c.id === selectedId.value))
      selectedId.value = res.items[0]?.id ?? null
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function loadDetail(id: string) {
  detailLoading.value = true
  detailError.value = false
  try {
    const [d, t] = await Promise.all([
      http.get<ClientDetail>(`/crm/clients/${id}`),
      http.get<TimelinePage>(`/crm/clients/${id}/timeline`),
    ])
    detail.value = d
    timeline.value = t.items
  } catch {
    detailError.value = true
  } finally {
    detailLoading.value = false
  }
}

function selectClient(id: string) {
  selectedId.value = id
  detail.value = null
  timeline.value = []
  loadDetail(id)
}

async function addNote() {
  if (!selectedId.value || !noteBody.value.trim()) return
  noteSubmitting.value = true
  try {
    await http.post(`/crm/clients/${selectedId.value}/activities`, {
      kind: 'note',
      body: noteBody.value.trim(),
      occurredAt: null,
      idempotencyKey: crypto.randomUUID(),
    })
    noteBody.value = ''
    await refreshSelected()
    toast.success('Poznámka uložena.')
  } catch {
    toast.error('Poznámku se nepodařilo uložit. Zkuste to znovu.')
  } finally {
    noteSubmitting.value = false
  }
}

async function addTask() {
  if (!selectedId.value || !taskTitle.value.trim()) return
  taskSubmitting.value = true
  try {
    await http.post('/crm/tasks', {
      clientId: selectedId.value,
      title: taskTitle.value.trim(),
      description: null,
      dueAt: taskDue.value ? new Date(taskDue.value).toISOString() : null,
      priority: taskPriority.value,
      idempotencyKey: crypto.randomUUID(),
    })
    taskTitle.value = ''
    taskDue.value = ''
    taskPriority.value = 'normal'
    await refreshSelected()
    toast.success('Úkol vytvořen.')
  } catch {
    toast.error('Úkol se nepodařilo vytvořit. Zkuste to znovu.')
  } finally {
    taskSubmitting.value = false
  }
}

async function completeTask(id: string) {
  try {
    await http.post(`/crm/tasks/${id}/complete`)
    await refreshSelected()
  } catch {
    toast.error('Úkol se nepodařilo dokončit.')
  }
}

async function cancelTask(id: string) {
  try {
    await http.post(`/crm/tasks/${id}/cancel`)
    await refreshSelected()
  } catch {
    toast.error('Úkol se nepodařilo zrušit.')
  }
}

// Po zápisu obnov detail i seznam (mění se počty úkolů / poslední aktivita).
async function refreshSelected() {
  if (selectedId.value) await loadDetail(selectedId.value)
  await loadClients()
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}
function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(amount)
}
const priorityLabel: Record<string, string> = { low: 'Nízká', normal: 'Běžná', high: 'Vysoká' }

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(loadClients, 250)
})

onMounted(() => {
  if (apiMode) loadClients()
})
</script>

<template>
  <div class="mx-auto w-full max-w-6xl space-y-4 p-4">
    <div>
      <h1 class="text-2xl font-semibold">CRM</h1>
      <p class="text-muted-foreground text-sm">
        Poznámky, úkoly a historie dokladů u vašich klientů — ať vám nezapadne žádný další krok.
      </p>
    </div>

    <div
      v-if="!apiMode"
      class="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
    >
      Poznámky, úkoly a historie dokladů u klientů se zapnou v online aplikaci s balíčkem CRM. V
      náhledu je tato sekce jen ukázková.
    </div>

    <LoadError v-else-if="loadError" @retry="loadClients" />

    <div v-else class="grid gap-4 md:grid-cols-[20rem_1fr]">
      <!-- Seznam klientů -->
      <aside class="space-y-2">
        <div class="relative">
          <Search class="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
          <Input
            v-model="search"
            placeholder="Hledat klienta…"
            class="pl-8"
            aria-label="Hledat klienta"
          />
        </div>
        <div v-if="loading" class="text-muted-foreground flex items-center gap-2 p-4 text-sm">
          <Loader2 class="h-4 w-4 animate-spin" /> Načítám…
        </div>
        <p v-else-if="clients.length === 0" class="text-muted-foreground p-4 text-sm">
          Zatím žádní klienti. Založte klienta v sekci Klienti.
        </p>
        <ul v-else class="space-y-1">
          <li v-for="c in clients" :key="c.id">
            <button
              type="button"
              class="hover:bg-accent w-full rounded-md border px-3 py-2 text-left transition-colors"
              :class="c.id === selectedId ? 'border-primary bg-accent' : 'border-transparent'"
              @click="selectClient(c.id)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="truncate font-medium">{{ c.name }}</span>
                <span
                  v-if="c.openTaskCount > 0"
                  class="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-xs"
                >
                  {{ c.openTaskCount }} úkol.
                </span>
              </div>
              <div class="text-muted-foreground mt-0.5 flex items-center justify-between text-xs">
                <span>{{
                  c.outstandingAmount > 0
                    ? formatMoney(c.outstandingAmount, c.currency)
                    : 'Bez pohledávek'
                }}</span>
                <span v-if="c.nextTaskDueAt">do {{ formatDate(c.nextTaskDueAt) }}</span>
              </div>
            </button>
          </li>
        </ul>
      </aside>

      <!-- Detail vybraného klienta -->
      <section class="space-y-4">
        <LoadError v-if="detailError" @retry="selectedId && loadDetail(selectedId)" />
        <div
          v-else-if="detailLoading"
          class="text-muted-foreground flex items-center gap-2 p-4 text-sm"
        >
          <Loader2 class="h-4 w-4 animate-spin" /> Načítám detail…
        </div>
        <template v-else-if="detail">
          <div class="rounded-lg border p-4">
            <h2 class="text-lg font-semibold">{{ detail.name }}</h2>
            <p class="text-muted-foreground text-sm">
              <span v-if="detail.ico">IČO {{ detail.ico }}</span>
              <span v-if="detail.email"> · {{ detail.email }}</span>
              <span v-if="detail.phone"> · {{ detail.phone }}</span>
            </p>
            <div v-if="detail.outstanding.length" class="mt-3 flex flex-wrap gap-2">
              <span
                v-for="o in detail.outstanding"
                :key="o.currency"
                class="rounded-md bg-amber-500/10 px-2 py-1 text-sm text-amber-700 dark:text-amber-400"
              >
                Nezaplaceno {{ formatMoney(o.amount, o.currency) }} ({{ o.invoiceCount }} fakt.)
              </span>
            </div>
          </div>

          <!-- Úkoly (další kroky) -->
          <div class="rounded-lg border p-4">
            <h3 class="mb-2 font-medium">Otevřené úkoly</h3>
            <ul v-if="detail.openTasks.length" class="mb-3 space-y-2">
              <li
                v-for="t in detail.openTasks"
                :key="t.id"
                class="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium">{{ t.title }}</div>
                  <div class="text-muted-foreground text-xs">
                    {{ priorityLabel[t.priority]
                    }}<span v-if="t.dueAt"> · termín {{ formatDate(t.dueAt) }}</span>
                  </div>
                </div>
                <div class="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" title="Dokončit" @click="completeTask(t.id)">
                    <Check class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Zrušit" @click="cancelTask(t.id)">
                    <X class="h-4 w-4" />
                  </Button>
                </div>
              </li>
            </ul>
            <p v-else class="text-muted-foreground mb-3 text-sm">
              Žádný otevřený úkol — přidejte další krok.
            </p>

            <form class="flex flex-wrap items-end gap-2" @submit.prevent="addTask">
              <div class="min-w-40 flex-1">
                <Label for="task-title" class="text-xs">Nový úkol</Label>
                <Input
                  id="task-title"
                  v-model="taskTitle"
                  placeholder="Např. Zavolat ohledně nabídky"
                />
              </div>
              <div>
                <Label for="task-due" class="text-xs">Termín</Label>
                <Input id="task-due" v-model="taskDue" type="date" />
              </div>
              <div>
                <Label for="task-prio" class="text-xs">Priorita</Label>
                <select
                  id="task-prio"
                  v-model="taskPriority"
                  class="border-input bg-background h-9 rounded-md border px-2 text-sm"
                >
                  <option value="low">Nízká</option>
                  <option value="normal">Běžná</option>
                  <option value="high">Vysoká</option>
                </select>
              </div>
              <Button type="submit" :disabled="taskSubmitting || !taskTitle.trim()">
                <Loader2 v-if="taskSubmitting" class="mr-1 h-4 w-4 animate-spin" />
                <Plus v-else class="mr-1 h-4 w-4" />
                Přidat
              </Button>
            </form>
          </div>

          <!-- Poznámka -->
          <div class="rounded-lg border p-4">
            <form class="flex items-end gap-2" @submit.prevent="addNote">
              <div class="flex-1">
                <Label for="note" class="text-xs">Nová poznámka / záznam hovoru</Label>
                <Input id="note" v-model="noteBody" placeholder="Např. Domluveno na příští týden" />
              </div>
              <Button type="submit" :disabled="noteSubmitting || !noteBody.trim()">
                <Loader2 v-if="noteSubmitting" class="mr-1 h-4 w-4 animate-spin" />
                Uložit
              </Button>
            </form>
          </div>

          <!-- Časová osa -->
          <div class="rounded-lg border p-4">
            <h3 class="mb-2 font-medium">Časová osa</h3>
            <p v-if="!timeline.length" class="text-muted-foreground text-sm">
              Zatím žádná aktivita.
            </p>
            <ul v-else class="space-y-2">
              <li v-for="i in timeline" :key="i.stableId" class="flex gap-3 text-sm">
                <span class="text-muted-foreground w-24 shrink-0 text-xs">{{
                  formatDate(i.occurredAt)
                }}</span>
                <div class="min-w-0">
                  <span class="font-medium">{{ i.label }}</span>
                  <span v-if="i.body" class="text-muted-foreground"> — {{ i.body }}</span>
                  <RouterLink
                    v-if="i.deepLink"
                    :to="i.deepLink"
                    class="text-primary ml-1 inline-flex items-center gap-0.5 hover:underline"
                  >
                    otevřít <ExternalLink class="h-3 w-3" />
                  </RouterLink>
                </div>
              </li>
            </ul>
          </div>
        </template>
        <p v-else class="text-muted-foreground p-4 text-sm">Vyberte klienta ze seznamu.</p>
      </section>
    </div>
  </div>
</template>
