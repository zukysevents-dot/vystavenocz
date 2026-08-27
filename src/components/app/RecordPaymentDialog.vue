<script setup lang="ts">
/**
 * Zaevidování úhrady faktury (VYS-03). Dřív existoval jen jednoklikový „Uhrazeno" v editoru, který
 * zaplatil celou částku bez data, částky i způsobu a nešel vzít zpět. Dialog to nahrazuje:
 * předvyplní ZBÝVAJÍCÍ částku (Enter tedy pokryje dosavadní jednoklik) a přepsáním částky vznikne
 * částečná úhrada. Rozhodnutí o stavu dokladu dělá server — tady se jen posbírá vstup.
 */
import { computed, ref, watch } from 'vue'
import { Check, Loader2 } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { formatCZK } from '@/lib/invoice'

const props = defineProps<{
  open: boolean
  invoiceNumber: string
  /** Zbývající částka k úhradě — předvyplní se do pole. */
  outstanding: number
  total: number
  saving: boolean
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [payment: { amount: number; method: string; paidAt: string; note?: string }]
}>()

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Převodem' },
  { value: 'cash', label: 'Hotově' },
  { value: 'card', label: 'Kartou' },
  { value: 'other', label: 'Jiné' },
] as const

const amount = ref('')
const method = ref<string>('bank_transfer')
const paidAt = ref('')

const alreadyPaid = computed(() => props.total - props.outstanding)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    amount.value = String(props.outstanding)
    method.value = 'bank_transfer'
    // `toISOString()` je UTC — po půlnoci SELČ by nabídl včerejšek. Skládáme lokální datum.
    const now = new Date()
    paidAt.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`
  },
)

function onConfirm(): void {
  const value = Number(amount.value.replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) {
    toast.error('Zadejte částku úhrady větší než nula.')
    return
  }
  if (value > props.outstanding) {
    toast.error(`Částka je vyšší než zbývá uhradit (${formatCZK(props.outstanding)}).`)
    return
  }
  if (!paidAt.value) {
    toast.error('Vyberte datum platby.')
    return
  }
  emit('confirm', { amount: value, method: method.value, paidAt: paidAt.value })
}
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Zaznamenat úhradu</DialogTitle>
        <DialogDescription>
          Faktura {{ invoiceNumber }} — zbývá uhradit
          <strong>{{ formatCZK(outstanding) }}</strong>
          <template v-if="alreadyPaid > 0">
            (z {{ formatCZK(total) }} je uhrazeno {{ formatCZK(alreadyPaid) }}).
          </template>
          <template v-else>. Nižší částkou zaevidujete částečnou úhradu.</template>
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-2">
        <div class="space-y-2">
          <Label for="payment-amount">Částka</Label>
          <Input
            id="payment-amount"
            v-model="amount"
            type="number"
            step="0.01"
            min="0"
            inputmode="decimal"
            @keydown.enter.prevent="onConfirm"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="payment-date">Datum platby</Label>
            <Input id="payment-date" v-model="paidAt" type="date" />
          </div>
          <div class="space-y-2">
            <Label for="payment-method">Způsob úhrady</Label>
            <Select v-model="method">
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in PAYMENT_METHODS" :key="m.value" :value="m.value">
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="ghost" :disabled="saving" @click="emit('update:open', false)">Zpět</Button>
        <Button :disabled="saving" @click="onConfirm">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Check v-else class="h-4 w-4" />
          Zaznamenat úhradu
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
