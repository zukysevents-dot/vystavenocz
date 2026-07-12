<script setup lang="ts">
import { ref } from 'vue'
import { Check, Copy, KeyRound } from 'lucide-vue-next'
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

// Jednorázové zobrazení tajné hodnoty (API token / webhook signing secret). Hodnota se po zavření
// dialogu už NIKDY nezobrazí — backend drží jen hash/šifrovaný tvar. Zavření vyžaduje explicitní
// potvrzení tlačítkem, ať ji uživatel omylem nezahodí klikem mimo dialog.
const props = defineProps<{
  open: boolean
  title: string
  description: string
  secret: string
}>()

const emit = defineEmits<{ close: [] }>()

const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.secret)
    copied.value = true
    toast.success('Zkopírováno do schránky.')
  } catch {
    toast.error('Kopírování se nezdařilo — zkopírujte hodnotu ručně.')
  }
}

function close() {
  copied.value = false
  emit('close')
}
</script>

<template>
  <Dialog :open="open" @update:open="(value) => !value && close()">
    <DialogContent class="sm:max-w-lg" data-testid="secret-reveal-dialog">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <KeyRound class="h-5 w-5 text-primary" />
          {{ title }}
        </DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>

      <div class="rounded-lg border border-border bg-muted/40 p-3">
        <code class="block break-all text-sm" data-testid="secret-value">{{ secret }}</code>
      </div>
      <p class="text-xs font-medium text-destructive">
        Hodnota se zobrazuje jen jednou — po zavření okna ji už nezískáte. Uložte ji bezpečně.
      </p>

      <DialogFooter class="gap-2">
        <Button type="button" variant="outline" @click="copy">
          <component :is="copied ? Check : Copy" class="h-4 w-4" />
          {{ copied ? 'Zkopírováno' : 'Zkopírovat' }}
        </Button>
        <Button type="button" @click="close">Uložil jsem, zavřít</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
