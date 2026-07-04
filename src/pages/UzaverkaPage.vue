<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Receipt,
  ShoppingCart,
  TrendingUp,
  Banknote,
  CreditCard,
  HandCoins,
  Loader2,
  Info,
  Lock,
  Download,
} from 'lucide-vue-next'
import { formatCZK } from '@/lib/invoice'
import { isApiMode } from '@/lib/http'
import { useSalesReport } from '@/composables/useSalesReport'
import { useDayClose, DayCloseError } from '@/composables/useDayClose'
import { useLocations } from '@/composables/useLocations'
import { downloadCsv } from '@/lib/csv-export'
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { DayCloseResponse } from '@/lib/types'

const apiMode = isApiMode()

const { loading, error, summary, vatBreakdown, soldProducts, byCategory, reload } = useSalesReport()
const { getDayClose, closeDay } = useDayClose()
const { locations, load: loadLocations } = useLocations()

// --- Výběr dne + pobočky (Fáze 2) ---
function todayISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10)
}
const today = todayISO()
const selectedDate = ref(today)
const selectedLocationId = ref<string>('')
// Provozovny už doběhly (ať neblikne prázdný stav, dokud se načítají).
const locationsLoaded = ref(false)
const noLocations = computed(() => apiMode && locationsLoaded.value && locations.value.length === 0)

// Stav dne + Z-report (jen API režim).
const dayState = ref<DayCloseResponse | null>(null)
const dayLoading = ref(false)
const dayError = ref(false)

const isClosed = computed(() => dayState.value?.status === 'Closed')
const zReport = computed(() => (isClosed.value ? dayState.value : null))
const hasCashClose = computed(
  () =>
    zReport.value != null &&
    (zReport.value.cashOpening != null ||
      zReport.value.cashCountedClosing != null ||
      zReport.value.cashExpectedClosing != null),
)

/** Načte stav dne a — když je OTEVŘENÝ — i živý přehled pro zvolený den + pobočku. */
async function loadDay(): Promise<void> {
  if (!apiMode || !selectedLocationId.value) return
  dayLoading.value = true
  dayError.value = false
  try {
    const state = await getDayClose(selectedDate.value, selectedLocationId.value)
    dayState.value = state
    if (state.status === 'Open') {
      await reload({ date: selectedDate.value, locationId: selectedLocationId.value })
    }
  } catch (e) {
    dayError.value = true
    if (e instanceof DayCloseError && e.status !== 0) toast.error(e.message)
    console.warn('Načtení stavu dne selhalo:', e)
  } finally {
    dayLoading.value = false
  }
}

// --- Potvrzovací dialog zavření dne (opravený vzor: samostatný boolean + odchyt hodnot) ---
const closeOpen = ref(false)
const closing = ref(false)
// Volitelná hotovostní uzávěrka (prázdné pole = null, neposílá se).
const cashOpening = ref<string>('')
const cashCounted = ref<string>('')
const cashDrop = ref<string>('')

function askClose(): void {
  cashOpening.value = ''
  cashCounted.value = ''
  cashDrop.value = ''
  closeOpen.value = true
}

/** '' → null; jinak číslo (NaN → null). */
function toNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

async function confirmClose(): Promise<void> {
  const date = selectedDate.value
  const locationId = selectedLocationId.value
  const payload = {
    date,
    locationId,
    cashOpening: toNum(cashOpening.value),
    cashCountedClosing: toNum(cashCounted.value),
    cashDrop: toNum(cashDrop.value),
  }
  closeOpen.value = false
  closing.value = true
  try {
    const closed = await closeDay(payload)
    dayState.value = closed
    toast.success(`Den uzavřen — Z-report č. ${closed.zReportNumber ?? ''}`.trim())
  } catch (e) {
    if (e instanceof DayCloseError) {
      toast.error(e.message)
      // 409 = mezitím zavřel někdo jiný → přenačti stav, ať se ukáže Z-report.
      if (e.status === 409) await loadDay()
    } else {
      toast.error('Zavření dne se nezdařilo.')
    }
  } finally {
    closing.value = false
  }
}

/** Export Z-reportu do CSV (české Excel konvence). */
function exportZReport(): void {
  const z = zReport.value
  if (!z) return
  const loc = locations.value.find((l) => l.id === z.locationId)?.name ?? z.locationId
  const rows: (string | number)[][] = [
    ['Z-report číslo', z.zReportNumber ?? ''],
    ['Datum', z.date],
    ['Pobočka', loc],
    ['Uzavřeno', z.closedAt ?? ''],
    ['Počet účtenek', z.saleCount ?? 0],
    ['Základ (net)', z.totalNet ?? 0],
    ['DPH', z.totalVat ?? 0],
    ['Celkem', z.total ?? 0],
    ['Hotovost', z.cashTotal ?? 0],
    ['Karta', z.cardTotal ?? 0],
    ['Spropitné', z.tipTotal ?? 0],
    ['Slevy', z.discountTotal ?? 0],
    ['Stornovaných účtenek', z.cancelledCount ?? 0],
    ['Hodnota storn', z.cancelledTotal ?? 0],
  ]
  for (const v of z.vatBreakdown ?? []) {
    rows.push([`DPH ${v.vatRate} % — základ`, v.net])
    rows.push([`DPH ${v.vatRate} % — daň`, v.vat])
    rows.push([`DPH ${v.vatRate} % — vč. DPH`, v.gross])
  }
  // Prodané produkty (inventura) — vlastní 3sloupcový blok: název / množství / tržba.
  if (z.productBreakdown?.length) {
    rows.push(['Prodané produkty', 'Množství', 'Tržba'])
    for (const p of z.productBreakdown) {
      rows.push([p.name, p.quantity, p.revenueGross])
    }
  }
  if (hasCashClose.value) {
    rows.push(['Počáteční hotovost', z.cashOpening ?? 0])
    rows.push(['Spočítaná hotovost', z.cashCountedClosing ?? 0])
    rows.push(['Odvod hotovosti', z.cashDrop ?? 0])
    rows.push(['Očekávaná hotovost', z.cashExpectedClosing ?? 0])
    rows.push(['Rozdíl (manko/přebytek)', z.cashDifference ?? 0])
  }
  downloadCsv(`z-report-${z.date}`, ['Položka', 'Hodnota'], rows)
}

onMounted(async () => {
  if (apiMode) {
    await loadLocations()
    locationsLoaded.value = true
    // Jedna pobočka → vezmeme automaticky; víc → uživatel vybere.
    if (locations.value.length >= 1) selectedLocationId.value = locations.value[0].id
    await loadDay()
  } else {
    // Mock režim: Fáze 2 nedostupná, ale ukážeme aspoň orientační přehled dneška (Fáze 1).
    await reload()
  }
})

// Změna dne nebo pobočky → přenačti stav dne.
watch([selectedDate, selectedLocationId], () => {
  if (apiMode && selectedLocationId.value) loadDay()
})
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Uzávěrka</h1>
      <p class="mt-1 text-muted-foreground">Přehled tržeb a zavření obchodního dne.</p>
    </div>

    <!-- Mock režim: zavření dne běží jen proti serveru. -->
    <div
      v-if="!apiMode"
      class="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
    >
      <Info class="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Zavření dne a Z-report jsou dostupné jen proti serveru. Níže je
        <strong class="font-medium text-foreground">orientační</strong> přehled dneška.
      </span>
    </div>

    <!-- Klient nemá žádnou provozovnu → per-pobočka uzávěrka nemá co ukázat. -->
    <div v-if="noLocations" class="mt-6 rounded-xl border border-border bg-card p-6 text-center">
      <Info class="mx-auto h-8 w-8 text-muted-foreground" />
      <p class="mt-3 font-semibold">Zatím žádná provozovna</p>
      <p class="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Uzávěrka se dělá po provozovnách. Přidejte si provozovnu a pak na ni v pokladně prodávejte —
        tržby se sem začnou propisovat.
      </p>
      <Button as-child variant="coral" class="mt-4">
        <RouterLink to="/app/pobocky">Přidat provozovnu</RouterLink>
      </Button>
    </div>

    <!-- Výběr dne + pobočky (Fáze 2, jen API režim) -->
    <div v-else-if="apiMode" class="mt-6 flex flex-wrap items-end gap-3">
      <div class="grid gap-1.5">
        <Label for="uzaverka-date">Den</Label>
        <Input id="uzaverka-date" v-model="selectedDate" type="date" :max="today" class="w-44" />
      </div>
      <div v-if="locations.length > 1" class="grid gap-1.5">
        <Label for="uzaverka-location">Pobočka</Label>
        <Select v-model="selectedLocationId">
          <SelectTrigger id="uzaverka-location" class="w-56">
            <SelectValue placeholder="Vyberte pobočku…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="l in locations" :key="l.id" :value="l.id">
              {{ l.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- Stav dne se načítá -->
    <div v-if="apiMode && dayLoading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="apiMode && dayError" class="mt-6" @retry="loadDay" />

    <!-- ============ ZAVŘENÝ DEN → Z-REPORT ============ -->
    <template v-else-if="apiMode && isClosed && zReport">
      <div
        class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div class="flex items-start gap-2">
          <Lock class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div class="text-lg font-semibold">Z-report č. {{ zReport.zReportNumber }}</div>
            <div class="text-sm text-muted-foreground">
              Den {{ zReport.date }} je uzavřený (read-only).
              <template v-if="zReport.closedAt">
                Zavřeno {{ new Date(zReport.closedAt).toLocaleString('cs-CZ') }}.
              </template>
            </div>
          </div>
        </div>
        <Button variant="outline" @click="exportZReport">
          <Download class="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <!-- Zafixovaná KPI Z-reportu -->
      <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShoppingCart class="h-4 w-4" /> Účtenek
          </div>
          <div class="mt-1 text-2xl font-bold">{{ zReport.saleCount ?? 0 }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUp class="h-4 w-4 text-primary" /> Tržba celkem
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(zReport.total ?? 0) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Receipt class="h-4 w-4" /> Základ / DPH
          </div>
          <div class="mt-1 text-lg font-bold">
            {{ formatCZK(zReport.totalNet ?? 0) }}
            <span class="text-sm font-normal text-muted-foreground">
              + {{ formatCZK(zReport.totalVat ?? 0) }}
            </span>
          </div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Banknote class="h-4 w-4" /> Hotovost
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(zReport.cashTotal ?? 0) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CreditCard class="h-4 w-4" /> Karta
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(zReport.cardTotal ?? 0) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <HandCoins class="h-4 w-4" /> Spropitné
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(zReport.tipTotal ?? 0) }}</div>
        </div>
      </div>

      <!-- Rozpad DPH (zafixovaný) -->
      <h2 class="mt-8 text-lg font-semibold">Rozpad DPH</h2>
      <div
        v-if="!zReport.vatBreakdown || zReport.vatBreakdown.length === 0"
        class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Bez položek pro rozpad DPH.
      </div>
      <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full min-w-[480px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Sazba</th>
              <th class="px-4 py-3 text-right">Základ</th>
              <th class="px-4 py-3 text-right">DPH</th>
              <th class="px-4 py-3 text-right">Vč. DPH</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in zReport.vatBreakdown"
              :key="r.vatRate"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ r.vatRate }} %</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(r.net) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(r.vat) }}</td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">
                {{ formatCZK(r.gross) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t border-border bg-muted/20 font-semibold">
            <tr>
              <td class="px-4 py-3">Celkem</td>
              <td class="px-4 py-3 text-right tabular-nums">
                {{ formatCZK(zReport.totalNet ?? 0) }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums">
                {{ formatCZK(zReport.totalVat ?? 0) }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(zReport.total ?? 0) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Storna & slevy (zafixované) -->
      <h2 class="mt-8 text-lg font-semibold">Storna &amp; slevy</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Stornovaných účtenek</div>
          <div class="mt-1 text-2xl font-bold">{{ zReport.cancelledCount ?? 0 }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Hodnota storn</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(zReport.cancelledTotal ?? 0) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Slevy na účet</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(zReport.discountTotal ?? 0) }}</div>
        </div>
      </div>

      <!-- Prodané produkty (zafixované) — kompletní výpis za den pro inventuru -->
      <h2 class="mt-8 text-lg font-semibold">Prodané produkty</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Kompletní seznam prodaných položek za den — pro inventuru.
      </p>
      <div
        v-if="!zReport.productBreakdown || zReport.productBreakdown.length === 0"
        class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Žádné prodané položky.
      </div>
      <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full min-w-[480px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Produkt</th>
              <th class="px-4 py-3 text-right">Množství</th>
              <th class="px-4 py-3 text-right">Tržba</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in zReport.productBreakdown"
              :key="p.productId ?? 'unknown'"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ p.name }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {{ p.quantity }}
              </td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">
                {{ formatCZK(p.revenueGross) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t border-border bg-muted/20 font-semibold">
            <tr>
              <td class="px-4 py-3">Celkem položek</td>
              <td class="px-4 py-3 text-right tabular-nums">
                {{ zReport.productBreakdown.reduce((sum, p) => sum + p.quantity, 0) }}
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(zReport.total ?? 0) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Hotovostní uzávěrka (jen když vyplněná) -->
      <template v-if="hasCashClose">
        <h2 class="mt-8 text-lg font-semibold">Hotovostní uzávěrka</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Počáteční hotovost</div>
            <div class="mt-1 text-xl font-bold">{{ formatCZK(zReport.cashOpening ?? 0) }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Očekávaná hotovost</div>
            <div class="mt-1 text-xl font-bold">
              {{ formatCZK(zReport.cashExpectedClosing ?? 0) }}
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Spočítaná hotovost</div>
            <div class="mt-1 text-xl font-bold">
              {{ formatCZK(zReport.cashCountedClosing ?? 0) }}
            </div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Odvod hotovosti</div>
            <div class="mt-1 text-xl font-bold">{{ formatCZK(zReport.cashDrop ?? 0) }}</div>
          </div>
          <div
            class="rounded-xl border p-4"
            :class="
              (zReport.cashDifference ?? 0) === 0
                ? 'border-border bg-card'
                : 'border-destructive/40 bg-destructive/5'
            "
          >
            <div class="text-sm text-muted-foreground">
              Rozdíl {{ (zReport.cashDifference ?? 0) < 0 ? '(manko)' : '' }}
            </div>
            <div
              class="mt-1 text-xl font-bold"
              :class="(zReport.cashDifference ?? 0) !== 0 ? 'text-destructive' : ''"
            >
              {{ formatCZK(zReport.cashDifference ?? 0) }}
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ============ OTEVŘENÝ DEN → ŽIVÝ PŘEHLED + ZAVŘÍT ============ -->
    <!-- Bez provozovny (apiMode) se sem nepadá — jinak by živý přehled točil donekonečna. -->
    <template v-else-if="!noLocations">
      <div v-if="loading" class="mt-12 flex justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <LoadError v-else-if="error" class="mt-6" @retry="reload" />

      <template v-else>
        <!-- Akční lišta: zavřít den (jen API + otevřený den + vybraná pobočka) -->
        <div
          v-if="apiMode && selectedLocationId"
          class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4"
        >
          <div class="flex items-start gap-2 text-sm text-muted-foreground">
            <Info class="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Den je <strong class="font-medium text-foreground">otevřený</strong>. Živý přehled,
              čísla se ještě mění. Zavřením dne se vygeneruje Z-report a den se uzamkne.
            </span>
          </div>
          <Button :disabled="closing" @click="askClose">
            <Loader2 v-if="closing" class="h-4 w-4 animate-spin" />
            <Lock v-else class="h-4 w-4" />
            Zavřít den
          </Button>
        </div>

        <!-- KPI dlaždice (živě) -->
        <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShoppingCart class="h-4 w-4" /> Účtenek
            </div>
            <div class="mt-1 text-2xl font-bold">{{ summary.count }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Receipt class="h-4 w-4" /> Průměrný účet
            </div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.avgSale) }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp class="h-4 w-4 text-primary" /> Tržba celkem
            </div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.total) }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Banknote class="h-4 w-4" /> Hotovost
            </div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.cashTotal) }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CreditCard class="h-4 w-4" /> Karta
            </div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.cardTotal) }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <HandCoins class="h-4 w-4" /> Spropitné
            </div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.tipTotal) }}</div>
          </div>
        </div>

        <!-- Rozpad DPH -->
        <h2 class="mt-8 text-lg font-semibold">Rozpad DPH</h2>
        <div
          v-if="vatBreakdown.length === 0"
          class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
        >
          Zatím žádné položky pro rozpad DPH.
        </div>
        <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table class="w-full min-w-[480px] text-sm">
            <thead
              class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Sazba</th>
                <th class="px-4 py-3 text-right">Základ</th>
                <th class="px-4 py-3 text-right">DPH</th>
                <th class="px-4 py-3 text-right">Vč. DPH</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in vatBreakdown"
                :key="r.vatRate"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3 font-medium">{{ r.vatRate }} %</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(r.net) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(r.vat) }}</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">
                  {{ formatCZK(r.gross) }}
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t border-border bg-muted/20 font-semibold">
              <tr>
                <td class="px-4 py-3">Celkem</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(summary.totalNet) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(summary.totalVat) }}</td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(summary.total) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Storna + slevy -->
        <h2 class="mt-8 text-lg font-semibold">Storna &amp; slevy</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Stornovaných účtenek</div>
            <div class="mt-1 text-2xl font-bold">{{ summary.cancelledCount }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Hodnota storn</div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.cancelledTotal) }}</div>
          </div>
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="text-sm text-muted-foreground">Slevy na účet</div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.discountTotal) }}</div>
          </div>
        </div>

        <!-- Prodané produkty — kompletní výpis za den (pro inventuru) -->
        <h2 class="mt-8 text-lg font-semibold">Prodané produkty</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Kompletní seznam prodaných položek za den — pro inventuru.
        </p>
        <div
          v-if="soldProducts.length === 0"
          class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
        >
          Zatím žádné prodané položky.
        </div>
        <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table class="w-full min-w-[480px] text-sm">
            <thead
              class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Produkt</th>
                <th class="px-4 py-3 text-right">Množství</th>
                <th class="px-4 py-3 text-right">Tržba</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in soldProducts"
                :key="p.productId ?? 'unknown'"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3 font-medium">{{ p.name }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {{ p.quantity }}
                </td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">
                  {{ formatCZK(p.revenueGross) }}
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t border-border bg-muted/20 font-semibold">
              <tr>
                <td class="px-4 py-3">Celkem položek</td>
                <td class="px-4 py-3 text-right tabular-nums">
                  {{ soldProducts.reduce((sum, p) => sum + p.quantity, 0) }}
                </td>
                <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(summary.total) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Tržby po kategoriích -->
        <h2 class="mt-8 text-lg font-semibold">Tržby po kategoriích</h2>
        <div
          v-if="byCategory.length === 0"
          class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
        >
          Zatím žádné tržby podle kategorií.
        </div>
        <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table class="w-full min-w-[480px] text-sm">
            <thead
              class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Kategorie</th>
                <th class="px-4 py-3 text-right">Množství</th>
                <th class="px-4 py-3 text-right">Tržba</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in byCategory"
                :key="c.categoryName"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3 font-medium">{{ c.categoryName }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {{ c.quantity }}
                </td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">
                  {{ formatCZK(c.revenueGross) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- Potvrzovací dialog zavření dne + volitelná hotovostní uzávěrka -->
    <AlertDialog :open="closeOpen" @update:open="(o) => (closeOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zavřít den {{ selectedDate }}?</AlertDialogTitle>
          <AlertDialogDescription>
            Vygeneruje se Z-report a den se uzamkne (nelze vrátit). Hotovostní uzávěrka je volitelná
            — nechte prázdné, pokud ji neřešíte.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div class="grid gap-3 py-2">
          <div class="grid gap-1.5">
            <Label for="cash-opening">Počáteční hotovost (Kč)</Label>
            <Input id="cash-opening" v-model="cashOpening" inputmode="decimal" placeholder="0" />
          </div>
          <div class="grid gap-1.5">
            <Label for="cash-counted">Spočítaná hotovost v pokladně (Kč)</Label>
            <Input id="cash-counted" v-model="cashCounted" inputmode="decimal" placeholder="0" />
          </div>
          <div class="grid gap-1.5">
            <Label for="cash-drop">Odvod hotovosti (Kč)</Label>
            <Input id="cash-drop" v-model="cashDrop" inputmode="decimal" placeholder="0" />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction @click="confirmClose">Zavřít den</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
