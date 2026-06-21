<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2, Mail } from 'lucide-vue-next'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'

const props = defineProps<{
  open: boolean
  recipientEmail?: string | null
  invoiceNumber: string
  supplierName?: string | null
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  sent: []
}>()

const form = reactive({ to: '', cc: '', subject: '', message: '' })
const sending = ref(false)

// Předvyplň formulář při otevření.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.to = props.recipientEmail ?? ''
    form.cc = ''
    form.subject = `Faktura ${props.invoiceNumber}${props.supplierName ? ` od ${props.supplierName}` : ''}`
    form.message = ''
    sending.value = false
  },
)

async function onSend() {
  if (!form.to.trim()) {
    toast.error('Zadejte e-mail příjemce.')
    return
  }
  sending.value = true
  // MVP mock — žádné reálné odeslání. Připraveno na napojení e-mail API.
  await new Promise((resolve) => setTimeout(resolve, 700))
  sending.value = false
  toast.success(`Faktura ${props.invoiceNumber} odeslána na ${form.to.trim()}. (mock)`)
  emit('sent')
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Odeslat fakturu e-mailem</DialogTitle>
        <DialogDescription>
          Odeslání je v MVP jen ukázkové (mock) — faktura se reálně neodešle.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label for="si-to">Příjemce *</Label>
          <Input id="si-to" v-model="form.to" type="email" placeholder="klient@firma.cz" />
        </div>
        <div class="space-y-2">
          <Label for="si-cc">Kopie (CC)</Label>
          <Input id="si-cc" v-model="form.cc" type="email" placeholder="nepovinné" />
        </div>
        <div class="space-y-2">
          <Label for="si-subject">Předmět</Label>
          <Input id="si-subject" v-model="form.subject" />
        </div>
        <div class="space-y-2">
          <Label for="si-message">Zpráva</Label>
          <Textarea
            id="si-message"
            v-model="form.message"
            rows="4"
            placeholder="Osobní poznámka pro klienta…"
          />
        </div>
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="ghost" :disabled="sending" @click="emit('update:open', false)">
          Zrušit
        </Button>
        <Button variant="coral" :disabled="sending" @click="onSend">
          <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
          <Mail v-else class="h-4 w-4" />
          Odeslat
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
