<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Users, Package, Upload, Loader2 } from 'lucide-vue-next'
import { toast } from '@/components/ui/sonner'
import ImportWizard from '@/import/components/ImportWizard.vue'
import { clientsConfig, productsConfig } from '@/import/configs'
import { parseFile } from '@/import/parse/parseFile'
import { detectEntity } from '@/import/detectEntity'

// Výchozí entita z URL (?entity=products), dál ji přebíjí autodetekce nebo přepínač.
const route = useRoute()
const entity = ref<'clients' | 'products'>(
  route.query.entity === 'products' ? 'products' : 'clients',
)
// Jakmile uživatel přepínač klikne ručně, autodetekce už jeho volbu nepřebíjí.
const userTouched = ref(route.query.entity === 'products')
const selectedFile = ref<File | null>(null)
const parsing = ref(false)
const dragOver = ref(false)

function setEntity(e: 'clients' | 'products'): void {
  entity.value = e
  userTouched.value = true
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
      </div>
    </div>

    <!-- Se souborem → wizard (od mapování; konkrétní config kvůli generice). -->
    <template v-if="selectedFile">
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
    <!-- Bez souboru → nahrání s autodetekcí typu. -->
    <section v-if="!selectedFile" class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Import dat</h1>
        <p class="mt-1 text-muted-foreground">
          Nahrajte CSV nebo XLSX — appka sama pozná, jestli jde o klienty nebo produkty.
        </p>
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
          <div class="font-semibold">
            Přetáhněte sem soubor (CSV, XLSX, Fakturoid XML) nebo klikněte
          </div>
          <p class="mt-1 text-sm text-muted-foreground">
            Export z Fakturoidu, Dotykačky, Storyous/Teya, iKelp nebo libovolné tabulky.
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
