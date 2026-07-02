<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Heart, UserCheck, Moon, Mail, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInvoices } from '@/composables/useInvoices'
import LoadError from '@/components/app/LoadError.vue'
import { formatCZK, formatDate } from '@/lib/invoice'
import {
  buildCustomerStats,
  summarize,
  winBack,
  topCustomers,
  buildWinBackEmail,
  outreachMailto,
  segmentLabel,
  type CustomerStat,
  type Segment,
} from '@/lib/loyalty'

const { invoices, loadError, load } = useInvoices()
const loading = ref(true)
const today = new Date()

async function reload(): Promise<void> {
  loading.value = true
  await load()
  loading.value = false
}
onMounted(reload)

const stats = computed(() => buildCustomerStats(invoices.value, today))
const summary = computed(() => summarize(stats.value))
const winBackList = computed(() => winBack(stats.value))
const top = computed(() => topCustomers(stats.value, 10))

const segmentVariant: Record<Segment, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'outline',
  at_risk: 'secondary',
  dormant: 'destructive',
}

function reachOut(stat: CustomerStat) {
  window.location.href = outreachMailto(buildWinBackEmail(stat))
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Věrnost &amp; návraty</h1>
      <p class="mt-1 text-muted-foreground">Kdo se vrací, kdo usíná a koho oslovit, ať se vrátí.</p>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <div
      v-else-if="stats.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Heart class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Zatím žádní zákazníci</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Až vystavíš první faktury, uvidíš tu segmentaci i návraty.
      </p>
    </div>

    <template v-else>
      <!-- Souhrn -->
      <div class="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Zákazníků</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.customers }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCheck class="h-4 w-4 text-primary" /> Aktivní
          </div>
          <div class="mt-1 text-2xl font-bold">{{ summary.active }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Moon class="h-4 w-4 text-destructive" /> Spící
          </div>
          <div class="mt-1 text-2xl font-bold text-destructive">{{ summary.dormant }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Celkový obrat</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.totalRevenue) }}</div>
        </div>
      </div>

      <!-- Win-back -->
      <div class="mt-8 flex items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold">Návraty (win-back)</h2>
        <span class="text-sm text-muted-foreground">Spící zákazníci podle obratu</span>
      </div>

      <div
        v-if="winBackList.length === 0"
        class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Žádní spící zákazníci — všichni nakupují. 🎉
      </div>

      <template v-else>
        <!-- Mobil -->
        <div class="mt-3 space-y-3 sm:hidden">
          <div
            v-for="c in winBackList"
            :key="c.key"
            class="rounded-xl border border-border bg-card p-4"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="truncate font-semibold">{{ c.name }}</div>
                <div class="mt-0.5 text-xs text-muted-foreground">
                  Naposledy {{ formatDate(c.lastPurchase || '') }} · {{ c.daysSince }} dní
                </div>
              </div>
              <span class="shrink-0 font-semibold">{{ formatCZK(c.revenue) }}</span>
            </div>
            <div class="mt-3 flex justify-end border-t border-border pt-2">
              <Button
                variant="ghost"
                size="sm"
                :disabled="!c.email"
                :title="c.email ? 'Oslovit e-mailem' : 'Zákazník nemá e-mail'"
                @click="reachOut(c)"
              >
                <Mail class="h-4 w-4" /> Oslovit
              </Button>
            </div>
          </div>
        </div>

        <!-- Desktop -->
        <div class="mt-3 hidden overflow-x-auto rounded-xl border border-border bg-card sm:block">
          <table class="w-full min-w-[640px] text-sm">
            <thead
              class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
            >
              <tr>
                <th class="px-4 py-3 text-left">Zákazník</th>
                <th class="px-4 py-3 text-left">Naposledy</th>
                <th class="px-4 py-3 text-center">Faktur</th>
                <th class="px-4 py-3 text-right">Obrat</th>
                <th class="px-4 py-3 text-right">Oslovit</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in winBackList"
                :key="c.key"
                class="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td class="px-4 py-3 font-medium">{{ c.name }}</td>
                <td class="px-4 py-3 text-muted-foreground">
                  {{ formatDate(c.lastPurchase || '') }}
                  <span class="text-xs">· {{ c.daysSince }} dní</span>
                </td>
                <td class="px-4 py-3 text-center text-muted-foreground">{{ c.invoiceCount }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatCZK(c.revenue) }}</td>
                <td class="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    :disabled="!c.email"
                    :title="c.email ? 'Oslovit e-mailem' : 'Zákazník nemá e-mail'"
                    @click="reachOut(c)"
                  >
                    <Mail class="h-4 w-4" /> Oslovit
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- Top zákazníci -->
      <h2 class="mt-8 text-lg font-semibold">Top zákazníci</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="c in top" :key="c.key" class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="truncate font-semibold">{{ c.name }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">
                {{ c.invoiceCount }} {{ c.invoiceCount === 1 ? 'faktura' : 'faktur' }}
              </div>
            </div>
            <Badge :variant="segmentVariant[c.segment]" class="shrink-0">
              {{ segmentLabel(c.segment) }}
            </Badge>
          </div>
          <div class="mt-2 text-lg font-bold">{{ formatCZK(c.revenue) }}</div>
        </div>
      </div>
    </template>
  </div>
</template>
