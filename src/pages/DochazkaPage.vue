<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  LogIn,
  LogOut,
  Coffee,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Download,
  UserCog,
  Play,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useAttendance, type EmployeeInput } from '@/composables/useAttendance'
import { useAuthStore } from '@/stores/auth'
import { isApiMode, ApiError } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import type { AttendanceRecord, AttendanceSummary, Employee } from '@/lib/types'

const att = useAttendance()
const auth = useAuthStore()
const apiMode = isApiMode()

const loading = ref(true)
const busy = ref(false)
const tab = ref<'clock' | 'employees' | 'summary'>('clock')
const TABS = [
  { v: 'clock', l: 'Píchačka' },
  { v: 'employees', l: 'Zaměstnanci' },
  { v: 'summary', l: 'Přehled' },
] as const
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const record = ref<AttendanceRecord | null>(null)
const notEmployee = ref(false)
const employees = ref<Employee[]>([])

const openBreak = computed(() => {
  const bs = record.value?.breaks ?? []
  const last = bs[bs.length - 1]
  return last && last.endAt === null ? last : null
})

async function loadCurrent() {
  try {
    record.value = await att.current()
    notEmployee.value = false
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      notEmployee.value = true
      record.value = null
    } else {
      console.error(e)
    }
  }
}
async function loadEmployees() {
  try {
    employees.value = await att.employees()
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  if (!apiMode) {
    loading.value = false
    return
  }
  await Promise.all([loadCurrent(), loadEmployees()])
  loading.value = false
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// --- Píchačka ---
async function doClock(fn: () => Promise<unknown>, okMsg: string) {
  if (busy.value) return
  busy.value = true
  try {
    await fn()
    await loadCurrent()
    toast.success(okMsg)
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      notEmployee.value = true
      toast.error('Nejste evidovaný zaměstnanec.')
    } else if (e instanceof ApiError && e.status === 409) {
      toast.error('Tuto akci teď nelze provést.')
    } else {
      toast.error('Akce selhala.')
    }
    console.error(e)
  } finally {
    busy.value = false
  }
}

function hm(iso: string): string {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}
function durationSince(iso: string): string {
  const min = Math.max(0, Math.floor((now.value - new Date(iso).getTime()) / 60000))
  return `${Math.floor(min / 60)} h ${min % 60} min`
}
function fmtMinutes(m: number): string {
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

// --- Zaměstnanci ---
const empDialogOpen = ref(false)
const editingEmp = ref<Employee | null>(null)
const empForm = reactive({ fullName: '', isActive: true, linkMe: false })
const deleteEmpId = ref<string | null>(null)

function openAddEmp(linkMe = false) {
  editingEmp.value = null
  empForm.fullName = ''
  empForm.isActive = true
  empForm.linkMe = linkMe
  empDialogOpen.value = true
}
function openEditEmp(e: Employee) {
  editingEmp.value = e
  empForm.fullName = e.fullName
  empForm.isActive = e.isActive
  empForm.linkMe = e.userId === auth.user?.id
  empDialogOpen.value = true
}
async function submitEmp() {
  if (!empForm.fullName.trim()) return toast.error('Zadejte jméno.')
  // linkMe → navázat na můj účet; jinak zachovat existující (cizí) vazbu, nebo žádnou.
  const keptUserId =
    editingEmp.value?.userId && editingEmp.value.userId !== auth.user?.id
      ? editingEmp.value.userId
      : null
  const input: EmployeeInput = {
    fullName: empForm.fullName.trim(),
    isActive: empForm.isActive,
    userId: empForm.linkMe ? (auth.user?.id ?? null) : keptUserId,
  }
  busy.value = true
  try {
    if (editingEmp.value) await att.updateEmployee(editingEmp.value.id, input)
    else await att.createEmployee(input)
    await loadEmployees()
    await loadCurrent()
    empDialogOpen.value = false
    toast.success('Uloženo.')
  } catch (e) {
    if (e instanceof ApiError && e.status === 409)
      toast.error('Tento uživatel je už navázán na jiného zaměstnance.')
    else toast.error('Uložení selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
}
async function confirmDeleteEmp() {
  if (!deleteEmpId.value) return
  try {
    await att.removeEmployee(deleteEmpId.value)
    employees.value = employees.value.filter((e) => e.id !== deleteEmpId.value)
    toast.success('Zaměstnanec smazán.')
  } catch (e) {
    toast.error('Smazání selhalo.')
    console.error(e)
  } finally {
    deleteEmpId.value = null
  }
}

// --- Přehled ---
const d = new Date()
const year = ref(d.getFullYear())
const month = ref(d.getMonth() + 1)
const summary = ref<AttendanceSummary | null>(null)

async function loadSummary() {
  busy.value = true
  try {
    summary.value = await att.summary(year.value, month.value)
  } catch (e) {
    toast.error('Načtení přehledu selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
}
function showSummary() {
  tab.value = 'summary'
  if (!summary.value) loadSummary()
}
async function exportCsv() {
  try {
    await att.exportCsv(year.value, month.value)
  } catch (e) {
    toast.error('Export selhal.')
    console.error(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
    <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Docházka</h1>

    <div
      v-if="!apiMode"
      class="mt-6 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      Docházka potřebuje připojení k serveru.
    </div>

    <template v-else>
      <div class="mt-6 flex flex-wrap gap-2">
        <button
          v-for="t in TABS"
          :key="t.v"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tab === t.v
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="t.v === 'summary' ? showSummary() : (tab = t.v)"
        >
          {{ t.l }}
        </button>
      </div>

      <div v-if="loading" class="mt-6 flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <!-- PÍCHAČKA -->
      <template v-else-if="tab === 'clock'">
        <div
          v-if="notEmployee"
          class="mt-6 rounded-2xl border border-border bg-card p-8 text-center"
        >
          <UserCog class="mx-auto h-10 w-10 text-muted-foreground" />
          <p class="mt-3 font-semibold">Nejste evidovaný zaměstnanec</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Pro píchání přidejte sebe jako zaměstnance (navázáno na váš účet).
          </p>
          <Button variant="coral" class="mt-4" @click="openAddEmp(true)">
            <Plus class="h-4 w-4" /> Přidat sebe
          </Button>
        </div>

        <!-- otevřená docházka -->
        <div
          v-else-if="record"
          class="mt-6 rounded-2xl border-2 p-6 text-center"
          :class="openBreak ? 'border-amber-400 bg-amber-50/50' : 'border-success bg-success/5'"
        >
          <p class="text-sm text-muted-foreground">
            {{ openBreak ? 'Na pauze od' : 'Pracujete od' }}
            {{ hm(openBreak ? openBreak.startAt : record.clockInAt) }}
          </p>
          <p class="mt-1 text-3xl font-bold tabular-nums">
            {{ durationSince(openBreak ? openBreak.startAt : record.clockInAt) }}
          </p>
          <div class="mt-5 flex justify-center gap-2">
            <Button
              v-if="!openBreak"
              variant="outline"
              :disabled="busy"
              @click="doClock(att.startBreak, 'Pauza zahájena.')"
            >
              <Coffee class="h-4 w-4" /> Pauza
            </Button>
            <Button
              v-else
              variant="outline"
              :disabled="busy"
              @click="doClock(att.endBreak, 'Pauza ukončena.')"
            >
              <Play class="h-4 w-4" /> Konec pauzy
            </Button>
            <Button
              variant="coral"
              :disabled="busy"
              @click="doClock(att.clockOut, 'Odchod zaznamenán.')"
            >
              <LogOut class="h-4 w-4" /> Odchod
            </Button>
          </div>
        </div>

        <!-- bez docházky -->
        <div v-else class="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <p class="text-muted-foreground">Nemáte otevřenou docházku.</p>
          <Button
            variant="coral"
            size="lg"
            class="mt-4"
            :disabled="busy"
            @click="doClock(att.clockIn, 'Příchod zaznamenán.')"
          >
            <LogIn class="h-4 w-4" /> Příchod
          </Button>
        </div>
      </template>

      <!-- ZAMĚSTNANCI -->
      <template v-else-if="tab === 'employees'">
        <div class="mt-4 flex justify-end">
          <Button variant="coral" @click="openAddEmp(false)"
            ><Plus class="h-4 w-4" /> Nový zaměstnanec</Button
          >
        </div>
        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div v-if="!employees.length" class="p-12 text-center text-muted-foreground">
            Zatím žádní zaměstnanci.
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="e in employees"
              :key="e.id"
              class="flex items-center justify-between gap-3 p-4 hover:bg-muted/40"
            >
              <div>
                <div class="flex items-center gap-2 font-semibold">
                  {{ e.fullName }}
                  <span
                    v-if="e.userId === auth.user?.id"
                    class="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary"
                    >to jsem já</span
                  >
                  <span
                    v-if="!e.isActive"
                    class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >neaktivní</span
                  >
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ e.userId ? 'navázán na účet' : 'bez účtu (jen evidence)' }}
                </div>
              </div>
              <div class="flex items-center gap-1">
                <Button variant="ghost" size="icon" title="Upravit" @click="openEditEmp(e)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Smazat" @click="deleteEmpId = e.id">
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- PŘEHLED -->
      <template v-else>
        <div class="mt-4 flex flex-wrap items-end gap-3">
          <div class="space-y-1">
            <Label for="y">Rok</Label>
            <Input id="y" v-model.number="year" type="number" class="w-24" />
          </div>
          <div class="space-y-1">
            <Label for="m">Měsíc</Label>
            <Input id="m" v-model.number="month" type="number" :min="1" :max="12" class="w-20" />
          </div>
          <Button variant="outline" :disabled="busy" @click="loadSummary">Načíst</Button>
          <span class="flex-1" />
          <Button variant="outline" @click="exportCsv"
            ><Download class="h-4 w-4" /> Export CSV</Button
          >
        </div>

        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div
            v-if="!summary || !summary.items.length"
            class="p-12 text-center text-muted-foreground"
          >
            Žádná data za vybraný měsíc.
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="i in summary.items"
              :key="i.employeeId"
              class="flex items-center justify-between gap-3 p-4"
            >
              <div class="font-medium">{{ i.employeeName }}</div>
              <div class="font-semibold tabular-nums">{{ fmtMinutes(i.workedMinutes) }}</div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Dialog zaměstnance -->
    <Dialog v-model:open="empDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingEmp ? 'Upravit zaměstnance' : 'Nový zaměstnanec' }}</DialogTitle>
          <DialogDescription>Jméno a vazba na uživatelský účet pro píchání.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitEmp">
          <div class="space-y-2">
            <Label for="emp-name">Jméno a příjmení *</Label>
            <Input id="emp-name" v-model="empForm.fullName" required placeholder="Jan Novák" />
          </div>
          <label class="flex items-center gap-2 text-sm">
            <Checkbox v-model="empForm.linkMe" /> Navázat na můj účet (abych mohl/a píchat)
          </label>
          <label class="flex items-center gap-2 text-sm">
            <Checkbox v-model="empForm.isActive" /> Aktivní
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="empDialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="!!deleteEmpId" @update:open="(o) => !o && (deleteEmpId = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat zaměstnance?</AlertDialogTitle>
          <AlertDialogDescription>Záznamy docházky zůstanou zachovány.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDeleteEmp"
          >
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
