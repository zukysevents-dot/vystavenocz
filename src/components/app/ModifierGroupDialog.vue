<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, Plus, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { useModifierGroups } from '@/composables/useModifierGroups'
import { isApiMode } from '@/lib/http'
import type { ModifierGroup, ModifierSelectionType } from '@/lib/types'

type OptionRow = {
  id: string
  name: string
  priceDelta: number
}

const props = defineProps<{
  open: boolean
  group: ModifierGroup | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const groupsApi = useModifierGroups()
const apiMode = isApiMode()

const name = ref('')
const selectionType = ref<ModifierSelectionType>('Single')
const isRequired = ref(false)
const maxSelect = ref<number | undefined>(undefined)
const options = ref<OptionRow[]>([])
const saving = ref(false)
const deleting = ref(false)

const isEditing = computed(() => props.group !== null)

function setOpen(open: boolean) {
  emit('update:open', open)
}

function addOption() {
  options.value.push({ id: crypto.randomUUID(), name: '', priceDelta: 0 })
}

function removeOption(id: string) {
  options.value = options.value.filter((o) => o.id !== id)
}

function reset() {
  const group = props.group
  name.value = group?.name ?? ''
  selectionType.value = group?.selectionType ?? 'Single'
  isRequired.value = group?.isRequired ?? false
  maxSelect.value = group?.maxSelect ?? undefined
  options.value = group?.options.map((o) => ({
    id: crypto.randomUUID(),
    name: o.name,
    priceDelta: o.priceDelta,
  })) ?? [{ id: crypto.randomUUID(), name: '', priceDelta: 0 }]
}

function validate(): boolean {
  if (!name.value.trim()) {
    toast.error('Zadejte název skupiny.')
    return false
  }
  if (options.value.length === 0) {
    toast.error('Přidejte alespoň jednu volbu.')
    return false
  }
  for (const option of options.value) {
    if (!option.name.trim()) {
      toast.error('Vyplňte název u každé volby.')
      return false
    }
  }
  if (
    selectionType.value === 'Multi' &&
    maxSelect.value !== undefined &&
    !(Number(maxSelect.value) >= 1)
  ) {
    toast.error('Maximální počet voleb musí být alespoň 1 (nebo prázdné = bez limitu).')
    return false
  }
  return true
}

async function save() {
  if (!validate()) return

  saving.value = true
  try {
    const payload = {
      name: name.value.trim(),
      selectionType: selectionType.value,
      isRequired: isRequired.value,
      maxSelect: selectionType.value === 'Multi' ? maxSelect.value || null : null,
      sortOrder: props.group?.sortOrder ?? 0,
      options: options.value.map((o, index) => ({
        name: o.name.trim(),
        priceDelta: Number(o.priceDelta) || 0,
        sortOrder: index,
      })),
    }
    if (props.group) await groupsApi.update(props.group.id, payload)
    else await groupsApi.create(payload)
    toast.success('Skupina modifikátorů uložena.')
    emit('saved')
    setOpen(false)
  } catch (e) {
    toast.error('Uložení skupiny selhalo.')
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function deleteGroup() {
  if (!props.group) return

  deleting.value = true
  try {
    await groupsApi.remove(props.group.id)
    toast.success('Skupina modifikátorů smazána.')
    emit('saved')
    setOpen(false)
  } catch (e) {
    toast.error('Smazání skupiny selhalo.')
    console.error(e)
  } finally {
    deleting.value = false
  }
}

watch(
  () => [props.open, props.group?.id] as const,
  ([open]) => {
    if (open) reset()
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="setOpen">
    <DialogContent class="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Upravit skupinu' : 'Nová skupina modifikátorů' }}</DialogTitle>
        <DialogDescription>
          Volby k produktu (např. velikost, příloha, „bez cibule"). Cena volby se připočítá k ceně
          produktu.
        </DialogDescription>
      </DialogHeader>

      <div
        v-if="!apiMode"
        class="rounded-lg border border-border p-4 text-sm text-muted-foreground"
      >
        Modifikátory jsou dostupné po připojení k API.
      </div>

      <div v-else class="space-y-5">
        <div class="space-y-2">
          <Label for="mod-name">Název skupiny</Label>
          <Input id="mod-name" v-model="name" placeholder="např. Velikost" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="mod-type">Typ výběru</Label>
            <select
              id="mod-type"
              v-model="selectionType"
              class="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Single">Jedna volba</option>
              <option value="Multi">Více voleb</option>
            </select>
          </div>

          <div v-if="selectionType === 'Multi'" class="space-y-2">
            <Label for="mod-max">Max. počet voleb</Label>
            <Input
              id="mod-max"
              v-model.number="maxSelect"
              type="number"
              min="1"
              step="1"
              placeholder="bez limitu"
            />
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="isRequired" type="checkbox" class="h-4 w-4 rounded border-border" />
          Povinná — zákazník musí vybrat
        </label>

        <div class="space-y-2">
          <div class="text-sm font-medium">Volby</div>
          <div class="overflow-hidden rounded-lg border border-border">
            <div
              class="grid grid-cols-[1fr_8rem_2.5rem] gap-3 border-b border-border px-3 py-2 text-sm text-muted-foreground"
            >
              <div>Název volby</div>
              <div class="text-right">Příplatek (Kč)</div>
              <div />
            </div>

            <div v-if="options.length === 0" class="p-6 text-center text-sm text-muted-foreground">
              Zatím žádné volby.
            </div>

            <div
              v-for="option in options"
              :key="option.id"
              class="grid grid-cols-[1fr_8rem_2.5rem] items-center gap-3 border-b border-border px-3 py-3 last:border-b-0"
            >
              <Input v-model="option.name" placeholder="např. Velká" aria-label="Název volby" />
              <Input
                v-model.number="option.priceDelta"
                type="number"
                step="0.01"
                class="text-right"
                aria-label="Příplatek"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Odebrat volbu"
                @click="removeOption(option.id)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          <Button type="button" variant="outline" @click="addOption">
            <Plus class="h-4 w-4" /> Přidat volbu
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" @click="setOpen(false)">Zavřít</Button>
        <Button
          v-if="apiMode && isEditing"
          type="button"
          variant="outline"
          :disabled="deleting || saving"
          @click="deleteGroup"
        >
          <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
          Smazat
        </Button>
        <Button type="button" variant="coral" :disabled="!apiMode || saving" @click="save">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Uložit
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
