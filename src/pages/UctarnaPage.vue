<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Building2, Calculator, Download, FileCode2, Loader2, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LoadError from '@/components/app/LoadError.vue'
import { useInvoiceExport } from '@/composables/useInvoiceExport'
import { useInvoices } from '@/composables/useInvoices'
import { useCompanyStore } from '@/stores/company'
import { isApiMode } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import { formatDate } from '@/lib/invoice'
import {
  canExportIsdoc,
  canExportIsdocHeader,
  downloadInvoicesCsv,
  downloadIsdoc,
} from '@/lib/accounting-export'
import {
  DEFAULT_INVOICE_EXPORT_FILTERS,
  filterInvoiceExport,
  invoiceExportClientOptions,
  invoiceExportCurrencies,
  summarizeInvoiceExport,
  type InvoiceExportFilters,
} from '@/lib/invoice-export'
import type { DocumentType, Invoice, InvoiceStatus } from '@/lib/types'

const isApi = isApiMode()
const { invoices, loading, loadError, load } = useInvoiceExport()
const { get } = useInvoices()
const companyStore = useCompanyStore()
const exportingId = ref<string | null>(null)

const filters = reactive<InvoiceExportFilters>({
  ...DEFAULT_INVOICE_EXPORT_FILTERS,
  documentTypes: [...DEFAULT_INVOICE_EXPORT_FILTERS.documentTypes],
  statuses: [...DEFAULT_INVOICE_EXPORT_FILTERS.statuses],
})

const documentTypeOptions: Array<{ value: DocumentType; label: string }> = [
  { value: 'invoice', label: 'Faktura' },
  { value: 'proforma', label: 'Zálohová faktura' },
  { value: 'credit_note', label: 'Dobropis' },
]

const statusOptions: Array<{
  value: InvoiceStatus
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}> = [
  { value: 'draft', label: 'Koncept', variant: 'secondary' },
  { value: 'issued', label: 'Vystaveno', variant: 'default' },
  { value: 'paid', label: 'Zaplaceno', variant: 'outline' },
  { value: 'overdue', label: 'Po splatnosti', variant: 'destructive' },
  { value: 'cancelled', label: 'Stornováno', variant: 'secondary' },
]

const documentTypeMeta = Object.fromEntries(
  documentTypeOptions.map((option) => [option.value, option]),
) as Record<DocumentType, (typeof documentTypeOptions)[number]>
const statusMeta = Object.fromEntries(
  statusOptions.map((option) => [option.value, option]),
) as Record<InvoiceStatus, (typeof statusOptions)[number]>

const clientOptions = computed(() => invoiceExportClientOptions(invoices.value))
const currencies = computed(() => invoiceExportCurrencies(invoices.value))
const filtered = computed(() => filterInvoiceExport(invoices.value, filters))
const summary = computed(() => summarizeInvoiceExport(filtered.value))
const activeCompanyName = computed(
  () => companyStore.company?.companyName || companyStore.company?.fullName || 'Aktivní firma',
)

async function reload(): Promise<void> {
  await Promise.all([load(), companyStore.load()])
}
onMounted(reload)

function resetFilters(): void {
  filters.from = ''
  filters.to = ''
  filters.documentTypes = [...DEFAULT_INVOICE_EXPORT_FILTERS.documentTypes]
  filters.statuses = [...DEFAULT_INVOICE_EXPORT_FILTERS.statuses]
  filters.clientKey = ''
  filters.currency = ''
}

function exportCsv(): void {
  const snapshot = [...filtered.value]
  if (!snapshot.length) return
  const filename =
    filters.from || filters.to
      ? `faktury-${filters.from || 'zacatek'}-${filters.to || 'dnes'}.csv`
      : 'faktury-vse.csv'
  downloadInvoicesCsv(snapshot, filename)
}

function canOfferIsdoc(invoice: Invoice): boolean {
  return isApi ? canExportIsdocHeader(invoice) : canExportIsdoc(invoice)
}

function isdocTitle(invoice: Invoice): string {
  if (invoice.documentType === 'proforma') return 'ISDOC není určený pro zálohovou fakturu.'
  if (invoice.status === 'draft' || invoice.status === 'cancelled')
    return 'ISDOC je dostupný jen pro platný vystavený doklad.'
  if (invoice.currency && invoice.currency !== 'CZK')
    return 'ISDOC bez kurzového přepočtu nabízíme jen pro doklady v Kč.'
  if (!isApi && invoice.items.length === 0) return 'ISDOC vyžaduje alespoň jednu položku.'
  return 'Stáhnout ISDOC (XML pro účetní program)'
}

async function exportIsdoc(invoice: Invoice): Promise<void> {
  if (!canOfferIsdoc(invoice)) return
  if (!isApi) {
    downloadIsdoc(invoice)
    return
  }
  exportingId.value = invoice.id
  try {
    const detail = await get(invoice.id)
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

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: currency || 'CZK',
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Export pro účetní</h1>
        <p class="mt-1 max-w-2xl text-muted-foreground">
          Vyberte přesně fakturační doklady, zkontrolujte souhrn a stáhněte stejný výběr.
        </p>
        <div class="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 class="h-4 w-4" aria-hidden="true" />
          Firma: <strong class="text-foreground">{{ activeCompanyName }}</strong>
        </div>
      </div>
      <Button variant="coral" :disabled="loading || filtered.length === 0" @click="exportCsv">
        <Download class="h-4 w-4" aria-hidden="true" /> Export CSV
      </Button>
    </div>

    <section
      aria-labelledby="export-filters-heading"
      class="mt-6 rounded-2xl border bg-card p-4 sm:p-5"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="export-filters-heading" class="font-semibold">Výběr fakturačních dokladů</h2>
          <p class="text-sm text-muted-foreground">
            Výchozí výběr obsahuje daňové doklady. Zálohy, koncepty a storna přidáte vědomě.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" @click="resetFilters">
          <RotateCcw class="h-4 w-4" aria-hidden="true" /> Obnovit výběr
        </Button>
      </div>

      <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label for="export-from" class="text-sm font-medium">Vystaveno od</label>
          <input
            id="export-from"
            v-model="filters.from"
            type="date"
            class="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label for="export-to" class="text-sm font-medium">Vystaveno do</label>
          <input
            id="export-to"
            v-model="filters.to"
            type="date"
            class="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label for="export-client" class="text-sm font-medium">Odběratel</label>
          <select
            id="export-client"
            v-model="filters.clientKey"
            class="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Všichni odběratelé</option>
            <option v-for="client in clientOptions" :key="client.key" :value="client.key">
              {{ client.label }}
            </option>
          </select>
        </div>
        <div>
          <label for="export-currency" class="text-sm font-medium">Měna</label>
          <select
            id="export-currency"
            v-model="filters.currency"
            class="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">Všechny měny odděleně</option>
            <option v-for="currency in currencies" :key="currency" :value="currency">
              {{ currency }}
            </option>
          </select>
        </div>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-[1fr_1.5fr_1fr]">
        <fieldset>
          <legend class="text-sm font-medium">Typ dokladu</legend>
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            <label
              v-for="option in documentTypeOptions"
              :key="option.value"
              class="flex min-h-9 cursor-pointer items-center gap-2 text-sm"
            >
              <input v-model="filters.documentTypes" type="checkbox" :value="option.value" />
              {{ option.label }}
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend class="text-sm font-medium">Stav</legend>
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            <label
              v-for="option in statusOptions"
              :key="option.value"
              class="flex min-h-9 cursor-pointer items-center gap-2 text-sm"
            >
              <input v-model="filters.statuses" type="checkbox" :value="option.value" />
              {{ option.label }}
            </label>
          </div>
        </fieldset>

        <div>
          <label for="export-format" class="text-sm font-medium">Hromadný formát</label>
          <select
            id="export-format"
            class="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="csv">CSV přehled</option>
          </select>
          <p class="mt-1 text-xs text-muted-foreground">
            ISDOC stáhnete po jednom u vystavených dokladů v Kč; ne u záloh, konceptů a storen.
          </p>
        </div>
      </div>
    </section>

    <div v-if="loading" class="mt-12 flex justify-center" aria-label="Načítání dokladů">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <template v-else>
      <section aria-labelledby="export-preview-heading" class="mt-6">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="export-preview-heading" class="text-lg font-semibold">Náhled exportu</h2>
            <p class="text-sm text-muted-foreground">
              CSV vznikne přesně z níže uvedeného výběru a pořadí.
            </p>
          </div>
          <div class="text-right">
            <div data-testid="export-count" class="text-2xl font-bold">{{ summary.count }}</div>
            <div class="text-sm text-muted-foreground">dokladů</div>
          </div>
        </div>

        <div v-if="summary.count" class="mt-4 flex flex-wrap gap-2" aria-label="Rozpad podle stavu">
          <Badge
            v-for="option in statusOptions.filter((item) => summary.statusCounts[item.value] > 0)"
            :key="option.value"
            :variant="option.variant"
          >
            {{ option.label }}: {{ summary.statusCounts[option.value] }}
          </Badge>
        </div>

        <div v-if="summary.currencies.length" class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="currency in summary.currencies"
            :key="currency.currency"
            class="rounded-xl border bg-card p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <strong>{{ currency.currency }}</strong>
              <span class="text-sm text-muted-foreground">{{ currency.count }} dokladů</span>
            </div>
            <div class="mt-2 text-xl font-bold">
              {{ formatMoney(currency.total, currency.currency) }}
            </div>
            <dl class="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <dt>Základ</dt>
                <dd class="mt-1 text-foreground">
                  {{ formatMoney(currency.subtotal, currency.currency) }}
                </dd>
              </div>
              <div>
                <dt>DPH</dt>
                <dd class="mt-1 text-foreground">
                  {{ formatMoney(currency.vatTotal, currency.currency) }}
                </dd>
              </div>
              <div>
                <dt>Průměr</dt>
                <dd class="mt-1 text-foreground">
                  {{ formatMoney(currency.averageTotal, currency.currency) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div
        v-if="filtered.length === 0"
        class="mt-6 rounded-2xl border border-border bg-card p-8 text-center sm:p-12"
      >
        <Calculator class="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 class="mt-4 text-lg font-semibold">Žádné doklady ve výběru</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Změňte období nebo filtry. Prázdný a zavádějící soubor nelze stáhnout.
        </p>
      </div>

      <template v-else>
        <div class="mt-6 space-y-3 sm:hidden">
          <article
            v-for="invoice in filtered"
            :key="invoice.id"
            class="rounded-xl border border-border bg-card p-4"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-semibold">{{ invoice.invoiceNumber || 'Koncept' }}</div>
                <div class="truncate text-sm text-muted-foreground">
                  {{ invoice.clientSnapshot?.name || '—' }}
                </div>
              </div>
              <Badge :variant="statusMeta[invoice.status].variant" class="shrink-0">
                {{ statusMeta[invoice.status].label }}
              </Badge>
            </div>
            <div class="mt-2 text-xs text-muted-foreground">
              {{ documentTypeMeta[invoice.documentType].label }} ·
              {{ formatDate(invoice.issueDate) }}
            </div>
            <div class="mt-3 flex items-center justify-between gap-3">
              <strong>{{ formatMoney(invoice.total, invoice.currency || 'CZK') }}</strong>
              <Button
                variant="ghost"
                size="sm"
                :disabled="!canOfferIsdoc(invoice) || exportingId === invoice.id"
                :title="isdocTitle(invoice)"
                :aria-label="isdocTitle(invoice)"
                @click="exportIsdoc(invoice)"
              >
                <Loader2
                  v-if="exportingId === invoice.id"
                  class="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                <FileCode2 v-else class="h-4 w-4" aria-hidden="true" /> ISDOC
              </Button>
            </div>
          </article>
        </div>

        <div class="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
          <table class="w-full min-w-[780px] text-sm">
            <thead
              class="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Číslo</th>
                <th class="px-4 py-3 text-left">Typ</th>
                <th class="px-4 py-3 text-left">Odběratel</th>
                <th class="px-4 py-3 text-left">Vystaveno</th>
                <th class="px-4 py-3 text-right">Částka</th>
                <th class="px-4 py-3 text-center">Stav</th>
                <th class="px-4 py-3 text-right">ISDOC</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="invoice in filtered"
                :key="invoice.id"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3 font-medium">{{ invoice.invoiceNumber || 'Koncept' }}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ documentTypeMeta[invoice.documentType].label }}
                </td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ invoice.clientSnapshot?.name || '—' }}
                </td>
                <td class="px-4 py-3 text-muted-foreground">{{ formatDate(invoice.issueDate) }}</td>
                <td class="px-4 py-3 text-right font-semibold">
                  {{ formatMoney(invoice.total, invoice.currency || 'CZK') }}
                </td>
                <td class="px-4 py-3 text-center">
                  <Badge :variant="statusMeta[invoice.status].variant">
                    {{ statusMeta[invoice.status].label }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    :disabled="!canOfferIsdoc(invoice) || exportingId === invoice.id"
                    :title="isdocTitle(invoice)"
                    :aria-label="isdocTitle(invoice)"
                    @click="exportIsdoc(invoice)"
                  >
                    <Loader2
                      v-if="exportingId === invoice.id"
                      class="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <FileCode2 v-else class="h-4 w-4" aria-hidden="true" /> ISDOC
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>
