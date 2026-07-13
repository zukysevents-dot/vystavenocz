<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

defineProps<{
  open: boolean
  recipientEmail?: string | null
  invoiceNumber: string
  supplierName?: string | null
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  sent: []
}>()
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Odeslání e-mailem zatím není dostupné</DialogTitle>
        <DialogDescription>
          Fakturu {{ invoiceNumber }} stáhněte jako PDF a odešlete ji ze svého e-mailu.
        </DialogDescription>
      </DialogHeader>

      <div class="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <div class="flex items-start gap-3">
          <Download class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            Zavřete toto okno, použijte tlačítko
            <strong class="text-foreground">Stáhnout PDF</strong> a soubor přiložte do zprávy{{
              recipientEmail ? ` pro ${recipientEmail}` : ''
            }}.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="coral" @click="emit('update:open', false)">Rozumím</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
