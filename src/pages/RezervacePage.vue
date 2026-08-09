<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Plus, Loader2, Pencil, Trash2, CalendarDays, Clock } from 'lucide-vue-next'
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
import {
  useReservations,
  type ReservationInput,
  type ServiceInput,
} from '@/composables/useReservations'
import { isApiMode, ApiError } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type { Reservation, ReservationStatus, Resource, Service } from '@/lib/types'

const api = useReservations()
const apiMode = isApiMode()

const loading = ref(true)
const busy = ref(false)
const tab = ref<'calendar' | 'services' | 'resources'>('calendar')
const TABS = [
  { v: 'calendar', l: 'Kalendář' },
  { v: 'services', l: 'Služby' },
  { v: 'resources', l: 'Zdroje' },
] as const

const services = ref<Service[]>([])
const resources = ref<Resource[]>([])

const STATUS: Record<ReservationStatus, { label: string; class: string }> = {
  Pending: { label: 'Čeká', class: 'bg-amber-100 text-amber-700' },
  Confirmed: { label: 'Potvrzeno', class: 'bg-primary-soft text-primary' },
  Completed: { label: 'Proběhlo', class: 'bg-success/15 text-success' },
  Cancelled: { label: 'Zrušeno', class: 'bg-muted text-muted-foreground' },
  NoShow: { label: 'Nedostavil se', class: 'bg-destructive/15 text-destructive' },
}
const VAT_RATES = [0, 12, 21]

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function hm(iso: string) {
  return new Date(iso).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}
function resourceName(id: string) {
  return resources.value.find((r) => r.id === id)?.name ?? '—'
}

// --- Kalendář ---
const date = ref(todayStr())
const reservations = ref<Reservation[]>([])

async function loadDay() {
  if (!apiMode) return
  try {
    const from = new Date(`${date.value}T00:00:00`).toISOString()
    const to = new Date(`${date.value}T23:59:59`).toISOString()
    reservations.value = await api.list(from, to)
  } catch (e) {
    console.error(e)
  }
}
watch(date, loadDay)

function actionsFor(status: ReservationStatus) {
  if (status === 'Pending')
    return [
      { label: 'Potvrdit', action: 'confirm' as const, variant: 'coral' as const },
      { label: 'Zrušit', action: 'cancel' as const, variant: 'ghost' as const },
    ]
  if (status === 'Confirmed')
    return [
      { label: 'Proběhlo', action: 'complete' as const, variant: 'coral' as const },
      { label: 'Nedostavil se', action: 'no-show' as const, variant: 'outline' as const },
      { label: 'Zrušit', action: 'cancel' as const, variant: 'ghost' as const },
    ]
  return []
}
async function changeStatus(r: Reservation, action: 'confirm' | 'complete' | 'cancel' | 'no-show') {
  if (busy.value) return
  busy.value = true
  try {
    await api.setStatus(r.id, action)
    await loadDay()
  } catch (e) {
    toast.error('Změna stavu selhala.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// nová rezervace
const resDialogOpen = ref(false)
const resForm = reactive({
  resourceId: '',
  serviceId: '',
  datetime: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  note: '',
})
function openNewReservation() {
  resForm.resourceId = resources.value[0]?.id ?? ''
  resForm.serviceId = services.value[0]?.id ?? ''
  resForm.datetime = `${date.value}T09:00`
  resForm.customerName = ''
  resForm.customerEmail = ''
  resForm.customerPhone = ''
  resForm.note = ''
  resDialogOpen.value = true
}
async function submitReservation() {
  if (!resForm.resourceId || !resForm.serviceId) return toast.error('Vyberte zdroj a službu.')
  if (!resForm.customerName.trim()) return toast.error('Zadejte jméno zákazníka.')
  if (!resForm.datetime) return toast.error('Zadejte termín.')
  const input: ReservationInput = {
    resourceId: resForm.resourceId,
    serviceId: resForm.serviceId,
    startsAt: new Date(resForm.datetime).toISOString(),
    customerName: resForm.customerName.trim(),
    customerEmail: resForm.customerEmail.trim() || null,
    customerPhone: resForm.customerPhone.trim() || null,
    note: resForm.note.trim() || null,
  }
  busy.value = true
  try {
    await api.create(input)
    await loadDay()
    resDialogOpen.value = false
    toast.success('Rezervace vytvořena.')
  } catch (e) {
    if (e instanceof ApiError && e.status === 409)
      toast.error('Termín se překrývá s jinou rezervací.')
    else toast.error('Vytvoření rezervace selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
}

// --- Služby (CRUD) ---
const svcDialogOpen = ref(false)
const editingSvc = ref<Service | null>(null)
const svcForm = reactive({ name: '', durationMinutes: 30, price: 0, vatRate: 21, isActive: true })
const deleteSvcId = ref<string | null>(null)
const deleteSvcOpen = ref(false)

function askDeleteSvc(id: string) {
  deleteSvcId.value = id
  deleteSvcOpen.value = true
}

function openAddSvc() {
  editingSvc.value = null
  Object.assign(svcForm, { name: '', durationMinutes: 30, price: 0, vatRate: 21, isActive: true })
  svcDialogOpen.value = true
}
function openEditSvc(s: Service) {
  editingSvc.value = s
  Object.assign(svcForm, {
    name: s.name,
    durationMinutes: s.durationMinutes,
    price: s.price,
    vatRate: s.vatRate,
    isActive: s.isActive,
  })
  svcDialogOpen.value = true
}
async function submitSvc() {
  if (!svcForm.name.trim()) return toast.error('Zadejte název služby.')
  const input: ServiceInput = {
    name: svcForm.name.trim(),
    durationMinutes: Number(svcForm.durationMinutes) || 0,
    price: Number(svcForm.price) || 0,
    vatRate: svcForm.vatRate,
    isActive: svcForm.isActive,
  }
  if (input.durationMinutes <= 0) return toast.error('Délka musí být kladná.')
  busy.value = true
  try {
    if (editingSvc.value) await api.updateService(editingSvc.value.id, input)
    else await api.createService(input)
    services.value = await api.services()
    svcDialogOpen.value = false
    toast.success('Uloženo.')
  } catch (e) {
    toast.error('Uložení selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
}
async function confirmDeleteSvc() {
  const id = deleteSvcId.value
  if (!id) return
  deleteSvcOpen.value = false
  deleteSvcId.value = null
  try {
    await api.removeService(id)
    services.value = services.value.filter((s) => s.id !== id)
    toast.success('Služba smazána.')
  } catch (e) {
    toast.error('Smazání selhalo.')
    console.error(e)
  }
}

// --- Zdroje (CRUD) ---
const rscDialogOpen = ref(false)
const editingRsc = ref<Resource | null>(null)
const rscForm = reactive({ name: '', isActive: true })
const deleteRscId = ref<string | null>(null)
const deleteRscOpen = ref(false)

function askDeleteRsc(id: string) {
  deleteRscId.value = id
  deleteRscOpen.value = true
}

function openAddRsc() {
  editingRsc.value = null
  Object.assign(rscForm, { name: '', isActive: true })
  rscDialogOpen.value = true
}
function openEditRsc(r: Resource) {
  editingRsc.value = r
  Object.assign(rscForm, { name: r.name, isActive: r.isActive })
  rscDialogOpen.value = true
}
async function submitRsc() {
  if (!rscForm.name.trim()) return toast.error('Zadejte název zdroje.')
  const input = { name: rscForm.name.trim(), isActive: rscForm.isActive }
  busy.value = true
  try {
    if (editingRsc.value) await api.updateResource(editingRsc.value.id, input)
    else await api.createResource(input)
    resources.value = await api.resources()
    rscDialogOpen.value = false
    toast.success('Uloženo.')
  } catch (e) {
    toast.error('Uložení selhalo.')
    console.error(e)
  } finally {
    busy.value = false
  }
}
async function confirmDeleteRsc() {
  const id = deleteRscId.value
  if (!id) return
  deleteRscOpen.value = false
  deleteRscId.value = null
  try {
    await api.removeResource(id)
    resources.value = resources.value.filter((r) => r.id !== id)
    toast.success('Zdroj smazán.')
  } catch (e) {
    toast.error('Smazání selhalo (možná má rezervace).')
    console.error(e)
  }
}

const canBook = computed(() => services.value.length > 0 && resources.value.length > 0)

onMounted(async () => {
  if (!apiMode) {
    loading.value = false
    return
  }
  try {
    ;[services.value, resources.value] = await Promise.all([api.services(), api.resources()])
    await loadDay()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
    <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Rezervace</h1>

    <div
      v-if="!apiMode"
      class="mt-6 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      Rezervace teď nejsou dostupné. Zkontrolujte připojení a zkuste to znovu.
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
          @click="tab = t.v"
        >
          {{ t.l }}
        </button>
      </div>

      <div v-if="loading" class="mt-6 flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <!-- KALENDÁŘ -->
      <template v-else-if="tab === 'calendar'">
        <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div class="space-y-1">
            <Label for="date">Den</Label>
            <Input id="date" v-model="date" type="date" class="w-44" />
          </div>
          <Button variant="coral" :disabled="!canBook" @click="openNewReservation">
            <Plus class="h-4 w-4" /> Nová rezervace
          </Button>
        </div>

        <p v-if="!canBook" class="mt-3 text-sm text-muted-foreground">
          Nejdřív přidejte alespoň jednu službu a jeden zdroj (záložky výše).
        </p>

        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div v-if="!reservations.length" class="p-12 text-center text-muted-foreground">
            <CalendarDays class="mx-auto h-10 w-10" />
            <p class="mt-3">Na tento den nejsou rezervace.</p>
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="r in reservations"
              :key="r.id"
              class="flex flex-wrap items-center gap-3 p-4"
            >
              <div class="flex items-center gap-1.5 font-semibold tabular-nums">
                <Clock class="h-4 w-4 text-muted-foreground" />
                {{ hm(r.startsAt) }}–{{ hm(r.endsAt) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ r.customerName }}</span>
                  <span
                    class="rounded px-1.5 py-0.5 text-[11px] font-medium"
                    :class="STATUS[r.status].class"
                    >{{ STATUS[r.status].label }}</span
                  >
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ r.serviceName }} • {{ resourceName(r.resourceId) }}
                  <span v-if="r.customerPhone"> • {{ r.customerPhone }}</span>
                </div>
              </div>
              <div class="flex gap-1">
                <Button
                  v-for="a in actionsFor(r.status)"
                  :key="a.action"
                  :variant="a.variant"
                  size="sm"
                  :disabled="busy"
                  @click="changeStatus(r, a.action)"
                >
                  {{ a.label }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- SLUŽBY -->
      <template v-else-if="tab === 'services'">
        <div class="mt-4 flex justify-end">
          <Button variant="coral" @click="openAddSvc"><Plus class="h-4 w-4" /> Nová služba</Button>
        </div>
        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div v-if="!services.length" class="p-12 text-center text-muted-foreground">
            Zatím žádné služby (např. Střih, Masáž, Konzultace…).
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="s in services"
              :key="s.id"
              class="flex items-center justify-between gap-3 p-4 hover:bg-muted/40"
            >
              <div>
                <div class="font-semibold">
                  {{ s.name }}
                  <span v-if="!s.isActive" class="text-xs text-muted-foreground">(neaktivní)</span>
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ s.durationMinutes }} min • {{ formatCZK(s.price) }} • DPH {{ s.vatRate }} %
                </div>
              </div>
              <div class="flex gap-1">
                <Button variant="ghost" size="icon" title="Upravit" @click="openEditSvc(s)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Smazat" @click="askDeleteSvc(s.id)">
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ZDROJE -->
      <template v-else>
        <div class="mt-4 flex justify-end">
          <Button variant="coral" @click="openAddRsc"><Plus class="h-4 w-4" /> Nový zdroj</Button>
        </div>
        <div class="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <div v-if="!resources.length" class="p-12 text-center text-muted-foreground">
            Zatím žádné zdroje (křeslo, pracovník, místnost…).
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="r in resources"
              :key="r.id"
              class="flex items-center justify-between gap-3 p-4 hover:bg-muted/40"
            >
              <div class="font-semibold">
                {{ r.name }}
                <span v-if="!r.isActive" class="text-xs text-muted-foreground">(neaktivní)</span>
              </div>
              <div class="flex gap-1">
                <Button variant="ghost" size="icon" title="Upravit" @click="openEditRsc(r)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Smazat" @click="askDeleteRsc(r.id)">
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Dialog nová rezervace -->
    <Dialog v-model:open="resDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Nová rezervace</DialogTitle>
          <DialogDescription>Zdroj, služba, termín a zákazník.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitReservation">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <Label for="r-rsc">Zdroj</Label>
              <select
                id="r-rsc"
                v-model="resForm.resourceId"
                class="flex h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <Label for="r-svc">Služba</Label>
              <select
                id="r-svc"
                v-model="resForm.serviceId"
                class="flex h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option v-for="s in services" :key="s.id" :value="s.id">
                  {{ s.name }} ({{ s.durationMinutes }}′)
                </option>
              </select>
            </div>
          </div>
          <div class="space-y-1">
            <Label for="r-dt">Termín</Label>
            <Input id="r-dt" v-model="resForm.datetime" type="datetime-local" />
          </div>
          <div class="space-y-1">
            <Label for="r-name">Zákazník *</Label>
            <Input id="r-name" v-model="resForm.customerName" required placeholder="Jana Nová" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <Label for="r-phone">Telefon</Label>
              <Input id="r-phone" v-model="resForm.customerPhone" />
            </div>
            <div class="space-y-1">
              <Label for="r-email">E-mail</Label>
              <Input id="r-email" v-model="resForm.customerEmail" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="resDialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Vytvořit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog služba -->
    <Dialog v-model:open="svcDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingSvc ? 'Upravit službu' : 'Nová služba' }}</DialogTitle>
          <DialogDescription>Délka trvání a cena bookovatelné služby.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitSvc">
          <div class="space-y-1">
            <Label for="s-name">Název *</Label>
            <Input id="s-name" v-model="svcForm.name" required placeholder="Střih" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <Label for="s-dur">Délka (min)</Label>
              <Input id="s-dur" v-model.number="svcForm.durationMinutes" type="number" :min="1" />
            </div>
            <div class="space-y-1">
              <Label for="s-price">Cena vč. DPH</Label>
              <Input
                id="s-price"
                v-model.number="svcForm.price"
                type="number"
                :min="0"
                step="0.01"
              />
            </div>
          </div>
          <div class="space-y-1">
            <Label>Sazba DPH</Label>
            <div class="flex gap-2">
              <Button
                v-for="rate in VAT_RATES"
                :key="rate"
                type="button"
                :variant="svcForm.vatRate === rate ? 'coral' : 'outline'"
                class="flex-1"
                @click="svcForm.vatRate = rate"
              >
                {{ rate }} %
              </Button>
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm">
            <Checkbox v-model="svcForm.isActive" /> Aktivní
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="svcDialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog zdroj -->
    <Dialog v-model:open="rscDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingRsc ? 'Upravit zdroj' : 'Nový zdroj' }}</DialogTitle>
          <DialogDescription>Křeslo, pracovník, místnost — co se rezervuje.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitRsc">
          <div class="space-y-1">
            <Label for="rsc-name">Název *</Label>
            <Input id="rsc-name" v-model="rscForm.name" required placeholder="Křeslo 1" />
          </div>
          <label class="flex items-center gap-2 text-sm">
            <Checkbox v-model="rscForm.isActive" /> Aktivní
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="rscDialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="busy">
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" /> Uložit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteSvcOpen" @update:open="(o) => (deleteSvcOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat službu?</AlertDialogTitle>
          <AlertDialogDescription>Existující rezervace zůstanou zachovány.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDeleteSvc"
            >Smazat</AlertDialogAction
          >
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="deleteRscOpen" @update:open="(o) => (deleteRscOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat zdroj?</AlertDialogTitle>
          <AlertDialogDescription>Existující rezervace zůstanou zachovány.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDeleteRsc"
            >Smazat</AlertDialogAction
          >
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
