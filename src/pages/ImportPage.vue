<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  ReceiptText,
  Upload,
  Users,
} from 'lucide-vue-next'
import { toast } from '@/components/ui/sonner'
import ImportWizard from '@/import/components/ImportWizard.vue'
import { clientsConfig, productsConfig } from '@/import/configs'
import { parseFile } from '@/import/parse/parseFile'
import { detectEntity } from '@/import/detectEntity'
import { ApiError, isApiMode } from '@/lib/http'
import {
  buildSalesImportPreview,
  type SalesImportPreview,
  type SalesImportResponse,
} from '@/lib/sales-import'
import { useSalesImport } from '@/composables/useSalesImport'

// Výchozí entita z URL (?entity=products), dál ji přebíjí autodetekce nebo přepínač.
const route = useRoute()
type ImportEntityChoice = 'clients' | 'products' | 'sales'
const initialEntity: ImportEntityChoice =
  route.query.entity === 'products'
    ? 'products'
    : route.query.entity === 'sales'
      ? 'sales'
      : 'clients'
const entity = ref<ImportEntityChoice>(initialEntity)
// Jakmile uživatel přepínač klikne ručně, autodetekce už jeho volbu nepřebíjí.
const userTouched = ref(route.query.entity === 'products' || route.query.entity === 'sales')
const selectedFile = ref<File | null>(null)
const parsing = ref(false)
const dragOver = ref(false)
const salesSource = ref('dotykacka')
const salesPreview = ref<SalesImportPreview | null>(null)
const salesResult = ref<SalesImportResponse | null>(null)
const salesImporting = ref(false)
const apiMode = isApiMode()
const salesImport = useSalesImport()
const salesCanSubmit = computed(
  () => apiMode && !!salesPreview.value?.sales.length && !salesPreview.value.errors.length,
)

function setEntity(e: ImportEntityChoice): void {
  entity.value = e
  userTouched.value = true
  selectedFile.value = null
  salesPreview.value = null
  salesResult.value = null
}

async function handleFile(file: File | undefined): Promise<void> {
  if (!file) return
  parsing.value = true
  try {
    // Peek hlaviček → autodetekce typu (klienti/produkty), pokud uživatel neurčil ručně.
    const table = await parseFile(file)
    if (!userTouched.value) {
      const detected = detectEntity(table.headers)
      if (detected) entity.value = detected
    }
    selectedFile.value = file
    salesResult.value = null
    salesPreview.value =
      entity.value === 'sales' ? buildSalesImportPreview(table, salesSource.value) : null
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Soubor se nepodařilo načíst.')
  } finally {
    parsing.value = false
  }
}

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  void handleFile(input.files?.[0])
  input.value = ''
}
function onDrop(e: DragEvent): void {
  dragOver.value = false
  void handleFile(e.dataTransfer?.files?.[0])
}

async function submitSalesImport(dryRun: boolean): Promise<void> {
  const preview = salesPreview.value
  if (!preview) return
  salesImporting.value = true
  try {
    const result = await salesImport.run({
      source: preview.source,
      dryRun,
      sales: preview.sales,
    })
    salesResult.value = result
    toast.success(
      dryRun
        ? `Kontrola hotová: ${result.summary.total} účtenek.`
        : `Import hotový: ${result.summary.imported} importováno, ${result.summary.skipped} přeskočeno.`,
    )
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      toast.error('Import historických tržeb zatím není v tomto prostředí dostupný.')
    } else {
      toast.error(e instanceof Error ? e.message : 'Import tržeb selhal.')
    }
  } finally {
    salesImporting.value = false
  }
}

function resetFile(): void {
  selectedFile.value = null
  salesPreview.value = null
  salesResult.value = null
}

function formatMoney(value: number): string {
  return value.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <!-- Přepínač: co importovat (ruční override autodetekce) -->
    <div class="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6 md:px-8 md:pt-8">
      <div class="inline-flex rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="
            entity === 'clients'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="setEntity('clients')"
        >
          <Users class="h-4 w-4" /> Klienti
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="
            entity === 'products'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="setEntity('products')"
        >
          <Package class="h-4 w-4" /> Produkty
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          :class="
            entity === 'sales'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="setEntity('sales')"
        >
          <ReceiptText class="h-4 w-4" /> Tržby
        </button>
      </div>
    </div>

    <!-- Se souborem → wizard (od mapování; konkrétní config kvůli generice). -->
    <template v-if="selectedFile && entity !== 'sales'">
      <ImportWizard
        v-if="entity === 'products'"
        :config="productsConfig"
        :file="selectedFile"
        @reset="selectedFile = null"
      />
      <ImportWizard
        v-else
        :config="clientsConfig"
        :file="selectedFile"
        @reset="selectedFile = null"
      />
    </template>
    <section
      v-else-if="selectedFile && entity === 'sales'"
      class="mx-auto max-w-5xl p-4 sm:p-6 md:p-8"
    >
      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Import historických tržeb</h1>
          <p class="mt-1 text-muted-foreground">
            {{ selectedFile.name }} · {{ salesPreview?.rowCount ?? 0 }} řádků ·
            {{ salesPreview?.sales.length ?? 0 }} účtenek
          </p>
        </div>
        <button
          type="button"
          class="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          @click="resetFile"
        >
          Vybrat jiný soubor
        </button>
      </div>

      <div
        v-if="!apiMode"
        class="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <AlertTriangle class="h-4 w-4" />
        Import historických tržeb je dostupný po přihlášení do online aplikace.
      </div>

      <div
        v-if="salesPreview?.errors.length"
        class="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
      >
        <div class="mb-2 flex items-center gap-2 font-semibold text-destructive">
          <AlertTriangle class="h-4 w-4" /> Soubor má chyby
        </div>
        <ul class="space-y-1 text-muted-foreground">
          <li
            v-for="err in salesPreview.errors.slice(0, 8)"
            :key="`${err.rowIndex}-${err.message}`"
          >
            Řádek {{ err.rowIndex }}: {{ err.message }}
          </li>
        </ul>
      </div>

      <div
        v-if="salesResult"
        class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
      >
        <div class="mb-2 flex items-center gap-2 font-semibold">
          <CheckCircle2 class="h-4 w-4" /> Výsledek importu
        </div>
        Celkem {{ salesResult.summary.total }}, importováno {{ salesResult.summary.imported }},
        přeskočeno {{ salesResult.summary.skipped }}, chyby {{ salesResult.summary.failed }}.
      </div>

      <div class="overflow-x-auto rounded-lg border bg-card">
        <div class="min-w-[640px]">
          <div
            class="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 border-b px-4 py-3 text-xs font-semibold uppercase text-muted-foreground"
          >
            <div>Účtenka</div>
            <div>Datum</div>
            <div>Položky</div>
            <div class="text-right">Celkem</div>
          </div>
          <div
            v-if="!salesPreview?.sales.length"
            class="px-4 py-8 text-center text-muted-foreground"
          >
            V souboru nejsou žádné použitelné účtenky.
          </div>
          <div
            v-for="sale in salesPreview?.sales.slice(0, 20)"
            :key="sale.externalId"
            class="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
          >
            <div class="font-medium">{{ sale.externalId }}</div>
            <div>{{ formatDateTime(sale.soldAt) }}</div>
            <div>{{ sale.items.length }}</div>
            <div class="text-right font-semibold">{{ formatMoney(sale.total) }}</div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          :disabled="!salesCanSubmit || salesImporting"
          @click="submitSalesImport(true)"
        >
          <Loader2 v-if="salesImporting" class="h-4 w-4 animate-spin" /> Zkontrolovat bez uložení
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          :disabled="!salesCanSubmit || salesImporting"
          @click="submitSalesImport(false)"
        >
          <Upload class="h-4 w-4" /> Importovat tržby
        </button>
      </div>
    </section>
    <!-- Bez souboru → nahrání s autodetekcí typu. -->
    <section v-if="!selectedFile" class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Nahrát data</h1>
        <p class="mt-1 text-muted-foreground">
          Nahrajte tabulku CSV nebo Excel. Aplikace pozná klienty a produkty sama; historické tržby
          vyberte nahoře.
        </p>
      </div>
      <div v-if="entity === 'sales'" class="mb-4 grid gap-2 sm:max-w-xs">
        <label for="sales-source" class="text-sm font-medium">Zdroj tržeb</label>
        <select
          id="sales-source"
          v-model="salesSource"
          class="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="dotykacka">Dotykačka</option>
          <option value="storyous">Storyous / Teya</option>
          <option value="ikelp">iKelp</option>
          <option value="generic-pos">Jiný pokladní systém</option>
        </select>
      </div>
      <label
        for="import-file"
        class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card p-12 text-center transition-colors hover:bg-muted/40"
        :class="dragOver ? 'border-primary bg-primary-soft/40' : 'border-border'"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <Loader2 v-if="parsing" class="h-10 w-10 animate-spin text-primary" />
        <Upload v-else class="h-10 w-10 text-muted-foreground" />
        <div>
          <div class="font-semibold">Přetáhněte sem exportovaný soubor nebo klikněte</div>
          <p class="mt-1 text-sm text-muted-foreground">
            Podporujeme CSV, Excel a XML z Fakturoidu, Dotykačky, Storyous/Teya nebo iKelp.
          </p>
        </div>
      </label>
      <input
        id="import-file"
        type="file"
        accept=".csv,.xlsx,.xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/xml,text/xml"
        class="sr-only"
        @change="onFileChange"
      />
    </section>
  </div>
</template>
