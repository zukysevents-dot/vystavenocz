<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2, Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { useProductVariants } from '@/composables/useProductVariants'
import { isApiMode } from '@/lib/http'
import type { Product, ProductVariantInput } from '@/lib/types'

type VariantRow = ProductVariantInput & { id: string; salePrice: number | '' }

const props = defineProps<{ open: boolean; product: Product | null }>()
const emit = defineEmits<{ 'update:open': [open: boolean] }>()
const variantsApi = useProductVariants()
const apiMode = isApiMode()
const rows = ref<VariantRow[]>([])
const loading = ref(false)
const saving = ref(false)

function setOpen(open: boolean) {
  emit('update:open', open)
}
function addRow() {
  rows.value.push({
    id: crypto.randomUUID(),
    name: '',
    salePrice: '',
    recipeMultiplier: 1,
    sortOrder: rows.value.length * 10,
  })
}
function removeRow(id: string) {
  rows.value = rows.value.filter((row) => row.id !== id)
}

async function load() {
  if (!props.product || !apiMode) return
  loading.value = true
  try {
    const loaded = await variantsApi.get(props.product.id)
    rows.value = (loaded ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      salePrice: item.salePriceOverride ?? '',
      recipeMultiplier: item.recipeMultiplier,
      sortOrder: item.sortOrder,
    }))
  } catch (error) {
    toast.error('Varianty se nepodařilo načíst.')
    console.error(error)
  } finally {
    loading.value = false
  }
}

async function save() {
  const product = props.product
  if (!product) return
  const names = new Set<string>()
  for (const row of rows.value) {
    const name = row.name.trim().toLocaleLowerCase('cs')
    if (!name || names.has(name) || !(Number(row.recipeMultiplier) > 0)) {
      toast.error('Každá varianta potřebuje jedinečný název a kladný násobek receptury.')
      return
    }
    names.add(name)
  }
  saving.value = true
  try {
    await variantsApi.upsert(
      product.id,
      rows.value.map((row, index) => ({
        name: row.name.trim(),
        salePriceOverride: row.salePrice === '' ? null : Number(row.salePrice),
        recipeMultiplier: Number(row.recipeMultiplier),
        sortOrder: index * 10,
      })),
    )
    toast.success('Varianty uloženy.')
    setOpen(false)
  } catch (error) {
    toast.error('Uložení variant selhalo.')
    console.error(error)
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
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Varianty produktu</DialogTitle>
        <DialogDescription
          >{{ product?.name }} — nastavte cenu a násobek receptury pro jednotlivé
          porce.</DialogDescription
        >
      </DialogHeader>
      <div v-if="!apiMode" class="rounded-md border p-3 text-sm text-muted-foreground">
        Varianty jsou dostupné po přihlášení do online aplikace.
      </div>
      <div v-else-if="loading" class="flex justify-center py-10">
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="row in rows"
          :key="row.id"
          class="grid grid-cols-[1fr_7rem_7rem_2.5rem] items-end gap-2"
        >
          <div>
            <Label :for="`variant-${row.id}`">Název</Label
            ><Input :id="`variant-${row.id}`" v-model="row.name" placeholder="Např. Velká porce" />
          </div>
          <div>
            <Label :for="`price-${row.id}`">Cena</Label
            ><Input
              :id="`price-${row.id}`"
              v-model.number="row.salePrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="Výchozí"
            />
          </div>
          <div>
            <Label :for="`multiplier-${row.id}`">Násobek</Label
            ><Input
              :id="`multiplier-${row.id}`"
              v-model.number="row.recipeMultiplier"
              type="number"
              min="0.001"
              step="0.001"
            />
          </div>
          <Button variant="ghost" size="icon" title="Odebrat variantu" @click="removeRow(row.id)"
            ><Trash2 class="h-4 w-4 text-destructive"
          /></Button>
        </div>
        <Button variant="outline" @click="addRow"><Plus class="h-4 w-4" /> Přidat variantu</Button>
      </div>
      <DialogFooter>
        <Button variant="ghost" @click="setOpen(false)">Zavřít</Button>
        <Button variant="coral" :disabled="!apiMode || saving" @click="save"
          ><Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Uložit varianty</Button
        >
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
