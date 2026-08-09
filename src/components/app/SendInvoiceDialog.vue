<script setup lang="ts">
import { ref, watch } from 'vue'
import { Download, Loader2, Mail } from 'lucide-vue-next'
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
import { http, isApiMode, ApiError } from '@/lib/http'

// Odeslání faktury e-mailem s PDF přílohou (server, POST /invoices/{id}/send). Jen API režim —
// v náhledu zůstává poctivý fallback „stáhněte PDF". Bez SMTP na serveru přijde 503 a nic se
// nepředstírá; uživatel dostane jasnou hlášku + PDF fallback.
const props = defineProps<{
  open: boolean
  invoiceId?: string | null
  recipientEmail?: string | null
  invoiceNumber: string
  supplierName?: string | null
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  sent: []
}>()

const apiMode = isApiMode()
const recipient = ref('')
const sending = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) recipient.value = props.recipientEmail ?? ''
  },
)

const canSend = () => apiMode && !!props.invoiceId

async function send() {
  if (!props.invoiceId) return
  if (!recipient.value.trim()) {
    toast.error('Zadejte e-mail příjemce.')
    return
  }
  sending.value = true
  try {
    await http.post(`/invoices/${props.invoiceId}/send`, { to: recipient.value.trim() })
    toast.success(`Faktura ${props.invoiceNumber} odeslána na ${recipient.value.trim()}.`)
    emit('sent')
    emit('update:open', false)
  } catch (e) {
    if (e instanceof ApiError && e.status === 503)
      toast.error(
        'Odesílání e-mailů není na serveru nastavené. Stáhněte PDF a pošlete fakturu sami.',
      )
    else if (e instanceof ApiError && e.status === 422)
      toast.error('Zkontrolujte e-mail příjemce (jedna platná adresa).')
    else if (e instanceof ApiError && e.status === 409)
      toast.error('Fakturu v tomto stavu nelze odeslat — nejdřív ji vystavte.')
    else toast.error('Fakturu se nepodařilo odeslat. Zkuste to znovu.')
    console.error(e)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="sm:max-w-lg">
      <template v-if="canSend()">
        <DialogHeader>
          <DialogTitle>Odeslat fakturu e-mailem</DialogTitle>
          <DialogDescription>
            Faktura {{ invoiceNumber }} se odešle s PDF přílohou
            {{ supplierName ? `jménem ${supplierName}` : '' }} a označí se jako odeslaná.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-1.5">
          <Label for="send-invoice-recipient">E-mail příjemce</Label>
          <Input
            id="send-invoice-recipient"
            v-model="recipient"
            type="email"
            placeholder="klient@firma.cz"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="sending" @click="emit('update:open', false)">
            Zrušit
          </Button>
          <Button variant="coral" :disabled="sending" @click="send">
            <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
            <Mail v-else class="h-4 w-4" />
            Odeslat
          </Button>
        </DialogFooter>
      </template>

      <template v-else>
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
      </template>
    </DialogContent>
  </Dialog>
</template>
