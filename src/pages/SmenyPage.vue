<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, CalendarClock, Pencil, Trash2, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useShifts, type ShiftInput } from '@/composables/useShifts'
import { shiftHours, shiftWage, summarizeByEmployee, totals } from '@/lib/shifts'
import { formatCZK, formatDate } from '@/lib/invoice'
import type { Shift } from '@/lib/types'

const { shifts, load, create, update, remove } = useShifts()
const loading = ref(true)
const dialogOpen = ref(false)
const editing = ref<Shift | null>(null)
const deleteId = ref<string | null>(null)
const submitting = ref(false)
const deleting = ref(false)

const emptyForm = {
  employeeName: '',
  date: '',
  start: '08:00',
  end: '16:00',
  hourlyRate: 0,
  note: '',
}
const form = reactive({ ...emptyForm })

onMounted(async () => {
  await load()
  loading.value = false
})

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Seřazené směny (nejnovější datum nahoře, pak podle začátku).
const sortedShifts = computed(() =>
  [...shifts.value].sort((a, b) => b.date.localeCompare(a.date) || a.start.localeCompare(b.start)),
)
const summary = computed(() => totals(shifts.value))
const byEmployee = computed(() => summarizeByEmployee(shifts.value))

// Živý náhled hodin + mzdy ve formuláři.
const preview = computed(() => {
  const s = { ...form, id: '', note: null, createdAt: '', updatedAt: '' } as Shift
  return { hours: shiftHours(s), wage: shiftWage({ ...s, hourlyRate: num(form.hourlyRate) }) }
})

function openNew() {
  editing.value = null
  Object.assign(form, emptyForm)
  dialogOpen.value = true
}
function openEdit(s: Shift) {
  editing.value = s
  Object.assign(form, {
    employeeName: s.employeeName,
    date: s.date,
    start: s.start,
    end: s.end,
    hourlyRate: s.hourlyRate,
    note: s.note ?? '',
  })
  dialogOpen.value = true
}

async function save() {
  if (submitting.value) return
  if (!form.employeeName.trim()) return toast.error('Zadejte jméno zaměstnance.')
  if (!form.date) return toast.error('Zadejte datum.')
  if (num(form.hourlyRate) <= 0) return toast.error('Zadejte sazbu za hodinu.')
  if (shiftHours({ ...form, id: '', note: null, createdAt: '', updatedAt: '' } as Shift) === 0)
    return toast.error('Konec směny musí být po začátku.')

  const input: ShiftInput = {
    employeeName: form.employeeName.trim(),
    date: form.date,
    start: form.start,
    end: form.end,
    hourlyRate: num(form.hourlyRate),
    note: form.note.trim() || null,
  }
  submitting.value = true
  try {
    if (editing.value) {
      await update(editing.value.id, input)
      toast.success('Směna upravena.')
    } else {
      await create(input)
      toast.success('Směna přidána.')
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
    toast.success('Směna smazána.')
    deleteId.value = null
  } catch {
    toast.error('Smazání se nezdařilo.')
  } finally {
    deleting.value = false
  }
}

/** České skloňování: 1 směna / 2–4 směny / 5+ směn. */
function pluralShifts(n: number): string {
  if (n === 1) return 'směna'
  if (n >= 2 && n <= 4) return 'směny'
  return 'směn'
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Směny &amp; provize</h1>
        <p class="mt-1 text-muted-foreground">Plánování směn a mzdové podklady.</p>
      </div>
      <Button variant="coral" @click="openNew"> <Plus class="h-4 w-4" /> Nová směna </Button>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div
      v-else-if="shifts.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <CalendarClock class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Zatím žádné směny</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Naplánuj směnu a uvidíš hodiny i mzdový náklad.
      </p>
      <Button variant="coral" class="mt-4" @click="openNew"
        ><Plus class="h-4 w-4" /> Nová směna</Button
      >
    </div>

    <template v-else>
      <!-- Souhrn -->
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Směn</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.count }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Hodin celkem</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.hours }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Mzdový náklad</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.wage) }}</div>
        </div>
      </div>

      <!-- Po zaměstnancích -->
      <h2 class="mt-8 text-lg font-semibold">Mzdové podklady</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="e in byEmployee"
          :key="e.name"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="truncate font-semibold">{{ e.name }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">
                {{ e.shifts }} {{ pluralShifts(e.shifts) }} · {{ e.hours }} h
              </div>
            </div>
          </div>
          <div class="mt-2 text-lg font-bold">{{ formatCZK(e.wage) }}</div>
        </div>
      </div>

      <!-- Seznam směn -->
      <h2 class="mt-8 text-lg font-semibold">Naplánované směny</h2>
      <div class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full min-w-[640px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Zaměstnanec</th>
              <th class="px-4 py-3 text-left">Datum</th>
              <th class="px-4 py-3 text-left">Čas</th>
              <th class="px-4 py-3 text-right">Hodin</th>
              <th class="px-4 py-3 text-right">Mzda</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in sortedShifts"
              :key="s.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ s.employeeName }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ formatDate(s.date) }}</td>
              <td class="px-4 py-3 text-muted-foreground tabular-nums">
                {{ s.start }}–{{ s.end }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ shiftHours(s) }}</td>
              <td class="px-4 py-3 text-right font-semibold">{{ formatCZK(shiftWage(s)) }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(s)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Smazat" @click="deleteId = s.id">
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
          <DialogTitle>{{ editing ? 'Upravit směnu' : 'Nová směna' }}</DialogTitle>
          <DialogDescription>Čas a sazba určí mzdový podklad.</DialogDescription>
        </DialogHeader>

        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="sh-emp">Zaměstnanec</Label>
            <Input id="sh-emp" v-model="form.employeeName" placeholder="Jméno" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="sh-date">Datum</Label>
              <Input id="sh-date" v-model="form.date" type="date" />
            </div>
            <div class="grid gap-1.5">
              <Label for="sh-rate">Sazba / hod (Kč)</Label>
              <Input id="sh-rate" v-model.number="form.hourlyRate" type="number" min="0" />
            </div>
            <div class="grid gap-1.5">
              <Label for="sh-start">Začátek</Label>
              <Input id="sh-start" v-model="form.start" type="time" />
            </div>
            <div class="grid gap-1.5">
              <Label for="sh-end">Konec</Label>
              <Input id="sh-end" v-model="form.end" type="time" />
            </div>
          </div>
          <div class="grid gap-1.5">
            <Label for="sh-note">Poznámka</Label>
            <Textarea id="sh-note" v-model="form.note" rows="2" />
          </div>

          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span class="text-muted-foreground">{{ preview.hours }} h</span>
            <span class="font-semibold text-primary">Mzda {{ formatCZK(preview.wage) }}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="submitting" @click="dialogOpen = false"
            >Zrušit</Button
          >
          <Button variant="coral" :disabled="submitting" @click="save">
            {{ editing ? 'Uložit' : 'Přidat' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="!!deleteId" @update:open="(o: boolean) => !o && (deleteId = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat směnu?</AlertDialogTitle>
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
