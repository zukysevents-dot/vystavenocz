<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  ScanBarcode,
  Search,
  Trash2,
  Loader2,
  PackagePlus,
  AlertTriangle,
  Camera,
  FileText,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CameraScanner from '@/components/app/CameraScanner.vue'
import LoadError from '@/components/app/LoadError.vue'
import { useProducts } from '@/composables/useProducts'
import { useInventory } from '@/composables/useInventory'
import { isApiMode } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import { reorderSuggestions, findByEan } from '@/lib/reorder'
import type { Product, PurchaseReceipt, PurchaseSuggestionItem } from '@/lib/types'

const { products, load: loadProducts } = useProducts()
const inv = useInventory()
const apiMode = isApiMode()

const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const levelMap = ref(new Map<string, number>())
const recentReceipts = ref<PurchaseReceipt[]>([])
const apiSuggestions = ref<PurchaseSuggestionItem[]>([])
const apiSuggestionsLoaded = ref(false)

const scanEan = ref('')
const search = ref('')
const scanInput = ref<HTMLInputElement | null>(null)
const scannerOpen = ref(false)

interface ReceiveLine {
  productId: string
  name: string
  sku: string
  quantity: number
  unitCost: number | ''
}
const lines = ref<ReceiveLine[]>([])

const supplierName = ref('')
const documentNumber = ref('')
const note = ref('')
const receivedOn = ref(todayInputValue())

function todayInputValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function loadLevels() {
  const levels = await inv.levels()
  levelMap.value = new Map(levels.map((l) => [l.productId, l.quantity]))
}

async function loadRecentReceipts() {
  recentReceipts.value = await inv.purchaseReceipts()
}

async function loadPurchaseSuggestions() {
  try {
    const response = await inv.purchaseSuggestions({ daysAhead: 7 })
    apiSuggestions.value = response.items
    apiSuggestionsLoaded.value = true
  } catch (e) {
    console.warn('Načtení nákupních doporučení selhalo:', e)
    apiSuggestions.value = []
    apiSuggestionsLoaded.value = false
  }
}

async function reload() {
  loading.value = true
  loadError.value = false
  try {
    await loadProducts()
    await Promise.all([loadLevels(), loadRecentReceipts(), loadPurchaseSuggestions()])
  } catch (e) {
    console.warn('Načtení skladu selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
    if (!loadError.value) focusScan()
  }
}

onMounted(() => {
  if (!apiMode) {
    loading.value = false
    return
  }
  reload()
})

function focusScan() {
  nextTick(() => scanInput.value?.focus())
}

function addProduct(p: Product, qty = 1) {
  const existing = lines.value.find((l) => l.productId === p.id)
  if (existing) existing.quantity += qty
  else {
    lines.value.push({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: qty,
      unitCost: p.purchasePrice ?? '',
    })
  }
}

// Sken / EAN → přidat na příjemku. Sdílené pro HW čtečku i kameru.
// announce=true (kamera) potvrdí přidání toastem — skener zůstává otevřený.
function handleCode(raw: string, announce = false) {
  const code = raw.trim()
  if (!code) return
  const p = findByEan(products.value, code)
  if (!p) {
    toast.error(`EAN „${code}" nenalezen v katalogu.`)
  } else if (products.value.filter((x) => x.ean === code).length > 1) {
    // Neunikátní EAN → radši nenaskladnit špatný produkt, vyber ho ručně.
    toast.error(`Víc produktů se stejným EAN „${code}" — vyber ho ručně níže.`)
  } else {
    addProduct(p, 1)
    if (announce) toast.success(`${p.name} přidán na příjemku.`)
  }
}

// Čtečka pošle kód + Enter.
function onScan() {
  handleCode(scanEan.value)
  scanEan.value = ''
  focusScan()
}

const searchResults = computed<Product[]>(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return []
  return products.value
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.ean ?? '').includes(q),
    )
    .slice(0, 8)
})

function pick(p: Product) {
  addProduct(p, 1)
  search.value = ''
}

function removeLine(id: string) {
  lines.value = lines.value.filter((l) => l.productId !== id)
}

const totalUnits = computed(() => lines.value.reduce((a, l) => a + (Number(l.quantity) || 0), 0))
const totalCost = computed(() =>
  lines.value.reduce((sum, l) => {
    const quantity = Number(l.quantity) || 0
    const unitCost = normalizeUnitCost(l.unitCost)
    return unitCost === null || Number.isNaN(unitCost) ? sum : sum + quantity * unitCost
  }, 0),
)
const hasAnyCost = computed(() => lines.value.some((l) => normalizeUnitCost(l.unitCost) !== null))

function normalizeUnitCost(value: number | ''): number | null {
  if (value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function fmtMoney(value: number): string {
  return value.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })
}

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString('cs-CZ')
}

async function submit() {
  if (submitting.value || lines.value.length === 0) return
  if (lines.value.some((l) => !(Number(l.quantity) > 0)))
    return toast.error('U všech položek zadejte kladné množství.')
  if (lines.value.some((l) => normalizeUnitCost(l.unitCost) !== null && Number(l.unitCost) < 0))
    return toast.error('Nákupní cena nesmí být záporná.')
  submitting.value = true
  try {
    const receipt = await inv.createPurchaseReceipt({
      supplierName: supplierName.value.trim() || null,
      documentNumber: documentNumber.value.trim() || null,
      receivedOn: receivedOn.value || null,
      note: note.value.trim() || null,
      locationId: null,
      items: lines.value.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitCost: normalizeUnitCost(l.unitCost),
      })),
    })
    lines.value = []
    documentNumber.value = ''
    note.value = ''
    await Promise.all([loadLevels(), loadRecentReceipts(), loadPurchaseSuggestions()])
    toast.success(`Příjemka uložena: ${receipt.items.length} položek.`)
    focusScan()
  } catch (e) {
    console.error(e)
    toast.error('Příjemka se neuložila. Sklad zůstal beze změny.')
    await Promise.all([loadLevels(), loadRecentReceipts(), loadPurchaseSuggestions()])
  } finally {
    submitting.value = false
  }
}

// --- Návrhy k doobjednání ---
interface SuggestionRow {
  productId: string
  name: string
  sku: string
  current: number
  min: number
  suggested: number
  averageDailyUsage: number | null
  estimatedCost: number | null
  daysOfStockRemaining: number | null
  purchasePrice: number | null
}

const suggestions = computed<SuggestionRow[]>(() => {
  if (apiSuggestionsLoaded.value) {
    return apiSuggestions.value.map((s) => ({
      productId: s.productId,
      name: s.productName,
      sku: s.productSku,
      current: s.currentQuantity,
      min: s.minQuantity,
      suggested: s.recommendedOrderQuantity,
      averageDailyUsage: s.averageDailyUsage,
      estimatedCost: s.estimatedCost,
      daysOfStockRemaining: s.daysOfStockRemaining,
      purchasePrice: s.purchasePrice,
    }))
  }
  return reorderSuggestions(products.value, levelMap.value).map((s) => ({
    ...s,
    averageDailyUsage: null,
    estimatedCost: null,
    daysOfStockRemaining: null,
    purchasePrice: products.value.find((p) => p.id === s.productId)?.purchasePrice ?? null,
  }))
})

const suggestionsSubtitle = computed(() =>
  apiSuggestionsLoaded.value
    ? 'Podle spotřeby, receptur a minima na dalších 7 dní.'
    : 'Zboží na/pod minimem podle lokálního stavu.',
)

const emptySuggestionsText = computed(() =>
  apiSuggestionsLoaded.value
    ? 'Na dalších 7 dní není potřeba nic doobjednat.'
    : 'Vše je nad minimem.',
)

function addSuggestion(suggestion: SuggestionRow) {
  const p = products.value.find((x) => x.id === suggestion.productId)
  if (p) addProduct(p, suggestion.suggested)
  else {
    lines.value.push({
      productId: suggestion.productId,
      name: suggestion.name,
      sku: suggestion.sku,
      quantity: suggestion.suggested,
      unitCost: suggestion.purchasePrice ?? '',
    })
  }
}

function fmtQuantity(value: number | null): string {
  if (value == null) return '—'
  return value.toLocaleString('cs-CZ', { maximumFractionDigits: 3 })
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Naskladnění</h1>
      <p class="mt-1 text-muted-foreground">
        Vytvoř příjemku, naskenuj zboží a ulož dohledatelný skladový doklad.
      </p>
    </div>

    <div
      v-if="!apiMode"
      class="mt-6 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <PackagePlus class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Naskladnění potřebuje připojení k serveru</p>
      <p class="mt-1 text-sm">Sklad běží proti backendu (vystaveno-api).</p>
    </div>

    <div v-else-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" :retrying="loading" @retry="reload" />

    <div v-else class="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
      <!-- Příjemka -->
      <div class="space-y-4">
        <!-- Hlavička dokladu -->
        <div class="rounded-2xl border border-border bg-card p-4">
          <h2 class="flex items-center gap-1.5 font-semibold">
            <FileText class="h-4 w-4 text-primary" /> Příjemka
          </h2>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <label class="space-y-1.5 text-sm font-medium">
              <span>Dodavatel</span>
              <Input v-model="supplierName" placeholder="Např. Makro" />
            </label>
            <label class="space-y-1.5 text-sm font-medium">
              <span>Číslo dokladu</span>
              <Input v-model="documentNumber" placeholder="Faktura / dodací list" />
            </label>
            <label class="space-y-1.5 text-sm font-medium">
              <span>Datum příjmu</span>
              <Input v-model="receivedOn" type="date" />
            </label>
            <label class="space-y-1.5 text-sm font-medium">
              <span>Poznámka</span>
              <Input v-model="note" placeholder="Volitelné" />
            </label>
          </div>
        </div>

        <!-- Sken -->
        <div class="rounded-2xl border border-border bg-card p-4">
          <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium" for="scan">
            <ScanBarcode class="h-4 w-4 text-primary" /> Sken / EAN
          </label>
          <div class="flex gap-2">
            <Input
              id="scan"
              ref="scanInput"
              v-model="scanEan"
              placeholder="Naskenuj kód nebo zadej EAN a stiskni Enter"
              class="flex-1"
              @keyup.enter="onScan"
            />
            <Button
              type="button"
              variant="outline"
              class="shrink-0"
              title="Skenovat kamerou"
              @click="scannerOpen = true"
            >
              <Camera class="h-4 w-4" /> Kamera
            </Button>
          </div>

          <!-- Ruční vyhledání -->
          <div class="relative mt-3">
            <Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input v-model="search" placeholder="…nebo hledej podle názvu / SKU" class="pl-9" />
            <div
              v-if="searchResults.length"
              class="mt-1 overflow-hidden rounded-lg border border-border"
            >
              <button
                v-for="p in searchResults"
                :key="p.id"
                type="button"
                class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                @click="pick(p)"
              >
                <span class="truncate">{{ p.name }}</span>
                <span class="ml-2 shrink-0 text-xs text-muted-foreground">{{ p.sku }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Řádky příjemky -->
        <div class="rounded-2xl border border-border bg-card">
          <div v-if="lines.length === 0" class="p-8 text-center text-sm text-muted-foreground">
            Naskenuj nebo přidej produkty. Řádky příjemky se objeví tady.
          </div>
          <div v-else class="divide-y divide-border">
            <div
              v-for="l in lines"
              :key="l.productId"
              class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_96px_128px_40px] sm:items-end"
            >
              <div class="min-w-0">
                <div class="truncate font-medium">{{ l.name }}</div>
                <div class="text-xs text-muted-foreground">{{ l.sku }}</div>
              </div>
              <label class="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Množství</span>
                <Input
                  v-model.number="l.quantity"
                  type="number"
                  min="0"
                  class="h-9 text-center"
                  aria-label="Množství"
                />
              </label>
              <label class="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Nákup / ks</span>
                <Input
                  v-model.number="l.unitCost"
                  type="number"
                  min="0"
                  step="0.01"
                  class="h-9 text-right"
                  aria-label="Nákupní cena za kus"
                />
              </label>
              <Button
                variant="ghost"
                size="icon"
                class="self-end"
                title="Odebrat"
                @click="removeLine(l.productId)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div
            class="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <span class="text-sm text-muted-foreground">
              {{ lines.length }} položek · {{ totalUnits }} ks
              <template v-if="hasAnyCost"> · nákup {{ fmtMoney(totalCost) }}</template>
            </span>
            <Button variant="coral" :disabled="lines.length === 0 || submitting" @click="submit">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              <PackagePlus v-else class="h-4 w-4" /> Uložit příjemku
            </Button>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Návrhy k doobjednání -->
        <div class="rounded-2xl border border-border bg-card p-4">
          <h2 class="flex items-center gap-1.5 font-semibold">
            <AlertTriangle class="h-4 w-4 text-destructive" /> K doobjednání
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">{{ suggestionsSubtitle }}</p>

          <div v-if="suggestions.length === 0" class="mt-4 text-sm text-muted-foreground">
            {{ emptySuggestionsText }}
          </div>
          <div v-else class="mt-3 space-y-2">
            <div
              v-for="s in suggestions"
              :key="s.productId"
              class="rounded-lg border border-border p-2.5"
            >
              <div class="truncate text-sm font-medium">{{ s.name }}</div>
              <div
                class="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                <span>stav {{ fmtQuantity(s.current) }} / min {{ fmtQuantity(s.min) }}</span>
                <Button variant="outline" size="sm" class="h-7 shrink-0" @click="addSuggestion(s)">
                  + {{ fmtQuantity(s.suggested) }} ks
                </Button>
              </div>
              <div
                v-if="apiSuggestionsLoaded"
                class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
              >
                <span>Denně {{ fmtQuantity(s.averageDailyUsage) }} ks</span>
                <span v-if="s.daysOfStockRemaining != null">
                  Zásoba {{ fmtQuantity(s.daysOfStockRemaining) }} dní
                </span>
                <span v-if="s.estimatedCost != null">Odhad {{ fmtMoney(s.estimatedCost) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Poslední příjemky -->
        <div class="rounded-2xl border border-border bg-card p-4">
          <h2 class="flex items-center gap-1.5 font-semibold">
            <FileText class="h-4 w-4 text-primary" /> Poslední příjemky
          </h2>
          <div v-if="recentReceipts.length === 0" class="mt-4 text-sm text-muted-foreground">
            Zatím tu není žádná příjemka.
          </div>
          <div v-else class="mt-3 space-y-2">
            <div
              v-for="receipt in recentReceipts.slice(0, 5)"
              :key="receipt.id"
              class="rounded-lg border border-border p-2.5"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium">
                    {{ receipt.documentNumber || receipt.supplierName || 'Příjemka' }}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {{ fmtDate(receipt.receivedOn) }} · {{ receipt.items.length }} položek
                  </div>
                </div>
                <div class="shrink-0 text-sm font-semibold">
                  {{ receipt.totalCost == null ? 'Bez ceny' : fmtMoney(receipt.totalCost) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CameraScanner v-model:open="scannerOpen" @detected="(c) => handleCode(c, true)" />
  </div>
</template>
