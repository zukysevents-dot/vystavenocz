<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Calculator, Download, FileCode2, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInvoices } from '@/composables/useInvoices'
import { formatCZK, formatDate } from '@/lib/invoice'
import { downloadIsdoc, downloadInvoicesCsv, canExportIsdoc } from '@/lib/accounting-export'
import type { Invoice, InvoiceStatus } from '@/lib/types'

const { invoices, load } = useInvoices()
const loading = ref(true)
const period = ref<string>('all')

onMounted(async () => {
  await load()
  loading.value = false
})

// Účetní doklady = vystavené faktury. Koncepty (ještě nevystavené) ani stornované
// (neplatné) doklady do podkladů pro účetní nepatří.
const documents = computed(() =>
  invoices.value.filter((i) => i.status !== 'draft' && i.status !== 'cancelled'),
)

// Dostupná období (YYYY-MM dle data vystavení), sestupně.
const periods = computed(() => {
  const set = new Set<string>()
  for (const i of documents.value) {
    if (i.issueDate) set.add(i.issueDate.slice(0, 7))
  }
  return [...set].sort().reverse()
})

const filtered = computed(() =>
  period.value === 'all'
    ? documents.value
    : documents.value.filter((i) => (i.issueDate || '').startsWith(period.value)),
)

function periodLabel(p: string): string {
  const [y, m] = p.split('-')
  return `${Number(m)}/${y}`
}

const statusMeta: Record<
  InvoiceStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Koncept', variant: 'secondary' },
  issued: { label: 'Vystaveno', variant: 'default' },
  paid: { label: 'Zaplaceno', variant: 'outline' },
  overdue: { label: 'Po splatnosti', variant: 'destructive' },
  cancelled: { label: 'Stornováno', variant: 'secondary' },
}

function exportCsv() {
  const name = period.value === 'all' ? 'faktury-vse' : `faktury-${period.value}`
  downloadInvoicesCsv(filtered.value, `${name}.csv`)
}

function exportIsdoc(inv: Invoice) {
  downloadIsdoc(inv)
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Účtárna</h1>
        <p class="mt-1 text-muted-foreground">
          Export podkladů pro účetní — ISDOC i CSV jedním kliknutím.
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <label class="sr-only" for="period">Období</label>
        <select
          id="period"
          v-model="period"
          class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
        >
          <option value="all">Všechna období</option>
          <option v-for="p in periods" :key="p" :value="p">{{ periodLabel(p) }}</option>
        </select>
        <Button variant="coral" :disabled="filtered.length === 0" @click="exportCsv">
          <Download class="h-4 w-4" /> Export CSV
        </Button>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div
      v-else-if="filtered.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Calculator class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Žádné doklady k exportu</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Pro vybrané období tu nejsou žádné vystavené faktury.
      </p>
    </div>

    <template v-else>
      <!-- Mobil: karty -->
      <div class="mt-6 space-y-3 sm:hidden">
        <div
          v-for="inv in filtered"
          :key="inv.id"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="font-semibold">{{ inv.invoiceNumber || 'Koncept' }}</div>
              <div class="truncate text-sm text-muted-foreground">
                {{ inv.clientSnapshot?.name || '—' }}
              </div>
            </div>
            <Badge :variant="statusMeta[inv.status].variant" class="shrink-0">
              {{ statusMeta[inv.status].label }}
            </Badge>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-sm text-muted-foreground">{{ formatDate(inv.issueDate) }}</span>
            <span class="font-semibold">{{ formatCZK(inv.total) }}</span>
          </div>
          <div class="mt-3 flex justify-end border-t border-border pt-2">
            <Button
              variant="ghost"
              size="sm"
              :disabled="!canExportIsdoc(inv)"
              :title="canExportIsdoc(inv) ? 'Stáhnout ISDOC' : 'ISDOC jen pro faktury v Kč'"
              @click="exportIsdoc(inv)"
            >
              <FileCode2 class="h-4 w-4" /> ISDOC
            </Button>
          </div>
        </div>
      </div>

      <!-- Desktop: tabulka -->
      <div class="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table class="w-full min-w-[640px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Číslo</th>
              <th class="px-4 py-3 text-left">Odběratel</th>
              <th class="px-4 py-3 text-left">Vystaveno</th>
              <th class="px-4 py-3 text-right">Částka</th>
              <th class="px-4 py-3 text-center">Stav</th>
              <th class="px-4 py-3 text-right">ISDOC</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="inv in filtered"
              :key="inv.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ inv.invoiceNumber || 'Koncept' }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ inv.clientSnapshot?.name || '—' }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ formatDate(inv.issueDate) }}</td>
              <td class="px-4 py-3 text-right font-semibold">{{ formatCZK(inv.total) }}</td>
              <td class="px-4 py-3 text-center">
                <Badge :variant="statusMeta[inv.status].variant">
                  {{ statusMeta[inv.status].label }}
                </Badge>
              </td>
              <td class="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="!canExportIsdoc(inv)"
                  :title="
                    canExportIsdoc(inv)
                      ? 'Stáhnout ISDOC (XML pro účetní program)'
                      : 'ISDOC umíme jen pro faktury v Kč'
                  "
                  @click="exportIsdoc(inv)"
                >
                  <FileCode2 class="h-4 w-4" /> ISDOC
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
