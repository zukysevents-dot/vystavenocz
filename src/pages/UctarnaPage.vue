<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Calculator, Download, FileCode2, Loader2, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInvoices } from '@/composables/useInvoices'
import LoadError from '@/components/app/LoadError.vue'
import { isApiMode } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import { formatCZK, formatDate } from '@/lib/invoice'
import { downloadIsdoc, downloadInvoicesCsv, canExportIsdoc } from '@/lib/accounting-export'
import type { Invoice, InvoiceStatus } from '@/lib/types'

const isApi = isApiMode()
const { invoices, loadError, load, get } = useInvoices()
const loading = ref(true)
const period = ref<string>('all')
const documentType = ref<'all' | 'invoice' | 'credit_note'>('all')
const status = ref<'all' | 'issued' | 'paid' | 'overdue'>('all')
const search = ref('')
// ISDOC se generuje z konkrétní faktury; v API režimu k ní nejdřív dotáhneme řádky.
const exportingId = ref<string | null>(null)

async function reload(): Promise<void> {
  loading.value = true
  await load()
  loading.value = false
}
onMounted(reload)

// Účetní doklady = vystavené faktury a dobropisy (daňové doklady). Koncepty a stornované doklady
// do podkladů nepatří; zálohové (proforma) jsou NEDAŇOVÉ → do účetního exportu také ne (do obratu
// vstupuje až daňový doklad vzniklý konverzí proformy).
const documents = computed(() =>
  invoices.value.filter(
    (i) => i.documentType !== 'proforma' && i.status !== 'draft' && i.status !== 'cancelled',
  ),
)

// Dostupná období (YYYY-MM dle data vystavení), sestupně.
const periods = computed(() => {
  const set = new Set<string>()
  for (const i of documents.value) {
    if (i.issueDate) set.add(i.issueDate.slice(0, 7))
  }
  return [...set].sort().reverse()
})

const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('cs-CZ')
  return documents.value.filter((invoice) => {
    if (period.value !== 'all' && !(invoice.issueDate || '').startsWith(period.value)) return false
    if (documentType.value !== 'all' && invoice.documentType !== documentType.value) return false
    if (status.value !== 'all' && invoice.status !== status.value) return false
    if (!query) return true
    return [
      invoice.invoiceNumber,
      invoice.clientSnapshot?.name,
      invoice.clientSnapshot?.ico,
      invoice.clientSnapshot?.dic,
    ].some((value) => value?.toLocaleLowerCase('cs-CZ').includes(query))
  })
})

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
  // CSV je hlavičkový přehled (číslo/datumy/odběratel/součty/stav) — list-summary nese
  // subtotal/vatTotal, takže dotahovat řádky netřeba.
  const name = period.value === 'all' ? 'faktury-vyber' : `faktury-${period.value}-vyber`
  downloadInvoicesCsv(filtered.value, `${name}.csv`)
}

/**
 * ISDOC nabídni podle typu dokladu a měny. V mock režimu má `inv` řádky, tak platí i podmínka
 * `items.length > 0` (`canExportIsdoc`). V API režimu má list-summary `items: []` — řádky dotáhneme
 * až při exportu z detailu, takže o nabídce rozhoduje jen typ a měna.
 */
function canOfferIsdoc(inv: Invoice): boolean {
  if (!isApi) return canExportIsdoc(inv)
  return inv.documentType !== 'proforma' && (!inv.currency || inv.currency === 'CZK')
}

async function exportIsdoc(inv: Invoice) {
  if (!canOfferIsdoc(inv)) return
  // Mock režim: `inv` už řádky nese → generuj rovnou.
  if (!isApi) {
    downloadIsdoc(inv)
    return
  }
  // API režim: list-summary nemá řádky → dotáhni plný detail, teprve pak generuj.
  exportingId.value = inv.id
  try {
    const detail = await get(inv.id)
    if (!detail || !canExportIsdoc(detail)) {
      toast.error('Doklad se nepodařilo připravit pro ISDOC export.')
      return
    }
    downloadIsdoc(detail)
  } catch {
    toast.error('Export ISDOC se nepodařil.')
  } finally {
    exportingId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Export pro účetní</h1>
        <p class="mt-1 text-muted-foreground">
          Vyberte přesně doklady, které chcete předat účetní — CSV i ISDOC jedním kliknutím.
        </p>
      </div>
      <Button class="shrink-0" variant="coral" :disabled="filtered.length === 0" @click="exportCsv">
        <Download class="h-4 w-4" /> Export CSV ({{ filtered.length }})
      </Button>
    </div>

    <div
      class="mt-5 grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground" for="period">Období</label>
        <select
          id="period"
          v-model="period"
          class="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="all">Všechna období</option>
          <option v-for="p in periods" :key="p" :value="p">{{ periodLabel(p) }}</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground" for="document-type"
          >Typ dokladu</label
        >
        <select
          id="document-type"
          v-model="documentType"
          class="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="all">Faktury i dobropisy</option>
          <option value="invoice">Pouze faktury</option>
          <option value="credit_note">Pouze dobropisy</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground" for="status">Stav</label>
        <select
          id="status"
          v-model="status"
          class="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          <option value="all">Všechny stavy</option>
          <option value="issued">Vystavené</option>
          <option value="paid">Zaplacené</option>
          <option value="overdue">Po splatnosti</option>
        </select>
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground" for="accounting-search"
          >Odběratel nebo číslo</label
        >
        <div class="relative">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="accounting-search"
            v-model="search"
            class="h-9 pl-9"
            placeholder="Jméno, IČO, číslo…"
          />
        </div>
      </div>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <div
      v-else-if="filtered.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Calculator class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Žádné doklady k exportu</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Změňte výběr období, typu dokladu, stavu nebo hledání.
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
              :disabled="!canOfferIsdoc(inv) || exportingId === inv.id"
              :title="canOfferIsdoc(inv) ? 'Stáhnout ISDOC' : 'ISDOC jen pro faktury v Kč'"
              @click="exportIsdoc(inv)"
            >
              <Loader2 v-if="exportingId === inv.id" class="h-4 w-4 animate-spin" />
              <FileCode2 v-else class="h-4 w-4" /> ISDOC
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
                  :disabled="!canOfferIsdoc(inv) || exportingId === inv.id"
                  :title="
                    canOfferIsdoc(inv)
                      ? 'Stáhnout ISDOC (XML pro účetní program)'
                      : 'ISDOC umíme jen pro faktury v Kč'
                  "
                  @click="exportIsdoc(inv)"
                >
                  <Loader2 v-if="exportingId === inv.id" class="h-4 w-4 animate-spin" />
                  <FileCode2 v-else class="h-4 w-4" /> ISDOC
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
