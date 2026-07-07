<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { useModifierGroups } from '@/composables/useModifierGroups'
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import type { ModifierGroup, ModifierOption, Product } from '@/lib/types'

const props = defineProps<{
  open: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const groupsApi = useModifierGroups()
const apiMode = isApiMode()

const allGroups = ref<ModifierGroup[]>([])
const selectedIds = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)

function setOpen(open: boolean) {
  emit('update:open', open)
}

function toggle(id: string) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((x) => x !== id)
    : [...selectedIds.value, id]
}

function optionLabel(option: ModifierOption): string {
  if (option.priceDelta === 0) return option.name
  const sign = option.priceDelta > 0 ? '+' : ''
  return `${option.name} (${sign}${formatCZK(option.priceDelta)})`
}

async function load() {
  const product = props.product
  if (!product || !apiMode) {
    allGroups.value = []
    selectedIds.value = []
    return
  }

  loading.value = true
  try {
    const [all, assigned] = await Promise.all([
      groupsApi.list(),
      groupsApi.listForProduct(product.id),
    ])
    allGroups.value = all
    selectedIds.value = assigned.map((g) => g.id)
  } catch (e) {
    toast.error('Skupiny modifikátorů se nepodařilo načíst.')
    console.error(e)
    allGroups.value = []
    selectedIds.value = []
  } finally {
    loading.value = false
  }
}

async function save() {
  const product = props.product
  if (!product) return

  saving.value = true
  try {
    // Pořadí u produktu = pořadí skupin v katalogu (stabilní), jen pro zaškrtnuté.
    let order = 0
    const groups = allGroups.value
      .filter((g) => selectedIds.value.includes(g.id))
      .map((g) => ({ modifierGroupId: g.id, sortOrder: order++ }))
    await groupsApi.assignToProduct(product.id, groups)
    toast.success('Přiřazení modifikátorů uloženo.')
    setOpen(false)
  } catch (e) {
    toast.error('Uložení přiřazení selhalo.')
    console.error(e)
  } finally {
    saving.value = false
  }
}

watch(
  () => [props.open, props.product?.id] as const,
  ([open]) => {
    if (open) void load()
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="setOpen">
    <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Modifikátory produktu</DialogTitle>
        <DialogDescription>
          {{ product?.name }} — vyberte skupiny voleb, které se u tohoto produktu nabídnou při
          objednávce.
        </DialogDescription>
      </DialogHeader>

      <div
        v-if="!apiMode"
        class="rounded-lg border border-border p-4 text-sm text-muted-foreground"
      >
        Modifikátory jsou dostupné po připojení k API.
      </div>

      <div v-else-if="loading" class="flex justify-center py-10">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <div
        v-else-if="allGroups.length === 0"
        class="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground"
      >
        Zatím nemáte žádné skupiny modifikátorů. Vytvořte je na stránce
        <RouterLink to="/app/modifikatory" class="text-primary underline">Modifikátory</RouterLink>.
      </div>

      <div v-else class="space-y-2">
        <label
          v-for="group in allGroups"
          :key="group.id"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
        >
          <input
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-border"
            :checked="selectedIds.includes(group.id)"
            @change="toggle(group.id)"
          />
          <div class="min-w-0">
            <div class="font-medium">{{ group.name }}</div>
            <div class="truncate text-sm text-muted-foreground">
              {{ group.options.map(optionLabel).join(' · ') || 'Bez voleb' }}
            </div>
          </div>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" @click="setOpen(false)">Zavřít</Button>
        <Button type="button" variant="coral" :disabled="!apiMode || saving" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Uložit
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
