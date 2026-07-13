<script setup lang="ts">
import { ref } from 'vue'
import { Loader2 } from 'lucide-vue-next'
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
import { useInventory } from '@/composables/useInventory'
import { isApiMode } from '@/lib/http'
import type { Product } from '@/lib/types'

const props = defineProps<{ open: boolean; product: Product | null }>()
const emit = defineEmits<{ 'update:open': [open: boolean]; created: [] }>()
const { createProductionBatch } = useInventory()
const apiMode = isApiMode()
const quantity = ref(1)
const note = ref('')
const saving = ref(false)

function setOpen(open: boolean) {
  emit('update:open', open)
}
async function createBatch() {
  if (!props.product || !(Number(quantity.value) > 0)) {
    toast.error('Zadejte kladné vyrobené množství.')
    return
  }
  saving.value = true
  try {
    await createProductionBatch({
      semiProductId: props.product.id,
      producedQuantity: Number(quantity.value),
      note: note.value.trim() || null,
    })
    toast.success('Výrobní dávka vytvořena a sklad upraven.')
    quantity.value = 1
    note.value = ''
    emit('created')
    setOpen(false)
  } catch (error) {
    toast.error('Dávku se nepodařilo vytvořit. Polotovar musí mít recepturu.')
    console.error(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="setOpen">
    <DialogContent class="max-w-md">
      <DialogHeader
        ><DialogTitle>Vyrobit polotovar</DialogTitle
        ><DialogDescription
          >{{ product?.name }} — suroviny se odečtou podle uložené receptury.</DialogDescription
        ></DialogHeader
      >
      <div v-if="!apiMode" class="rounded-md border p-3 text-sm text-muted-foreground">
        Výroba je dostupná po přihlášení do online aplikace.
      </div>
      <div v-else class="space-y-4">
        <div class="space-y-2">
          <Label for="batch-quantity">Vyrobené množství</Label
          ><Input
            id="batch-quantity"
            v-model.number="quantity"
            type="number"
            min="0.001"
            step="0.001"
          />
        </div>
        <div class="space-y-2">
          <Label for="batch-note">Poznámka</Label
          ><Input id="batch-note" v-model="note" placeholder="Např. ranní várka" />
        </div>
      </div>
      <DialogFooter
        ><Button variant="ghost" @click="setOpen(false)">Zrušit</Button
        ><Button variant="coral" :disabled="!apiMode || saving" @click="createBatch"
          ><Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Vyrobit</Button
        ></DialogFooter
      >
    </DialogContent>
  </Dialog>
</template>
