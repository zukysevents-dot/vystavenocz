<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Wrench, Loader2, Search, UserPlus } from 'lucide-vue-next'
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
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'
import QuickClientDialog, { type QuickClient } from '@/components/app/QuickClientDialog.vue'
import { useJobs, type JobInput } from '@/composables/useJobs'
import { useClients } from '@/composables/useClients'
import { useLocations } from '@/composables/useLocations'
import { useApi } from '@/composables/useApi'
import { jobStatusLabel, jobPriorityLabel } from '@/lib/jobs'
import { formatDate } from '@/lib/invoice'
import type { Employee, Job, JobPriority, JobStatus } from '@/lib/types'

const router = useRouter()
const jobsApi = useJobs()
const { clients, load: loadClients } = useClients()
const { locations, load: loadLocations } = useLocations()
const employeesApi = useApi<Employee>('employees')

const jobs = ref<Job[]>([])
const employees = ref<Employee[]>([])
const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const dialogOpen = ref(false)
const quickClientOpen = ref(false)

const statuses: JobStatus[] = ['scheduled', 'in_progress', 'waiting', 'done', 'cancelled']
const priorities: JobPriority[] = ['low', 'normal', 'high', 'urgent']

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

// Filtry (client-side nad načteným seznamem).
const filterStatus = ref<JobStatus | ''>('')
const filterPriority = ref<JobPriority | ''>('')
const filterAssignee = ref<string>('')
const search = ref('')

const employeeName = (id: string | null): string =>
  id ? (employees.value.find((e) => e.id === id)?.fullName ?? '—') : '—'

const filteredJobs = computed(() =>
  jobs.value.filter((j) => {
    if (filterStatus.value && j.status !== filterStatus.value) return false
    if (filterPriority.value && j.priority !== filterPriority.value) return false
    if (filterAssignee.value && j.assignedEmployeeId !== filterAssignee.value) return false
    const q = search.value.trim().toLowerCase()
    if (q) {
      const hay = `${j.number} ${j.name} ${j.clientName ?? ''} ${j.siteAddress ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }),
)

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    ;[jobs.value, employees.value] = await Promise.all([
      jobsApi.list(),
      employeesApi.list().catch(() => []),
    ])
    await Promise.all([loadClients(), loadLocations()])
  } catch (e) {
    console.warn('Načtení zakázek selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(reload)

// --- Nová zakázka ---
const emptyForm = {
  name: '',
  clientId: '' as string,
  clientName: '',
  siteAddress: '',
  scheduledAt: '',
  priority: 'normal' as JobPriority,
  assignedEmployeeId: '' as string,
  locationId: '' as string,
  note: '',
}
const form = reactive({ ...emptyForm })
const activeEmployees = computed(() => employees.value.filter((e) => e.isActive))

// Výběr klienta ze seznamu doplní jméno; „ručně" nechá volný text.
watch(
  () => form.clientId,
  (id) => {
    if (id) {
      const c = clients.value.find((x) => x.id === id)
      if (c) form.clientName = c.name
    }
  },
)

function openNew() {
  Object.assign(form, emptyForm)
  dialogOpen.value = true
}

function onQuickClient(client: QuickClient, savedClientId: string | null) {
  form.clientName = client.name
  form.clientId = savedClientId ?? ''
  if (savedClientId) void loadClients()
}

async function save() {
  if (submitting.value) return
  if (!form.name.trim()) {
    toast.error('Zadejte název zakázky.')
    return
  }
  const input: JobInput = {
    name: form.name.trim(),
    clientId: form.clientId || null,
    clientName: form.clientName.trim() || null,
    siteAddress: form.siteAddress.trim() || null,
    priority: form.priority,
    scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
    assignedEmployeeId: form.assignedEmployeeId || null,
    locationId: form.locationId || null,
    note: form.note.trim() || null,
  }
  submitting.value = true
  try {
    const created = await jobsApi.create(input)
    toast.success('Zakázka vytvořena.')
    dialogOpen.value = false
    router.push(`/app/zakazky/${created.id}`)
  } catch {
    toast.error('Vytvoření se nezdařilo. Zkuste to prosím znovu.')
  } finally {
    submitting.value = false
  }
}

function openDetail(job: Job) {
  router.push(`/app/zakazky/${job.id}`)
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Zakázky</h1>
        <p class="mt-1 text-muted-foreground">
          Pracovní listy, materiál, předání a fakturace řemeslných zakázek.
        </p>
      </div>
      <Button variant="coral" @click="openNew"> <Plus class="h-4 w-4" /> Nová zakázka </Button>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <template v-else>
      <!-- Filtry -->
      <div class="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div class="relative sm:col-span-2 lg:col-span-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input v-model="search" placeholder="Hledat zakázku, klienta, adresu" class="pl-9" />
        </div>
        <select
          v-model="filterStatus"
          class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          aria-label="Filtr stavu"
        >
          <option value="">Všechny stavy</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ jobStatusLabel(s) }}</option>
        </select>
        <select
          v-model="filterPriority"
          class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          aria-label="Filtr priority"
        >
          <option value="">Všechny priority</option>
          <option v-for="p in priorities" :key="p" :value="p">{{ jobPriorityLabel(p) }}</option>
        </select>
        <select
          v-model="filterAssignee"
          class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
          aria-label="Filtr technika"
        >
          <option value="">Všichni technici</option>
          <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.fullName }}</option>
        </select>
      </div>

      <p class="mt-4 text-xs text-muted-foreground">
        Zakázku můžeš vytvořit i převodem z
        <RouterLink to="/app/nabidky" class="font-medium text-primary hover:underline"
          >nabídky</RouterLink
        >.
      </p>

      <div
        v-if="filteredJobs.length === 0"
        class="mt-6 rounded-2xl border border-border bg-card p-12 text-center"
      >
        <Wrench class="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 class="mt-4 text-lg font-semibold">
          {{ jobs.length === 0 ? 'Zatím žádné zakázky' : 'Nic neodpovídá filtru' }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            jobs.length === 0
              ? 'Založ první zakázku a veď její pracovní list.'
              : 'Zkus upravit filtry.'
          }}
        </p>
        <Button v-if="jobs.length === 0" variant="coral" class="mt-4" @click="openNew">
          <Plus class="h-4 w-4" /> Nová zakázka
        </Button>
      </div>

      <template v-else>
        <!-- Mobil: karty -->
        <div class="mt-6 space-y-3 lg:hidden">
          <button
            v-for="job in filteredJobs"
            :key="job.id"
            type="button"
            class="w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/30"
            @click="openDetail(job)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="truncate font-semibold">{{ job.name }}</div>
                <div class="truncate text-xs text-muted-foreground">
                  {{ job.number }} · {{ job.clientName || 'bez klienta' }}
                </div>
              </div>
              <Badge :variant="statusVariant[job.status]" class="shrink-0">
                {{ jobStatusLabel(job.status) }}
              </Badge>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge :variant="priorityVariant[job.priority]" class="text-[10px]">
                {{ jobPriorityLabel(job.priority) }}
              </Badge>
              <span v-if="job.scheduledAt">📅 {{ formatDate(job.scheduledAt) }}</span>
              <span v-if="job.assignedEmployeeId"
                >👷 {{ employeeName(job.assignedEmployeeId) }}</span
              >
            </div>
          </button>
        </div>

        <!-- Desktop: tabulka -->
        <div class="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
          <table class="w-full min-w-[820px] text-sm">
            <thead
              class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Číslo</th>
                <th class="px-4 py-3 text-left">Zakázka</th>
                <th class="px-4 py-3 text-left">Klient</th>
                <th class="px-4 py-3 text-left">Termín</th>
                <th class="px-4 py-3 text-left">Technik</th>
                <th class="px-4 py-3 text-center">Priorita</th>
                <th class="px-4 py-3 text-center">Stav</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="job in filteredJobs"
                :key="job.id"
                class="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                @click="openDetail(job)"
              >
                <td class="px-4 py-3 font-mono text-xs text-muted-foreground">{{ job.number }}</td>
                <td class="px-4 py-3 font-medium">{{ job.name }}</td>
                <td class="px-4 py-3 text-muted-foreground">{{ job.clientName || '—' }}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ job.scheduledAt ? formatDate(job.scheduledAt) : '—' }}
                </td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ employeeName(job.assignedEmployeeId) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <Badge :variant="priorityVariant[job.priority]">
                    {{ jobPriorityLabel(job.priority) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-center">
                  <Badge :variant="statusVariant[job.status]">
                    {{ jobStatusLabel(job.status) }}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- Dialog nová zakázka -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nová zakázka</DialogTitle>
          <DialogDescription>Základní údaje — pracovní list doplníš v detailu.</DialogDescription>
        </DialogHeader>

        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="job-name">Název</Label>
            <Input id="job-name" v-model="form.name" placeholder="Např. Oprava kotle — Novákovi" />
          </div>

          <div class="grid gap-1.5">
            <Label for="job-client">Klient</Label>
            <div class="flex gap-2">
              <select
                id="job-client"
                v-model="form.clientId"
                class="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <option value="">— zadat ručně / bez klienta —</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <Button variant="outline" size="sm" @click="quickClientOpen = true">
                <UserPlus class="h-4 w-4" /> Nový
              </Button>
            </div>
            <Input
              v-if="!form.clientId"
              v-model="form.clientName"
              placeholder="Jméno / firma (volný text)"
            />
          </div>

          <div class="grid gap-1.5">
            <Label for="job-site">Adresa realizace</Label>
            <Input id="job-site" v-model="form.siteAddress" placeholder="Kde se práce provádí" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="job-sched">Termín</Label>
              <Input id="job-sched" v-model="form.scheduledAt" type="datetime-local" />
            </div>
            <div class="grid gap-1.5">
              <Label for="job-priority">Priorita</Label>
              <select
                id="job-priority"
                v-model="form.priority"
                class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <option v-for="p in priorities" :key="p" :value="p">
                  {{ jobPriorityLabel(p) }}
                </option>
              </select>
            </div>
            <div class="grid gap-1.5">
              <Label for="job-worker">Technik</Label>
              <select
                id="job-worker"
                v-model="form.assignedEmployeeId"
                class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <option value="">— nepřiřazeno —</option>
                <option v-for="e in activeEmployees" :key="e.id" :value="e.id">
                  {{ e.fullName }}
                </option>
              </select>
            </div>
            <div class="grid gap-1.5">
              <Label for="job-loc">Pobočka</Label>
              <select
                id="job-loc"
                v-model="form.locationId"
                class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <option value="">— nezvoleno —</option>
                <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
              </select>
            </div>
          </div>

          <div class="grid gap-1.5">
            <Label for="job-note">Poznámka</Label>
            <Textarea id="job-note" v-model="form.note" rows="2" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="submitting" @click="dialogOpen = false"
            >Zrušit</Button
          >
          <Button variant="coral" :disabled="submitting" @click="save">Vytvořit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <QuickClientDialog v-model:open="quickClientOpen" @confirm="onQuickClient" />
  </div>
</template>
