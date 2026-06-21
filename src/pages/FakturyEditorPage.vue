<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Save, Loader2, UserPlus } from 'lucide-vue-next'
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
import QuickClientDialog, { type QuickClient } from '@/components/app/QuickClientDialog.vue'
import { useClients } from '@/composables/useClients'
import { useInvoices, type InvoiceInput } from '@/composables/useInvoices'
import { useCompanyStore } from '@/stores/company'
import { buildInvoiceNumber, variableSymbolFromInvoiceNumber } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type { ClientSnapshot, SupplierSnapshot } from '@/lib/types'

const route = useRoute()
const router = useRouter()
const { clients, load: loadClients, getById: getClientById } = useClients()
const { create, update, getById, load: loadInvoices } = useInvoices()
const companyStore = useCompanyStore()

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const paymentMethods = [
  { value: 'bank_transfer', label: 'Převodem' },
  { value: 'cash', label: 'Hotově' },
  { value: 'card', label: 'Kartou' },
]

const loading = ref(true)
const saving = ref(false)
const quickOpen = ref(false)

const editingId = ref<string | null>(null)

// Stav hlavičky.
const selectedClientId = ref('')
const adHocClient = ref<ClientSnapshot | null>(null)
const invoiceNumber = ref('')
const issueDate = ref(todayISO())
const dueDate = ref(addDaysISO(14))
const variableSymbol = ref('')
const paymentMethod = ref('bank_transfer')

onMounted(async () => {
  companyStore.init()
  await Promise.all([loadClients(), loadInvoices()])

  const id = typeof route.query.id === 'string' ? route.query.id : null
  if (id) {
    const inv = getById(id)
    if (inv) {
      editingId.value = id
      invoiceNumber.value = inv.invoiceNumber
      issueDate.value = inv.issueDate
      dueDate.value = inv.dueDate
      variableSymbol.value = inv.variableSymbol ?? ''
      paymentMethod.value = inv.paymentMethod
      selectedClientId.value = inv.clientId && getClientById(inv.clientId) ? inv.clientId : ''
      if (!selectedClientId.value && inv.clientSnapshot?.name) {
        adHocClient.value = inv.clientSnapshot
      }
    } else {
      toast.error('Faktura nenalezena.')
      router.replace('/app/faktury')
      return
    }
  } else {
    // Nová faktura — předvyplň číslo z profilu firmy a VS odvoď z čísla.
    const c = companyStore.company
    invoiceNumber.value = buildInvoiceNumber(
      c?.invoiceNumberPrefix || 'FA',
      c?.invoiceNumberFormat || '{prefix}-{year}-{seq}',
      c?.nextInvoiceSeq || 1,
    )
    variableSymbol.value = variableSymbolFromInvoiceNumber(invoiceNumber.value)
    const clientIdQ = typeof route.query.clientId === 'string' ? route.query.clientId : null
    if (clientIdQ) selectedClientId.value = clientIdQ
  }

  loading.value = false
})

// Změna klienta ze seznamu: zruš ad-hoc odběratele a u nové faktury dotáhni splatnost.
watch(selectedClientId, (id) => {
  if (id) adHocClient.value = null
  if (editingId.value) return
  const c = getClientById(id)
  if (c) dueDate.value = addDaysISO(c.defaultPaymentDays)
})

function onQuickConfirm(client: QuickClient, savedClientId: string | null) {
  if (savedClientId) {
    // Klient byl uložen do seznamu — vyber ho (watcher dotáhne splatnost).
    selectedClientId.value = savedClientId
  } else {
    const { defaultPaymentDays, ...snapshot } = client
    adHocClient.value = snapshot
    selectedClientId.value = ''
    if (!editingId.value) dueDate.value = addDaysISO(defaultPaymentDays)
  }
}

function buildSupplierSnapshot(): SupplierSnapshot {
  const c = companyStore.company
  return {
    companyName: c?.companyName ?? null,
    fullName: c?.fullName ?? null,
    ico: c?.ico ?? null,
    dic: c?.dic ?? null,
    vatMode: c?.vatMode,
    street: c?.street ?? null,
    city: c?.city ?? null,
    zip: c?.zip ?? null,
    country: c?.country,
    bankAccount: c?.bankAccount ?? null,
    iban: c?.iban ?? null,
    swift: c?.swift ?? null,
    email: c?.email,
    logoUrl: c?.logoUrl ?? null,
    invoiceColor: c?.invoiceColor ?? null,
  }
}

function buildClientSnapshot(): ClientSnapshot {
  if (selectedClientId.value) {
    const c = getClientById(selectedClientId.value)
    if (c) {
      return {
        name: c.name,
        ico: c.ico,
        dic: c.dic,
        street: c.street,
        city: c.city,
        zip: c.zip,
        country: c.country,
        email: c.email,
      }
    }
  }
  return adHocClient.value ?? { name: '' }
}

async function onSave() {
  saving.value = true
  try {
    // Položky a součty přijdou ve F6-46 — koncept se zatím ukládá bez položek.
    const input: InvoiceInput = {
      documentType: 'invoice',
      status: 'draft',
      invoiceNumber: invoiceNumber.value.trim(),
      clientId: selectedClientId.value || null,
      clientSnapshot: buildClientSnapshot(),
      supplierSnapshot: buildSupplierSnapshot(),
      items: [],
      currency: 'CZK',
      issueDate: issueDate.value,
      dueDate: dueDate.value,
      taxableDate: issueDate.value,
      paidAt: null,
      variableSymbol:
        variableSymbol.value.trim() || variableSymbolFromInvoiceNumber(invoiceNumber.value),
      constantSymbol: null,
      specificSymbol: null,
      paymentMethod: paymentMethod.value,
      notes: null,
    }

    if (editingId.value) {
      await update(editingId.value, input)
    } else {
      const created = await create(input)
      editingId.value = created.id
      // Posuň pořadové číslo, ať příští faktura nedostane stejné.
      const c = companyStore.company
      if (c) companyStore.save({ nextInvoiceSeq: (c.nextInvoiceSeq || 1) + 1 })
      // Převezmi id do URL, aby další uložení byla update (ne duplicitní faktura).
      router.replace({ query: { id: created.id } })
    }
    toast.success('Koncept uložen.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" title="Zpět" @click="router.push('/app/faktury')">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            {{ editingId ? 'Upravit fakturu' : 'Nová faktura' }}
          </h1>
          <p class="text-sm text-muted-foreground">Hlavička faktury</p>
        </div>
      </div>
      <Button variant="coral" :disabled="saving || loading" @click="onSave">
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <Save v-else class="h-4 w-4" />
        Uložit koncept
      </Button>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div v-else class="mt-6 space-y-6">
      <!-- Odběratel -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Odběratel
        </h2>
        <div class="mt-4 space-y-2">
          <Label>Klient</Label>
          <div class="flex gap-2">
            <Select v-model="selectedClientId">
              <SelectTrigger class="flex-1">
                <SelectValue placeholder="Vyberte klienta…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in clients" :key="c.id" :value="c.id">
                  {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" class="shrink-0" @click="quickOpen = true">
              <UserPlus class="h-4 w-4" /> Nový
            </Button>
          </div>
          <p v-if="adHocClient && !selectedClientId" class="text-xs text-muted-foreground">
            Neuložený odběratel:
            <span class="font-medium text-foreground">{{ adHocClient.name }}</span>
          </p>
        </div>
      </div>

      <!-- Detaily faktury -->
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Detaily faktury
        </h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="inv-number">Číslo faktury</Label>
            <Input id="inv-number" v-model="invoiceNumber" />
          </div>
          <div class="space-y-2">
            <Label for="inv-payment">Způsob úhrady</Label>
            <Select v-model="paymentMethod">
              <SelectTrigger id="inv-payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in paymentMethods" :key="m.value" :value="m.value">
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="inv-issue">Datum vystavení</Label>
            <Input id="inv-issue" v-model="issueDate" type="date" />
          </div>
          <div class="space-y-2">
            <Label for="inv-due">Datum splatnosti</Label>
            <Input id="inv-due" v-model="dueDate" type="date" />
          </div>
          <div class="space-y-2">
            <Label for="inv-vs">Variabilní symbol</Label>
            <Input id="inv-vs" v-model="variableSymbol" inputmode="numeric" />
          </div>
        </div>
      </div>

      <!-- Položky a součty — F6-46 -->
      <div
        class="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground"
      >
        Položky a součty faktury doplní další krok (F6-46).
      </div>
    </div>

    <QuickClientDialog v-model:open="quickOpen" @confirm="onQuickConfirm" />
  </div>
</template>
