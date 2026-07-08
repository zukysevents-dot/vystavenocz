<script setup lang="ts">
import { computed, ref } from 'vue'
import { BadgePercent, Clock, Crown, Gift, Star } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import {
  calculatePromotions,
  earnLoyaltyPoints,
  redeemLoyaltyPoints,
  type PriceLevel,
  type PromotionLineInput,
  type PromotionRule,
} from '@/lib/promotions'

const priceLevels: PriceLevel[] = [
  { id: 'standard', name: 'Standard', adjustmentPercent: 0 },
  { id: 'vip', name: 'VIP host', adjustmentPercent: -10 },
  { id: 'staff', name: 'Personál', adjustmentPercent: -30 },
]

const rules: PromotionRule[] = [
  {
    id: 'happy-drinks',
    name: 'Happy hour nápoje',
    type: 'percent',
    scope: 'categories',
    categoryIds: ['drinks'],
    percent: 20,
    daysOfWeek: [3],
    startTime: '16:00',
    endTime: '18:00',
    priority: 20,
  },
  {
    id: 'burger-week',
    name: 'Burger week',
    type: 'percent',
    scope: 'products',
    productIds: ['burger'],
    percent: 15,
    priority: 10,
  },
]

const basket: PromotionLineInput[] = [
  { productId: 'beer', categoryId: 'drinks', name: 'Pivo 0,5 l', quantity: 2, unitPrice: 55 },
  { productId: 'burger', categoryId: 'food', name: 'Hovězí burger', quantity: 1, unitPrice: 199 },
]

const selectedPriceLevelId = ref('vip')
const selectedPriceLevel = computed(
  () => priceLevels.find((level) => level.id === selectedPriceLevelId.value) ?? priceLevels[0],
)
const preview = computed(() =>
  calculatePromotions(basket, rules, {
    now: new Date('2026-07-08T16:30:00'),
    priceLevel: selectedPriceLevel.value,
  }),
)
const earnedPoints = computed(() => earnLoyaltyPoints(preview.value.total, { crownsPerPoint: 10 }))
const redeemed = computed(() =>
  redeemLoyaltyPoints(120, preview.value.total, { pointValue: 1, maxDiscountPercent: 20 }),
)

function formatCZK(value: number): string {
  return value.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Akce a ceny</h1>
      <p class="mt-1 text-muted-foreground">
        Model cenových hladin, časových akcí a věrnostních bodů pro pokladnu i restauraci.
      </p>
    </div>

    <div class="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <section class="rounded-xl border border-border bg-card p-5">
        <div class="flex items-center gap-2">
          <Crown class="h-5 w-5 text-primary" />
          <h2 class="font-semibold">Cenová hladina</h2>
        </div>
        <div class="mt-4 grid gap-2">
          <label for="price-level" class="text-sm text-muted-foreground"
            >Náhled pro typ hosta</label
          >
          <select
            id="price-level"
            v-model="selectedPriceLevelId"
            class="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option v-for="level in priceLevels" :key="level.id" :value="level.id">
              {{ level.name }} ({{ level.adjustmentPercent }} %)
            </option>
          </select>
        </div>

        <div class="mt-6 space-y-3">
          <div v-for="rule in rules" :key="rule.id" class="rounded-lg border border-border p-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-medium">{{ rule.name }}</div>
                <div class="mt-1 text-sm text-muted-foreground">
                  {{ rule.type === 'percent' ? `${rule.percent} %` : formatCZK(rule.amount ?? 0) }}
                  · {{ rule.scope === 'categories' ? 'Kategorie' : 'Produkty' }}
                </div>
              </div>
              <Badge variant="outline">
                <Clock v-if="rule.startTime" class="mr-1 h-3 w-3" />
                {{ rule.startTime ? `${rule.startTime}-${rule.endTime}` : 'Stále' }}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-border bg-card p-5">
        <div class="flex items-center gap-2">
          <BadgePercent class="h-5 w-5 text-primary" />
          <h2 class="font-semibold">Simulace účtu</h2>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[560px] text-sm">
            <thead class="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th class="py-2 text-left">Položka</th>
                <th class="py-2 text-right">Původně</th>
                <th class="py-2 text-right">Po hladině</th>
                <th class="py-2 text-right">Finálně</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in preview.lines"
                :key="`${line.productId}-${line.name}`"
                class="border-b last:border-0"
              >
                <td class="py-3">
                  <div class="font-medium">{{ line.name }}</div>
                  <div v-if="line.discounts.length" class="mt-1 text-xs text-primary">
                    {{ line.discounts.map((d) => `${d.name} −${formatCZK(d.amount)}`).join(', ') }}
                  </div>
                </td>
                <td class="py-3 text-right">{{ formatCZK(line.originalTotal) }}</td>
                <td class="py-3 text-right">{{ formatCZK(line.priceLevelTotal) }}</td>
                <td class="py-3 text-right font-semibold">{{ formatCZK(line.finalTotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-xs text-muted-foreground">Před akcemi</div>
            <div class="mt-1 font-semibold">{{ formatCZK(preview.subtotalOriginal) }}</div>
          </div>
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-xs text-muted-foreground">Sleva celkem</div>
            <div class="mt-1 font-semibold text-primary">
              −{{ formatCZK(preview.discountTotal) }}
            </div>
          </div>
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-xs text-muted-foreground">K úhradě</div>
            <div class="mt-1 font-semibold">{{ formatCZK(preview.total) }}</div>
          </div>
        </div>
      </section>
    </div>

    <section class="mt-4 rounded-xl border border-border bg-card p-5">
      <div class="flex items-center gap-2">
        <Gift class="h-5 w-5 text-primary" />
        <h2 class="font-semibold">Věrnostní body</h2>
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-border p-4">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Star class="h-4 w-4" /> Body za aktuální účet
          </div>
          <div class="mt-1 text-2xl font-bold">{{ earnedPoints }}</div>
        </div>
        <div class="rounded-lg border border-border p-4">
          <div class="text-sm text-muted-foreground">Uplatnění 120 bodů, max 20 % účtu</div>
          <div class="mt-1 text-2xl font-bold">−{{ formatCZK(redeemed.discountAmount) }}</div>
          <div class="mt-1 text-xs text-muted-foreground">
            Použito {{ redeemed.pointsUsed }} bodů
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
