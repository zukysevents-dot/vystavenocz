<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Gift, Loader2, Plus, RefreshCw, Save, UserRound } from 'lucide-vue-next'
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
import LoadError from '@/components/app/LoadError.vue'
import { formatDate } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import {
  useCustomers,
  type CustomerLoyalty,
  type LoyaltyCustomer,
  type LoyaltyLedgerType,
} from '@/composables/useCustomers'
import { useLoyalty, type LoyaltySettings } from '@/composables/useLoyalty'

const customersApi = useCustomers()
const loyaltyApi = useLoyalty()

const loading = ref(true)
const saving = ref(false)
const loadError = ref(false)
const customers = ref<LoyaltyCustomer[]>([])
const settings = ref<LoyaltySettings>({
  earnRateCzkPerPoint: 0,
  pointValueCzk: 0,
  maxRedeemPointsPerSale: 0,
})

const selectedCustomer = ref<LoyaltyCustomer | null>(null)
const ledger = ref<CustomerLoyalty | null>(null)
const customerDialogOpen = ref(false)
const ledgerDialogOpen = ref(false)
const customerForm = ref({ name: '', phone: '', email: '' })
const adjustForm = ref({ points: 0, note: '' })

const totalPoints = computed(() => customers.value.reduce((sum, c) => sum + c.loyaltyPoints, 0))
const activeCustomers = computed(() => customers.value.filter((c) => c.loyaltyPoints !== 0).length)

async function reload() {
  loading.value = true
  loadError.value = false
  try {
    const [customerPage, loyaltySettings] = await Promise.all([
      customersApi.list('', 200),
      loyaltyApi.getSettings(),
    ])
    customers.value = customerPage.items
    settings.value = loyaltySettings
  } catch (e) {
    loadError.value = true
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(reload)

async function saveSettings() {
  saving.value = true
  try {
    settings.value = await loyaltyApi.updateSettings({
      earnRateCzkPerPoint: Number(settings.value.earnRateCzkPerPoint) || 0,
      pointValueCzk: Number(settings.value.pointValueCzk) || 0,
      maxRedeemPointsPerSale: Number(settings.value.maxRedeemPointsPerSale) || 0,
    })
    toast.success('Nastavení věrnosti uloženo.')
  } catch (e) {
    toast.error('Nastavení se nepodařilo uložit.')
    console.error(e)
  } finally {
    saving.value = false
  }
}

function openCustomerDialog() {
  customerForm.value = { name: '', phone: '', email: '' }
  customerDialogOpen.value = true
}

async function createCustomer() {
  if (!customerForm.value.name.trim()) return
  saving.value = true
  try {
    const customer = await customersApi.create(customerForm.value)
    customers.value = [customer, ...customers.value].sort((a, b) => a.name.localeCompare(b.name))
    customerDialogOpen.value = false
    toast.success('Zákazník přidán.')
  } catch (e) {
    toast.error('Zákazníka se nepodařilo uložit.')
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function openLedger(customer: LoyaltyCustomer) {
  selectedCustomer.value = customer
  ledger.value = null
  adjustForm.value = { points: 0, note: '' }
  ledgerDialogOpen.value = true
  try {
    ledger.value = await customersApi.loyalty(customer.id)
  } catch (e) {
    toast.error('Historii bodů se nepodařilo načíst.')
    console.error(e)
  }
}

async function adjustPoints() {
  if (!selectedCustomer.value || !adjustForm.value.points) return
  saving.value = true
  try {
    ledger.value = await customersApi.adjust(
      selectedCustomer.value.id,
      Number(adjustForm.value.points),
      adjustForm.value.note,
    )
    customers.value = customers.value.map((customer) =>
      customer.id === selectedCustomer.value?.id
        ? { ...customer, loyaltyPoints: ledger.value?.balance ?? customer.loyaltyPoints }
        : customer,
    )
    selectedCustomer.value =
      customers.value.find((c) => c.id === selectedCustomer.value?.id) ?? null
    adjustForm.value = { points: 0, note: '' }
    toast.success('Body upraveny.')
  } catch (e) {
    toast.error('Korekci bodů se nepodařilo uložit.')
    console.error(e)
  } finally {
    saving.value = false
  }
}

function ledgerTypeLabel(type: LoyaltyLedgerType): string {
  if (type === 'Earn') return 'Získáno'
  if (type === 'Redeem') return 'Uplatněno'
  if (type === 'Reversal') return 'Storno'
  return 'Ruční úprava'
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Věrnost</h1>
        <p class="mt-1 text-muted-foreground">Zákazníci, body a pravidla uplatnění.</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" :disabled="loading" @click="reload">
          <RefreshCw class="h-4 w-4" /> Obnovit
        </Button>
        <Button variant="coral" @click="openCustomerDialog">
          <Plus class="h-4 w-4" /> Zákazník
        </Button>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <template v-else>
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Zákazníků</div>
          <div class="mt-1 text-2xl font-bold">{{ customers.length }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Aktivní s body</div>
          <div class="mt-1 text-2xl font-bold">{{ activeCustomers }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Body celkem</div>
          <div class="mt-1 text-2xl font-bold">{{ totalPoints }}</div>
        </div>
      </div>

      <section class="mt-6 rounded-xl border border-border bg-card p-4">
        <div class="mb-4 flex items-center gap-2">
          <Gift class="h-5 w-5 text-primary" />
          <h2 class="font-semibold">Nastavení programu</h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="space-y-1.5">
            <Label for="earn-rate">Kč za 1 bod</Label>
            <Input
              id="earn-rate"
              v-model.number="settings.earnRateCzkPerPoint"
              type="number"
              min="0"
            />
          </div>
          <div class="space-y-1.5">
            <Label for="point-value">Hodnota bodu v Kč</Label>
            <Input id="point-value" v-model.number="settings.pointValueCzk" type="number" min="0" />
          </div>
          <div class="space-y-1.5">
            <Label for="max-redeem">Max bodů na prodej</Label>
            <Input
              id="max-redeem"
              v-model.number="settings.maxRedeemPointsPerSale"
              type="number"
              min="0"
            />
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <Button variant="coral" :disabled="saving" @click="saveSettings">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" /> Uložit
          </Button>
        </div>
      </section>

      <section class="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div class="border-b border-border p-4 font-semibold">Zákazníci</div>
        <div v-if="customers.length === 0" class="p-10 text-center text-sm text-muted-foreground">
          Zatím žádní zákazníci.
        </div>
        <div v-else class="divide-y divide-border">
          <button
            v-for="customer in customers"
            :key="customer.id"
            type="button"
            class="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40"
            @click="openLedger(customer)"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2 font-medium">
                <UserRound class="h-4 w-4 text-muted-foreground" />
                <span class="truncate">{{ customer.name }}</span>
              </div>
              <div class="mt-0.5 text-xs text-muted-foreground">
                {{ [customer.phone, customer.email].filter(Boolean).join(' · ') || 'Bez kontaktu' }}
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-lg font-bold tabular-nums">{{ customer.loyaltyPoints }}</div>
              <div class="text-xs text-muted-foreground">bodů</div>
            </div>
          </button>
        </div>
      </section>
    </template>

    <Dialog v-model:open="customerDialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový zákazník</DialogTitle>
          <DialogDescription>Zákazník půjde vybrat v Pokladně i Restauraci.</DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <div class="space-y-1.5">
            <Label for="customer-name">Jméno</Label>
            <Input id="customer-name" v-model="customerForm.name" />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label for="customer-phone">Telefon</Label>
              <Input id="customer-phone" v-model="customerForm.phone" />
            </div>
            <div class="space-y-1.5">
              <Label for="customer-email">E-mail</Label>
              <Input id="customer-email" v-model="customerForm.email" type="email" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" @click="customerDialogOpen = false">Zavřít</Button>
          <Button
            variant="coral"
            :disabled="saving || !customerForm.name.trim()"
            @click="createCustomer"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Uložit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="ledgerDialogOpen">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ selectedCustomer?.name }}</DialogTitle>
          <DialogDescription>
            Zůstatek {{ ledger?.balance ?? selectedCustomer?.loyaltyPoints ?? 0 }} bodů.
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
          <Input v-model.number="adjustForm.points" type="number" placeholder="+/- body" />
          <Textarea v-model="adjustForm.note" class="min-h-10" placeholder="Poznámka" />
          <Button variant="outline" :disabled="saving || !adjustForm.points" @click="adjustPoints">
            Upravit
          </Button>
        </div>

        <div class="max-h-96 overflow-y-auto rounded-lg border border-border">
          <div v-if="!ledger" class="flex justify-center p-8">
            <Loader2 class="h-5 w-5 animate-spin text-primary" />
          </div>
          <div
            v-else-if="ledger.entries.length === 0"
            class="p-8 text-center text-sm text-muted-foreground"
          >
            Bez pohybů.
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="entry in ledger.entries"
              :key="entry.id"
              class="flex items-start justify-between gap-3 p-3 text-sm"
            >
              <div>
                <div class="font-medium">{{ ledgerTypeLabel(entry.type) }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ formatDate(entry.createdAt) }}
                  <span v-if="entry.note"> · {{ entry.note }}</span>
                </div>
              </div>
              <div
                class="font-bold tabular-nums"
                :class="entry.points >= 0 ? 'text-primary' : 'text-destructive'"
              >
                {{ entry.points > 0 ? '+' : '' }}{{ entry.points }}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
