<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Upload,
  Loader2,
  Check,
  RotateCcw,
  FileSpreadsheet,
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
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import { useInvoiceImport } from './useInvoiceImport'

const router = useRouter()
const { state, pickFile, commit, applySupplierToProfile, rollbackLast, reset } = useInvoiceImport()
const dragOver = ref(false)
const rollingBack = ref(false)
const applyingProfile = ref(false)

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

const STATUS_LABEL: Record<string, string> = {
  paid: 'Uhrazená',
  issued: 'Vystavená',
  overdue: 'Po splatnosti',
  cancelled: 'Stornovaná',
  draft: 'Koncept',
}

const willCreate = computed(() => state.rows.filter((r) => r.decision === 'create').length)
const willSkip = computed(() => state.rows.filter((r) => r.decision === 'skip').length)

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
  <div class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Import faktur z Fakturoidu</h1>
      <p class="mt-1 text-muted-foreground">
        Nahrajte XML export faktur z Fakturoidu — zachováme čísla, datumy i stav úhrady.
      </p>
    </div>

    <!-- Upozornění: v produkci čeká na backend -->
    <div
      v-if="isApiMode()"
      class="mb-6 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm"
    >
      <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>
        Historický import faktur potřebuje serverový endpoint
        <code class="rounded bg-muted px-1">/invoices/import</code>, který zachová původní číslo a
        stav. Dokud ho backend nemá, import zde může selhat — náhled a mapování ale fungují.
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
          <div class="font-semibold">Přetáhněte sem XML export z Fakturoidu nebo klikněte</div>
          <p class="mt-1 text-sm text-muted-foreground">Nastavení → Export → Faktury (XML).</p>
        </div>
      </label>
      <input
        id="invoice-file"
        type="file"
        accept=".xml,application/xml,text/xml"
        class="sr-only"
        @change="onFileChange"
      />
    </section>

    <!-- KROK 2: Náhled -->
    <section v-else-if="state.step === 'preview'" class="space-y-4">
      <div class="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <FileSpreadsheet class="h-4 w-4 text-primary" />
        <span class="font-medium">{{ state.fileName }}</span>
        <span class="text-muted-foreground">· {{ state.rows.length }} faktur</span>
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
      </div>
      <div class="overflow-x-auto rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Číslo</TableHead>
              <TableHead>Klient</TableHead>
              <TableHead>Vystaveno</TableHead>
              <TableHead class="text-right">Částka</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead>Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(r, i) in state.rows" :key="i">
              <TableCell class="font-medium">{{ r.input.invoiceNumber || '—' }}</TableCell>
              <TableCell>{{ r.input.clientSnapshot.name || '—' }}</TableCell>
              <TableCell>{{ r.input.issueDate || '—' }}</TableCell>
              <TableCell class="text-right tabular-nums">{{ formatCZK(r.previewTotal) }}</TableCell>
              <TableCell>
                <Badge :variant="r.duplicate ? 'secondary' : 'outline'">
                  {{ r.duplicate ? 'Duplicita' : (STATUS_LABEL[r.input.status] ?? r.input.status) }}
                </Badge>
              </TableCell>
              <TableCell>
                <Select v-model="r.decision">
                  <SelectTrigger class="h-8 w-32"><SelectValue /></SelectTrigger>
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
