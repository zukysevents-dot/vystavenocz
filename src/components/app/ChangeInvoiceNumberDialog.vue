<script setup lang="ts">
import { ref, watch } from 'vue'
import { Hash, Loader2 } from 'lucide-vue-next'
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
import { toast } from '@/components/ui/sonner'

const props = defineProps<{
  open: boolean
  invoiceNumber: string
  saving: boolean
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [invoiceNumber: string]
}>()

const value = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) value.value = props.invoiceNumber
  },
)

// Potvrzení zůstává aktivní i s prázdným polem — zablokované tlačítko bez vysvětlení uživateli
// neřekne, co mu chybí (stejný vzor jako storno dobropisu).
function onConfirm(): void {
  const next = value.value.trim()
  if (!next) {
    toast.error('Zadejte číslo dokladu.')
    return
  }
  if (next === props.invoiceNumber) {
    emit('update:open', false)
    return
  }
  emit('confirm', next)
}
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="sm:max-w-md" data-testid="zmena-cisla-dialog">
      <DialogHeader>
        <DialogTitle>Změnit číslo dokladu {{ invoiceNumber }}</DialogTitle>
        <DialogDescription>
          Pod tímto číslem doklad odešel odběrateli i do účetnictví. Po změně se přegeneruje PDF a
          změní se i variabilní symbol, který se z čísla odvozuje — pokud už doklad odešel, pošlete
          ho znovu. Číslo, které má jiný doklad, použít nelze. Změna se zapisuje do auditu.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2 py-2">
        <Label for="change-invoice-number">Nové číslo dokladu *</Label>
        <Input
          id="change-invoice-number"
          v-model="value"
          data-testid="zmena-cisla-input"
          placeholder="Např. 2026-0042"
        />
        <p class="text-xs text-muted-foreground">
          Číslo se nečerpá z číselné řady, takže další doklad dostane číslo podle nastavení firmy.
        </p>
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="ghost" :disabled="saving" @click="emit('update:open', false)">Zpět</Button>
        <Button :disabled="saving" data-testid="zmena-cisla-potvrdit" @click="onConfirm">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Hash v-else class="h-4 w-4" />
          Uložit číslo
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
