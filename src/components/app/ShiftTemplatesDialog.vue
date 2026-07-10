<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Pencil, Trash2, Copy, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { useShiftTemplates, type ShiftTemplateInput } from '@/composables/useShiftTemplates'
import type { Location, ShiftTemplate } from '@/lib/types'

const props = defineProps<{ open: boolean; locations: Location[] }>()
const emit = defineEmits<{ 'update:open': [boolean]; apply: [ShiftTemplate] }>()

const NO_LOCATION = '__none__'
const WEEKDAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle']

const { list, create, update, remove } = useShiftTemplates()
const templates = ref<ShiftTemplate[]>([])
const loading = ref(false)
const busy = ref(false)

const formOpen = ref(false)
const editing = ref<ShiftTemplate | null>(null)
const empty = {
  name: '',
  weekday: 0,
  startTime: '08:00',
  endTime: '16:00',
  position: '',
  locationId: NO_LOCATION,
}
const form = reactive({ ...empty })
// reka-ui Select pracuje se stringy → proxy na číselný weekday.
const weekdayStr = computed({
  get: () => String(form.weekday),
  set: (v: string) => (form.weekday = Number(v)),
})

async function reload(): Promise<void> {
  loading.value = true
  try {
    templates.value = await list()
  } catch {
    toast.error('Načtení šablon selhalo.')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      formOpen.value = false
      reload()
    }
  },
)

function openNew(): void {
  editing.value = null
  Object.assign(form, empty)
  formOpen.value = true
}
function openEdit(t: ShiftTemplate): void {
  editing.value = t
  Object.assign(form, {
    name: t.name,
    weekday: t.weekday,
    startTime: t.startTime,
    endTime: t.endTime,
    position: t.position ?? '',
    locationId: t.locationId ?? NO_LOCATION,
  })
  formOpen.value = true
}

function timeToMin(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h > 23 || min > 59 ? null : h * 60 + min
}

async function save(): Promise<void> {
  if (busy.value) return
  if (!form.name.trim()) return void toast.error('Zadejte název šablony.')
  const a = timeToMin(form.startTime)
  const b = timeToMin(form.endTime)
  if (a === null || b === null || b <= a) return void toast.error('Konec musí být po začátku.')

  const input: ShiftTemplateInput = {
    name: form.name.trim(),
    weekday: form.weekday,
    startTime: form.startTime,
    endTime: form.endTime,
    position: form.position.trim() || null,
    locationId: form.locationId === NO_LOCATION ? null : form.locationId,
  }
  busy.value = true
  try {
    if (editing.value) await update(editing.value.id, input)
    else await create(input)
    toast.success('Šablona uložena.')
    formOpen.value = false
    await reload()
  } catch {
    toast.error('Uložení šablony selhalo.')
  } finally {
    busy.value = false
  }
}

async function onDelete(t: ShiftTemplate): Promise<void> {
  if (busy.value) return
  busy.value = true
  try {
    await remove(t.id)
    templates.value = templates.value.filter((x) => x.id !== t.id)
    toast.success('Šablona smazána.')
  } catch {
    toast.error('Smazání selhalo.')
  } finally {
    busy.value = false
  }
}

function locationName(id: string | null): string {
  if (!id) return 'Bez pobočky'
  return props.locations.find((l) => l.id === id)?.name ?? 'Pobočka'
}
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="max-h-[90vh] max-w-lg overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Šablony směn</DialogTitle>
        <DialogDescription>
          Opakované vzory směn. „Použít" vloží směnu do zobrazeného týdne — stačí vybrat
          zaměstnance.
        </DialogDescription>
      </DialogHeader>

      <div v-if="loading" class="flex justify-center py-8">
        <Loader2 class="h-5 w-5 animate-spin text-primary" />
      </div>

      <template v-else>
        <div
          v-if="!templates.length && !formOpen"
          class="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
        >
          Zatím žádné šablony.
        </div>

        <div v-else-if="!formOpen" class="space-y-2">
          <div
            v-for="t in templates"
            :key="t.id"
            class="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
          >
            <div class="min-w-0">
              <div class="truncate font-medium">{{ t.name }}</div>
              <div class="text-xs text-muted-foreground">
                {{ WEEKDAYS[t.weekday] }} · {{ t.startTime }}–{{ t.endTime }}
                <span v-if="t.position"> · {{ t.position }}</span>
                <span> · {{ locationName(t.locationId) }}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <Button variant="outline" size="sm" title="Použít" @click="emit('apply', t)">
                <Copy class="h-4 w-4" /> Použít
              </Button>
              <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(t)">
                <Pencil class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Smazat"
                :disabled="busy"
                @click="onDelete(t)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <!-- Formulář -->
        <div v-if="formOpen" class="space-y-3">
          <div class="grid gap-1.5">
            <Label for="tpl-name">Název</Label>
            <Input id="tpl-name" v-model="form.name" placeholder="Ranní bar" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label>Den v týdnu</Label>
              <Select v-model="weekdayStr">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="(d, i) in WEEKDAYS" :key="i" :value="String(i)">{{
                    d
                  }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-1.5">
              <Label for="tpl-pos">Pozice</Label>
              <Input id="tpl-pos" v-model="form.position" placeholder="Číšník…" />
            </div>
            <div class="grid gap-1.5">
              <Label for="tpl-start">Začátek</Label>
              <Input id="tpl-start" v-model="form.startTime" type="time" />
            </div>
            <div class="grid gap-1.5">
              <Label for="tpl-end">Konec</Label>
              <Input id="tpl-end" v-model="form.endTime" type="time" />
            </div>
            <div v-if="locations.length" class="col-span-2 grid gap-1.5">
              <Label>Pobočka</Label>
              <Select v-model="form.locationId">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem :value="NO_LOCATION">Bez pobočky</SelectItem>
                  <SelectItem v-for="l in locations" :key="l.id" :value="l.id">{{
                    l.name
                  }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" :disabled="busy" @click="formOpen = false">Zrušit</Button>
            <Button variant="coral" :disabled="busy" @click="save">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit
            </Button>
          </div>
        </div>

        <Button v-if="!formOpen" variant="coral" class="w-full" @click="openNew">
          <Plus class="h-4 w-4" /> Nová šablona
        </Button>
      </template>
    </DialogContent>
  </Dialog>
</template>
