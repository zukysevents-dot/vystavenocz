<script setup lang="ts">
// Jednotný tok placení (Pokladna, Restaurace, split): volba Hotově/Kartou →
// hotovost = zadání přijaté částky s výpočtem vrácení, karta = terminálový krok.
// Terminál zatím není propojený — obsluha zadá částku na terminálu ručně a potvrdí
// výsledek; Sale vzniká až po potvrzení (žádná platba se nezapíše předem).
import { computed, ref, watch } from 'vue'
import { ArrowLeft, Banknote, Check, CreditCard, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cashChange, suggestedCashAmounts } from '@/lib/payment'
import { formatCZK } from '@/lib/invoice'
import type { PaymentMethod } from '@/lib/types'

const props = defineProps<{
  open: boolean
  /** Částka k úhradě (po slevě, včetně spropitného). */
  total: number
  /** Kontext pro obsluhu — např. „Stůl 4" nebo osoba z rozdělení účtu. */
  label?: string
  /** Probíhá odeslání platby na server. */
  busy?: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  /** Obsluha potvrdila platbu; cashReceived jen u hotovosti se zadanou částkou. */
  confirm: [payment: { method: PaymentMethod; cashReceived: number | null }]
}>()

const step = ref<'method' | 'cash' | 'card'>('method')
const received = ref<number | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open) {
      step.value = 'method'
      received.value = null
    }
  },
)

const quickAmounts = computed(() => suggestedCashAmounts(props.total))
const change = computed(() =>
  typeof received.value === 'number' ? cashChange(props.total, received.value) : null,
)
const cashReady = computed(() => change.value !== null && change.value >= 0)

function pickAmount(amount: number) {
  received.value = amount
}

function confirmCash() {
  if (!cashReady.value || props.busy) return
  emit('confirm', { method: 'Cash', cashReceived: received.value })
}

function confirmCard() {
  if (props.busy) return
  emit('confirm', { method: 'Card', cashReceived: null })
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Platba{{ label ? ` — ${label}` : '' }}</DialogTitle>
        <DialogDescription>Vyberte způsob platby a dokončete účet.</DialogDescription>
      </DialogHeader>

      <div class="rounded-xl bg-muted p-4 text-center">
        <div class="text-sm text-muted-foreground">K úhradě</div>
        <div class="text-3xl font-bold tabular-nums">{{ formatCZK(total) }}</div>
      </div>

      <!-- Krok 1: způsob platby -->
      <div v-if="step === 'method'" class="grid grid-cols-2 gap-2">
        <Button variant="coral" size="lg" class="h-16 flex-col gap-1" @click="step = 'cash'">
          <Banknote class="h-5 w-5" /> Hotově
        </Button>
        <Button variant="outline" size="lg" class="h-16 flex-col gap-1" @click="step = 'card'">
          <CreditCard class="h-5 w-5" /> Kartou
        </Button>
      </div>

      <!-- Krok 2a: hotovost — přijatá částka + vrácení -->
      <div v-else-if="step === 'cash'" class="space-y-3">
        <div class="flex flex-wrap gap-1.5">
          <Button
            v-for="amount in quickAmounts"
            :key="amount"
            type="button"
            variant="outline"
            size="sm"
            :class="received === amount ? 'border-primary bg-primary-soft' : ''"
            @click="pickAmount(amount)"
          >
            {{ formatCZK(amount) }}
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">Přijato</span>
          <Input
            :model-value="received ?? undefined"
            type="number"
            min="0"
            inputmode="decimal"
            class="h-10 flex-1 text-right text-base"
            aria-label="Přijatá hotovost v Kč"
            @update:model-value="
              (v) => {
                const n = typeof v === 'number' ? v : v ? Number(v) : NaN
                received = Number.isFinite(n) ? n : null
              }
            "
          />
          <span class="text-sm text-muted-foreground">Kč</span>
        </div>
        <div
          v-if="change !== null"
          class="flex items-center justify-between rounded-lg border border-border px-3 py-2"
        >
          <span class="text-sm text-muted-foreground">{{ change >= 0 ? 'Vrátit' : 'Chybí' }}</span>
          <span
            class="text-xl font-bold tabular-nums"
            :class="change >= 0 ? 'text-primary' : 'text-destructive'"
          >
            {{ formatCZK(Math.abs(change)) }}
          </span>
        </div>
        <div class="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="ghost" :disabled="busy" @click="step = 'method'">
            <ArrowLeft class="h-4 w-4" /> Zpět
          </Button>
          <Button variant="coral" :disabled="busy || !cashReady" @click="confirmCash">
            <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
            <Check v-else class="h-4 w-4" /> Zaplatit hotově
          </Button>
        </div>
      </div>

      <!-- Krok 2b: karta — terminálový krok (zatím ruční potvrzení výsledku) -->
      <div v-else class="space-y-3">
        <div class="rounded-lg border border-border p-3 text-sm">
          <p>Zadejte {{ formatCZK(total) }} na platebním terminálu a dokončete platbu.</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Terminál zatím není propojený — potvrďte výsledek platby ručně.
          </p>
        </div>
        <div class="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="ghost" :disabled="busy" @click="step = 'method'">
            <ArrowLeft class="h-4 w-4" /> Zpět
          </Button>
          <Button variant="coral" :disabled="busy" @click="confirmCard">
            <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
            <Check v-else class="h-4 w-4" /> Platba prošla
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
