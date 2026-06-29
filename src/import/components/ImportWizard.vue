<script setup lang="ts" generic="T">
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  TriangleAlert,
  Building2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/sonner'
import { useImportWizard } from '../useImportWizard'
import { hasBlockingError } from '../validate'
import type { EntityDraft } from '../types'
import type { ImportEntityConfig } from '../configs'

const props = defineProps<{ config: ImportEntityConfig<T> }>()
const router = useRouter()
const {
  state,
  hasEnrich,
  enrichLabel,
  pickFile,
  goToPreview,
  commit,
  enrichAll,
  rollbackLast,
  reset,
} = useImportWizard(props.config)

const NONE = '__none__'
const STEP_INDEX: Record<string, number> = { upload: 0, mapping: 1, preview: 2, result: 3 }
const STEP_TITLE: Record<string, string> = {
  upload: 'Krok 1 ze 4: Vyberte soubor',
  mapping: 'Krok 2 ze 4: Přiřaďte sloupce',
  preview: 'Krok 3 ze 4: Náhled importu',
  result: 'Krok 4 ze 4: Výsledek importu',
}
const progressValue = computed(() => (STEP_INDEX[state.step] / 3) * 100)
const rowCount = computed(() => state.rawTable?.rows.length ?? 0)
const nameMapped = computed(() => !!state.mapping.name)
const dragOver = ref(false)
const rollingBack = ref(false)
const stepHeading = ref<HTMLElement | null>(null)

// Po přechodu mezi kroky přesuň focus na nadpis kroku — jinak focus spadne na <body>
// (předchozí tlačítko zmizí z DOM) a screen reader neoznámí nový krok (WCAG 2.4.3 / 4.1.3).
watch(
  () => state.step,
  async () => {
    await nextTick()
    stepHeading.value?.focus()
  },
)

const summary = computed(() => {
  const s = { create: 0, overwrite: 0, skip: 0, errors: 0 }
  for (const d of state.drafts) {
    if (hasBlockingError(d.issues)) s.errors++
    else if (d.decision === 'overwrite') s.overwrite++
    else if (d.decision === 'skip') s.skip++
    else s.create++
  }
  return s
})

async function handleFile(file: File | undefined): Promise<void> {
  if (!file) return
  try {
    await pickFile(file)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Soubor se nepodařilo načíst.')
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

function setMapping(field: string, value: unknown): void {
  state.mapping[field] = value === NONE ? null : String(value)
}

function sample(header: string | null): string {
  if (!header || !state.rawTable) return ''
  return state.rawTable.rows[0]?.[header] ?? ''
}

function cellValue(draft: EntityDraft<T>, field: string): string {
  const v = (draft.value as Record<string, unknown>)[field]
  return v === null || v === undefined || v === '' ? '—' : String(v)
}

function rowStatus(draft: EntityDraft<T>): { label: string; variant: string } {
  if (hasBlockingError(draft.issues)) return { label: 'Chyba', variant: 'destructive' }
  if (draft.duplicate) return { label: 'Duplicita', variant: 'secondary' }
  if (draft.issues.length) return { label: 'Varování', variant: 'outline' }
  return { label: 'OK', variant: 'default' }
}

function decisionOptions(draft: EntityDraft<T>): { value: string; label: string }[] {
  const base = [
    { value: 'create', label: 'Vytvořit' },
    { value: 'skip', label: 'Přeskočit' },
  ]
  if (draft.duplicate?.existingId) base.push({ value: 'overwrite', label: 'Přepsat' })
  return base
}

async function onEnrich(): Promise<void> {
  const res = await enrichAll()
  toast.success(`Doplněno z ARES: ${res.enriched} řádků.`)
}

async function onCommit(): Promise<void> {
  await commit()
  const c = state.result?.batch.counts
  if (c) toast.success(`Import hotový: ${c.created} vytvořeno, ${c.skipped} přeskočeno.`)
}

async function onRollback(): Promise<void> {
  rollingBack.value = true
  try {
    const res = await rollbackLast()
    toast.success(`Import vrácen: smazáno ${res.removed} záznamů.`)
    reset()
  } finally {
    rollingBack.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Import {{ props.config.noun }}</h1>
      <p class="mt-1 text-muted-foreground">
        Přeneste data z jiného systému přes soubor CSV nebo XLSX — bez ručního přepisování.
      </p>
    </div>

    <!-- Progress kroků -->
    <div class="mb-6">
      <Progress :model-value="progressValue" aria-label="Průběh importu" />
      <ol class="mt-2 flex justify-between text-xs text-muted-foreground">
        <li
          :class="{ 'font-semibold text-foreground': state.step === 'upload' }"
          :aria-current="state.step === 'upload' ? 'step' : undefined"
        >
          1. Soubor
        </li>
        <li
          :class="{ 'font-semibold text-foreground': state.step === 'mapping' }"
          :aria-current="state.step === 'mapping' ? 'step' : undefined"
        >
          2. Mapování
        </li>
        <li
          :class="{ 'font-semibold text-foreground': state.step === 'preview' }"
          :aria-current="state.step === 'preview' ? 'step' : undefined"
        >
          3. Náhled
        </li>
        <li
          :class="{ 'font-semibold text-foreground': state.step === 'result' }"
          :aria-current="state.step === 'result' ? 'step' : undefined"
        >
          4. Hotovo
        </li>
      </ol>
    </div>

    <!-- Živý nadpis kroku — cíl focusu po přechodu, oznámí krok screen readeru. -->
    <h2 ref="stepHeading" tabindex="-1" class="sr-only" aria-live="polite">
      {{ STEP_TITLE[state.step] }}
    </h2>

    <!-- KROK 1: Upload -->
    <section v-if="state.step === 'upload'">
      <label
        for="import-file"
        class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card p-12 text-center transition-colors hover:bg-muted/40"
        :class="dragOver ? 'border-primary bg-primary-soft/40' : 'border-border'"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <Loader2 v-if="state.parsing" class="h-10 w-10 animate-spin text-primary" />
        <Upload v-else class="h-10 w-10 text-muted-foreground" />
        <div>
          <div class="font-semibold">
            Přetáhněte sem soubor (CSV, XLSX, Fakturoid XML) nebo klikněte
          </div>
          <p class="mt-1 text-sm text-muted-foreground">
            Export z Fakturoidu, Dotykačky, Reservia nebo libovolné tabulky.
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

    <!-- KROK 2: Mapování -->
    <section v-else-if="state.step === 'mapping'" class="space-y-4">
      <div class="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <FileSpreadsheet class="h-4 w-4 text-primary" />
        <span class="font-medium">{{ state.fileName }}</span>
        <span class="text-muted-foreground">· {{ rowCount }} řádků</span>
      </div>
      <p class="text-sm text-muted-foreground">
        Přiřaďte sloupce ze souboru k polím. Pole označená * jsou povinná.
      </p>
      <div class="divide-y divide-border rounded-2xl border border-border bg-card">
        <div
          v-for="f in props.config.fields"
          :key="f.field"
          class="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap"
        >
          <div class="w-44 shrink-0 text-sm font-medium">
            {{ f.label }}<span v-if="f.required" class="text-destructive"> *</span>
          </div>
          <Select
            :model-value="state.mapping[f.field] ?? NONE"
            @update:model-value="(v) => setMapping(f.field, v)"
          >
            <SelectTrigger class="w-full sm:w-64" :aria-label="`Sloupec pro pole ${f.label}`">
              <SelectValue placeholder="— nemapovat —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NONE">— nemapovat —</SelectItem>
              <SelectItem v-for="h in state.rawTable?.headers ?? []" :key="h" :value="h">
                {{ h }}
              </SelectItem>
            </SelectContent>
          </Select>
          <span class="truncate text-xs text-muted-foreground">
            {{ sample(state.mapping[f.field]) }}
          </span>
        </div>
      </div>
      <p v-if="!nameMapped" class="flex items-center gap-2 text-sm text-destructive">
        <TriangleAlert class="h-4 w-4" /> Namapujte alespoň pole „Název".
      </p>
    </section>

    <!-- KROK 3: Náhled -->
    <section v-else-if="state.step === 'preview'" class="space-y-4">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="default">{{ summary.create }} vytvoří</Badge>
        <Badge v-if="summary.overwrite" variant="secondary">{{ summary.overwrite }} přepíše</Badge>
        <Badge variant="outline">{{ summary.skip }} přeskočí</Badge>
        <Badge v-if="summary.errors" variant="destructive">{{ summary.errors }} chyb</Badge>
        <Button
          v-if="hasEnrich"
          variant="outline"
          size="sm"
          class="ml-auto"
          :disabled="!!state.enrichProgress"
          @click="onEnrich"
        >
          <Loader2 v-if="state.enrichProgress" class="h-4 w-4 animate-spin" />
          <Building2 v-else class="h-4 w-4" />
          {{ enrichLabel }}
          <span v-if="state.enrichProgress">
            ({{ state.enrichProgress.done }}/{{ state.enrichProgress.total }})
          </span>
        </Button>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stav</TableHead>
              <TableHead>Název</TableHead>
              <TableHead v-for="col in props.config.previewColumns" :key="col.field">
                {{ col.label }}
              </TableHead>
              <TableHead>Poznámka k řádku</TableHead>
              <TableHead>Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="d in state.drafts" :key="d.rowIndex">
              <TableCell>
                <Badge :variant="rowStatus(d).variant as never">{{ rowStatus(d).label }}</Badge>
              </TableCell>
              <TableCell class="font-medium">{{ cellValue(d, 'name') }}</TableCell>
              <TableCell v-for="col in props.config.previewColumns" :key="col.field">
                {{ cellValue(d, col.field) }}
              </TableCell>
              <TableCell class="max-w-48 text-xs text-muted-foreground">
                <span v-for="(i, idx) in d.issues" :key="idx" class="block">{{ i.message }}</span>
              </TableCell>
              <TableCell>
                <Select v-if="!hasBlockingError(d.issues)" v-model="d.decision" class="w-32">
                  <SelectTrigger
                    class="h-8 w-32"
                    :aria-label="`Akce pro řádek ${cellValue(d, 'name')}`"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="opt in decisionOptions(d)"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <span v-else class="text-xs text-muted-foreground">nelze</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div v-if="state.progress" class="space-y-1">
        <Progress :model-value="(state.progress.done / state.progress.total) * 100" />
        <p class="text-xs text-muted-foreground">
          Importuji {{ state.progress.done }} / {{ state.progress.total }}…
        </p>
      </div>
    </section>

    <!-- KROK 4: Výsledek -->
    <section v-else-if="state.step === 'result'" class="space-y-4">
      <div
        class="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center"
      >
        <div
          class="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success"
        >
          <Check class="h-7 w-7" />
        </div>
        <h2 class="text-xl font-semibold">Import dokončen</h2>
        <p class="text-muted-foreground">
          Vytvořeno {{ state.result?.batch.counts.created }} {{ props.config.noun }}, přeskočeno
          {{ state.result?.batch.counts.skipped }}.
          <template v-if="state.result?.batch.counts.overwritten">
            Přepsáno {{ state.result?.batch.counts.overwritten }}.
          </template>
          <template v-if="state.result?.batch.counts.failed">
            Selhalo {{ state.result?.batch.counts.failed }}.
          </template>
        </p>
        <div class="mt-2 flex flex-wrap justify-center gap-2">
          <Button variant="coral" @click="router.push(props.config.doneLink.to)">
            {{ props.config.doneLink.label }}
          </Button>
          <Button
            v-if="state.result?.batch.createdIds.length"
            variant="outline"
            :disabled="rollingBack"
            @click="onRollback"
          >
            <Loader2 v-if="rollingBack" class="h-4 w-4 animate-spin" />
            <RotateCcw v-else class="h-4 w-4" /> Vrátit import
          </Button>
          <Button variant="ghost" @click="reset">Nový import</Button>
        </div>
        <p v-if="state.result?.batch.createdIds.length" class="text-xs text-muted-foreground">
          „Vrátit import" smaže jen nově vytvořené záznamy. Přepsané se nevrátí.
        </p>
      </div>
    </section>

    <!-- Navigace -->
    <div v-if="state.step !== 'result'" class="mt-6 flex items-center justify-between">
      <Button
        v-if="state.step === 'mapping' || state.step === 'preview'"
        variant="ghost"
        @click="state.step === 'preview' ? (state.step = 'mapping') : reset()"
      >
        <ArrowLeft class="h-4 w-4" /> Zpět
      </Button>
      <div v-else />

      <Button
        v-if="state.step === 'mapping'"
        variant="coral"
        :disabled="!nameMapped"
        @click="goToPreview"
      >
        Pokračovat <ArrowRight class="h-4 w-4" />
      </Button>
      <Button
        v-else-if="state.step === 'preview'"
        variant="coral"
        :disabled="state.committing || summary.create + summary.overwrite === 0"
        @click="onCommit"
      >
        <Loader2 v-if="state.committing" class="h-4 w-4 animate-spin" />
        Importovat {{ summary.create + summary.overwrite }} {{ props.config.noun }}
      </Button>
    </div>
  </div>
</template>
