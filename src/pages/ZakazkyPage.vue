<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Wrench, Pencil, Trash2, Loader2 } from 'lucide-vue-next'
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
import { useJobs, type JobInput } from '@/composables/useJobs'
import {
  jobRevenue,
  jobProfit,
  jobMargin,
  summarizeJobs,
  jobStatusLabel,
  nonNegative,
} from '@/lib/jobs'
import { formatCZK } from '@/lib/invoice'
import type { Job, JobStatus } from '@/lib/types'

const { jobs, loadError, load, create, update, remove } = useJobs()
const loading = ref(true)
const dialogOpen = ref(false)
const editing = ref<Job | null>(null)
const deleteId = ref<string | null>(null)
const submitting = ref(false)
const deleting = ref(false)

const emptyForm = {
  name: '',
  clientName: '',
  status: 'quote' as JobStatus,
  materialCost: 0,
  materialPrice: 0,
  hours: 0,
  hourlyRate: 0,
  note: '',
}
const form = reactive({ ...emptyForm })

async function reload(): Promise<void> {
  loading.value = true
  await load()
  loading.value = false
}
onMounted(reload)

const summary = computed(() => summarizeJobs(jobs.value))
const statuses: JobStatus[] = ['quote', 'in_progress', 'done', 'invoiced']

const statusVariant: Record<JobStatus, 'default' | 'secondary' | 'outline'> = {
  quote: 'secondary',
  in_progress: 'default',
  done: 'outline',
  invoiced: 'outline',
}

// Živý náhled ziskovosti ve formuláři.
const formRevenue = computed(() => form.materialPrice + form.hours * form.hourlyRate)
const formProfit = computed(() => formRevenue.value - form.materialCost)

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)} %`
}

function openNew() {
  editing.value = null
  Object.assign(form, emptyForm)
  dialogOpen.value = true
}

function openEdit(job: Job) {
  editing.value = job
  Object.assign(form, {
    name: job.name,
    clientName: job.clientName ?? '',
    status: job.status,
    materialCost: job.materialCost,
    materialPrice: job.materialPrice,
    hours: job.hours,
    hourlyRate: job.hourlyRate,
    note: job.note ?? '',
  })
  dialogOpen.value = true
}

async function save() {
  if (submitting.value) return // zámek proti dvojkliku
  if (!form.name.trim()) {
    toast.error('Zadejte název zakázky.')
    return
  }
  // Klampnutí na nezáporné hodnoty — vstup jde přímo do výpočtu ziskovosti.
  const input: JobInput = {
    name: form.name.trim(),
    clientName: form.clientName.trim() || null,
    status: form.status,
    materialCost: nonNegative(form.materialCost),
    materialPrice: nonNegative(form.materialPrice),
    hours: nonNegative(form.hours),
    hourlyRate: nonNegative(form.hourlyRate),
    note: form.note.trim() || null,
  }
  submitting.value = true
  try {
    if (editing.value) {
      await update(editing.value.id, input)
      toast.success('Zakázka upravena.')
    } else {
      await create(input)
      toast.success('Zakázka vytvořena.')
    }
    dialogOpen.value = false
  } catch {
    toast.error('Uložení se nezdařilo. Zkuste to prosím znovu.')
  } finally {
    submitting.value = false
  }
}

async function onDelete() {
  if (!deleteId.value || deleting.value) return
  deleting.value = true
  try {
    await remove(deleteId.value)
    toast.success('Zakázka smazána.')
    deleteId.value = null
  } catch {
    toast.error('Smazání se nezdařilo.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Zakázky &amp; výjezdy</h1>
        <p class="mt-1 text-muted-foreground">Materiál, hodiny a ziskovost každé zakázky.</p>
      </div>
      <Button variant="coral" @click="openNew"> <Plus class="h-4 w-4" /> Nová zakázka </Button>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <div
      v-else-if="jobs.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Wrench class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Zatím žádné zakázky</h2>
      <p class="mt-1 text-sm text-muted-foreground">Založ první zakázku a hlídej si ziskovost.</p>
      <Button variant="coral" class="mt-4" @click="openNew">
        <Plus class="h-4 w-4" /> Nová zakázka
      </Button>
    </div>

    <template v-else>
      <!-- Souhrn -->
      <div class="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Zakázek</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.count }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Výnos</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.revenue) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Zisk</div>
          <div
            class="mt-1 text-2xl font-bold"
            :class="summary.profit < 0 ? 'text-destructive' : ''"
          >
            {{ formatCZK(summary.profit) }}
          </div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Marže</div>
          <div class="mt-1 text-2xl font-bold">{{ pct(summary.margin) }}</div>
        </div>
      </div>

      <!-- Mobil: karty -->
      <div class="mt-6 space-y-3 sm:hidden">
        <div v-for="job in jobs" :key="job.id" class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="truncate font-semibold">{{ job.name }}</div>
              <div class="truncate text-sm text-muted-foreground">{{ job.clientName || '—' }}</div>
            </div>
            <Badge :variant="statusVariant[job.status]" class="shrink-0">
              {{ jobStatusLabel(job.status) }}
            </Badge>
          </div>
          <div class="mt-3 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Zisk</span>
            <span class="font-semibold" :class="jobProfit(job) < 0 ? 'text-destructive' : ''">
              {{ formatCZK(jobProfit(job)) }} · {{ pct(jobMargin(job)) }}
            </span>
          </div>
          <div class="mt-3 flex justify-end gap-1 border-t border-border pt-2">
            <Button variant="ghost" size="sm" @click="openEdit(job)">
              <Pencil class="h-4 w-4" /> Upravit
            </Button>
            <Button variant="ghost" size="sm" @click="deleteId = job.id">
              <Trash2 class="h-4 w-4 text-destructive" /> Smazat
            </Button>
          </div>
        </div>
      </div>

      <!-- Desktop: tabulka -->
      <div class="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table class="w-full min-w-[720px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Zakázka</th>
              <th class="px-4 py-3 text-left">Klient</th>
              <th class="px-4 py-3 text-center">Stav</th>
              <th class="px-4 py-3 text-right">Výnos</th>
              <th class="px-4 py-3 text-right">Zisk</th>
              <th class="px-4 py-3 text-right">Marže</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="job in jobs"
              :key="job.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ job.name }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ job.clientName || '—' }}</td>
              <td class="px-4 py-3 text-center">
                <Badge :variant="statusVariant[job.status]">{{ jobStatusLabel(job.status) }}</Badge>
              </td>
              <td class="px-4 py-3 text-right">{{ formatCZK(jobRevenue(job)) }}</td>
              <td
                class="px-4 py-3 text-right font-semibold"
                :class="jobProfit(job) < 0 ? 'text-destructive' : ''"
              >
                {{ formatCZK(jobProfit(job)) }}
              </td>
              <td class="px-4 py-3 text-right text-muted-foreground">{{ pct(jobMargin(job)) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(job)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Smazat" @click="deleteId = job.id">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Dialog create / edit -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit zakázku' : 'Nová zakázka' }}</DialogTitle>
          <DialogDescription>Materiál a hodiny určí ziskovost zakázky.</DialogDescription>
        </DialogHeader>

        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="job-name">Název</Label>
            <Input id="job-name" v-model="form.name" placeholder="Např. Oprava kotle" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="job-client">Klient</Label>
              <Input id="job-client" v-model="form.clientName" placeholder="Jméno / firma" />
            </div>
            <div class="grid gap-1.5">
              <Label for="job-status">Stav</Label>
              <select
                id="job-status"
                v-model="form.status"
                class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
              >
                <option v-for="s in statuses" :key="s" :value="s">{{ jobStatusLabel(s) }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="job-mcost">Materiál — nákup (Kč)</Label>
              <Input id="job-mcost" v-model.number="form.materialCost" type="number" min="0" />
            </div>
            <div class="grid gap-1.5">
              <Label for="job-mprice">Materiál — prodej (Kč)</Label>
              <Input id="job-mprice" v-model.number="form.materialPrice" type="number" min="0" />
            </div>
            <div class="grid gap-1.5">
              <Label for="job-hours">Hodiny</Label>
              <Input id="job-hours" v-model.number="form.hours" type="number" min="0" step="0.5" />
            </div>
            <div class="grid gap-1.5">
              <Label for="job-rate">Sazba / hod (Kč)</Label>
              <Input id="job-rate" v-model.number="form.hourlyRate" type="number" min="0" />
            </div>
          </div>

          <div class="grid gap-1.5">
            <Label for="job-note">Poznámka</Label>
            <Textarea id="job-note" v-model="form.note" rows="2" />
          </div>

          <!-- Živý náhled ziskovosti -->
          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span class="text-muted-foreground">Výnos {{ formatCZK(formRevenue) }}</span>
            <span
              class="font-semibold"
              :class="formProfit < 0 ? 'text-destructive' : 'text-primary'"
            >
              Zisk {{ formatCZK(formProfit) }}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="submitting" @click="dialogOpen = false"
            >Zrušit</Button
          >
          <Button variant="coral" :disabled="submitting" @click="save">
            {{ editing ? 'Uložit' : 'Vytvořit' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="!!deleteId" @update:open="(o: boolean) => !o && (deleteId = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat zakázku?</AlertDialogTitle>
          <AlertDialogDescription>Tuto akci nelze vrátit.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="onDelete"
          >
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
