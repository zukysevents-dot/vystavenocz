<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Loader2, Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { useAttendance } from '@/composables/useAttendance'
import { ApiError } from '@/lib/http'
import type { AttendanceRecord, Employee } from '@/lib/types'

const props = defineProps<{ employees: Employee[] }>()

const att = useAttendance()
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const records = ref<AttendanceRecord[]>([])
const loading = ref(false)
const busy = ref(false)

const nameById = computed(() => new Map(props.employees.map((e) => [e.id, e.fullName])))
function empName(id: string): string {
  return nameById.value.get(id) ?? 'Neznámý zaměstnanec'
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function monthRange(): { from: string; to: string } {
  const from = new Date(year.value, month.value - 1, 1, 0, 0, 0).toISOString()
  const to = new Date(year.value, month.value, 0, 23, 59, 59).toISOString()
  return { from, to }
}
function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function localInputToIso(v: string): string {
  return new Date(v).toISOString()
}
function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function reload(): Promise<void> {
  loading.value = true
  try {
    const { from, to } = monthRange()
    const res = await att.records({ from, to, pageSize: 100, sort: '-start' })
    records.value = res.items
  } catch (e) {
    if (e instanceof ApiError && e.status === 403)
      toast.error('Na opravy docházky nemáte oprávnění.')
    else toast.error('Načtení záznamů selhalo.')
    console.error(e)
  } finally {
    loading.value = false
  }
}
onMounted(reload)

// --- oprava ---
const dialogOpen = ref(false)
const editing = ref<AttendanceRecord | null>(null)
const form = reactive({ clockInAt: '', clockOutAt: '' })

function openEdit(r: AttendanceRecord): void {
  editing.value = r
  form.clockInAt = isoToLocalInput(r.clockInAt)
  form.clockOutAt = r.clockOutAt ? isoToLocalInput(r.clockOutAt) : ''
  dialogOpen.value = true
}

async function save(): Promise<void> {
  if (!editing.value || busy.value) return
  if (!form.clockInAt) return void toast.error('Zadejte čas příchodu.')
  const clockInAt = localInputToIso(form.clockInAt)
  const clockOutAt = form.clockOutAt ? localInputToIso(form.clockOutAt) : null
  if (clockOutAt && Date.parse(clockOutAt) <= Date.parse(clockInAt))
    return void toast.error('Odchod musí být po příchodu.')
  busy.value = true
  try {
    await att.correctRecord(editing.value.id, { clockInAt, clockOutAt })
    toast.success('Docházka opravena (zapsáno do auditu).')
    dialogOpen.value = false
    await reload()
  } catch (e) {
    if (e instanceof ApiError && e.status === 403)
      toast.error('Nemáte oprávnění upravit tuto docházku.')
    else if (e instanceof ApiError && e.status === 422) toast.error('Neplatné časy.')
    else toast.error('Oprava selhala.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

function workedLabel(r: AttendanceRecord): string {
  if (!r.clockOutAt) return 'otevřená'
  const min = Math.max(0, Math.round((Date.parse(r.clockOutAt) - Date.parse(r.clockInAt)) / 60000))
  const brk = (r.breaks ?? []).reduce((sum, b) => {
    if (!b.endAt) return sum
    return sum + Math.max(0, Math.round((Date.parse(b.endAt) - Date.parse(b.startAt)) / 60000))
  }, 0)
  const net = Math.max(0, min - brk)
  return `${Math.floor(net / 60)} h ${net % 60} min`
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end gap-3">
      <div class="space-y-1">
        <Label for="corr-y">Rok</Label>
        <Input id="corr-y" v-model.number="year" type="number" class="w-24" />
      </div>
      <div class="space-y-1">
        <Label for="corr-m">Měsíc</Label>
        <Input id="corr-m" v-model.number="month" type="number" :min="1" :max="12" class="w-20" />
      </div>
      <Button variant="outline" :disabled="loading" @click="reload">Načíst</Button>
    </div>

    <p class="mt-3 text-sm text-muted-foreground">
      Oprava přepíše časy příchodu/odchodu a zapíše se do auditu. Manažer opravuje jen svou pobočku.
    </p>

    <div v-if="loading" class="mt-6 flex justify-center p-8">
      <Loader2 class="h-5 w-5 animate-spin text-primary" />
    </div>

    <div v-else class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div v-if="!records.length" class="p-10 text-center text-muted-foreground">
        Žádné záznamy docházky za vybraný měsíc.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[640px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Zaměstnanec</th>
              <th class="px-4 py-3 text-left">Příchod</th>
              <th class="px-4 py-3 text-left">Odchod</th>
              <th class="px-4 py-3 text-right">Odpracováno</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in records"
              :key="r.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ empName(r.employeeId) }}</td>
              <td class="px-4 py-3 tabular-nums text-muted-foreground">{{ fmt(r.clockInAt) }}</td>
              <td class="px-4 py-3 tabular-nums text-muted-foreground">
                <span :class="{ 'text-amber-600 dark:text-amber-400': !r.clockOutAt }">{{
                  fmt(r.clockOutAt)
                }}</span>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ workedLabel(r) }}</td>
              <td class="px-4 py-3 text-right">
                <Button variant="ghost" size="icon" title="Opravit" @click="openEdit(r)">
                  <Pencil class="h-4 w-4" />
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Opravit docházku</DialogTitle>
          <DialogDescription>
            {{ editing ? empName(editing.employeeId) : '' }} — změna se zapíše do auditu.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="corr-in">Příchod</Label>
            <Input id="corr-in" v-model="form.clockInAt" type="datetime-local" />
          </div>
          <div class="grid gap-1.5">
            <Label for="corr-out">Odchod (prázdné = nechat otevřenou)</Label>
            <Input id="corr-out" v-model="form.clockOutAt" type="datetime-local" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="busy" @click="dialogOpen = false">Zrušit</Button>
          <Button variant="coral" :disabled="busy" @click="save">
            <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit opravu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
