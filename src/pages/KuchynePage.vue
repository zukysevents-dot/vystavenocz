<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChefHat, Clock, Play, Check, UtensilsCrossed } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useKitchen } from '@/composables/useKitchen'
import { isApiMode } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import type { CategoryKitchenSection, KitchenQueueItem, KitchenStatus } from '@/lib/types'

const kitchen = useKitchen()
const apiMode = isApiMode()

const items = ref<KitchenQueueItem[]>([])
const section = ref<CategoryKitchenSection>('None') // 'None' = vše
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

const SECTIONS: { value: CategoryKitchenSection; label: string }[] = [
  { value: 'None', label: 'Vše' },
  { value: 'Kitchen', label: 'Kuchyně' },
  { value: 'Bar', label: 'Bar' },
]

const NEXT: Record<string, { status: KitchenStatus; label: string }> = {
  Sent: { status: 'Preparing', label: 'Začít' },
  Preparing: { status: 'Ready', label: 'Hotovo' },
  Ready: { status: 'Served', label: 'Vydat' },
}

const columns = computed(() => [
  { key: 'Sent', title: 'Nové', items: items.value.filter((i) => i.kitchenStatus === 'Sent') },
  {
    key: 'Preparing',
    title: 'Připravuje se',
    items: items.value.filter((i) => i.kitchenStatus === 'Preparing'),
  },
  {
    key: 'Ready',
    title: 'Hotové k výdeji',
    items: items.value.filter((i) => i.kitchenStatus === 'Ready'),
  },
])

async function refresh() {
  if (!apiMode) return
  try {
    items.value = await kitchen.queue(section.value)
    now.value = Date.now()
  } catch (e) {
    console.error(e)
  }
}

async function advance(item: KitchenQueueItem) {
  const next = NEXT[item.kitchenStatus]
  if (!next) return
  try {
    await kitchen.setStatus(item.itemId, next.status)
    await refresh()
  } catch (e) {
    toast.error('Změna stavu selhala.')
    console.error(e)
  }
}

function minutesSince(iso: string | null): number {
  if (!iso) return 0
  return Math.max(0, Math.floor((now.value - new Date(iso).getTime()) / 60000))
}

watch(section, refresh)

onMounted(() => {
  if (!apiMode) return
  refresh()
  timer = setInterval(refresh, 5000) // živé obnovování fronty
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="p-4 sm:p-6">
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <ChefHat class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Kuchyně potřebuje připojení k serveru</p>
    </div>

    <template v-else>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Kuchyně</h1>
          <p class="text-sm text-muted-foreground">Objednávky z účtů — obnovuje se automaticky.</p>
        </div>
        <div class="flex gap-2">
          <button
            v-for="s in SECTIONS"
            :key="s.value"
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              section === s.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            "
            @click="section = s.value"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div
        v-if="!items.length"
        class="flex flex-col items-center rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground"
      >
        <UtensilsCrossed class="h-10 w-10" />
        <p class="mt-3 font-semibold text-foreground">Kuchyně je prázdná</p>
        <p class="mt-1 text-sm">Nové objednávky se tu objeví automaticky.</p>
      </div>

      <div v-else class="grid gap-4 md:grid-cols-3">
        <div v-for="col in columns" :key="col.key" class="rounded-2xl border border-border bg-card">
          <div class="flex items-center justify-between border-b border-border p-3 font-semibold">
            {{ col.title }}
            <span class="rounded-full bg-muted px-2 py-0.5 text-xs">{{ col.items.length }}</span>
          </div>
          <div class="space-y-2 p-3">
            <div
              v-for="item in col.items"
              :key="item.itemId"
              class="rounded-xl border border-border p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-semibold">{{ item.quantity }}× {{ item.productName }}</div>
                  <div class="text-xs text-muted-foreground">
                    {{ item.tableName ?? 'Bez stolu' }}
                    <span v-if="item.note"> • {{ item.note }}</span>
                  </div>
                </div>
                <span
                  class="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium"
                  :class="
                    minutesSince(item.sentToKitchenAt) >= 15
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  "
                >
                  <Clock class="h-3 w-3" /> {{ minutesSince(item.sentToKitchenAt) }}′
                </span>
              </div>
              <Button
                :variant="item.kitchenStatus === 'Ready' ? 'coral' : 'outline'"
                size="sm"
                class="mt-2 w-full"
                @click="advance(item)"
              >
                <Play v-if="item.kitchenStatus === 'Sent'" class="h-4 w-4" />
                <Check v-else class="h-4 w-4" />
                {{ NEXT[item.kitchenStatus]?.label }}
              </Button>
            </div>
            <p v-if="!col.items.length" class="py-4 text-center text-xs text-muted-foreground">—</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
