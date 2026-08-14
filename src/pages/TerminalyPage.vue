<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { BatteryLow, Loader2, Plus, RefreshCw, Smartphone } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { ApiError, isApiMode } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { useLocations } from '@/composables/useLocations'
import { useIntegrations, type PaymentProviderConnection } from '@/composables/useIntegrations'
import { useTerminalDevices, type TerminalDevice } from '@/composables/useTerminalDevices'
import type { Location } from '@/lib/types'

const auth = useAuthStore()
const devicesApi = useTerminalDevices()
const integrationsApi = useIntegrations()
const locationsApi = useLocations()

const apiMode = isApiMode()
// Backend gate je integrations.terminals (jen Owner/Admin) + modul integrations. UI to zrcadlí, server vynucuje vždy.
const available = computed(
  () => apiMode && auth.hasModule('integrations') && auth.hasRole('Owner', 'Admin'),
)

const loading = ref(true)
const refreshing = ref(false)
const devices = ref<TerminalDevice[]>([])
const connections = ref<PaymentProviderConnection[]>([])
const locations = ref<Location[]>([])

const UNASSIGNED = '__none__'

// Skupiny podle pobočky — přiřazení určuje, komu spadne tržba, takže je to hlavní osa výpisu.
// „Bez pobočky" je vlastní skupina a ne tichý řádek dole: terminál bez pobočky může použít kdokoli.
const groups = computed(() => {
  const byLocation = new Map<string, { id: string | null; name: string; items: TerminalDevice[] }>()
  for (const loc of locations.value)
    byLocation.set(loc.id, { id: loc.id, name: loc.name, items: [] })

  const unassigned: TerminalDevice[] = []
  for (const device of devices.value) {
    const group = device.locationId ? byLocation.get(device.locationId) : undefined
    if (group) group.items.push(device)
    else if (device.locationId)
      // Pobočka mimo náš seznam (smazaná/mimo scope) — ať terminál nezmizí z výpisu.
      byLocation.set(device.locationId, {
        id: device.locationId,
        name: device.locationName ?? 'Neznámá pobočka',
        items: [device],
      })
    else unassigned.push(device)
  }

  const result = [...byLocation.values()].filter((g) => g.items.length > 0)
  if (unassigned.length > 0) result.push({ id: null, name: 'Bez pobočky', items: unassigned })
  return result
})

const readyConnections = computed(() =>
  connections.value.filter((c) => c.providerKey === 'sumup' && c.status === 'ready'),
)

async function load(withLiveStatus = false): Promise<void> {
  if (!available.value) {
    loading.value = false
    return
  }
  try {
    const [list, conns] = await Promise.all([
      devicesApi.list({ includeLiveStatus: withLiveStatus }),
      integrationsApi.listPaymentProviderConnections(),
    ])
    devices.value = list
    connections.value = conns
    await locationsApi.load()
    locations.value = locationsApi.locations.value.filter((l) => l.isActive)
  } catch (e) {
    toast.error(errorMessage(e, 'Terminály se nepodařilo načíst.'))
  } finally {
    loading.value = false
  }
}

async function refresh(): Promise<void> {
  refreshing.value = true
  await load(true) // živý stav (online, baterie) stojí dotaz k providerovi — jen na vyžádání
  refreshing.value = false
}

// --- Registrace čtečky ---
const registerOpen = ref(false)
const registering = ref(false)
const form = reactive({
  providerConnectionId: '',
  name: '',
  pairingCode: '',
  locationId: UNASSIGNED,
})

function openRegister(locationId: string | null): void {
  form.providerConnectionId = readyConnections.value[0]?.id ?? ''
  form.name = ''
  form.pairingCode = ''
  form.locationId = locationId ?? UNASSIGNED
  registerOpen.value = true
}

async function submitRegister(): Promise<void> {
  const name = form.name.trim()
  const pairingCode = form.pairingCode.trim()
  if (!form.providerConnectionId) {
    toast.error('Nejdřív dokončete konfiguraci SumUpu v Nastavení firmy.')
    return
  }
  if (!name || !pairingCode) {
    toast.error('Vyplňte název terminálu a párovací kód z displeje.')
    return
  }
  registering.value = true
  try {
    await devicesApi.register({
      providerConnectionId: form.providerConnectionId,
      name,
      pairingCode,
      locationId: form.locationId === UNASSIGNED ? null : form.locationId,
    })
    toast.success('Terminál spárován.')
    registerOpen.value = false
    await load()
  } catch (e) {
    toast.error(errorMessage(e, 'Spárování se nepodařilo.'))
  } finally {
    registering.value = false
  }
}

// --- Úprava (přejmenování / přeřazení na jiný bar) ---
const editTarget = ref<TerminalDevice | null>(null)
const saving = ref(false)
const editForm = reactive({ name: '', locationId: UNASSIGNED })

function openEdit(device: TerminalDevice): void {
  editTarget.value = device
  editForm.name = device.name
  editForm.locationId = device.locationId ?? UNASSIGNED
}

async function submitEdit(): Promise<void> {
  const device = editTarget.value
  if (!device) return
  const name = editForm.name.trim()
  if (!name) {
    toast.error('Název terminálu je povinný.')
    return
  }
  saving.value = true
  try {
    await devicesApi.update(device.id, {
      name,
      locationId: editForm.locationId === UNASSIGNED ? null : editForm.locationId,
      isActive: device.isActive,
      note: device.note,
    })
    toast.success('Terminál uložen.')
    editTarget.value = null
    await load()
  } catch (e) {
    toast.error(errorMessage(e, 'Uložení se nepodařilo.'))
  } finally {
    saving.value = false
  }
}

// --- Deaktivace ---
const deactivateTarget = ref<TerminalDevice | null>(null)
const deactivating = ref(false)

async function confirmDeactivate(): Promise<void> {
  const device = deactivateTarget.value
  if (!device) return
  deactivating.value = true
  try {
    await devicesApi.deactivate(device.id)
    toast.success('Terminál deaktivován.')
    await load()
  } catch (e) {
    toast.error(errorMessage(e, 'Deaktivace se nepodařila.'))
  } finally {
    deactivating.value = false
    deactivateTarget.value = null
  }
}

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return 'Na správu terminálů má právo jen majitel nebo administrátor.'
    if (e.status === 409) return 'Tenhle terminál už je zaregistrovaný.'
    if (e.status === 422)
      return e.message || 'Párovací kód je neplatný nebo vypršel — vygenerujte na terminálu nový.'
    if (e.message) return e.message
  }
  return fallback
}

function statusLabel(device: TerminalDevice): string {
  if (!device.isActive) return 'Deaktivovaný'
  if (device.status === 'ONLINE') return 'Online'
  if (device.status === 'OFFLINE') return 'Offline'
  return 'Stav nezjištěn'
}

onMounted(() => load())
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Platební terminály</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Čtečky rozdělené podle poboček. Obsluha může platit jen na terminálu své pobočky.
        </p>
      </div>
      <div v-if="available" class="flex gap-2">
        <Button variant="outline" :disabled="refreshing" @click="refresh">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': refreshing }" />
          Zjistit stav
        </Button>
        <Button data-testid="register-terminal" @click="openRegister(null)">
          <Plus class="h-4 w-4" />
          Spárovat terminál
        </Button>
      </div>
    </div>

    <p v-if="!apiMode" class="rounded-lg border border-border p-4 text-sm text-muted-foreground">
      Terminály se spravují proti serveru — v náhledu aplikace nejsou dostupné.
    </p>
    <p
      v-else-if="!available"
      class="rounded-lg border border-border p-4 text-sm text-muted-foreground"
    >
      Na správu terminálů má právo jen majitel nebo administrátor firmy se zapnutým propojením na
      platební služby.
    </p>

    <template v-else>
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" />
        Načítám terminály…
      </div>

      <div
        v-else-if="devices.length === 0"
        class="rounded-lg border border-dashed border-border p-8 text-center"
        data-testid="terminals-empty"
      >
        <Smartphone class="mx-auto h-8 w-8 text-muted-foreground" />
        <p class="mt-3 text-sm font-medium">Zatím žádný terminál</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Na terminálu SumUp Solo otevřete Menu → Connections → Wi-Fi → API → Connect a zadejte sem
          párovací kód z displeje. Platí 5 minut.
        </p>
        <Button v-if="readyConnections.length > 0" class="mt-4" @click="openRegister(null)">
          <Plus class="h-4 w-4" />
          Spárovat terminál
        </Button>
        <p v-else class="mt-4 text-sm text-muted-foreground">
          Nejdřív dokončete konfiguraci SumUpu v Nastavení firmy (stav Ready).
        </p>
      </div>

      <section
        v-for="group in groups"
        :key="group.id ?? 'none'"
        class="rounded-xl border border-border"
        :data-testid="`terminal-group-${group.id ?? 'none'}`"
      >
        <header class="flex items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 class="text-sm font-semibold">{{ group.name }}</h2>
            <p class="text-xs text-muted-foreground">
              {{ group.items.length }}× terminál
              <template v-if="group.id === null"> · může použít kterákoli pobočka </template>
            </p>
          </div>
          <Button variant="ghost" size="sm" @click="openRegister(group.id)">
            <Plus class="h-4 w-4" />
            Přidat
          </Button>
        </header>

        <ul class="divide-y divide-border">
          <li
            v-for="device in group.items"
            :key="device.id"
            class="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ device.name }}</p>
              <p class="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{{ statusLabel(device) }}</span>
                <span v-if="device.batteryLevel !== null" class="flex items-center gap-1">
                  <BatteryLow v-if="device.batteryLevel < 0.2" class="h-3 w-3" />
                  baterie {{ Math.round(device.batteryLevel * 100) }} %
                </span>
                <span v-if="device.configurationState !== 'Ready'">
                  konfigurace není dokončená
                </span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Badge v-if="!device.isActive" variant="outline">Deaktivovaný</Badge>
              <Button variant="outline" size="sm" @click="openEdit(device)">Upravit</Button>
              <Button
                v-if="device.isActive"
                variant="ghost"
                size="sm"
                @click="deactivateTarget = device"
              >
                Deaktivovat
              </Button>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- Spárování čtečky -->
    <Dialog v-model:open="registerOpen">
      <DialogContent class="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spárovat terminál</DialogTitle>
          <DialogDescription>
            Na terminálu otevřete Menu → Connections → Wi-Fi → API → Connect. Kód z displeje platí 5
            minut; nikam se neukládá.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="terminal-name">Název terminálu</Label>
            <Input id="terminal-name" v-model="form.name" placeholder="Bar A — SumUp 01" />
            <p class="text-xs text-muted-foreground">
              Zobrazí se obsluze u každé platby — pojmenujte ho tak, aby poznala, na kterém
              přístroji účtuje.
            </p>
          </div>

          <div class="space-y-2">
            <Label for="terminal-pairing">Párovací kód</Label>
            <Input id="terminal-pairing" v-model="form.pairingCode" placeholder="např. ABCD1234" />
          </div>

          <div class="space-y-2">
            <Label for="terminal-location">Pobočka</Label>
            <Select v-model="form.locationId">
              <SelectTrigger id="terminal-location">
                <SelectValue placeholder="Vyberte pobočku" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="UNASSIGNED">Bez pobočky</SelectItem>
                <SelectItem v-for="loc in locations" :key="loc.id" :value="loc.id">
                  {{ loc.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Určuje, komu spadne tržba. Obsluha jiné pobočky na tenhle terminál nezaplatí.
            </p>
          </div>

          <div v-if="readyConnections.length > 1" class="space-y-2">
            <Label for="terminal-connection">Konfigurace SumUpu</Label>
            <Select v-model="form.providerConnectionId">
              <SelectTrigger id="terminal-connection">
                <SelectValue placeholder="Vyberte konfiguraci" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="conn in readyConnections" :key="conn.id" :value="conn.id">
                  {{ conn.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="registering" @click="registerOpen = false">
            Zrušit
          </Button>
          <Button :disabled="registering" @click="submitRegister">
            <Loader2 v-if="registering" class="h-4 w-4 animate-spin" />
            Spárovat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Přejmenování / přeřazení -->
    <Dialog :open="editTarget !== null" @update:open="(v) => !v && (editTarget = null)">
      <DialogContent class="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upravit terminál</DialogTitle>
          <DialogDescription>
            Přeřazení na jinou pobočku přesměruje tržbu z tohoto terminálu a zapíše se do historie
            změn.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="edit-terminal-name">Název terminálu</Label>
            <Input id="edit-terminal-name" v-model="editForm.name" />
          </div>
          <div class="space-y-2">
            <Label for="edit-terminal-location">Pobočka</Label>
            <Select v-model="editForm.locationId">
              <SelectTrigger id="edit-terminal-location">
                <SelectValue placeholder="Vyberte pobočku" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="UNASSIGNED">Bez pobočky</SelectItem>
                <SelectItem v-for="loc in locations" :key="loc.id" :value="loc.id">
                  {{ loc.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="saving" @click="editTarget = null">Zrušit</Button>
          <Button :disabled="saving" @click="submitEdit">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog
      :open="deactivateTarget !== null"
      @update:open="(v) => !v && !deactivating && (deactivateTarget = null)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deaktivovat terminál?</AlertDialogTitle>
          <AlertDialogDescription>
            {{ deactivateTarget?.name }} zmizí z nabídky a nové platby na něj neprojdou. Historie
            plateb zůstává.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deactivating">Zrušit</AlertDialogCancel>
          <AlertDialogAction :disabled="deactivating" @click="confirmDeactivate">
            Deaktivovat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
