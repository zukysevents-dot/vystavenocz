<script setup lang="ts">
import { ref, watch } from 'vue'
import { Ban, Loader2 } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'

const props = defineProps<{
  open: boolean
  invoiceNumber: string
  cancelling: boolean
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [reason: string]
}>()

const reason = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) reason.value = ''
  },
)

function onConfirm(): void {
  const value = reason.value.trim()
  if (!value) {
    toast.error('Zadejte důvod stornování.')
    return
  }
  emit('confirm', value)
}
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Stornovat fakturu {{ invoiceNumber }}</DialogTitle>
        <DialogDescription>
          Faktura zůstane v evidenci se stavem Stornováno, číslo se nemění. Uveďte důvod pro auditní
          záznam.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2 py-2">
        <Label for="cancel-reason">Důvod stornování *</Label>
        <Textarea
          id="cancel-reason"
          v-model="reason"
          rows="3"
          placeholder="Např. duplicitní faktura, chyba v položkách…"
        />
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="ghost" :disabled="cancelling" @click="emit('update:open', false)">
          Zpět
        </Button>
        <Button variant="destructive" :disabled="cancelling" @click="onConfirm">
          <Loader2 v-if="cancelling" class="h-4 w-4 animate-spin" />
          <Ban v-else class="h-4 w-4" />
          Stornovat
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
