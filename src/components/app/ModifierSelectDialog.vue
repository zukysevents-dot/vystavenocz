<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Loader2, SlidersHorizontal } from 'lucide-vue-next'
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
import { toast } from '@/components/ui/sonner'
import type { ModifierGroup, ModifierOption } from '@/lib/types'

interface ModifierDialogProduct {
  id: string
  name: string
  salePrice: number
}

const props = defineProps<{
  open: boolean
  product: ModifierDialogProduct | null
  groups: ModifierGroup[]
  busy?: boolean
  confirmLabel?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [modifierOptionIds: string[]]
}>()

const selectedByGroup = ref<Record<string, string[]>>({})

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const sortedGroups = computed(() =>
  [...props.groups].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'cs')),
)

const optionById = computed(() => {
  const map = new Map<string, ModifierOption>()
  for (const group of props.groups) {
    for (const option of group.options) map.set(option.id, option)
  }
  return map
})

const selectedIds = computed(() => Object.values(selectedByGroup.value).flat())
const priceDelta = computed(() =>
  selectedIds.value.reduce((sum, id) => sum + (optionById.value.get(id)?.priceDelta ?? 0), 0),
)
const totalPrice = computed(() => (props.product?.salePrice ?? 0) + priceDelta.value)

const validationError = computed(() => {
  for (const group of sortedGroups.value) {
    const selected = selectedByGroup.value[group.id] ?? []
    if (group.isRequired && selected.length === 0) return `Vyberte volbu ve skupině ${group.name}.`
    if (group.selectionType === 'Single' && selected.length > 1)
      return `Ve skupině ${group.name} lze vybrat jen jednu volbu.`
    if (group.selectionType === 'Multi' && group.maxSelect && selected.length > group.maxSelect) {
      return `Ve skupině ${group.name} lze vybrat nejvýš ${group.maxSelect} voleb.`
    }
  }
  return null
})

watch(
  () => [props.open, props.product?.id, props.groups.map((group) => group.id).join('|')] as const,
  ([open]) => {
    if (!open) return
    selectedByGroup.value = Object.fromEntries(props.groups.map((group) => [group.id, []]))
  },
)

function isSelected(groupId: string, optionId: string): boolean {
  return (selectedByGroup.value[groupId] ?? []).includes(optionId)
}

function toggleOption(group: ModifierGroup, option: ModifierOption) {
  const selected = selectedByGroup.value[group.id] ?? []
  let next: string[]

  if (group.selectionType === 'Single') {
    next = selected.includes(option.id) && !group.isRequired ? [] : [option.id]
  } else if (selected.includes(option.id)) {
    next = selected.filter((id) => id !== option.id)
  } else {
    const max = group.maxSelect
    if (max && selected.length >= max) {
      toast.info(`Ve skupině ${group.name} lze vybrat nejvýš ${max} voleb.`)
      return
    }
    next = [...selected, option.id]
  }

  selectedByGroup.value = { ...selectedByGroup.value, [group.id]: next }
}

function confirm() {
  if (validationError.value) {
    toast.error(validationError.value)
    return
  }
  emit('confirm', selectedIds.value)
}
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="max-h-[90vh] max-w-xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Vybrat možnosti</DialogTitle>
        <DialogDescription>
          {{ product ? product.name : 'Položka' }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="!sortedGroups.length" class="rounded-lg border border-dashed p-6 text-center">
        <SlidersHorizontal class="mx-auto h-8 w-8 text-muted-foreground" />
        <p class="mt-3 text-sm text-muted-foreground">Tato položka nemá žádné další možnosti.</p>
      </div>

      <div v-else class="space-y-4">
        <section
          v-for="group in sortedGroups"
          :key="group.id"
          class="rounded-lg border border-border p-3"
        >
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <h3 class="font-semibold">{{ group.name }}</h3>
            <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {{ group.selectionType === 'Single' ? 'Vyberte jednu' : 'Můžete vybrat více' }}
            </span>
            <span
              v-if="group.isRequired"
              class="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary"
            >
              Povinná
            </span>
            <span
              v-if="group.selectionType === 'Multi' && group.maxSelect"
              class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              nejvýše {{ group.maxSelect }}
            </span>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <button
              v-for="option in group.options"
              :key="option.id"
              type="button"
              class="flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
              :class="
                isSelected(group.id, option.id)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:border-primary'
              "
              :aria-pressed="isSelected(group.id, option.id)"
              @click="toggleOption(group, option)"
            >
              <span class="inline-flex min-w-0 items-center gap-2">
                <Check v-if="isSelected(group.id, option.id)" class="h-4 w-4 shrink-0" />
                <span class="truncate font-medium">{{ option.name }}</span>
              </span>
              <span
                v-if="option.priceDelta"
                class="shrink-0 text-xs font-semibold tabular-nums"
                :class="
                  isSelected(group.id, option.id) ? 'text-primary-foreground/90' : 'text-primary'
                "
              >
                {{ option.priceDelta > 0 ? '+' : '' }}{{ formatCZK(option.priceDelta) }}
              </span>
            </button>
          </div>
        </section>
      </div>

      <div class="rounded-lg bg-muted/60 px-3 py-2 text-sm">
        <div class="flex items-center justify-between">
          <span class="text-muted-foreground">Cena položky</span>
          <span class="font-semibold tabular-nums">{{ formatCZK(totalPrice) }}</span>
        </div>
        <p v-if="validationError" class="mt-1 text-xs text-destructive">{{ validationError }}</p>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" @click="openModel = false">Zrušit</Button>
        <Button variant="coral" :disabled="busy || !!validationError" @click="confirm">
          <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
          {{ confirmLabel ?? 'Přidat na účet' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
