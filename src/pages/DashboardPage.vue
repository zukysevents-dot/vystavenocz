<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  FileText,
  Plus,
  UserPlus,
  Users,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart } from '@/components/ui/chart'
import { useInvoices } from '@/composables/useInvoices'
import { useClients } from '@/composables/useClients'
import { useCompanyStore } from '@/stores/company'
import { formatCZK, formatDate } from '@/lib/invoice'
import type { Invoice, InvoiceStatus } from '@/lib/types'

const router = useRouter()
const { invoices, load: loadInvoices } = useInvoices()
const { clients, load: loadClients } = useClients()
const companyStore = useCompanyStore()

const loading = ref(true)

onMounted(async () => {
  companyStore.init()
  await Promise.all([loadInvoices(), loadClients()])
  loading.value = false
})

const CZ_MONTHS = [
  'Led',
  'Úno',
  'Bře',
  'Dub',
  'Kvě',
  'Čer',
  'Čec',
  'Srp',
  'Zář',
  'Říj',
  'Lis',
  'Pro',
]
const todayISO = new Date().toISOString().slice(0, 10)

function isOverdue(inv: Invoice): boolean {
  return inv.status === 'overdue' || (inv.status === 'issued' && inv.dueDate < todayISO)
}

const stats = computed(() => {
  let billed = 0
  let paidAmount = 0
  let overdueAmount = 0
  let paidCount = 0
  let overdueCount = 0
  for (const inv of invoices.value) {
    const amount = Number(inv.total) || 0
    if (inv.status !== 'draft' && inv.status !== 'cancelled') billed += amount
    if (inv.status === 'paid') {
      paidCount++
      paidAmount += amount
    } else if (isOverdue(inv)) {
      overdueCount++
      overdueAmount += amount
    }
  }
  return {
    count: invoices.value.length,
    billed,
    paidAmount,
    paidCount,
    overdueAmount,
    overdueCount,
  }
})

// Tržby za posledních 6 měsíců (fakturováno = bez konceptů a storen).
const revenue = computed(() => {
  const now = new Date()
  const buckets: { key: string; label: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: CZ_MONTHS[d.getMonth()],
      total: 0,
    })
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]))
  for (const inv of invoices.value) {
    if (inv.status === 'draft' || inv.status === 'cancelled') continue
    const d = new Date(inv.issueDate)
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (i !== undefined) buckets[i].total += Number(inv.total) || 0
  }
  return buckets
})

const hasRevenue = computed(() => revenue.value.some((b) => b.total > 0))

const recentInvoices = computed(() =>
  [...invoices.value].sort((a, b) => b.issueDate.localeCompare(a.issueDate)).slice(0, 5),
)
const recentClients = computed(() =>
  [...clients.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
)

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'
const statusLabels: Record<InvoiceStatus, { label: string; variant: BadgeVariant }> = {
  draft: { label: 'Koncept', variant: 'secondary' },
  issued: { label: 'Vystaveno', variant: 'default' },
  paid: { label: 'Zaplaceno', variant: 'outline' },
  overdue: { label: 'Po splatnosti', variant: 'destructive' },
  cancelled: { label: 'Stornováno', variant: 'secondary' },
}
function statusMeta(s: string): { label: string; variant: BadgeVariant } {
  return statusLabels[s as InvoiceStatus] ?? { label: s || 'Neznámý', variant: 'outline' }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Přehled</h1>
        <p class="mt-1 text-muted-foreground">
          {{ companyStore.company?.companyName || 'Vítejte ve Vystaveno' }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="router.push('/app/klienti')">
          <UserPlus class="h-4 w-4" /> Nový klient
        </Button>
        <Button variant="coral" @click="router.push('/app/faktury/editor')">
          <Plus class="h-4 w-4" /> Nová faktura
        </Button>
      </div>
    </div>

    <!-- Metriky -->
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText class="h-4 w-4" /> Faktury celkem
        </div>
        <div class="mt-2 text-2xl font-bold">{{ stats.count }}</div>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Coins class="h-4 w-4" /> Fakturováno
        </div>
        <div class="mt-2 text-2xl font-bold">{{ formatCZK(stats.billed) }}</div>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 class="h-4 w-4 text-success" /> Uhrazené
        </div>
        <div class="mt-2 text-2xl font-bold">{{ stats.paidCount }}</div>
        <div class="text-xs text-muted-foreground">{{ formatCZK(stats.paidAmount) }}</div>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle class="h-4 w-4 text-destructive" /> Po splatnosti
        </div>
        <div class="mt-2 text-2xl font-bold">{{ stats.overdueCount }}</div>
        <div class="text-xs text-muted-foreground">{{ formatCZK(stats.overdueAmount) }}</div>
      </div>
    </div>

    <!-- Graf tržeb -->
    <div class="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Tržby (posledních 6 měsíců)
      </h2>
      <BarChart
        v-if="hasRevenue"
        class="mt-4"
        :data="revenue"
        :x="(_, i) => i"
        :y="(d) => d.total"
        :x-tick-format="(_, i) => revenue[i]?.label ?? ''"
        aria-label="Tržby za posledních 6 měsíců"
      />
      <p v-else class="mt-4 text-sm text-muted-foreground">
        Zatím žádné tržby k zobrazení. Vystavte první fakturu.
      </p>
    </div>

    <!-- Poslední faktury + klienti -->
    <div class="mt-6 grid gap-4 lg:grid-cols-2">
      <div class="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Poslední faktury
          </h2>
          <RouterLink to="/app/faktury" class="text-xs font-medium text-primary hover:underline">
            Všechny
          </RouterLink>
        </div>
        <div v-if="recentInvoices.length" class="mt-4 space-y-1">
          <button
            v-for="inv in recentInvoices"
            :key="inv.id"
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
            @click="router.push('/app/faktury/editor?id=' + inv.id)"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ inv.invoiceNumber || 'Koncept' }}</span>
              <span class="block truncate text-xs text-muted-foreground">
                {{ inv.clientSnapshot?.name || '—' }} · {{ formatDate(inv.issueDate) }}
              </span>
            </span>
            <span class="flex shrink-0 items-center gap-2">
              <span class="font-semibold">{{ formatCZK(inv.total) }}</span>
              <Badge :variant="statusMeta(inv.status).variant">
                {{ statusMeta(inv.status).label }}
              </Badge>
            </span>
          </button>
        </div>
        <p v-else class="mt-4 text-sm text-muted-foreground">Zatím žádné faktury.</p>
      </div>

      <div class="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Poslední klienti
          </h2>
          <RouterLink to="/app/klienti" class="text-xs font-medium text-primary hover:underline">
            Všichni
          </RouterLink>
        </div>
        <div v-if="recentClients.length" class="mt-4 space-y-1">
          <RouterLink
            v-for="c in recentClients"
            :key="c.id"
            to="/app/klienti"
            class="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <Users class="h-4 w-4" />
            </span>
            <span class="min-w-0">
              <span class="block truncate font-medium">{{ c.name }}</span>
              <span class="block truncate text-xs text-muted-foreground">
                {{ [c.city, c.ico ? 'IČO ' + c.ico : ''].filter(Boolean).join(' · ') || '—' }}
              </span>
            </span>
          </RouterLink>
        </div>
        <p v-else class="mt-4 text-sm text-muted-foreground">Zatím žádní klienti.</p>
      </div>
    </div>
  </div>
</template>
