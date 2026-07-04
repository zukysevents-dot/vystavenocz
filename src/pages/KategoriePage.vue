<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { Plus, Loader2, Pencil, Trash2, Tags } from 'lucide-vue-next'
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
import { useCategories, type CategoryInput } from '@/composables/useCategories'
import { isApiMode } from '@/lib/http'
import { toast } from '@/components/ui/sonner'
import type { Category, CategoryKitchenSection } from '@/lib/types'

const api = useCategories()
const apiMode = isApiMode()

const loading = ref(true)
const categories = ref<Category[]>([])
const editing = ref<Category | null>(null)
const dialogOpen = ref(false)
const deleteId = ref<string | null>(null)
const deleteOpen = ref(false)
const submitting = ref(false)

function askDelete(id: string) {
  deleteId.value = id
  deleteOpen.value = true
}

const SECTIONS: { value: CategoryKitchenSection; label: string }[] = [
  { value: 'None', label: 'Žádná' },
  { value: 'Kitchen', label: 'Kuchyně' },
  { value: 'Bar', label: 'Bar' },
]
const SECTION_LABEL: Record<CategoryKitchenSection, string> = {
  None: 'Bez kuchyně',
  Kitchen: 'Kuchyně',
  Bar: 'Bar',
}

type Form = { name: string; color: string; kitchenSection: CategoryKitchenSection }
const emptyForm: Form = { name: '', color: '#3366ff', kitchenSection: 'None' }
const form = reactive<Form>({ ...emptyForm })

onMounted(async () => {
  if (!apiMode) {
    loading.value = false
    return
  }
  try {
    categories.value = await api.list()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}
function openEdit(c: Category) {
  editing.value = c
  dialogOpen.value = true
}
watch(dialogOpen, (open) => {
  if (open) {
    if (editing.value) {
      Object.assign(form, {
        name: editing.value.name,
        color: editing.value.color ?? '#3366ff',
        kitchenSection: editing.value.kitchenSection,
      })
    } else {
      Object.assign(form, { ...emptyForm })
    }
  }
})

async function onSubmit() {
  if (!form.name.trim()) {
    toast.error('Zadejte název kategorie.')
    return
  }
  submitting.value = true
  const payload: CategoryInput = {
    name: form.name.trim(),
    color: form.color,
    kitchenSection: form.kitchenSection,
    sortOrder: editing.value?.sortOrder ?? categories.value.length,
  }
  try {
    if (editing.value) {
      const updated = await api.update(editing.value.id, payload)
      const idx = categories.value.findIndex((c) => c.id === updated.id)
      if (idx !== -1) categories.value[idx] = updated
      toast.success('Kategorie upravena.')
    } else {
      categories.value.push(await api.create(payload))
      toast.success('Kategorie přidána.')
    }
    dialogOpen.value = false
  } catch (e) {
    toast.error('Uložení kategorie selhalo.')
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function onDelete() {
  const id = deleteId.value
  if (!id) return
  deleteOpen.value = false
  deleteId.value = null
  try {
    await api.remove(id)
    categories.value = categories.value.filter((c) => c.id !== id)
    toast.success('Kategorie smazána.')
  } catch (e) {
    toast.error('Smazání selhalo (možná ji používají produkty).')
    console.error(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Kategorie</h1>
        <p class="mt-1 text-muted-foreground">
          Roztřiďte produkty a nasměrujte je do kuchyně/baru.
        </p>
      </div>
      <Button variant="coral" @click="openCreate"> <Plus class="h-4 w-4" /> Nová kategorie </Button>
    </div>

    <div class="mt-6 rounded-2xl border border-border bg-card">
      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div v-else-if="!categories.length" class="flex flex-col items-center p-12 text-center">
        <Tags class="h-10 w-10 text-muted-foreground" />
        <h3 class="mt-3 text-lg font-semibold">Zatím žádné kategorie</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Např. Nápoje (bar), Hlavní jídla (kuchyně), Dezerty…
        </p>
        <Button variant="coral" class="mt-4" @click="openCreate">
          <Plus class="h-4 w-4" /> Přidat kategorii
        </Button>
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="c in categories"
          :key="c.id"
          class="flex items-center justify-between gap-3 p-4 hover:bg-muted/40"
        >
          <div class="flex items-center gap-3">
            <span
              class="h-5 w-5 shrink-0 rounded-full border border-border"
              :style="{ backgroundColor: c.color ?? '#cccccc' }"
            />
            <div>
              <div class="font-semibold">{{ c.name }}</div>
              <div class="text-xs text-muted-foreground">{{ SECTION_LABEL[c.kitchenSection] }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(c)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Smazat" @click="askDelete(c.id)">
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit kategorii' : 'Nová kategorie' }}</DialogTitle>
          <DialogDescription>Barva pro dlaždice a směrování do kuchyně/baru.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="cat-name">Název *</Label>
            <Input id="cat-name" v-model="form.name" required placeholder="Nápoje" />
          </div>
          <div class="grid grid-cols-[auto_1fr] items-end gap-4">
            <div class="space-y-2">
              <Label for="cat-color">Barva</Label>
              <input
                id="cat-color"
                v-model="form.color"
                type="color"
                class="h-10 w-16 cursor-pointer rounded-md border border-border bg-background"
              />
            </div>
            <div class="space-y-2">
              <Label>Směrovat do</Label>
              <div class="flex gap-2">
                <Button
                  v-for="s in SECTIONS"
                  :key="s.value"
                  type="button"
                  :variant="form.kitchenSection === s.value ? 'coral' : 'outline'"
                  class="flex-1"
                  @click="form.kitchenSection = s.value"
                >
                  {{ s.label }}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" @click="dialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="submitting">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              {{ editing ? 'Uložit' : 'Přidat' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteOpen" @update:open="(o) => (deleteOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat kategorii?</AlertDialogTitle>
          <AlertDialogDescription>
            Produkty zůstanou, jen ztratí zařazení do této kategorie.
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
