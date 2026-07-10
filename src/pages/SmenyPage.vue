<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Plus,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  Send,
  LayoutTemplate,
  Loader2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import ShiftTemplatesDialog from '@/components/app/ShiftTemplatesDialog.vue'
import { useShifts, type ShiftInput } from '@/composables/useShifts'
import { useApi } from '@/composables/useApi'
import { useLocations } from '@/composables/useLocations'
import { isApiMode } from '@/lib/http'
import { downloadCsv } from '@/lib/csv-export'
import {
  shiftHours,
  shiftWage,
  effectiveRate,
  buildPayrollPreview,
  totals,
  calculateCommission,
} from '@/lib/shifts'
import { formatCZK } from '@/lib/invoice'
import type { Shift, ShiftTemplate, Sale, Employee } from '@/lib/types'

// --- date helpery (lokální čas) ---
const CZ_DAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // 0 = pondělí
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function localToIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0).toISOString()
}
function isoLocalDate(iso: string): string {
  return ymd(new Date(iso))
}
function isoLocalTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
// Overnight směny (např. bar 18:00–02:00): když je čas konce ≤ času začátku, konec patří na
// následující den — jinak by vyšla nulová délka a nešlo by je naplánovat ani editovat.
function computeEndsAt(dateStr: string, start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const rollsOver = [sh, sm, eh, em].every((n) => Number.isFinite(n)) && eh * 60 + em < sh * 60 + sm
  const endDateStr = rollsOver ? ymd(addDays(new Date(`${dateStr}T00:00:00`), 1)) : dateStr
  return localToIso(endDateStr, end)
}

const { shifts, load, create, update, remove, publish } = useShifts()
const employeesApi = useApi<Employee>('employees')
const salesApi = useApi<Sale>('sales')
const { locations, load: loadLocations } = useLocations()

const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const publishing = ref(false)
const busy = ref(false)

const employees = ref<Employee[]>([])
const sales = ref<Sale[]>([])
const commissionRate = ref(0)

const weekStart = ref(mondayOf(new Date()))
const selectedLocationId = ref<string | null>(null)
const templatesOpen = ref(false)

const weekDays = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)))
const weekRange = computed(() => ({
  from: localToIso(ymd(weekStart.value), '00:00'),
  to: localToIso(ymd(addDays(weekStart.value, 6)), '23:59'),
}))
const weekLabel = computed(() => {
  const a = weekStart.value
  const b = addDays(weekStart.value, 6)
  return `${a.getDate()}. ${a.getMonth() + 1}. – ${b.getDate()}. ${b.getMonth() + 1}. ${b.getFullYear()}`
})

const employeeById = computed(() => new Map(employees.value.map((e) => [e.id, e])))
const shiftEmployeeIds = computed(() => new Set(shifts.value.map((s) => s.employeeId)))
// Řádky mřížky = aktivní zaměstnanci + ti, kdo mají v týdnu směnu (ať se skrytím neztratí).
const rowEmployees = computed(() =>
  employees.value.filter((e) => e.isActive || shiftEmployeeIds.value.has(e.id)),
)
const activeEmployees = computed(() => employees.value.filter((e) => e.isActive))

const payroll = computed(() => buildPayrollPreview(shifts.value, employees.value))
const weekTotals = computed(() => totals(shifts.value, employees.value))
const draftCount = computed(() => shifts.value.filter((s) => s.status === 'Draft').length)
const commissions = computed(() =>
  calculateCommission(sales.value, employees.value, commissionRate.value),
)

function empName(id: string): string {
  return employeeById.value.get(id)?.fullName ?? 'Neznámý'
}
function cellShifts(employeeId: string, day: Date): Shift[] {
  const key = ymd(day)
  return shifts.value
    .filter((s) => s.employeeId === employeeId && isoLocalDate(s.startsAt) === key)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}
function dayShifts(day: Date): Shift[] {
  const key = ymd(day)
  return shifts.value
    .filter((s) => isoLocalDate(s.startsAt) === key)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

async function loadWeek(): Promise<void> {
  await load({
    from: weekRange.value.from,
    to: weekRange.value.to,
    locationId: selectedLocationId.value,
  })
}

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([loadLocations(), loadEmployees()])
    // Výchozí pobočka = první, pokud firma nějakou má.
    if (selectedLocationId.value === null && locations.value.length) {
      selectedLocationId.value = locations.value[0].id
    }
    await loadWeek()
    await loadCommission()
  } catch (e) {
    console.warn('Načtení plánovače selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function loadEmployees(): Promise<void> {
  try {
    employees.value = await employeesApi.list()
  } catch {
    employees.value = []
  }
}

// Provize je doplněk (potřebuje prodeje s employeeId, prakticky jen API režim) — výpadek nesmí shodit stránku.
async function loadCommission(): Promise<void> {
  try {
    sales.value = isApiMode() ? await salesApi.listAll() : []
  } catch {
    sales.value = []
  }
}

onMounted(reload)

async function changeWeek(deltaWeeks: number): Promise<void> {
  weekStart.value = addDays(weekStart.value, deltaWeeks * 7)
  await loadWeek()
}
async function goToday(): Promise<void> {
  weekStart.value = mondayOf(new Date())
  await loadWeek()
}
async function onLocationChange(): Promise<void> {
  await loadWeek()
}

// --- dialog směny ---
const dialogOpen = ref(false)
const editing = ref<Shift | null>(null)
const emptyForm = {
  employeeId: '',
  date: '',
  start: '08:00',
  end: '16:00',
  position: '',
  hourlyRateOverride: '' as number | '',
  note: '',
}
const form = reactive({ ...emptyForm })

function openNew(employeeId = '', day?: Date): void {
  editing.value = null
  Object.assign(form, emptyForm)
  form.employeeId = employeeId
  form.date = ymd(day ?? weekStart.value)
  const emp = employeeById.value.get(employeeId)
  if (emp?.position) form.position = emp.position
  dialogOpen.value = true
}
function openEdit(s: Shift): void {
  editing.value = s
  Object.assign(form, {
    employeeId: s.employeeId,
    date: isoLocalDate(s.startsAt),
    start: isoLocalTime(s.startsAt),
    end: isoLocalTime(s.endsAt),
    position: s.position ?? '',
    hourlyRateOverride: s.hourlyRateOverride ?? '',
    note: s.note ?? '',
  })
  dialogOpen.value = true
}

const preview = computed(() => {
  if (!form.date || !form.start || !form.end) return { hours: 0, wage: 0 }
  const draft = {
    startsAt: localToIso(form.date, form.start),
    endsAt: computeEndsAt(form.date, form.start, form.end),
    hourlyRateOverride: form.hourlyRateOverride === '' ? null : Number(form.hourlyRateOverride),
  }
  const emp = employeeById.value.get(form.employeeId)
  return { hours: shiftHours(draft), wage: shiftWage(draft, emp) }
})
const previewRate = computed(() => {
  const emp = employeeById.value.get(form.employeeId)
  return effectiveRate(
    { hourlyRateOverride: form.hourlyRateOverride === '' ? null : Number(form.hourlyRateOverride) },
    emp,
  )
})

async function save(): Promise<void> {
  if (submitting.value) return
  if (!form.employeeId) return void toast.error('Vyberte zaměstnance.')
  if (!form.date) return void toast.error('Zadejte datum.')
  const startsAt = localToIso(form.date, form.start)
  const endsAt = computeEndsAt(form.date, form.start, form.end)
  if (shiftHours({ startsAt, endsAt }) === 0)
    return void toast.error('Konec směny musí být po začátku.')

  const rate = form.hourlyRateOverride === '' ? null : Number(form.hourlyRateOverride)
  if (rate !== null && (!Number.isFinite(rate) || rate < 0))
    return void toast.error('Sazba musí být kladné číslo.')

  const input: ShiftInput = {
    employeeId: form.employeeId,
    locationId: selectedLocationId.value,
    startsAt,
    endsAt,
    position: form.position.trim() || null,
    hourlyRateOverride: rate,
    note: form.note.trim() || null,
    ...(editing.value ? { status: editing.value.status } : {}),
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
    await loadWeek()
  } catch {
    toast.error('Uložení se nezdařilo.')
  } finally {
    submitting.value = false
  }
}

// --- smazání ---
const deleteId = ref<string | null>(null)
async function onDelete(): Promise<void> {
  if (!deleteId.value || busy.value) return
  busy.value = true
  try {
    await remove(deleteId.value)
    toast.success('Směna smazána.')
    deleteId.value = null
    await loadWeek()
  } catch {
    toast.error('Smazání se nezdařilo.')
  } finally {
    busy.value = false
  }
}

// --- publikace ---
async function publishWeek(): Promise<void> {
  if (publishing.value) return
  if (draftCount.value === 0) return void toast.info('Žádné rozpracované směny k publikování.')
  publishing.value = true
  try {
    const n = await publish({ ...weekRange.value, locationId: selectedLocationId.value })
    toast.success(n > 0 ? `Publikováno ${n} ${pluralShifts(n)}.` : 'Nic k publikování.')
    await loadWeek()
  } catch {
    toast.error('Publikování se nezdařilo.')
  } finally {
    publishing.value = false
  }
}

// --- šablony ---
function onApplyTemplate(t: ShiftTemplate): void {
  templatesOpen.value = false
  const day = addDays(weekStart.value, Math.min(6, Math.max(0, t.weekday)))
  editing.value = null
  Object.assign(form, emptyForm)
  form.date = ymd(day)
  form.start = t.startTime
  form.end = t.endTime
  form.position = t.position ?? ''
  dialogOpen.value = true
}

// --- payroll export (plánovaný náklad, funguje i offline) ---
function exportPayrollCsv(): void {
  const rows = payroll.value.map((r) => [r.name, r.shifts, r.hours, r.wage])
  rows.push(['CELKEM', weekTotals.value.count, weekTotals.value.hours, weekTotals.value.wage])
  downloadCsv(
    `plan-smen-${ymd(weekStart.value)}`,
    ['Zaměstnanec', 'Směn', 'Hodiny', 'Plánovaná mzda'],
    rows,
  )
}

function pluralShifts(n: number): string {
  if (n === 1) return 'směna'
  if (n >= 2 && n <= 4) return 'směny'
  return 'směn'
}
function statusChipClass(s: Shift): string {
  return s.status === 'Published'
    ? 'bg-primary text-primary-foreground'
    : 'border border-dashed border-primary/60 bg-primary-soft text-primary'
}
</script>

<template>
  <div class="mx-auto max-w-7xl p-4 pb-24 sm:p-6 md:p-8 lg:pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Plán směn</h1>
        <p class="mt-1 text-muted-foreground">
          Naplánuj směny na pobočce, zveřejni rotu obsluze a připrav mzdové podklady.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" @click="templatesOpen = true">
          <LayoutTemplate class="h-4 w-4" /> Šablony
        </Button>
        <Button variant="coral" @click="openNew()"> <Plus class="h-4 w-4" /> Nová směna </Button>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <template v-else>
      <!-- Toolbar -->
      <div class="mt-6 flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <Button variant="ghost" size="icon" title="Předchozí týden" @click="changeWeek(-1)">
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <button
            type="button"
            class="min-w-[11rem] px-2 text-center text-sm font-medium tabular-nums"
            @click="goToday"
          >
            {{ weekLabel }}
          </button>
          <Button variant="ghost" size="icon" title="Další týden" @click="changeWeek(1)">
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" @click="goToday">Dnešní týden</Button>

        <Select
          v-if="locations.length > 1"
          v-model="selectedLocationId"
          @update:model-value="onLocationChange"
        >
          <SelectTrigger class="w-52"><SelectValue placeholder="Pobočka" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</SelectItem>
          </SelectContent>
        </Select>

        <span class="flex-1" />

        <Button variant="outline" size="sm" :disabled="!payroll.length" @click="exportPayrollCsv">
          <Download class="h-4 w-4" /> Export plánu
        </Button>
        <Button
          variant="coral"
          size="sm"
          :disabled="publishing || draftCount === 0"
          @click="publishWeek"
        >
          <Send class="h-4 w-4" /> Publikovat týden<span v-if="draftCount">
            ({{ draftCount }})</span
          >
        </Button>
      </div>

      <!-- Bez zaměstnanců -->
      <div
        v-if="!activeEmployees.length"
        class="mt-6 rounded-2xl border border-border bg-card p-10 text-center"
      >
        <CalendarClock class="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 class="mt-3 text-lg font-semibold">Zatím žádní zaměstnanci</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Zaměstnance přidáš v
          <RouterLink to="/app/dochazka" class="text-primary underline">Docházce</RouterLink>. Pak
          je tady naplánuješ na směny.
        </p>
      </div>

      <template v-else>
        <!-- Desktop mřížka -->
        <div class="mt-4 hidden overflow-x-auto rounded-2xl border border-border bg-card lg:block">
          <table class="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/40">
                <th class="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-medium">
                  Zaměstnanec
                </th>
                <th
                  v-for="(d, i) in weekDays"
                  :key="i"
                  class="px-2 py-2 text-center font-medium"
                  :class="{ 'text-primary': ymd(d) === ymd(new Date()) }"
                >
                  {{ CZ_DAYS[i] }} {{ d.getDate() }}.{{ d.getMonth() + 1 }}.
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in rowEmployees"
                :key="e.id"
                class="border-b border-border last:border-0"
              >
                <td class="sticky left-0 z-10 bg-card px-3 py-2 align-top">
                  <div class="font-medium">{{ e.fullName }}</div>
                  <div v-if="e.position" class="text-xs text-muted-foreground">
                    {{ e.position }}
                  </div>
                </td>
                <td
                  v-for="(d, i) in weekDays"
                  :key="i"
                  class="group h-16 border-l border-border/60 px-1 py-1 align-top"
                >
                  <div class="flex flex-col gap-1">
                    <button
                      v-for="s in cellShifts(e.id, d)"
                      :key="s.id"
                      type="button"
                      class="rounded-md px-1.5 py-1 text-left text-xs font-medium leading-tight"
                      :class="statusChipClass(s)"
                      @click="openEdit(s)"
                    >
                      {{ isoLocalTime(s.startsAt) }}–{{ isoLocalTime(s.endsAt) }}
                      <span v-if="s.position" class="block opacity-80">{{ s.position }}</span>
                    </button>
                    <button
                      type="button"
                      class="rounded-md border border-dashed border-transparent py-0.5 text-xs text-muted-foreground opacity-0 transition group-hover:border-border group-hover:opacity-100"
                      title="Přidat směnu"
                      @click="openNew(e.id, d)"
                    >
                      + přidat
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobilní / tablet seznam po dnech -->
        <div class="mt-4 space-y-3 lg:hidden">
          <div
            v-for="(d, i) in weekDays"
            :key="i"
            class="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div
              class="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2"
              :class="{ 'text-primary': ymd(d) === ymd(new Date()) }"
            >
              <span class="text-sm font-semibold"
                >{{ CZ_DAYS[i] }} {{ d.getDate() }}.{{ d.getMonth() + 1 }}.</span
              >
              <Button variant="ghost" size="icon" title="Přidat směnu" @click="openNew('', d)">
                <Plus class="h-4 w-4" />
              </Button>
            </div>
            <div v-if="!dayShifts(d).length" class="px-3 py-3 text-xs text-muted-foreground">
              Volno
            </div>
            <button
              v-for="s in dayShifts(d)"
              :key="s.id"
              type="button"
              class="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted/30"
              @click="openEdit(s)"
            >
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">{{ empName(s.employeeId) }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ isoLocalTime(s.startsAt) }}–{{ isoLocalTime(s.endsAt) }}
                  <span v-if="s.position"> · {{ s.position }}</span>
                </div>
              </div>
              <span
                class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                :class="
                  s.status === 'Published'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary-soft text-primary'
                "
              >
                {{ s.status === 'Published' ? 'Zveřejněno' : 'Rozpracováno' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Payroll podklad -->
        <h2 class="mt-8 text-lg font-semibold">Mzdové podklady (plán týdne)</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Směn</div>
            <div class="mt-1 text-2xl font-bold">{{ weekTotals.count }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Hodin celkem</div>
            <div class="mt-1 text-2xl font-bold">{{ weekTotals.hours }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Plánovaný mzdový náklad</div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(weekTotals.wage) }}</div>
          </div>
        </div>
        <div v-if="payroll.length" class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="r in payroll"
            :key="r.employeeId"
            class="rounded-xl border border-border bg-card p-4"
          >
            <div class="truncate font-semibold">{{ r.name }}</div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              {{ r.shifts }} {{ pluralShifts(r.shifts) }} · {{ r.hours }} h
            </div>
            <div class="mt-2 text-lg font-bold">{{ formatCZK(r.wage) }}</div>
          </div>
        </div>

        <!-- Provize z tržeb (samostatná analytika) -->
        <div class="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold">Provize z tržeb</h2>
          <label class="flex items-center gap-2 text-sm">
            <span class="text-muted-foreground">Sazba provize</span>
            <span class="flex items-center gap-1">
              <Input
                v-model.number="commissionRate"
                type="number"
                min="0"
                max="100"
                class="h-9 w-20"
              />
              <span class="text-muted-foreground">%</span>
            </span>
          </label>
        </div>
        <div
          v-if="commissions.length"
          class="mt-3 overflow-x-auto rounded-xl border border-border bg-card"
        >
          <table class="w-full min-w-[560px] text-sm">
            <thead
              class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Zaměstnanec</th>
                <th class="px-4 py-3 text-right">Prodejů</th>
                <th class="px-4 py-3 text-right">Tržby (bez DPH)</th>
                <th class="px-4 py-3 text-right">Provize</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in commissions"
                :key="c.employeeId"
                class="border-b border-border last:border-0"
              >
                <td class="px-4 py-3 font-medium">{{ c.name }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ c.salesCount }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(c.revenue) }}</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">
                  {{ formatCZK(c.commission) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-else
          class="mt-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground"
        >
          Provize se zobrazí, jakmile budou prodeje napojené na konkrétní zaměstnance.
        </p>
      </template>
    </template>

    <!-- Sticky mobilní lišta -->
    <div
      v-if="!loading && !loadError && activeEmployees.length"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 py-2 backdrop-blur lg:hidden"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div class="text-sm">
          <span class="font-semibold">{{ weekTotals.hours }} h</span>
          <span class="text-muted-foreground"> · {{ formatCZK(weekTotals.wage) }}</span>
        </div>
        <Button
          variant="coral"
          size="sm"
          :disabled="publishing || draftCount === 0"
          @click="publishWeek"
        >
          <Send class="h-4 w-4" /> Publikovat<span v-if="draftCount"> ({{ draftCount }})</span>
        </Button>
      </div>
    </div>

    <!-- Dialog směny -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit směnu' : 'Nová směna' }}</DialogTitle>
          <DialogDescription
            >Zaměstnanec, čas a volitelná sazba určí mzdový podklad.</DialogDescription
          >
        </DialogHeader>

        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label>Zaměstnanec</Label>
            <Select v-model="form.employeeId">
              <SelectTrigger><SelectValue placeholder="Vyberte zaměstnance" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="e in activeEmployees" :key="e.id" :value="e.id">
                  {{ e.fullName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="sh-date">Datum</Label>
              <Input id="sh-date" v-model="form.date" type="date" />
            </div>
            <div class="grid gap-1.5">
              <Label for="sh-pos">Pozice</Label>
              <Input id="sh-pos" v-model="form.position" placeholder="Číšník, Kuchař…" />
            </div>
            <div class="grid gap-1.5">
              <Label for="sh-start">Začátek</Label>
              <Input id="sh-start" v-model="form.start" type="time" />
            </div>
            <div class="grid gap-1.5">
              <Label for="sh-end">Konec</Label>
              <Input id="sh-end" v-model="form.end" type="time" />
            </div>
            <div class="col-span-2 grid gap-1.5">
              <Label for="sh-rate">Sazba / hod (Kč) — volitelně, jinak sazba zaměstnance</Label>
              <Input
                id="sh-rate"
                v-model="form.hourlyRateOverride"
                type="number"
                min="0"
                step="1"
              />
            </div>
          </div>
          <div class="grid gap-1.5">
            <Label for="sh-note">Poznámka</Label>
            <Textarea id="sh-note" v-model="form.note" rows="2" />
          </div>

          <div class="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span class="text-muted-foreground"
              >{{ preview.hours }} h · {{ formatCZK(previewRate) }}/h</span
            >
            <span class="font-semibold text-primary">Mzda {{ formatCZK(preview.wage) }}</span>
          </div>
        </div>

        <DialogFooter class="gap-2 sm:justify-between">
          <Button
            v-if="editing"
            variant="ghost"
            class="text-destructive"
            @click="((deleteId = editing.id), (dialogOpen = false))"
          >
            <Trash2 class="h-4 w-4" /> Smazat
          </Button>
          <span v-else />
          <div class="flex gap-2">
            <Button variant="outline" :disabled="submitting" @click="dialogOpen = false"
              >Zrušit</Button
            >
            <Button variant="coral" :disabled="submitting" @click="save">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              {{ editing ? 'Uložit' : 'Přidat' }}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Šablony -->
    <ShiftTemplatesDialog
      v-model:open="templatesOpen"
      :locations="locations"
      @apply="onApplyTemplate"
    />

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
