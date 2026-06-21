<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2, Search, Check } from 'lucide-vue-next'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useAres } from '@/composables/useAres'
import { useClients } from '@/composables/useClients'
import { toast } from '@/components/ui/sonner'
import type { ClientSnapshot } from '@/lib/types'

export type QuickClient = ClientSnapshot & { defaultPaymentDays: number }

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [client: QuickClient, savedClientId: string | null]
}>()

const ares = useAres()
const { create: createClient } = useClients()

// Formulář drží textová pole jako string (prázdné = ''); na null se mapuje až při potvrzení.
type QcForm = {
  name: string
  ico: string
  dic: string
  email: string
  street: string
  city: string
  zip: string
  country: string
}

const emptyForm = (): QcForm => ({
  name: '',
  ico: '',
  dic: '',
  email: '',
  street: '',
  city: '',
  zip: '',
  country: 'CZ',
})

const form = reactive<QcForm>(emptyForm())
const saveToList = ref(true)
const saving = ref(false)

// Reset stavu při zavření dialogu.
watch(
  () => props.open,
  (open) => {
    if (!open) {
      Object.assign(form, emptyForm())
      saveToList.value = true
      saving.value = false
      ares.reset()
    }
  },
)

async function fillFromAres() {
  const result = await ares.lookup(form.ico)
  if (!result) return
  form.name = result.companyName || form.name
  form.ico = result.ico
  form.dic = result.dic ?? ''
  form.street = result.street ?? ''
  form.city = result.city ?? ''
  form.zip = result.zip ?? ''
  form.country = result.country || 'CZ'
}

async function confirm() {
  if (!form.name.trim()) {
    toast.error('Vyplňte název odběratele.')
    return
  }
  const snapshot: QuickClient = {
    name: form.name.trim(),
    ico: form.ico || null,
    dic: form.dic || null,
    email: form.email || null,
    street: form.street || null,
    city: form.city || null,
    zip: form.zip || null,
    country: form.country || 'CZ',
    defaultPaymentDays: 14,
  }

  saving.value = true
  try {
    let savedId: string | null = null
    if (saveToList.value) {
      try {
        const client = await createClient({
          name: snapshot.name,
          ico: snapshot.ico ?? null,
          dic: snapshot.dic ?? null,
          email: snapshot.email ?? null,
          phone: null,
          street: snapshot.street ?? null,
          city: snapshot.city ?? null,
          zip: snapshot.zip ?? null,
          country: snapshot.country ?? 'CZ',
          defaultPaymentDays: snapshot.defaultPaymentDays,
          notes: null,
        })
        savedId = client.id
        toast.success('Klient přidán do seznamu.')
      } catch {
        toast.error('Nepodařilo se uložit klienta. Pokračuji bez uložení.')
      }
    }
    emit('confirm', snapshot, savedId)
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(o) => emit('update:open', o)">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Nový odběratel</DialogTitle>
        <DialogDescription>
          Zadejte IČO a načtěte údaje z ARES, nebo je vyplňte ručně. Klient se použije pro tuto
          fakturu.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label for="qc-ico">IČO (auto-vyplnění z ARES)</Label>
          <div class="flex gap-2">
            <Input
              id="qc-ico"
              v-model="form.ico"
              inputmode="numeric"
              placeholder="např. 12345678"
              @keydown.enter.prevent="fillFromAres"
            />
            <Button
              type="button"
              variant="outline"
              :disabled="ares.loading.value || !form.ico"
              @click="fillFromAres"
            >
              <Loader2 v-if="ares.loading.value" class="h-4 w-4 animate-spin" />
              <Search v-else class="h-4 w-4" />
              Načíst z ARES
            </Button>
          </div>
          <div v-if="ares.data.value" class="flex items-center gap-1 text-xs text-success">
            <Check class="h-3.5 w-3.5" /> Údaje doplněny z ARES
          </div>
        </div>

        <div class="space-y-2">
          <Label for="qc-name">Název / jméno *</Label>
          <Input id="qc-name" v-model="form.name" placeholder="Firma s.r.o. nebo Jan Novák" />
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="qc-dic">DIČ</Label>
            <Input id="qc-dic" v-model="form.dic" placeholder="CZ12345678" />
          </div>
          <div class="space-y-2">
            <Label for="qc-email">E-mail</Label>
            <Input id="qc-email" v-model="form.email" type="email" placeholder="info@firma.cz" />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="qc-street">Ulice a č.p.</Label>
          <Input id="qc-street" v-model="form.street" />
        </div>

        <div class="grid gap-3 sm:grid-cols-[1fr_140px]">
          <div class="space-y-2">
            <Label for="qc-city">Město</Label>
            <Input id="qc-city" v-model="form.city" />
          </div>
          <div class="space-y-2">
            <Label for="qc-zip">PSČ</Label>
            <Input id="qc-zip" v-model="form.zip" />
          </div>
        </div>

        <label
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
        >
          <Checkbox v-model="saveToList" class="mt-0.5" />
          <div class="space-y-0.5 text-sm">
            <div class="font-medium">Uložit i do seznamu klientů</div>
            <div class="text-xs text-muted-foreground">
              Při příští fakturaci ho už nebudete muset zadávat znovu.
            </div>
          </div>
        </label>
      </div>

      <DialogFooter class="gap-2 sm:gap-0">
        <Button variant="ghost" :disabled="saving" @click="emit('update:open', false)">
          Zrušit
        </Button>
        <Button variant="coral" :disabled="saving" @click="confirm">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Použít odběratele
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
