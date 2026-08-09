<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Loader2, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  useModifierGroups,
  type ModifierGroupInput,
  type ModifierOptionInput,
} from '@/composables/useModifierGroups'
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import LoadError from '@/components/app/LoadError.vue'
import type { ModifierGroup, ModifierSelectionType } from '@/lib/types'

type OptionForm = { id: string; name: string; priceDelta: number | ''; sortOrder: number }
type Form = {
  name: string
  selectionType: ModifierSelectionType
  isRequired: boolean
  maxSelect: number | ''
  options: OptionForm[]
}

const api = useModifierGroups()
const apiMode = isApiMode()
const loading = ref(true)
const loadError = ref(false)
const groups = ref<ModifierGroup[]>([])
const editing = ref<ModifierGroup | null>(null)
const dialogOpen = ref(false)
const submitting = ref(false)
const deleteId = ref<string | null>(null)
const deleteOpen = ref(false)

const form = reactive<Form>({
  name: '',
  selectionType: 'Single',
  isRequired: false,
  maxSelect: '',
  options: [{ id: crypto.randomUUID(), name: '', priceDelta: 0, sortOrder: 0 }],
})

const sortedGroups = computed(() =>
  [...groups.value].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'cs')),
)

onMounted(async () => {
  if (!apiMode) {
    loading.value = false
    return
  }
  await load()
})

async function load() {
  loading.value = true
  try {
    groups.value = await api.list()
    loadError.value = false
  } catch (e) {
    loadError.value = true
    toast.error('Volby k produktům se nepodařilo načíst.')
    console.error(e)
  } finally {
    loading.value = false
  }
}

function resetForm() {
  Object.assign(form, {
    name: '',
    selectionType: 'Single' as ModifierSelectionType,
    isRequired: false,
    maxSelect: '',
    options: [{ id: crypto.randomUUID(), name: '', priceDelta: 0, sortOrder: 0 }],
  })
}

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(group: ModifierGroup) {
  editing.value = group
  dialogOpen.value = true
}

watch(dialogOpen, (open) => {
  if (!open) return
  if (!editing.value) {
    resetForm()
    return
  }
  Object.assign(form, {
    name: editing.value.name,
    selectionType: editing.value.selectionType,
    isRequired: editing.value.isRequired,
    maxSelect: editing.value.maxSelect ?? '',
    options:
      editing.value.options.length > 0
        ? editing.value.options
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'cs'))
            .map((option) => ({
              id: option.id,
              name: option.name,
              priceDelta: option.priceDelta,
              sortOrder: option.sortOrder,
            }))
        : [{ id: crypto.randomUUID(), name: '', priceDelta: 0, sortOrder: 0 }],
  })
})

function addOption() {
  form.options.push({
    id: crypto.randomUUID(),
    name: '',
    priceDelta: 0,
    sortOrder: form.options.length,
  })
}

function removeOption(id: string) {
  form.options = form.options.filter((option) => option.id !== id)
}

function askDelete(id: string) {
  deleteId.value = id
  deleteOpen.value = true
}

function toPayload(): ModifierGroupInput | null {
  if (!form.name.trim()) {
    toast.error('Zadejte název skupiny.')
    return null
  }
  const options: ModifierOptionInput[] = form.options
    .map((option, index) => ({
      id: option.id,
      name: option.name.trim(),
      priceDelta: option.priceDelta === '' ? 0 : Number(option.priceDelta) || 0,
      sortOrder: index,
    }))
    .filter((option) => option.name)

  if (options.length === 0) {
    toast.error('Přidejte aspoň jednu volbu.')
    return null
  }

  return {
    name: form.name.trim(),
    selectionType: form.selectionType,
    isRequired: form.isRequired,
    maxSelect:
      form.selectionType === 'Multi' && form.maxSelect !== ''
        ? Number(form.maxSelect) || null
        : null,
    sortOrder: editing.value?.sortOrder ?? groups.value.length,
    options,
  }
}

async function onSubmit() {
  const payload = toPayload()
  if (!payload) return
  submitting.value = true
  try {
    if (editing.value) {
      const updated = await api.update(editing.value.id, payload)
      const idx = groups.value.findIndex((group) => group.id === updated.id)
      if (idx !== -1) groups.value[idx] = updated
      toast.success('Skupina upravena.')
    } else {
      groups.value.push(await api.create(payload))
      toast.success('Skupina přidána.')
    }
    dialogOpen.value = false
  } catch (e) {
    toast.error('Uložení skupiny selhalo.')
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
    groups.value = groups.value.filter((group) => group.id !== id)
    toast.success('Skupina smazána.')
  } catch (e) {
    toast.error('Smazání skupiny selhalo.')
    console.error(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Volby k produktům</h1>
        <p class="mt-1 text-muted-foreground">
          Nastavte velikosti, přílohy, propečení nebo extra suroviny, které si host vybere.
        </p>
      </div>
      <Button variant="coral" :disabled="!apiMode || loading || loadError" @click="openCreate">
        <Plus class="h-4 w-4" /> Nová skupina voleb
      </Button>
    </div>

    <div v-if="!apiMode" class="mt-6 rounded-lg border border-border bg-card p-6 text-center">
      <p class="font-semibold">Volby k produktům teď nelze otevřít.</p>
      <p class="mt-1 text-sm text-muted-foreground">
        Přihlaste se do online aplikace a zkuste to znovu.
      </p>
    </div>

    <LoadError
      v-else-if="loadError"
      class="mt-6"
      message="Volby k produktům se nepodařilo načíst. Bez aktuálních dat není bezpečné vytvářet ani upravovat skupiny."
      :retrying="loading"
      @retry="load"
    />

    <div v-else class="mt-6 rounded-2xl border border-border bg-card">
      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div
        v-else-if="sortedGroups.length === 0"
        class="flex flex-col items-center p-12 text-center"
      >
        <SlidersHorizontal class="h-10 w-10 text-muted-foreground" />
        <h3 class="mt-3 text-lg font-semibold">Zatím žádné skupiny</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Přidejte třeba Přílohy, Propečení masa nebo Extra suroviny.
        </p>
        <Button variant="coral" class="mt-4" @click="openCreate">
          <Plus class="h-4 w-4" /> Přidat skupinu
        </Button>
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="group in sortedGroups"
          :key="group.id"
          class="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/40"
        >
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold">{{ group.name }}</span>
              <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {{ group.selectionType === 'Single' ? 'Vybere se jedna' : 'Lze vybrat více' }}
              </span>
              <span
                v-if="group.isRequired"
                class="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary"
              >
                Povinná
              </span>
            </div>
            <div class="mt-1 text-sm text-muted-foreground">
              {{
                group.options
                  .map((option) =>
                    option.priceDelta
                      ? `${option.name} (+${formatCZK(option.priceDelta)})`
                      : option.name,
                  )
                  .join(', ')
              }}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(group)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Smazat" @click="askDelete(group.id)">
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit skupinu' : 'Nová skupina' }}</DialogTitle>
          <DialogDescription>
            Skupinu potom přiřadíte konkrétním produktům ve skladu.
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-5" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="modifier-name">Název *</Label>
            <Input id="modifier-name" v-model="form.name" required placeholder="Přílohy" />
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="space-y-2 sm:col-span-2">
              <Label>Kolik možností lze vybrat?</Label>
              <div class="flex gap-2">
                <Button
                  type="button"
                  :variant="form.selectionType === 'Single' ? 'coral' : 'outline'"
                  class="flex-1"
                  @click="form.selectionType = 'Single'"
                >
                  Právě jednu
                </Button>
                <Button
                  type="button"
                  :variant="form.selectionType === 'Multi' ? 'coral' : 'outline'"
                  class="flex-1"
                  @click="form.selectionType = 'Multi'"
                >
                  Jednu nebo více
                </Button>
              </div>
            </div>
            <div class="space-y-2">
              <Label for="modifier-max">Nejvýše možností</Label>
              <Input
                id="modifier-max"
                v-model.number="form.maxSelect"
                :disabled="form.selectionType === 'Single'"
                type="number"
                min="1"
                placeholder="bez limitu"
              />
            </div>
          </div>

          <label class="flex items-center gap-3 rounded-lg border border-border p-3">
            <Checkbox v-model="form.isRequired" />
            <span>
              <span class="block font-medium">Povinná volba</span>
              <span class="text-sm text-muted-foreground">
                Bez výběru nepůjde produkt přidat do objednávky.
              </span>
            </span>
          </label>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <Label>Volby</Label>
              <Button type="button" variant="outline" size="sm" @click="addOption">
                <Plus class="h-4 w-4" /> Přidat volbu
              </Button>
            </div>
            <div
              v-for="option in form.options"
              :key="option.id"
              class="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_140px_auto]"
            >
              <Input v-model="option.name" placeholder="Hranolky" />
              <Input
                v-model.number="option.priceDelta"
                type="number"
                step="0.01"
                placeholder="Změna ceny"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Odebrat volbu"
                :disabled="form.options.length === 1"
                @click="removeOption(option.id)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" @click="dialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="submitting">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              {{ editing ? 'Uložit změny' : 'Přidat skupinu' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog :open="deleteOpen" @update:open="(o) => (deleteOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat skupinu?</AlertDialogTitle>
          <AlertDialogDescription>
            Skupina se přestane nabízet u produktů, kterým byla přiřazená.
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
