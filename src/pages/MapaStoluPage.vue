<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import QRCode from 'qrcode'
import {
  Copy,
  ExternalLink,
  Plus,
  Save,
  Loader2,
  Pencil,
  Trash2,
  Square,
  Circle,
  RotateCw,
  LayoutGrid,
  QrCode,
} from 'lucide-vue-next'
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
import { useFloors } from '@/composables/useFloors'
import { useTables } from '@/composables/useTables'
import { isApiMode } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import { useCompanyStore } from '@/stores/company'
import type { DiningTable, Floor, TableShape } from '@/lib/types'

const floorsApi = useFloors()
const tablesApi = useTables()
const companyStore = useCompanyStore()
const apiMode = isApiMode()

const loading = ref(true)
const saving = ref(false)
const floors = ref<Floor[]>([])
const currentFloorId = ref<string | null>(null)
const tables = ref<DiningTable[]>([])
const selectedId = ref<string | null>(null)
const dirty = ref(false)

const floorDialogOpen = ref(false)
const editingFloor = ref<Floor | null>(null)
const floorName = ref('')
const deleteFloorId = ref<string | null>(null)
const deleteFloorOpen = ref(false)

const tableDialogOpen = ref(false)
const editingTable = ref<DiningTable | null>(null)
const tableForm = reactive({ name: '', seats: 4, shape: 'Rect' as TableShape })
const deleteTableId = ref<string | null>(null)
const deleteTableOpen = ref(false)
const qrDialogOpen = ref(false)
const qrCodeUrl = ref('')
const qrLoading = ref(false)

const currentFloor = computed(() => floors.value.find((f) => f.id === currentFloorId.value) ?? null)
const selectedTable = computed(() => tables.value.find((t) => t.id === selectedId.value) ?? null)
const publicSlug = computed(() => companyStore.company?.publicSlug?.trim() ?? '')
const selectedTableOrderUrl = computed(() =>
  selectedTable.value && publicSlug.value ? tableOrderUrl(selectedTable.value) : '',
)

onMounted(async () => {
  if (!apiMode) {
    loading.value = false
    return
  }
  try {
    await companyStore.load()
    floors.value = await floorsApi.list()
    if (!currentFloorId.value && floors.value.length) currentFloorId.value = floors.value[0].id
    if (currentFloorId.value) await loadTables()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function loadTables() {
  if (!currentFloorId.value) {
    tables.value = []
    return
  }
  tables.value = await tablesApi.listByFloor(currentFloorId.value)
  dirty.value = false
  selectedId.value = null
}

watch(currentFloorId, () => {
  if (apiMode) loadTables()
})

// --- Místnosti ---
function openAddFloor() {
  editingFloor.value = null
  floorName.value = ''
  floorDialogOpen.value = true
}
function openEditFloor() {
  if (!currentFloor.value) return
  editingFloor.value = currentFloor.value
  floorName.value = currentFloor.value.name
  floorDialogOpen.value = true
}
async function submitFloor() {
  const name = floorName.value.trim()
  if (!name) {
    toast.error('Zadejte název místnosti.')
    return
  }
  try {
    if (editingFloor.value) {
      const updated = await floorsApi.update(editingFloor.value.id, { name })
      const idx = floors.value.findIndex((f) => f.id === updated.id)
      if (idx !== -1) floors.value[idx] = updated
      toast.success('Místnost upravena.')
    } else {
      const created = await floorsApi.create({ name })
      floors.value.push(created)
      currentFloorId.value = created.id
      toast.success('Místnost přidána.')
    }
    floorDialogOpen.value = false
  } catch (e) {
    toast.error('Uložení místnosti selhalo.')
    console.error(e)
  }
}
function askDeleteFloor() {
  if (!currentFloorId.value) return
  deleteFloorId.value = currentFloorId.value
  deleteFloorOpen.value = true
}
async function confirmDeleteFloor() {
  // Odchyť ID a zavři dialog SYNCHRONNĚ, teprve pak mazání. deleteFloorId se nesmí
  // nulovat v @update:open, jinak by ho tato obsluha přečetla už jako null (proto
  // samostatný deleteFloorOpen pro stav dialogu).
  const id = deleteFloorId.value
  if (!id) return
  deleteFloorOpen.value = false
  deleteFloorId.value = null
  try {
    await floorsApi.remove(id)
    floors.value = floors.value.filter((f) => f.id !== id)
    if (currentFloorId.value === id) currentFloorId.value = floors.value[0]?.id ?? null
    toast.success('Místnost smazána.')
  } catch (e) {
    toast.error('Smazání místnosti selhalo.')
    console.error(e)
  }
}

// --- Stoly ---
async function addTable(shape: TableShape) {
  if (!currentFloorId.value) return
  const offset = (tables.value.length * 16) % 220
  try {
    const created = await tablesApi.create({
      floorId: currentFloorId.value,
      name: `Stůl ${tables.value.length + 1}`,
      x: 24 + offset,
      y: 24 + offset,
      width: shape === 'Circle' ? 80 : 100,
      height: 80,
      seats: 4,
      shape,
    })
    tables.value.push(created)
    selectedId.value = created.id
  } catch (e) {
    toast.error('Přidání stolu selhalo.')
    console.error(e)
  }
}
function openEditTable() {
  const t = selectedTable.value
  if (!t) return
  editingTable.value = t
  tableForm.name = t.name
  tableForm.seats = t.seats
  tableForm.shape = t.shape
  tableDialogOpen.value = true
}
async function submitTable() {
  const t = editingTable.value
  if (!t) return
  const name = tableForm.name.trim()
  if (!name) {
    toast.error('Zadejte název stolu.')
    return
  }
  try {
    const updated = await tablesApi.update(t.id, {
      floorId: t.floorId,
      name,
      seats: Number(tableForm.seats) || 0,
      shape: tableForm.shape,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      rotation: t.rotation,
    })
    const idx = tables.value.findIndex((x) => x.id === t.id)
    if (idx !== -1) tables.value[idx] = updated
    tableDialogOpen.value = false
    toast.success('Stůl upraven.')
  } catch (e) {
    toast.error('Uložení stolu selhalo.')
    console.error(e)
  }
}
function askDeleteTable(id: string) {
  deleteTableId.value = id
  deleteTableOpen.value = true
}
async function confirmDeleteTable() {
  const id = deleteTableId.value
  if (!id) return
  deleteTableOpen.value = false
  deleteTableId.value = null
  try {
    await tablesApi.remove(id)
    tables.value = tables.value.filter((t) => t.id !== id)
    if (selectedId.value === id) selectedId.value = null
    toast.success('Stůl smazán.')
  } catch (e) {
    toast.error('Smazání stolu selhalo.')
    console.error(e)
  }
}
function rotateSelected() {
  const t = selectedTable.value
  if (!t) return
  t.rotation = (t.rotation + 90) % 360
  dirty.value = true
}

async function saveLayout() {
  saving.value = true
  try {
    await tablesApi.saveLayout(
      tables.value.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        rotation: t.rotation,
      })),
    )
    dirty.value = false
    toast.success('Rozložení uloženo.')
  } catch (e) {
    toast.error('Uložení rozložení selhalo.')
    console.error(e)
  } finally {
    saving.value = false
  }
}

function tableOrderUrl(table: DiningTable): string {
  const url = new URL(`/objednavka/${publicSlug.value}`, window.location.origin)
  url.searchParams.set('table', table.id)
  url.searchParams.set('name', table.name)
  return url.toString()
}

async function openQrDialog() {
  const table = selectedTable.value
  if (!table) return
  if (!publicSlug.value) {
    toast.error('Nejdřív nastavte veřejný slug firmy v nastavení.')
    return
  }
  qrDialogOpen.value = true
  qrLoading.value = true
  qrCodeUrl.value = ''
  try {
    qrCodeUrl.value = await QRCode.toDataURL(tableOrderUrl(table), {
      width: 320,
      margin: 2,
      color: { dark: '#111111', light: '#ffffff' },
    })
  } catch (e) {
    toast.error('Vygenerování QR kódu selhalo.')
    console.error(e)
  } finally {
    qrLoading.value = false
  }
}

async function copyOrderUrl() {
  if (!selectedTableOrderUrl.value) return
  try {
    await navigator.clipboard.writeText(selectedTableOrderUrl.value)
    toast.success('Odkaz zkopírován.')
  } catch (e) {
    toast.error('Kopírování odkazu selhalo.')
    console.error(e)
  }
}

// --- Drag & resize ---
const canvas = ref<HTMLElement | null>(null)
type DragState = {
  mode: 'move' | 'resize'
  id: string
  startX: number
  startY: number
  orig: { x: number; y: number; width: number; height: number }
}
let drag: DragState | null = null

function startDrag(mode: 'move' | 'resize', e: PointerEvent, t: DiningTable) {
  selectedId.value = t.id
  drag = {
    mode,
    id: t.id,
    startX: e.clientX,
    startY: e.clientY,
    orig: { x: t.x, y: t.y, width: t.width, height: t.height },
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  e.preventDefault()
  e.stopPropagation()
}
function onPointerMove(e: PointerEvent) {
  if (!drag) return
  const t = tables.value.find((x) => x.id === drag!.id)
  if (!t) return
  const dx = e.clientX - drag.startX
  const dy = e.clientY - drag.startY
  const bounds = canvas.value?.getBoundingClientRect()
  if (drag.mode === 'move') {
    let nx = Math.max(0, drag.orig.x + dx)
    let ny = Math.max(0, drag.orig.y + dy)
    if (bounds) {
      nx = Math.min(nx, bounds.width - t.width)
      ny = Math.min(ny, bounds.height - t.height)
    }
    t.x = Math.round(nx)
    t.y = Math.round(ny)
  } else {
    t.width = Math.max(40, Math.round(drag.orig.width + dx))
    t.height = Math.max(40, Math.round(drag.orig.height + dy))
  }
  dirty.value = true
}
function onPointerUp() {
  drag = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}
function onCanvasPointerDown(e: PointerEvent) {
  if (e.target === canvas.value) selectedId.value = null
}
</script>

<template>
  <div class="p-4 sm:p-6">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Mapa stolů</h1>
        <p class="text-sm text-muted-foreground">
          Rozmístěte stoly tažením, měňte velikost úchytem v rohu. Editor pro správce.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" :disabled="!currentFloorId" @click="addTable('Rect')">
          <Square class="h-4 w-4" /> Hranatý
        </Button>
        <Button variant="outline" :disabled="!currentFloorId" @click="addTable('Circle')">
          <Circle class="h-4 w-4" /> Kulatý
        </Button>
        <Button variant="coral" :disabled="!dirty || saving" @click="saveLayout">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" /> Uložit rozložení
        </Button>
      </div>
    </div>

    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <LayoutGrid class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Mapa stolů potřebuje připojení k serveru</p>
      <p class="mt-1 text-sm">Nastavte <code>VITE_API_URL</code> a spusťte backend.</p>
    </div>

    <template v-else>
      <!-- Místnosti (taby) -->
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <button
          v-for="f in floors"
          :key="f.id"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            currentFloorId === f.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          "
          @click="currentFloorId = f.id"
        >
          {{ f.name }}
        </button>
        <Button variant="ghost" size="sm" @click="openAddFloor"
          ><Plus class="h-4 w-4" /> Místnost</Button
        >
        <span class="flex-1" />
        <Button
          v-if="currentFloor"
          variant="ghost"
          size="icon"
          title="Přejmenovat"
          @click="openEditFloor"
        >
          <Pencil class="h-4 w-4" />
        </Button>
        <Button
          v-if="currentFloor"
          variant="ghost"
          size="icon"
          title="Smazat"
          @click="askDeleteFloor()"
        >
          <Trash2 class="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div
        v-else-if="!floors.length"
        class="flex flex-col items-center rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground"
      >
        <LayoutGrid class="h-10 w-10" />
        <p class="mt-3 font-semibold text-foreground">Zatím žádná místnost</p>
        <p class="mt-1 text-sm">Vytvořte první místnost (hlavní sál, zahrádka, salonek…).</p>
        <Button variant="coral" class="mt-4" @click="openAddFloor"
          ><Plus class="h-4 w-4" /> Přidat místnost</Button
        >
      </div>

      <div v-else class="grid gap-4 lg:grid-cols-[1fr_260px]">
        <!-- Plátno -->
        <div
          ref="canvas"
          class="relative min-h-[560px] touch-none overflow-hidden rounded-2xl border border-border bg-muted/20"
          style="
            background-image:
              linear-gradient(to right, rgba(120, 120, 120, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(120, 120, 120, 0.12) 1px, transparent 1px);
            background-size: 24px 24px;
          "
          @pointerdown="onCanvasPointerDown"
        >
          <div
            v-for="t in tables"
            :key="t.id"
            class="absolute flex cursor-move select-none flex-col items-center justify-center border-2 bg-card text-center shadow-sm"
            :class="[
              t.shape === 'Circle' ? 'rounded-full' : 'rounded-lg',
              selectedId === t.id ? 'border-primary ring-2 ring-primary/40' : 'border-border',
            ]"
            :style="{
              left: t.x + 'px',
              top: t.y + 'px',
              width: t.width + 'px',
              height: t.height + 'px',
              transform: `rotate(${t.rotation}deg)`,
            }"
            @pointerdown="startDrag('move', $event, t)"
          >
            <span class="px-1 text-xs font-semibold leading-none">{{ t.name }}</span>
            <span class="mt-1 text-[10px] text-muted-foreground">{{ t.seats }} míst</span>
            <span
              v-if="selectedId === t.id"
              class="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize rounded-sm border border-background bg-primary"
              @pointerdown="startDrag('resize', $event, t)"
            />
          </div>

          <div
            v-if="!tables.length"
            class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
          >
            Přidejte stoly tlačítky „Hranatý" / „Kulatý" nahoře.
          </div>
        </div>

        <!-- Panel vlastností -->
        <div class="h-fit rounded-2xl border border-border bg-card p-4">
          <h3 class="font-semibold">Vlastnosti stolu</h3>
          <div v-if="!selectedTable" class="mt-2 text-sm text-muted-foreground">
            Vyberte stůl klepnutím.
          </div>
          <div v-else class="mt-3 space-y-2 text-sm">
            <div>
              <span class="text-muted-foreground">Název:</span>
              <span class="font-semibold"> {{ selectedTable.name }}</span>
            </div>
            <div>
              <span class="text-muted-foreground">Míst:</span>
              <span class="font-semibold"> {{ selectedTable.seats }}</span>
            </div>
            <div>
              <span class="text-muted-foreground">Tvar:</span>
              <span class="font-semibold">
                {{ selectedTable.shape === 'Circle' ? 'Kulatý' : 'Hranatý' }}</span
              >
            </div>
            <div class="flex flex-wrap gap-2 pt-2">
              <Button variant="coral" size="sm" @click="openQrDialog">
                <QrCode class="h-4 w-4" /> QR objednávka
              </Button>
              <Button variant="outline" size="sm" @click="openEditTable">
                <Pencil class="h-4 w-4" /> Upravit
              </Button>
              <Button variant="outline" size="sm" @click="rotateSelected">
                <RotateCw class="h-4 w-4" /> Otočit
              </Button>
              <Button variant="ghost" size="sm" @click="askDeleteTable(selectedTable.id)">
                <Trash2 class="h-4 w-4 text-destructive" /> Smazat
              </Button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Dialog místnosti -->
    <Dialog v-model:open="floorDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editingFloor ? 'Přejmenovat místnost' : 'Nová místnost' }}</DialogTitle>
          <DialogDescription>Místnost / patro / zahrádka pro mapu stolů.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitFloor">
          <div class="space-y-2">
            <Label for="floor-name">Název *</Label>
            <Input id="floor-name" v-model="floorName" required placeholder="Hlavní sál" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="floorDialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral">{{ editingFloor ? 'Uložit' : 'Přidat' }}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Dialog stolu -->
    <Dialog v-model:open="tableDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Upravit stůl</DialogTitle>
          <DialogDescription>Název, počet míst a tvar stolu.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="submitTable">
          <div class="space-y-2">
            <Label for="table-name">Název *</Label>
            <Input id="table-name" v-model="tableForm.name" required placeholder="Stůl 1" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="table-seats">Počet míst</Label>
              <Input
                id="table-seats"
                v-model.number="tableForm.seats"
                type="number"
                :min="0"
                :max="100"
              />
            </div>
            <div class="space-y-2">
              <Label>Tvar</Label>
              <div class="flex gap-2">
                <Button
                  type="button"
                  :variant="tableForm.shape === 'Rect' ? 'coral' : 'outline'"
                  class="flex-1"
                  @click="tableForm.shape = 'Rect'"
                >
                  <Square class="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  :variant="tableForm.shape === 'Circle' ? 'coral' : 'outline'"
                  class="flex-1"
                  @click="tableForm.shape = 'Circle'"
                >
                  <Circle class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="tableDialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral">Uložit změny</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- QR objednávka ke stolu -->
    <Dialog v-model:open="qrDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>QR objednávka ke stolu</DialogTitle>
          <DialogDescription>
            {{ selectedTable?.name }} otevře veřejné menu a objednávka se připíše k tomuto stolu.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div
            class="flex min-h-80 items-center justify-center rounded-lg border border-border bg-white p-4"
          >
            <Loader2 v-if="qrLoading" class="h-6 w-6 animate-spin text-primary" />
            <img
              v-else-if="qrCodeUrl"
              :src="qrCodeUrl"
              alt="QR kód objednávky ke stolu"
              class="h-72 w-72"
            />
          </div>

          <div class="grid gap-2">
            <Label for="table-order-url">Odkaz</Label>
            <div class="flex gap-2">
              <Input
                id="table-order-url"
                :model-value="selectedTableOrderUrl"
                readonly
                class="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Zkopírovat"
                @click="copyOrderUrl"
              >
                <Copy class="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Otevřít"
                :disabled="!selectedTableOrderUrl"
                as-child
              >
                <a :href="selectedTableOrderUrl" target="_blank" rel="noreferrer">
                  <ExternalLink class="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" @click="qrDialogOpen = false">Zavřít</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Smazat místnost -->
    <AlertDialog :open="deleteFloorOpen" @update:open="(o) => (deleteFloorOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat místnost?</AlertDialogTitle>
          <AlertDialogDescription>
            Místnost „{{ currentFloor?.name }}" se smaže i se všemi svými stoly. Akci nelze vrátit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDeleteFloor"
          >
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Smazat stůl -->
    <AlertDialog :open="deleteTableOpen" @update:open="(o) => (deleteTableOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat stůl?</AlertDialogTitle>
          <AlertDialogDescription>Stůl se odstraní z mapy.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="confirmDeleteTable"
          >
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
