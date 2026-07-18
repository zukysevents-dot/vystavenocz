<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CheckCircle2, Loader2, MessageSquarePlus, Search, XCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import LoadError from '@/components/app/LoadError.vue'
import { toast } from '@/components/ui/sonner'
import { useCrm } from '@/composables/useCrm'
import type {
  CrmActivity,
  CrmActivityKind,
  CrmClientSummary,
  CrmTask,
  CrmTaskPriority,
} from '@/lib/types'

const crm = useCrm()
const loading = ref(true)
const saving = ref(false)
const error = ref(false)
const search = ref('')
const clients = ref<CrmClientSummary[]>([])
const tasks = ref<CrmTask[]>([])
const timeline = ref<CrmActivity[]>([])
const selectedClientId = ref<string | null>(null)
const activityBody = ref('')
const activityKind = ref<Extract<CrmActivityKind, 'Note' | 'Call' | 'Email' | 'Meeting'>>('Note')
const taskTitle = ref('')
const taskDescription = ref('')
const taskDueAt = ref('')
const taskPriority = ref<CrmTaskPriority>('Normal')

const selectedClient = computed(
  () => clients.value.find((client) => client.clientId === selectedClientId.value) ?? null,
)
const openTasks = computed(() => tasks.value.filter((task) => task.status === 'Open'))
const overdueTasks = computed(() =>
  openTasks.value.filter((task) => task.dueAt && new Date(task.dueAt) < new Date()),
)

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : 'Bez termínu'
}

async function load(): Promise<void> {
  loading.value = true
  error.value = false
  try {
    ;[clients.value, tasks.value] = await Promise.all([crm.listClients(search.value), crm.tasks()])
    if (!selectedClientId.value && clients.value[0])
      selectedClientId.value = clients.value[0].clientId
    if (
      selectedClientId.value &&
      !clients.value.some((client) => client.clientId === selectedClientId.value)
    )
      selectedClientId.value = clients.value[0]?.clientId ?? null
    if (selectedClientId.value) timeline.value = await crm.timeline(selectedClientId.value)
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

async function selectClient(clientId: string): Promise<void> {
  selectedClientId.value = clientId
  try {
    timeline.value = await crm.timeline(clientId)
  } catch {
    toast.error('Časovou osu klienta se nepodařilo načíst.')
  }
}

watch(search, () => void load())
onMounted(load)

async function addActivity(): Promise<void> {
  if (!selectedClientId.value || !activityBody.value.trim()) return
  saving.value = true
  try {
    await crm.createActivity(selectedClientId.value, activityKind.value, activityBody.value.trim())
    activityBody.value = ''
    timeline.value = await crm.timeline(selectedClientId.value)
    clients.value = await crm.listClients(search.value)
    toast.success('Aktivita byla přidána do časové osy.')
  } finally {
    saving.value = false
  }
}

async function addTask(): Promise<void> {
  if (!selectedClientId.value || !taskTitle.value.trim()) return
  saving.value = true
  try {
    await crm.createTask(
      selectedClientId.value,
      taskTitle.value.trim(),
      taskDescription.value.trim() || null,
      taskDueAt.value ? new Date(taskDueAt.value).toISOString() : null,
      taskPriority.value,
    )
    taskTitle.value = ''
    taskDescription.value = ''
    taskDueAt.value = ''
    ;[tasks.value, timeline.value, clients.value] = await Promise.all([
      crm.tasks(),
      crm.timeline(selectedClientId.value),
      crm.listClients(search.value),
    ])
    toast.success('Úkol byl vytvořen.')
  } finally {
    saving.value = false
  }
}

async function closeTask(taskId: string, cancel = false): Promise<void> {
  saving.value = true
  try {
    if (cancel) await crm.cancelTask(taskId)
    else await crm.completeTask(taskId)
    tasks.value = await crm.tasks()
    if (selectedClientId.value) timeline.value = await crm.timeline(selectedClientId.value)
    toast.success(cancel ? 'Úkol byl zrušen.' : 'Úkol byl dokončen.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">CRM</h1>
        <p class="mt-1 text-muted-foreground">
          Interní komunikace a navazující úkoly nad vašimi klienty.
        </p>
      </div>
      <div class="rounded-lg border border-border bg-card px-4 py-2 text-sm">
        <strong>{{ overdueTasks.length }}</strong> po termínu ·
        <strong>{{ openTasks.length }}</strong> otevřených úkolů
      </div>
    </div>
    <div class="mt-6 relative max-w-xl">
      <Search
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      /><Input v-model="search" class="pl-9" placeholder="Hledat klienta…" />
    </div>
    <LoadError v-if="error && !loading" class="mt-6" @retry="load" />
    <div v-else-if="loading" class="flex justify-center p-16">
      <Loader2 class="h-7 w-7 animate-spin text-primary" />
    </div>
    <div v-else class="mt-6 grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)_20rem]">
      <section class="rounded-2xl border border-border bg-card">
        <div class="border-b p-4 font-semibold">Klienti</div>
        <button
          v-for="client in clients"
          :key="client.clientId"
          class="w-full border-b p-4 text-left hover:bg-muted/50"
          :class="selectedClientId === client.clientId ? 'bg-primary-soft' : ''"
          @click="selectClient(client.clientId)"
        >
          <div class="font-medium">{{ client.clientName }}</div>
          <div class="mt-1 text-xs text-muted-foreground">
            {{ client.openTaskCount }} otevřených · {{ formatDate(client.nextTaskDueAt) }}
          </div>
        </button>
        <p v-if="!clients.length" class="p-5 text-sm text-muted-foreground">
          Žádní klienti neodpovídají hledání.
        </p>
      </section>
      <section class="space-y-6">
        <div class="rounded-2xl border border-border bg-card p-5">
          <h2 class="text-lg font-semibold">
            {{ selectedClient?.clientName ?? 'Vyberte klienta' }}
          </h2>
          <div v-if="selectedClient" class="mt-4 space-y-3">
            <div
              v-for="item in timeline"
              :key="item.id"
              class="rounded-lg border border-border p-3"
            >
              <div class="text-xs font-medium text-primary">
                {{ item.kind }} · {{ formatDate(item.occurredAt) }}
              </div>
              <p class="mt-1 whitespace-pre-wrap text-sm">{{ item.body }}</p>
            </div>
            <p v-if="!timeline.length" class="text-sm text-muted-foreground">
              Zatím žádná aktivita.
            </p>
          </div>
        </div>
        <div v-if="selectedClient" class="rounded-2xl border border-border bg-card p-5">
          <h2 class="flex items-center gap-2 font-semibold">
            <MessageSquarePlus class="h-4 w-4" /> Přidat aktivitu
          </h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr]">
            <select
              v-model="activityKind"
              class="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Note">Poznámka</option>
              <option value="Call">Telefonát</option>
              <option value="Email">E-mail</option>
              <option value="Meeting">Schůzka</option></select
            ><Textarea v-model="activityBody" placeholder="Interní poznámka…" />
          </div>
          <div class="mt-3 flex justify-end">
            <Button :disabled="saving || !activityBody.trim()" @click="addActivity"
              >Uložit aktivitu</Button
            >
          </div>
        </div>
      </section>
      <aside class="space-y-4">
        <div class="rounded-2xl border border-border bg-card p-5">
          <h2 class="font-semibold">Nový úkol</h2>
          <div v-if="selectedClient" class="mt-4 space-y-3">
            <div><Label>Název</Label><Input v-model="taskTitle" class="mt-1" /></div>
            <div>
              <Label>Termín</Label><Input v-model="taskDueAt" class="mt-1" type="datetime-local" />
            </div>
            <div>
              <Label>Priorita</Label
              ><select
                v-model="taskPriority"
                class="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Low">Nízká</option>
                <option value="Normal">Normální</option>
                <option value="High">Vysoká</option>
              </select>
            </div>
            <Textarea v-model="taskDescription" placeholder="Volitelný popis" /><Button
              class="w-full"
              :disabled="saving || !taskTitle.trim()"
              @click="addTask"
              >Vytvořit úkol</Button
            >
          </div>
          <p v-else class="mt-3 text-sm text-muted-foreground">Nejprve vyberte klienta.</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-5">
          <h2 class="font-semibold">Otevřené úkoly</h2>
          <div v-for="task in openTasks" :key="task.id" class="mt-3 border-t pt-3">
            <p class="text-sm font-medium">{{ task.title }}</p>
            <p class="text-xs text-muted-foreground">{{ formatDate(task.dueAt) }}</p>
            <div class="mt-2 flex gap-2">
              <Button size="sm" variant="outline" :disabled="saving" @click="closeTask(task.id)"
                ><CheckCircle2 class="h-3.5 w-3.5" /> Hotovo</Button
              ><Button
                size="sm"
                variant="ghost"
                :disabled="saving"
                @click="closeTask(task.id, true)"
                ><XCircle class="h-3.5 w-3.5" /> Zrušit</Button
              >
            </div>
          </div>
          <p v-if="!openTasks.length" class="mt-3 text-sm text-muted-foreground">
            Žádné otevřené úkoly.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
