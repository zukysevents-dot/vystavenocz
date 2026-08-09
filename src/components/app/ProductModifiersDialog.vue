<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, SlidersHorizontal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useModifierGroups } from '@/composables/useModifierGroups'
import { formatCZK } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type { ModifierGroup, Product } from '@/lib/types'

const props = defineProps<{
  open: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const api = useModifierGroups()
const loading = ref(false)
const saving = ref(false)
const groups = ref<ModifierGroup[]>([])
const selected = ref<Set<string>>(new Set())

const sortedGroups = computed(() =>
  [...groups.value].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'cs')),
)

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

watch(
  () => [props.open, props.product?.id] as const,
  async ([open, productId]) => {
    if (!open || !productId) return
    loading.value = true
    selected.value = new Set()
    try {
      const [allGroups, assignedGroups] = await Promise.all([
        api.list(),
        api.listForProduct(productId),
      ])
      groups.value = allGroups
      selected.value = new Set(assignedGroups.map((group) => group.id))
    } catch (e) {
      toast.error('Volby k produktu se nepodařilo načíst.')
      console.error(e)
    } finally {
      loading.value = false
    }
  },
)

function toggleGroup(groupId: string, checked: boolean | 'indeterminate') {
  const next = new Set(selected.value)
  if (checked === true) next.add(groupId)
  else next.delete(groupId)
  selected.value = next
}

function toggleGroupRow(groupId: string) {
  toggleGroup(groupId, !selected.value.has(groupId))
}

function onGroupChecked(groupId: string) {
  return (checked: boolean | 'indeterminate') => toggleGroup(groupId, checked)
}

async function save() {
  if (!props.product) return
  saving.value = true
  const assigned = sortedGroups.value
    .filter((group) => selected.value.has(group.id))
    .map((group, index) => ({ modifierGroupId: group.id, sortOrder: index }))
  try {
    await api.assignToProduct(props.product.id, { groups: assigned })
    toast.success('Volby k produktu byly uloženy.')
    openModel.value = false
  } catch (e) {
    toast.error('Volby k produktu se nepodařilo uložit.')
    console.error(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="max-h-[90vh] max-w-xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Volby k produktu</DialogTitle>
        <DialogDescription>
          {{ product ? `Skupiny nabízené u produktu ${product.name}.` : 'Vyberte produkt.' }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="loading" class="flex justify-center py-10">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div
        v-else-if="sortedGroups.length === 0"
        class="rounded-lg border border-dashed p-6 text-center"
      >
        <SlidersHorizontal class="mx-auto h-8 w-8 text-muted-foreground" />
        <p class="mt-3 font-medium">Zatím nejsou založené žádné skupiny.</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Nejdřív je vytvořte v sekci Volby k produktům.
        </p>
      </div>
      <div v-else class="space-y-3">
        <label
          v-for="group in sortedGroups"
          :key="group.id"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/40"
          @click="toggleGroupRow(group.id)"
        >
          <Checkbox
            :model-value="selected.has(group.id)"
            :aria-label="`Volba ${group.name}`"
            class="mt-1"
            @click.stop
            @update:model-value="onGroupChecked(group.id)"
          />
          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-2">
              <span class="font-semibold">{{ group.name }}</span>
              <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {{ group.selectionType === 'Single' ? 'Vybere se jedna' : 'Lze vybrat více' }}
              </span>
              <span
                v-if="group.isRequired"
                class="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary"
              >
                Povinná
              </span>
            </span>
            <span class="mt-2 block text-sm text-muted-foreground">
              <template v-if="group.options.length">
                {{
                  group.options
                    .map((option) =>
                      option.priceDelta
                        ? `${option.name} (+${formatCZK(option.priceDelta)})`
                        : option.name,
                    )
                    .join(', ')
                }}
              </template>
              <template v-else>Bez voleb.</template>
            </span>
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" @click="openModel = false">Zrušit</Button>
        <Button variant="coral" :disabled="saving || loading || !product" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Uložit
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
