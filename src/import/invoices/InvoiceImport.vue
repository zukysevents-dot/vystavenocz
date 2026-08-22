<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  Upload,
  Loader2,
  Check,
  RotateCcw,
  FileSpreadsheet,
  Info,
  Building2,
  ListOrdered,
  FileWarning,
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
import { ApiError, isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import { useInvoiceImport } from './useInvoiceImport'
import { SOURCE_LABEL } from './types'

const router = useRouter()
const { state, pickFiles, commit, applySeries, applySupplierToProfile, rollbackLast, reset } =
  useInvoiceImport()
const dragOver = ref(false)
const rollingBack = ref(false)
const applyingProfile = ref(false)
const applyingSeries = ref(false)
const stepHeading = ref<HTMLElement | null>(null)

const STEP_TITLE: Record<string, string> = {
  upload: 'Krok 1 ze 3: Nahrajte faktury z původního programu',
  preview: 'Krok 2 ze 3: Náhled faktur',
  result: 'Krok 3 ze 3: Výsledek importu',
}

// Po přechodu mezi kroky přesuň focus na nadpis kroku — jinak focus spadne na <body>
// (předchozí tlačítko zmizí z DOM) a screen reader neoznámí nový krok (WCAG 2.4.3 / 4.1.3).
watch(
  () => state.step,
  async () => {
    await nextTick()
    stepHeading.value?.focus()
  },
)

const supplier = computed(() => state.rows[0]?.input.supplierSnapshot ?? null)

async function onApplyProfile(): Promise<void> {
  applyingProfile.value = true
  try {
    const n = await applySupplierToProfile()
    toast.success(n > 0 ? `Profil firmy doplněn (${n} polí).` : 'Profil firmy už je vyplněný.')
  } catch {
    toast.error('Uložení profilu selhalo.')
  } finally {
    applyingProfile.value = false
  }
}

async function onApplySeries(): Promise<void> {
  applyingSeries.value = true
  try {
    const preview = await applySeries()
    if (preview) toast.success(`Hotovo — příští faktura dostane číslo ${preview}.`)
  } catch (e) {
    // Server umí říct KONKRÉTNĚ, co vadí (např. že řadu nelze snížit) — obecná hláška by tu radu zahodila.
    toast.error(
      e instanceof ApiError && e.message ? e.message : 'Číselnou řadu se nepodařilo nastavit.',
    )
  } finally {
    applyingSeries.value = false
  }
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Uhrazená',
  issued: 'Vystavená',
  overdue: 'Po splatnosti',
  cancelled: 'Stornovaná',
  draft: 'Koncept',
}

const willCreate = computed(() => state.rows.filter((r) => r.decision === 'create').length)
const willSkip = computed(() => state.rows.filter((r) => r.decision === 'skip').length)
const needsReview = computed(() => state.rows.filter((r) => r.needsReview).length)

async function handleFiles(files: File[]): Promise<void> {
  if (!files.length) return
  try {
    await pickFiles(files)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Soubory se nepodařilo načíst.')
  }
}

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  void handleFiles(Array.from(input.files ?? []))
  input.value = ''
}

function onDrop(e: DragEvent): void {
  dragOver.value = false
  void handleFiles(Array.from(e.dataTransfer?.files ?? []))
}

async function onCommit(): Promise<void> {
  await commit()
  const c = state.result?.batch.counts
  if (c)
    toast.success(`Import hotový: ${c.created} faktur, ${c.skipped} přeskočeno, ${c.failed} chyb.`)
}

async function onRollback(): Promise<void> {
  rollingBack.value = true
  try {
    const res = await rollbackLast()
    toast.success(`Import vrácen: smazáno ${res.removed} faktur.`)
    reset()
  } finally {
    rollingBack.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Import faktur z jiného programu</h1>
      <p class="mt-1 text-muted-foreground">
        Nahrajte faktury z původního účetního programu — zachováme čísla, datumy i stav úhrady a
        navážeme na ně číselnou řadu.
      </p>
    </div>

    <!-- Živý nadpis kroku — cíl focusu po přechodu, oznámí krok screen readeru. -->
    <h2 ref="stepHeading" tabindex="-1" class="sr-only" aria-live="polite">
      {{ STEP_TITLE[state.step] }}
    </h2>

    <!-- Info: jak se historické faktury ukládají. Psáno pro obsluhu, ne pro vývojáře —
         technický název endpointu ani varovná ikona sem nepatří, tohle je běžný stav. -->
    <div
      v-if="isApiMode()"
      class="mb-6 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
    >
      <Info class="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Faktury se uloží přesně tak, jak jsou — s původním číslem, datem i stavem úhrady.
        Nepřečíslováváme je. Pokud některou uložit nepůjde (třeba už takové číslo máte), uvidíte to
        na konci v souhrnu.
      </span>
    </div>

    <!-- KROK 1: Upload -->
    <section v-if="state.step === 'upload'">
      <label
        for="invoice-file"
        class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-card p-12 text-center transition-colors hover:bg-muted/40"
        :class="dragOver ? 'border-primary bg-primary-soft/40' : 'border-border'"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <Loader2 v-if="state.parsing" class="h-10 w-10 animate-spin text-primary" />
        <Upload v-else class="h-10 w-10 text-muted-foreground" />
        <div>
          <div class="font-semibold">Přetáhněte sem faktury nebo celý ZIP — nebo klikněte</div>
          <p class="mt-1 text-sm text-muted-foreground">
            ISDOC, ISDOCX, XML, PDF nebo ZIP s dávkou faktur. Můžete vybrat víc souborů najednou.
          </p>
        </div>
      </label>
      <input
        id="invoice-file"
        type="file"
        multiple
        accept=".xml,.isdoc,.isdocx,.pdf,.zip,application/xml,text/xml,application/pdf,application/zip"
        class="sr-only"
        @change="onFileChange"
      />

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-border bg-card p-3 text-sm">
          <div class="font-medium">Nejlepší výsledek: ISDOC</div>
          <p class="mt-1 text-muted-foreground">
            Český standard e-fakturace. Umí ho vyexportovat Pohoda, Money, ABRA, Helios i iDoklad —
            data jsou přesná, nic se neodhaduje.
          </p>
        </div>
        <div class="rounded-lg border border-border bg-card p-3 text-sm">
          <div class="font-medium">Když máte jen PDF</div>
          <p class="mt-1 text-muted-foreground">
            Údaje z faktury přečteme z textu. U dokladů, kde si nejsme jistí, řádek označíme ke
            kontrole. Naskenované PDF (obrázek) přečíst neumíme.
          </p>
        </div>
      </div>
    </section>

    <!-- KROK 2: Náhled -->
    <section v-else-if="state.step === 'preview'" class="space-y-4">
      <div class="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <FileSpreadsheet class="h-4 w-4 text-primary" />
        <span class="font-medium">{{ state.fileName }}</span>
        <span class="text-muted-foreground">· {{ state.rows.length }} faktur</span>
      </div>

      <!-- Soubory, které se nepodařilo přečíst — zbytek dávky jede dál. -->
      <div
        v-if="state.fileErrors.length"
        class="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
      >
        <div class="flex items-center gap-2 font-medium">
          <FileWarning class="h-4 w-4 text-destructive" />
          {{ state.fileErrors.length }} souborů se nepodařilo přečíst
        </div>
        <ul class="mt-2 space-y-1 text-muted-foreground">
          <li v-for="(err, i) in state.fileErrors" :key="i">
            <strong class="font-medium">{{ err.fileName }}</strong> — {{ err.message }}
          </li>
        </ul>
      </div>

      <!-- Navázání číselné řady — hlavní důvod, proč se historie přenáší. -->
      <div
        v-if="state.series"
        class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm"
      >
        <ListOrdered class="h-4 w-4 shrink-0 text-primary" />
        <span v-if="state.series.resetForNewYear">
          Nejvyšší importované číslo je <strong>{{ state.series.basedOn }}</strong> z roku
          {{ state.series.year }}. Pořadí se každý rok vrací na začátek, takže příští faktura
          dostane číslo <strong>{{ state.series.preview }}</strong
          >.
        </span>
        <span v-else>
          Nejvyšší importované číslo je <strong>{{ state.series.basedOn }}</strong
          >. Příští vystavená faktura může navázat číslem <strong>{{ state.series.preview }}</strong
          >.
        </span>
        <!-- Pořadí doplňuje systém vždy na čtyři místa; u kratší řady se tvar čísla změní. -->
        <span v-if="state.series.seqWidthChanged" class="basis-full text-xs text-muted-foreground">
          Pořadové číslo se doplňuje na čtyři místa, tvar čísla se proto oproti importu mírně změní.
        </span>
        <Button
          variant="outline"
          size="sm"
          class="ml-auto"
          :disabled="applyingSeries || state.seriesApplied"
          @click="onApplySeries"
        >
          <Loader2 v-if="applyingSeries" class="h-4 w-4 animate-spin" />
          <Check v-else-if="state.seriesApplied" class="h-4 w-4" />
          <ListOrdered v-else class="h-4 w-4" />
          {{ state.seriesApplied ? 'Číselná řada nastavena' : 'Navázat číselnou řadu' }}
        </Button>
      </div>

      <!-- Tvoje údaje z exportu → profil firmy -->
      <div
        v-if="supplier?.companyName"
        class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm"
      >
        <Building2 class="h-4 w-4 shrink-0 text-primary" />
        <span>
          Tvoje údaje z exportu: <strong>{{ supplier.companyName }}</strong>
          <template v-if="supplier.ico"> · IČO {{ supplier.ico }}</template>
        </span>
        <Button
          variant="outline"
          size="sm"
          class="ml-auto"
          :disabled="applyingProfile"
          @click="onApplyProfile"
        >
          <Loader2 v-if="applyingProfile" class="h-4 w-4 animate-spin" />
          <Building2 v-else class="h-4 w-4" /> Předvyplnit profil firmy
        </Button>
      </div>

      <div class="flex flex-wrap gap-2 text-sm">
        <Badge variant="default">{{ willCreate }} importuje</Badge>
        <Badge variant="outline">{{ willSkip }} přeskočí</Badge>
        <Badge v-if="needsReview" variant="destructive">{{ needsReview }} ke kontrole</Badge>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Číslo</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Vystaveno</TableHead>
              <TableHead class="text-right">Částka</TableHead>
              <TableHead>Zdroj</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(r, i) in state.rows" :key="i">
              <TableCell class="font-medium">
                {{ r.input.invoiceNumber || '—' }}
                <div v-if="r.sourceFile" class="text-xs font-normal text-muted-foreground">
                  {{ r.sourceFile }}
                </div>
              </TableCell>
              <TableCell>{{ r.input.clientSnapshot.name || '—' }}</TableCell>
              <TableCell>{{ r.input.issueDate || '—' }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatCZK(r.previewTotal) }}</TableCell>
              <TableCell>
                <Badge variant="outline">{{ SOURCE_LABEL[r.source] }}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  :variant="
                    r.blocking.length
                      ? 'destructive'
                      : r.duplicate
                        ? 'secondary'
                        : r.warnings.length
                          ? 'destructive'
                          : 'outline'
                  "
                >
                  {{
                    r.blocking.length
                      ? 'Nelze uložit'
                      : r.duplicate
                        ? 'Duplicita'
                        : r.warnings.length
                          ? 'Varování'
                          : (STATUS_LABEL[r.input.status] ?? r.input.status)
                  }}
                </Badge>
                <div v-if="r.blocking.length" class="mt-1 max-w-xs text-xs text-destructive">
                  Doklad {{ r.blocking.join(', ') }} — doplňte ho ručně.
                </div>
                <div v-else-if="r.warnings.length" class="mt-1 max-w-xs text-xs text-destructive">
                  <div v-for="(w, wi) in r.warnings" :key="wi">{{ w }}</div>
                </div>
              </TableCell>
              <TableCell>
                <!-- Doklad bez povinných polí server odmítne → volba se ani nenabízí. -->
                <span v-if="r.blocking.length" class="text-xs text-muted-foreground">
                  Přeskočí se
                </span>
                <Select v-else v-model="r.decision">
                  <SelectTrigger
                    class="h-8 w-32"
                    :aria-label="`Akce pro fakturu ${r.input.invoiceNumber || r.input.clientSnapshot.name || i + 1}`"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">Importovat</SelectItem>
                    <SelectItem value="skip">Přeskočit</SelectItem>
                  </SelectContent>
                </Select>
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
      <div class="flex items-center justify-between">
        <Button variant="ghost" @click="reset"> Zpět </Button>
        <Button variant="coral" :disabled="state.committing || willCreate === 0" @click="onCommit">
          <Loader2 v-if="state.committing" class="h-4 w-4 animate-spin" />
          Importovat {{ willCreate }} faktur
        </Button>
      </div>
    </section>

    <!-- KROK 3: Výsledek -->
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
          Naimportováno {{ state.result?.batch.counts.created }} faktur, přeskočeno
          {{ state.result?.batch.counts.skipped }}.
          <template v-if="state.result?.batch.counts.failed">
            Selhalo {{ state.result?.batch.counts.failed }}.
          </template>
        </p>

        <!-- Připomenutí, když se řada ještě nenavázala — jinak další faktura -->
        <!-- dostane číslo z původní řady a vznikne díra nebo duplicita. -->
        <div
          v-if="state.series && !state.seriesApplied"
          class="mt-2 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm"
        >
          <ListOrdered class="h-4 w-4 shrink-0 text-primary" />
          <span>
            Chcete, aby další faktura navázala číslem <strong>{{ state.series.preview }}</strong
            >?
          </span>
          <Button variant="outline" size="sm" :disabled="applyingSeries" @click="onApplySeries">
            <Loader2 v-if="applyingSeries" class="h-4 w-4 animate-spin" />
            Navázat číselnou řadu
          </Button>
        </div>

        <div class="mt-2 flex flex-wrap justify-center gap-2">
          <Button variant="coral" @click="router.push('/app/faktury')">Zobrazit faktury</Button>
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
      </div>
    </section>
  </div>
</template>
