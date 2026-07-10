<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Loader2, AlertTriangle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { useAttendance } from '@/composables/useAttendance'
import { ApiError } from '@/lib/http'
import type { AttendanceException, AttendanceExceptionKind } from '@/lib/types'

const att = useAttendance()

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const today = new Date()
const from = ref(ymd(new Date(today.getFullYear(), today.getMonth(), 1)))
const to = ref(ymd(new Date(today.getFullYear(), today.getMonth() + 1, 0)))

const items = ref<AttendanceException[]>([])
const loading = ref(false)
const loaded = ref(false)

const KIND: Record<AttendanceExceptionKind, { label: string; cls: string }> = {
  MissingClockOut: {
    label: 'Chybějící odchod',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  },
  Overtime: {
    label: 'Přesčas',
    cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  },
  PlanVsActualVariance: {
    label: 'Plán vs. realita',
    cls: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
  },
}

function minutes(m: number | null): string {
  if (m == null) return '—'
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

async function reload(): Promise<void> {
  loading.value = true
  try {
    const fromIso = new Date(`${from.value}T00:00:00`).toISOString()
    const toIso = new Date(`${to.value}T23:59:59`).toISOString()
    items.value = await att.exceptions({ from: fromIso, to: toIso })
    loaded.value = true
  } catch (e) {
    if (e instanceof ApiError && e.status === 403)
      toast.error('Na přehled výjimek nemáte oprávnění.')
    else toast.error('Načtení výjimek selhalo.')
    console.error(e)
  } finally {
    loading.value = false
  }
}
onMounted(reload)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end gap-3">
      <div class="space-y-1">
        <Label for="exc-from">Od</Label>
        <Input id="exc-from" v-model="from" type="date" class="w-40" />
      </div>
      <div class="space-y-1">
        <Label for="exc-to">Do</Label>
        <Input id="exc-to" v-model="to" type="date" class="w-40" />
      </div>
      <Button variant="outline" :disabled="loading" @click="reload">Načíst</Button>
    </div>

    <p class="mt-3 text-sm text-muted-foreground">
      Odchylky docházky za období: chybějící odchod, přesčas (nad 9 h/den) a rozdíl plánu proti
      realitě.
    </p>

    <div v-if="loading" class="mt-6 flex justify-center p-8">
      <Loader2 class="h-5 w-5 animate-spin text-primary" />
    </div>

    <div
      v-else-if="loaded && !items.length"
      class="mt-4 rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"
    >
      <AlertTriangle class="mx-auto h-8 w-8 text-success" />
      <p class="mt-2">Žádné výjimky za vybrané období. 👍</p>
    </div>

    <div v-else class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Zaměstnanec</th>
              <th class="px-4 py-3 text-left">Datum</th>
              <th class="px-4 py-3 text-left">Typ</th>
              <th class="px-4 py-3 text-right">Plán</th>
              <th class="px-4 py-3 text-right">Realita</th>
              <th class="px-4 py-3 text-left">Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(x, i) in items"
              :key="`${x.employeeId}-${x.date}-${x.kind}-${i}`"
              class="border-b border-border last:border-0"
            >
              <td class="px-4 py-3 font-medium">{{ x.employeeName }}</td>
              <td class="px-4 py-3 tabular-nums text-muted-foreground">{{ x.date }}</td>
              <td class="px-4 py-3">
                <span class="rounded px-2 py-0.5 text-xs font-medium" :class="KIND[x.kind].cls">
                  {{ KIND[x.kind].label }}
                </span>
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {{ minutes(x.plannedMinutes) }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {{ minutes(x.actualMinutes) }}
              </td>
              <td class="px-4 py-3 text-muted-foreground">{{ x.detail }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
