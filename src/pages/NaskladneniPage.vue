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
import type { Product } from '@/lib/types'

const { products, load: loadProducts } = useProducts()
const inv = useInventory()
const apiMode = isApiMode()

const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const levelMap = ref(new Map<string, number>())

const scanEan = ref('')
const search = ref('')
const scanInput = ref<HTMLInputElement | null>(null)
const scannerOpen = ref(false)

interface ReceiveLine {
  productId: string
  name: string
  sku: string
  quantity: number
}
const lines = ref<ReceiveLine[]>([])

async function loadLevels() {
  const levels = await inv.levels()
  levelMap.value = new Map(levels.map((l) => [l.productId, l.quantity]))
}

async function reload() {
  loading.value = true
  loadError.value = false
  try {
    await loadProducts()
    await loadLevels()
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
  else lines.value.push({ productId: p.id, name: p.name, sku: p.sku, quantity: qty })
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

async function submit() {
  if (submitting.value || lines.value.length === 0) return
  if (lines.value.some((l) => !(Number(l.quantity) > 0)))
    return toast.error('U všech položek zadejte kladné množství.')
  submitting.value = true
  const total = lines.value.length
  let ok = 0
  try {
    // Iterujeme přes kopii — každý úspěšný řádek hned odebereme z příjemky, aby
    // opakování po částečném selhání nenaskladnilo už uložené položky podruhé.
    for (const l of [...lines.value]) {
      await inv.receive(l.productId, Number(l.quantity), 'Naskladnění')
      lines.value = lines.value.filter((x) => x.productId !== l.productId)
      ok++
    }
    await loadLevels()
    toast.success(`Naskladněno ${ok} položek.`)
    focusScan()
  } catch (e) {
    console.error(e)
    toast.error(`Naskladnění selhalo (uloženo ${ok} z ${total}). Zbytek zůstal na příjemce.`)
    await loadLevels()
  } finally {
    submitting.value = false
  }
}

// --- Návrhy k doobjednání ---
const suggestions = computed(() => reorderSuggestions(products.value, levelMap.value))

function addSuggestion(productId: string, suggested: number) {
  const p = products.value.find((x) => x.id === productId)
  if (p) addProduct(p, suggested)
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Naskladnění</h1>
      <p class="mt-1 text-muted-foreground">Naskenuj čárové kódy a naskladni zboží jedním tahem.</p>
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
            Naskenuj nebo přidej produkty — objeví se tu k naskladnění.
          </div>
          <div v-else class="divide-y divide-border">
            <div v-for="l in lines" :key="l.productId" class="flex items-center gap-2 p-3">
              <div class="min-w-0 flex-1">
                <div class="truncate font-medium">{{ l.name }}</div>
                <div class="text-xs text-muted-foreground">{{ l.sku }}</div>
              </div>
              <Input
                v-model.number="l.quantity"
                type="number"
                min="0"
                class="h-9 w-20 text-center"
                aria-label="Množství"
              />
              <Button variant="ghost" size="icon" title="Odebrat" @click="removeLine(l.productId)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-border p-4">
            <span class="text-sm text-muted-foreground">
              {{ lines.length }} položek · {{ totalUnits }} ks
            </span>
            <Button variant="coral" :disabled="lines.length === 0 || submitting" @click="submit">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              <PackagePlus v-else class="h-4 w-4" /> Naskladnit
            </Button>
          </div>
        </div>
      </div>

      <!-- Návrhy k doobjednání -->
      <div class="rounded-2xl border border-border bg-card p-4">
        <h2 class="flex items-center gap-1.5 font-semibold">
          <AlertTriangle class="h-4 w-4 text-destructive" /> K doobjednání
        </h2>
        <p class="mt-0.5 text-xs text-muted-foreground">Zboží na/pod minimem.</p>

        <div v-if="suggestions.length === 0" class="mt-4 text-sm text-muted-foreground">
          Vše je nad minimem. 👍
        </div>
        <div v-else class="mt-3 space-y-2">
          <div
            v-for="s in suggestions"
            :key="s.productId"
            class="rounded-lg border border-border p-2.5"
          >
            <div class="truncate text-sm font-medium">{{ s.name }}</div>
            <div class="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>stav {{ s.current }} / min {{ s.min }}</span>
              <Button
                variant="outline"
                size="sm"
                class="h-7"
                @click="addSuggestion(s.productId, s.suggested)"
              >
                + {{ s.suggested }} ks
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CameraScanner v-model:open="scannerOpen" @detected="(c) => handleCode(c, true)" />
  </div>
</template>
