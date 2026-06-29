<script setup lang="ts">
import { Printer } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SaleReceipt from '@/components/SaleReceipt.vue'
import type { ReceiptInfo } from '@/lib/receipt'

defineProps<{ open: boolean; receipt: ReceiptInfo | null }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()

function printReceipt() {
  window.print()
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Účtenka</DialogTitle>
        <DialogDescription
          >Náhled účtenky — můžete vytisknout nebo uložit jako PDF.</DialogDescription
        >
      </DialogHeader>
      <div class="max-h-[70vh] overflow-y-auto">
        <SaleReceipt v-if="receipt" v-bind="receipt" />
      </div>
      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">Hotovo</Button>
        <Button variant="coral" @click="printReceipt">
          <Printer class="h-4 w-4" /> Vytisknout / PDF
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
