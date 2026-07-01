<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Plus, Building2, Pencil, Trash2, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/components/ui/sonner'
import { useLocations, type LocationInput } from '@/composables/useLocations'
import type { Location } from '@/lib/types'

const { locations, load, create, update, remove } = useLocations()
const loading = ref(true)
const dialogOpen = ref(false)
const editing = ref<Location | null>(null)
const deleteId = ref<string | null>(null)
const submitting = ref(false)
const deleting = ref(false)

const emptyForm = { name: '', address: '', isActive: true }
const form = reactive({ ...emptyForm })

onMounted(async () => {
  await load()
  loading.value = false
})

function openNew() {
  editing.value = null
  Object.assign(form, emptyForm)
  dialogOpen.value = true
}
function openEdit(l: Location) {
  editing.value = l
  Object.assign(form, { name: l.name, address: l.address ?? '', isActive: l.isActive })
  dialogOpen.value = true
}

async function save() {
  if (submitting.value) return
  if (!form.name.trim()) return toast.error('Zadejte název pobočky.')
  const input: LocationInput = {
    name: form.name.trim(),
    address: form.address.trim() || null,
    isActive: form.isActive,
  }
  submitting.value = true
  try {
    if (editing.value) {
      await update(editing.value.id, input)
      toast.success('Pobočka upravena.')
    } else {
      await create(input)
      toast.success('Pobočka přidána.')
    }
    dialogOpen.value = false
  } catch {
    toast.error('Uložení se nezdařilo. Zkuste to prosím znovu.')
  } finally {
    submitting.value = false
  }
}

async function onDelete() {
  if (!deleteId.value || deleting.value) return
  deleting.value = true
  try {
    await remove(deleteId.value)
    toast.success('Pobočka smazána.')
    deleteId.value = null
  } catch {
    toast.error('Smazání se nezdařilo.')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Pobočky &amp; vedení</h1>
        <p class="mt-1 text-muted-foreground">Provozovny firmy — základ pro konsolidaci a role.</p>
      </div>
      <Button variant="coral" @click="openNew"> <Plus class="h-4 w-4" /> Nová pobočka </Button>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div
      v-else-if="locations.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Building2 class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Zatím žádné pobočky</h2>
      <p class="mt-1 text-sm text-muted-foreground">Přidej provozovny a přiřaď k nim provoz.</p>
      <Button variant="coral" class="mt-4" @click="openNew"
        ><Plus class="h-4 w-4" /> Nová pobočka</Button
      >
    </div>

    <div v-else class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="l in locations" :key="l.id" class="rounded-xl border border-border bg-card p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate font-semibold">{{ l.name }}</div>
            <div class="mt-0.5 truncate text-xs text-muted-foreground">{{ l.address || '—' }}</div>
          </div>
          <Badge :variant="l.isActive ? 'default' : 'secondary'" class="shrink-0">
            {{ l.isActive ? 'Aktivní' : 'Neaktivní' }}
          </Badge>
        </div>
        <div class="mt-3 flex justify-end gap-1 border-t border-border pt-2">
          <Button variant="ghost" size="sm" @click="openEdit(l)">
            <Pencil class="h-4 w-4" /> Upravit
          </Button>
          <Button variant="ghost" size="sm" @click="deleteId = l.id">
            <Trash2 class="h-4 w-4 text-destructive" /> Smazat
          </Button>
        </div>
      </div>
    </div>

    <!-- Dialog create / edit -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit pobočku' : 'Nová pobočka' }}</DialogTitle>
          <DialogDescription>Provozovna pro konsolidaci a přiřazení provozu.</DialogDescription>
        </DialogHeader>

        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="loc-name">Název</Label>
            <Input id="loc-name" v-model="form.name" placeholder="Např. Pobočka Praha" />
          </div>
          <div class="grid gap-1.5">
            <Label for="loc-addr">Adresa</Label>
            <Input id="loc-addr" v-model="form.address" placeholder="Ulice, město" />
          </div>
          <label class="flex items-center gap-2 text-sm">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4" />
            Aktivní pobočka
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="submitting" @click="dialogOpen = false"
            >Zrušit</Button
          >
          <Button variant="coral" :disabled="submitting" @click="save">
            {{ editing ? 'Uložit' : 'Přidat' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="!!deleteId" @update:open="(o: boolean) => !o && (deleteId = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat pobočku?</AlertDialogTitle>
          <AlertDialogDescription>Tuto akci nelze vrátit.</AlertDialogDescription>
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
