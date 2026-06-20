<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Plus, Search, Loader2, Pencil, Trash2, Users, Check, Building2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useClients, type ClientInput } from '@/composables/useClients'
import { useAres } from '@/composables/useAres'
import { toast } from '@/components/ui/sonner'
import type { Client } from '@/lib/types'

const { clients, load, create, update, remove } = useClients()
const ares = useAres()

const loading = ref(true)
const search = ref('')
const editing = ref<Client | null>(null)
const dialogOpen = ref(false)
const deleteId = ref<string | null>(null)
const submitting = ref(false)

// Formulář drží textová pole jako string (prázdné = ''); na null se mapuje až při uložení.
type ClientForm = {
  name: string
  ico: string
  dic: string
  email: string
  phone: string
  street: string
  city: string
  zip: string
  country: string
  defaultPaymentDays: number
  notes: string
}

const emptyForm: ClientForm = {
  name: '',
  ico: '',
  dic: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  zip: '',
  country: 'CZ',
  defaultPaymentDays: 14,
  notes: '',
}

const form = reactive<ClientForm>({ ...emptyForm })

onMounted(async () => {
  loading.value = true
  await load()
  loading.value = false
})

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return clients.value.filter((c) => {
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      (c.ico ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  })
})

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(c: Client) {
  editing.value = c
  dialogOpen.value = true
}

// Při otevření dialogu naplň formulář (create = prázdný, edit = předvyplněný) a vyresetuj ARES.
watch(dialogOpen, (open) => {
  if (open) {
    if (editing.value) {
      const c = editing.value
      Object.assign(form, {
        name: c.name,
        ico: c.ico ?? '',
        dic: c.dic ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        street: c.street ?? '',
        city: c.city ?? '',
        zip: c.zip ?? '',
        country: c.country,
        defaultPaymentDays: c.defaultPaymentDays,
        notes: c.notes ?? '',
      })
    } else {
      Object.assign(form, { ...emptyForm })
    }
    ares.reset()
  }
})

async function fillFromAres() {
  const result = await ares.lookup(form.ico ?? '')
  if (result) {
    form.name = result.companyName ?? form.name
    form.ico = result.ico
    form.dic = result.dic ?? ''
    form.street = result.street ?? ''
    form.city = result.city ?? ''
    form.zip = result.zip ?? ''
    form.country = result.country ?? 'CZ'
  }
}

async function onSubmit() {
  if (!form.name.trim()) {
    toast.error('Zadejte jméno klienta.')
    return
  }
  submitting.value = true
  const payload: ClientInput = {
    ...form,
    ico: form.ico || null,
    dic: form.dic || null,
    email: form.email || null,
    phone: form.phone || null,
    street: form.street || null,
    city: form.city || null,
    zip: form.zip || null,
    notes: form.notes || null,
  }
  try {
    if (editing.value) {
      await update(editing.value.id, payload)
      toast.success('Klient upraven.')
    } else {
      await create(payload)
      toast.success('Klient vytvořen.')
    }
    dialogOpen.value = false
  } finally {
    submitting.value = false
  }
}

async function onDelete() {
  if (!deleteId.value) return
  await remove(deleteId.value)
  toast.success('Klient smazán.')
  deleteId.value = null
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Klienti</h1>
        <p class="mt-1 text-muted-foreground">Spravujte odběratele pro vaše faktury.</p>
      </div>
      <Button variant="coral" @click="openCreate"> <Plus class="h-4 w-4" /> Nový klient </Button>
    </div>

    <div class="mt-6 relative">
      <Search
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input v-model="search" class="pl-9" placeholder="Hledat podle jména, IČO nebo e-mailu…" />
    </div>

    <div class="mt-6 rounded-2xl border border-border bg-card">
      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center p-12 text-center">
        <Users class="h-10 w-10 text-muted-foreground" />
        <h3 class="mt-3 text-lg font-semibold">
          {{ clients.length === 0 ? 'Zatím žádní klienti' : 'Nic nenalezeno' }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            clients.length === 0
              ? 'Přidejte prvního klienta s autoplněním z ARES.'
              : 'Zkuste jiný hledaný výraz.'
          }}
        </p>
        <Button v-if="clients.length === 0" variant="coral" class="mt-4" @click="openCreate">
          <Plus class="h-4 w-4" /> Přidat klienta
        </Button>
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="c in filtered"
          :key="c.id"
          class="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/40"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary"
            >
              <Building2 class="h-5 w-5" />
            </div>
            <div>
              <div class="font-semibold">{{ c.name }}</div>
              <div class="text-sm text-muted-foreground">
                {{ c.ico ? `IČO ${c.ico}` : 'Bez IČO' }}
                {{ c.city ? ` • ${c.city}` : '' }}
                {{ c.email ? ` • ${c.email}` : '' }}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(c)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Smazat" @click="deleteId = c.id">
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog formuláře (create / edit) -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit klienta' : 'Nový klient' }}</DialogTitle>
          <DialogDescription>
            Vyplňte údaje ručně nebo načtěte firmu z veřejného registru ARES podle IČO.
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-5" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="c-ico">IČO (auto-vyplnění z ARES)</Label>
            <div class="flex gap-2">
              <Input id="c-ico" v-model="form.ico" inputmode="numeric" placeholder="12345678" />
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
            <div v-if="ares.data.value" class="flex items-center gap-2 text-xs text-success">
              <Check class="h-3.5 w-3.5" /> Údaje doplněny z ARES
            </div>
          </div>

          <div class="space-y-2">
            <Label for="c-name">Název / jméno *</Label>
            <Input id="c-name" v-model="form.name" required />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="c-dic">DIČ</Label>
              <Input id="c-dic" v-model="form.dic" placeholder="CZ12345678" />
            </div>
            <div class="space-y-2">
              <Label for="c-days">Splatnost (dny)</Label>
              <Input
                id="c-days"
                v-model.number="form.defaultPaymentDays"
                type="number"
                :min="0"
                :max="120"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="c-street">Ulice</Label>
            <Input id="c-street" v-model="form.street" />
          </div>

          <div class="grid gap-4 sm:grid-cols-[1fr_140px_120px]">
            <div class="space-y-2">
              <Label for="c-city">Město</Label>
              <Input id="c-city" v-model="form.city" />
            </div>
            <div class="space-y-2">
              <Label for="c-zip">PSČ</Label>
              <Input id="c-zip" v-model="form.zip" />
            </div>
            <div class="space-y-2">
              <Label for="c-country">Země</Label>
              <Input
                id="c-country"
                :model-value="form.country"
                @update:model-value="form.country = String($event).toUpperCase()"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="c-email">E-mail</Label>
              <Input id="c-email" v-model="form.email" type="email" />
            </div>
            <div class="space-y-2">
              <Label for="c-phone">Telefon</Label>
              <Input id="c-phone" v-model="form.phone" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="c-notes">Poznámka</Label>
            <Input id="c-notes" v-model="form.notes" placeholder="Interní poznámka…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" @click="dialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="submitting">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              {{ editing ? 'Uložit změny' : 'Vytvořit klienta' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="!!deleteId" @update:open="(o) => !o && (deleteId = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat klienta?</AlertDialogTitle>
          <AlertDialogDescription>
            Klienta odstraníme z vašeho seznamu. Faktury vystavené pro něj zůstanou zachovány.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="onDelete"
          >
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
