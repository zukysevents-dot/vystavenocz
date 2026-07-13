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
  TrendingUp,
  ShoppingCart,
  Building2,
  Trophy,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart } from '@/components/ui/chart'
import LoadError from '@/components/app/LoadError.vue'
import { useInvoices } from '@/composables/useInvoices'
import { useClients } from '@/composables/useClients'
import { useLocations } from '@/composables/useLocations'
import { useApi } from '@/composables/useApi'
import { useCompanyStore } from '@/stores/company'
import { useAuthStore } from '@/stores/auth'
import { http, isApiMode } from '@/lib/http'
import { formatCZK, formatDate } from '@/lib/invoice'
import { buildLocationRevenue, consolidationSummary } from '@/lib/consolidation'
import type { InvoiceStatus, Sale } from '@/lib/types'

const router = useRouter()
const loading = ref(true)
// Profil firmy pro pozdrav v hlavičce; načítá ho AppLayout (reaktivně), tady jen čteme.
const companyStore = useCompanyStore()
// Fakturační část dashboardu (metriky faktur, graf tržeb, poslední faktury/klienti + tlačítka) je za modulem
// `invoicing`. Bez něj backend vrací 403 → dřív to shodilo celý Přehled jako „server nedostupný". Gastro/POS
// tenant (jen pos/gastro) proto fakturační část vůbec nevolá ani nezobrazuje; POS provoz jede dál.
const auth = useAuthStore()
const hasInvoicing = computed(() => auth.hasModule('invoicing'))
const salesApi = useApi<Sale>('sales')
const { locations, load: loadLocations } = useLocations()

// Normalizovaný tvar dat — stejný pro API i mock režim (template nezávisí na režimu).
interface Stats {
  count: number
  billed: number
  paidAmount: number
  paidCount: number
  overdueAmount: number
  overdueCount: number
}
interface RecentInvoice {
  id: string
  invoiceNumber: string | null
  clientName: string
  issueDate: string
  total: number
  status: string
}
interface RecentClient {
  id: string
  name: string
  city: string | null
  ico: string | null
  email: string | null
}

const stats = ref<Stats>({
  count: 0,
  billed: 0,
  paidAmount: 0,
  paidCount: 0,
  overdueAmount: 0,
  overdueCount: 0,
})
const revenue = ref<{ label: string; total: number }[]>([])
const recentInvoices = ref<RecentInvoice[]>([])
const recentClients = ref<RecentClient[]>([])
const hasRevenue = computed(() => revenue.value.some((b) => b.total > 0))

// Provoz (POS & pobočky) — tržby z prodejů seskupené po pobočkách. Čte se stejně v obou
// režimech přes useApi<Sale>('sales') (API: /sales, mock: seed). Reuse otestované consolidation
// logiky. locationId plní backend; do té doby padne do „Nepřiřazeno".
const posSales = ref<Sale[]>([])
const posSummary = computed(() =>
  consolidationSummary(buildLocationRevenue(posSales.value, locations.value)),
)
const hasPos = computed(() => posSales.value.length > 0)

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

const loadError = ref(false)

async function loadAll(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    // POS provoz běží nezávisle (vlastní try/catch). Fakturační část se volá jen s modulem `invoicing`
    // (jinak backend vrací 403); její chyba řídí loadError. Bez modulu se fakturační část přeskočí.
    await Promise.all([
      hasInvoicing.value ? (isApiMode() ? loadFromApi() : loadFromMock()) : Promise.resolve(),
      loadPos(),
    ])
  } catch (e) {
    console.warn('Načtení přehledu selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

// POS provoz — prodeje + pobočky. Chyba (např. chybějící /sales endpoint) nesmí shodit
// zbytek dashboardu, proto vlastní try/catch a graceful prázdný stav.
async function loadPos(): Promise<void> {
  try {
    const [sales] = await Promise.all([salesApi.list(), loadLocations()])
    posSales.value = sales
  } catch (e) {
    console.warn('Načtení POS provozu selhalo:', e)
    posSales.value = []
  }
}

// API režim: tenant-scoped agregace na backendu (5 malých paralelních dotazů). Nestahuje celý
// seznam faktur do prohlížeče — metriky/řadu/recent počítá DB. Částky all-time (široký rozsah),
// aby odpovídaly původnímu zobrazení; čísla už nejsou omezená stropem stránky (pageSize 100).
async function loadFromApi(): Promise<void> {
  const today = new Date()
  const toISO = today.toISOString().slice(0, 10)
  const revFromISO = new Date(today.getFullYear(), today.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10)

  interface SummaryDto {
    totalInvoiced: number
    totalPaid: number
    paidCount: number
    overdueCount: number
    overdueAmount: number
  }
  interface RevenueDto {
    series: { periodStart: string; invoicedAmount: number }[]
  }
  interface RecentInvoiceDto {
    id: string
    number: string | null
    clientName: string
    status: string
    issueDate: string | null
    total: number
  }
  interface RecentClientDto {
    id: string
    name: string
    email: string | null
  }

  const [count, summary, rev, recInv, recCli] = await Promise.all([
    http.get<{ total: number }>('/invoices?pageSize=1'),
    http.get<SummaryDto>(`/dashboard/summary?from=2000-01-01&to=${toISO}`),
    http.get<RevenueDto>(`/dashboard/revenue?from=${revFromISO}&to=${toISO}&granularity=Month`),
    http.get<RecentInvoiceDto[]>('/dashboard/recent-invoices?limit=5'),
    http.get<RecentClientDto[]>('/dashboard/recent-clients?limit=5'),
  ])

  stats.value = {
    count: count.total,
    billed: summary.totalInvoiced,
    paidAmount: summary.totalPaid,
    paidCount: summary.paidCount,
    overdueAmount: summary.overdueAmount,
    overdueCount: summary.overdueCount,
  }
  revenue.value = rev.series.map((b) => ({
    label: CZ_MONTHS[new Date(b.periodStart).getMonth()],
    total: b.invoicedAmount,
  }))
  recentInvoices.value = recInv.map((i) => ({
    id: i.id,
    invoiceNumber: i.number,
    clientName: i.clientName,
    issueDate: i.issueDate ?? '',
    total: i.total,
    status: i.status,
  }))
  // Backend recent-clients vrací e-mail (ne město/IČO) → subtitle padá zpět na e-mail.
  recentClients.value = recCli.map((c) => ({
    id: c.id,
    name: c.name,
    city: null,
    ico: null,
    email: c.email,
  }))
}

// Mock režim (bez backendu): počítá z localStorage seznamů (vývoj / demo). Logika beze změny.
async function loadFromMock(): Promise<void> {
  const { invoices, load: loadInvoices } = useInvoices()
  const { clients, load: loadClients } = useClients()
  await Promise.all([loadInvoices(), loadClients()])

  const todayISO = new Date().toISOString().slice(0, 10)
  // Zálohové (proforma) jsou nedaňové doklady — nepatří do tržeb ani počtu. Dobropisy zůstávají
  // (jejich záporný total správně sníží billed). V API režimu totéž řeší backend /dashboard/summary.
  const taxDocs = invoices.value.filter((inv) => inv.documentType !== 'proforma')
  let billed = 0
  let paidAmount = 0
  let overdueAmount = 0
  let paidCount = 0
  let overdueCount = 0
  for (const inv of taxDocs) {
    const amount = Number(inv.total) || 0
    if (inv.status !== 'draft' && inv.status !== 'cancelled') billed += amount
    if (inv.status === 'paid') {
      paidCount++
      paidAmount += amount
    } else if (inv.status === 'overdue' || (inv.status === 'issued' && inv.dueDate < todayISO)) {
      overdueCount++
      overdueAmount += amount
    }
  }
  stats.value = {
    count: taxDocs.length,
    billed,
    paidAmount,
    paidCount,
    overdueAmount,
    overdueCount,
  }

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
  for (const inv of taxDocs) {
    if (inv.status === 'draft' || inv.status === 'cancelled') continue
    const d = new Date(inv.issueDate)
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (i !== undefined) buckets[i].total += Number(inv.total) || 0
  }
  revenue.value = buckets.map((b) => ({ label: b.label, total: b.total }))

  recentInvoices.value = [...invoices.value]
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber ?? null,
      clientName: i.clientSnapshot?.name ?? '',
      issueDate: i.issueDate,
      total: Number(i.total) || 0,
      status: i.status,
    }))
  recentClients.value = [...clients.value]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city ?? null,
      ico: c.ico ?? null,
      email: c.email ?? null,
    }))
}

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
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Dnes ve firmě</h1>
        <p class="mt-1 text-muted-foreground">
          {{ companyStore.company?.companyName || 'Vítejte ve Vystaveno' }}
        </p>
      </div>
      <div v-if="hasInvoicing" class="flex flex-wrap gap-2">
        <Button variant="outline" @click="router.push('/app/klienti')">
          <UserPlus class="h-4 w-4" /> Nový klient
        </Button>
        <Button variant="coral" @click="router.push('/app/faktury/editor')">
          <Plus class="h-4 w-4" /> Nová faktura
        </Button>
      </div>
    </div>

    <!-- Výpadek serveru → místo zavádějícího prázdna (0 faktur) ukážeme chybu + retry -->
    <LoadError v-if="loadError && !loading" class="mt-6" :retrying="loading" @retry="loadAll" />

    <template v-else>
      <!-- Metriky faktur — jen s modulem invoicing -->
      <div v-if="hasInvoicing" class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <!-- Graf tržeb (fakturace) — jen s modulem invoicing -->
      <div v-if="hasInvoicing" class="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
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

      <!-- Provoz (pokladna & pobočky) -->
      <div v-if="hasPos" class="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Provoz — pokladna &amp; pobočky
          </h2>
          <RouterLink
            to="/app/konsolidace"
            class="text-xs font-medium text-primary hover:underline"
          >
            Konsolidace
          </RouterLink>
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp class="h-4 w-4" /> POS tržby
            </div>
            <div class="mt-1 text-2xl font-bold">{{ formatCZK(posSummary.totalRevenue) }}</div>
          </div>
          <div>
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart class="h-4 w-4" /> Prodejů
            </div>
            <div class="mt-1 text-2xl font-bold">{{ posSummary.totalSales }}</div>
          </div>
          <div>
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 class="h-4 w-4" /> Poboček
            </div>
            <div class="mt-1 text-2xl font-bold">{{ posSummary.locationCount }}</div>
          </div>
          <div>
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy class="h-4 w-4 text-primary" /> Nejlepší pobočka
            </div>
            <div class="mt-1 truncate text-2xl font-bold">
              {{ posSummary.topLocationName ?? '—' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Poslední faktury + klienti — jen s modulem invoicing -->
      <div v-if="hasInvoicing" class="mt-6 grid gap-4 lg:grid-cols-2">
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
                  {{ inv.clientName || '—' }} · {{ formatDate(inv.issueDate) }}
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
                  {{
                    [c.city, c.ico ? 'IČO ' + c.ico : ''].filter(Boolean).join(' · ') ||
                    c.email ||
                    '—'
                  }}
                </span>
              </span>
            </RouterLink>
          </div>
          <p v-else class="mt-4 text-sm text-muted-foreground">Zatím žádní klienti.</p>
        </div>
      </div>

      <!-- Prázdný stav: tenant bez fakturace a zatím bez POS provozu (aby Přehled nebyl prázdný). -->
      <div
        v-if="!hasInvoicing && !hasPos && !loading"
        class="mt-6 rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground"
      >
        Provozní přehled se naplní, jakmile začnete prodávat v Pokladně nebo Restauraci.
      </div>
    </template>
  </div>
</template>
