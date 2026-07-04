<script setup lang="ts">
import { onMounted } from 'vue'
import {
  Receipt,
  ShoppingCart,
  TrendingUp,
  Banknote,
  CreditCard,
  HandCoins,
  Loader2,
  Info,
} from 'lucide-vue-next'
import { formatCZK } from '@/lib/invoice'
import { useSalesReport } from '@/composables/useSalesReport'
import LoadError from '@/components/app/LoadError.vue'

const { loading, error, summary, vatBreakdown, topProducts, byCategory, reload } = useSalesReport()

onMounted(reload)
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Uzávěrka</h1>
      <p class="mt-1 text-muted-foreground">Přehled dnešních tržeb na jednom místě.</p>
    </div>

    <!-- Orientační upozornění: zdroj jsou poslední účtenky, ne uzávěrka „zavřením dne". -->
    <div
      class="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
    >
      <Info class="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Přehled je zatím <strong class="font-medium text-foreground">orientační</strong> — počítá se
        z posledních 50 účtenek. Přesná uzávěrka přijde se „zavřením dne".
      </span>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="error" class="mt-6" @retry="reload" />

    <template v-else>
      <!-- KPI dlaždice -->
      <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShoppingCart class="h-4 w-4" /> Účtenek
          </div>
          <div class="mt-1 text-2xl font-bold">{{ summary.count }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Receipt class="h-4 w-4" /> Průměrný účet
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.avgSale) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUp class="h-4 w-4 text-primary" /> Tržba celkem
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.total) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Banknote class="h-4 w-4" /> Hotovost
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.cashTotal) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CreditCard class="h-4 w-4" /> Karta
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.cardTotal) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
            <HandCoins class="h-4 w-4" /> Spropitné
          </div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.tipTotal) }}</div>
        </div>
      </div>

      <!-- Rozpad DPH -->
      <h2 class="mt-8 text-lg font-semibold">Rozpad DPH</h2>
      <div
        v-if="vatBreakdown.length === 0"
        class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Zatím žádné položky pro rozpad DPH.
      </div>
      <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full min-w-[480px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Sazba</th>
              <th class="px-4 py-3 text-right">Základ</th>
              <th class="px-4 py-3 text-right">DPH</th>
              <th class="px-4 py-3 text-right">Vč. DPH</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in vatBreakdown"
              :key="r.vatRate"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ r.vatRate }} %</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(r.net) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(r.vat) }}</td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">
                {{ formatCZK(r.gross) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t border-border bg-muted/20 font-semibold">
            <tr>
              <td class="px-4 py-3">Celkem</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(summary.totalNet) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(summary.totalVat) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatCZK(summary.total) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Storna + slevy -->
      <h2 class="mt-8 text-lg font-semibold">Storna & slevy</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Stornovaných účtenek</div>
          <div class="mt-1 text-2xl font-bold">{{ summary.cancelledCount }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Hodnota storn</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.cancelledTotal) }}</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-sm text-muted-foreground">Slevy na účet</div>
          <div class="mt-1 text-2xl font-bold">{{ formatCZK(summary.discountTotal) }}</div>
        </div>
      </div>

      <!-- Top produkty -->
      <h2 class="mt-8 text-lg font-semibold">Top produkty</h2>
      <div
        v-if="topProducts.length === 0"
        class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Zatím žádné prodané položky.
      </div>
      <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full min-w-[480px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Produkt</th>
              <th class="px-4 py-3 text-right">Množství</th>
              <th class="px-4 py-3 text-right">Tržba</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in topProducts"
              :key="p.productId ?? 'unknown'"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ p.name }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {{ p.quantity }}
              </td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">
                {{ formatCZK(p.revenueGross) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tržby po kategoriích -->
      <h2 class="mt-8 text-lg font-semibold">Tržby po kategoriích</h2>
      <div
        v-if="byCategory.length === 0"
        class="mt-3 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
      >
        Zatím žádné tržby podle kategorií.
      </div>
      <div v-else class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full min-w-[480px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Kategorie</th>
              <th class="px-4 py-3 text-right">Množství</th>
              <th class="px-4 py-3 text-right">Tržba</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in byCategory"
              :key="c.categoryName"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ c.categoryName }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {{ c.quantity }}
              </td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">
                {{ formatCZK(c.revenueGross) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
