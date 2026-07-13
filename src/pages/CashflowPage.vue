<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Wallet, AlertTriangle, FileText, Mail, Loader2, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInvoices } from '@/composables/useInvoices'
import LoadError from '@/components/app/LoadError.vue'
import { downloadCsv } from '@/lib/csv-export'
import { formatCZK, formatDate } from '@/lib/invoice'
import {
  buildOutstanding,
  summarize,
  agingBuckets,
  debtors,
  buildReminder,
  reminderMailto,
  otherCurrencyCount,
} from '@/lib/cashflow'
import type { Invoice } from '@/lib/types'

const { invoices, loadError, load } = useInvoices()
const loading = ref(true)

// Referenční „dnešek" — jednou při mountu, ať se výpočty během renderu neměmí.
const today = new Date()

async function reload(): Promise<void> {
  loading.value = true
  await load()
  loading.value = false
}
onMounted(reload)

const outstanding = computed(() => buildOutstanding(invoices.value, today))
const summary = computed(() => summarize(outstanding.value))
const buckets = computed(() => agingBuckets(outstanding.value))
const topDebtors = computed(() => debtors(outstanding.value))
// Faktury v cizí měně se do CZK přehledu nesčítají — jen na ně upozorníme.
const otherCurrency = computed(() => otherCurrencyCount(invoices.value))

function remind(inv: Invoice) {
  window.location.href = reminderMailto(buildReminder(inv, today))
}

function exportDebtors() {
  downloadCsv(
    'dluznici.csv',
    ['Klient', 'E-mail', 'Dlužná částka', 'Faktur', 'Dní po splatnosti'],
    topDebtors.value.map((d) => [d.name, d.email ?? '', d.amount, d.count, d.maxDaysOverdue]),
  )
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Pohledávky a peníze</h1>
        <p class="mt-1 text-muted-foreground">
          Kdo ti dluží, co je po splatnosti a komu připomenout.
        </p>
      </div>
      <Button variant="outline" :disabled="!topDebtors.length" @click="exportDebtors">
        <Download class="h-4 w-4" /> Export dlužníků
      </Button>
    </div>

    <p
      v-if="!loading && otherCurrency > 0"
      class="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
    >
      Přehled je v Kč. {{ otherCurrency }}
      {{ otherCurrency === 1 ? 'faktura v cizí měně není' : 'faktur v cizí měně není' }} zahrnuto.
    </p>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <div
      v-else-if="outstanding.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Wallet class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Žádné otevřené pohledávky</h2>
      <p class="mt-1 text-sm text-muted-foreground">Všechny vystavené faktury jsou zaplacené. 🎉</p>
    </div>

    <template v-else>
      <!-- Souhrn -->
      <div class="mt-6 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Celkem nezaplaceno</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.totalOutstanding) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">
            {{ summary.outstandingCount }} otevřených faktur
          </div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlertTriangle class="h-4 w-4 text-destructive" /> Po splatnosti
          </div>
          <div class="mt-1 text-2xl font-bold text-destructive">
            {{ formatCZK(summary.overdueAmount) }}
          </div>
          <div class="mt-1 text-xs text-muted-foreground">
            {{ summary.overdueCount }} faktur po splatnosti
          </div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Dlužníků</div>
          <div class="mt-1 text-2xl font-bold">{{ topDebtors.length }}</div>
          <div class="mt-1 text-xs text-muted-foreground">odběratelů s otevřenou fakturou</div>
        </div>
      </div>

      <!-- Aging report -->
      <h2 class="mt-8 text-lg font-semibold">Stáří pohledávek</h2>
      <div class="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <div
          v-for="b in buckets"
          :key="b.key"
          class="rounded-xl border border-border bg-card p-4"
          :class="{ 'border-destructive/40': b.key === 'd90plus' && b.count > 0 }"
        >
          <div class="text-xs uppercase tracking-wide text-muted-foreground">{{ b.label }}</div>
          <div
            class="mt-1 text-lg font-bold"
            :class="b.key !== 'current' && b.count > 0 ? 'text-destructive' : ''"
          >
            {{ formatCZK(b.amount) }}
          </div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ b.count }} faktur</div>
        </div>
      </div>

      <!-- Otevřené faktury + připomenout -->
      <h2 class="mt-8 text-lg font-semibold">Otevřené faktury</h2>

      <!-- Mobil: karty -->
      <div class="mt-3 space-y-3 sm:hidden">
        <div
          v-for="o in outstanding"
          :key="o.invoice.id"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="font-semibold">{{ o.invoice.invoiceNumber || 'Koncept' }}</div>
              <div class="truncate text-sm text-muted-foreground">
                {{ o.invoice.clientSnapshot?.name || '—' }}
              </div>
            </div>
            <Badge :variant="o.daysOverdue > 0 ? 'destructive' : 'secondary'" class="shrink-0">
              {{ o.daysOverdue > 0 ? `${o.daysOverdue} dní po` : 'Do splatnosti' }}
            </Badge>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <span class="text-sm text-muted-foreground"
              >Splatnost {{ formatDate(o.invoice.dueDate) }}</span
            >
            <span class="font-semibold">{{ formatCZK(o.invoice.total) }}</span>
          </div>
          <div class="mt-3 flex justify-end border-t border-border pt-2">
            <Button
              variant="ghost"
              size="sm"
              :disabled="!o.invoice.clientSnapshot?.email"
              :title="
                o.invoice.clientSnapshot?.email ? 'Připomenout e-mailem' : 'Klient nemá e-mail'
              "
              @click="remind(o.invoice)"
            >
              <Mail class="h-4 w-4" /> Připomenout
            </Button>
          </div>
        </div>
      </div>

      <!-- Desktop: tabulka -->
      <div class="mt-3 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
        <table class="w-full min-w-[640px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Číslo</th>
              <th class="px-4 py-3 text-left">Odběratel</th>
              <th class="px-4 py-3 text-left">Splatnost</th>
              <th class="px-4 py-3 text-center">Stav</th>
              <th class="px-4 py-3 text-right">Částka</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in outstanding"
              :key="o.invoice.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ o.invoice.invoiceNumber || 'Koncept' }}</td>
              <td class="px-4 py-3 text-muted-foreground">
                {{ o.invoice.clientSnapshot?.name || '—' }}
              </td>
              <td class="px-4 py-3 text-muted-foreground">{{ formatDate(o.invoice.dueDate) }}</td>
              <td class="px-4 py-3 text-center">
                <Badge :variant="o.daysOverdue > 0 ? 'destructive' : 'secondary'">
                  {{ o.daysOverdue > 0 ? `${o.daysOverdue} dní po splatnosti` : 'Do splatnosti' }}
                </Badge>
              </td>
              <td class="px-4 py-3 text-right font-semibold">{{ formatCZK(o.invoice.total) }}</td>
              <td class="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="!o.invoice.clientSnapshot?.email"
                  :title="
                    o.invoice.clientSnapshot?.email ? 'Připomenout e-mailem' : 'Klient nemá e-mail'
                  "
                  @click="remind(o.invoice)"
                >
                  <Mail class="h-4 w-4" /> Připomenout
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Dlužníci -->
      <h2 class="mt-8 text-lg font-semibold">Dlužníci</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="d in topDebtors"
          :key="d.name"
          class="rounded-xl border border-border bg-card p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="truncate font-semibold">{{ d.name }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">
                {{ d.count }} {{ d.count === 1 ? 'faktura' : 'faktur' }}
                <template v-if="d.maxDaysOverdue > 0"
                  >· nejstarší {{ d.maxDaysOverdue }} dní po splatnosti</template
                >
              </div>
            </div>
            <FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
          <div
            class="mt-2 text-lg font-bold"
            :class="d.maxDaysOverdue > 0 ? 'text-destructive' : ''"
          >
            {{ formatCZK(d.amount) }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
