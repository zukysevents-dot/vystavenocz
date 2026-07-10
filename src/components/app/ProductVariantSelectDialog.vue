<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Loader2, Scaling } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCZK } from '@/lib/invoice'

export interface SelectableProductVariant {
  id: string
  name: string
  priceWithVat: number
  sortOrder: number
}

const props = defineProps<{
  open: boolean
  productName: string
  variants: SelectableProductVariant[]
  busy?: boolean
  confirmLabel?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [variant: SelectableProductVariant]
}>()

const selectedId = ref<string | null>(null)
const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})
const sortedVariants = computed(() =>
  [...props.variants].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'cs'),
  ),
)
const selected = computed(
  () => sortedVariants.value.find((variant) => variant.id === selectedId.value) ?? null,
)

watch(
  () =>
    [props.open, props.productName, props.variants.map((variant) => variant.id).join('|')] as const,
  ([open]) => {
    if (open) selectedId.value = null
  },
)

function confirm() {
  if (selected.value) emit('confirm', selected.value)
}
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Vybrat porci</DialogTitle>
        <DialogDescription>{{ productName }}</DialogDescription>
      </DialogHeader>

      <div class="grid gap-2">
        <button
          v-for="variant in sortedVariants"
          :key="variant.id"
          type="button"
          class="flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
          :class="
            selectedId === variant.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:border-primary'
          "
          :aria-pressed="selectedId === variant.id"
          @click="selectedId = variant.id"
        >
          <span class="inline-flex min-w-0 items-center gap-2">
            <Check v-if="selectedId === variant.id" class="h-4 w-4 shrink-0" />
            <Scaling v-else class="h-4 w-4 shrink-0 text-muted-foreground" />
            <span class="truncate font-medium">{{ variant.name }}</span>
          </span>
          <span class="shrink-0 font-semibold tabular-nums">{{
            formatCZK(variant.priceWithVat)
          }}</span>
        </button>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" @click="openModel = false">Zrušit</Button>
        <Button variant="coral" :disabled="busy || !selected" @click="confirm">
          <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
          {{ confirmLabel ?? 'Přidat' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
