<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, Wrench, Pencil, Trash2, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import LoadError from '@/components/app/LoadError.vue'
import { useServiceItems } from '@/composables/useServiceItems'
import { formatCZK } from '@/lib/invoice'
import type { ServiceItem, ServiceItemInput, VatRate } from '@/lib/types'

const svc = useServiceItems()
const items = ref<ServiceItem[]>([])
const loading = ref(true)
const loadError = ref(false)
const dialogOpen = ref(false)
const editing = ref<ServiceItem | null>(null)
const deleteId = ref<string | null>(null)
const submitting = ref(false)

const vatRates: VatRate[] = [21, 12, 0]
const emptyForm = { name: '', unit: 'h', unitPrice: 0, vatRate: 21 as VatRate, isActive: true }
const form = reactive({ ...emptyForm })

async function reload(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    items.value = await svc.list()
  } catch (e) {
    console.warn('Načtení ceníku služeb selhalo:', e)
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(reload)

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function openNew() {
  editing.value = null
  Object.assign(form, emptyForm)
  dialogOpen.value = true
}
function openEdit(item: ServiceItem) {
  editing.value = item
  Object.assign(form, {
    name: item.name,
    unit: item.unit,
    unitPrice: item.unitPrice,
    vatRate: item.vatRate,
    isActive: item.isActive,
  })
  dialogOpen.value = true
}

async function save() {
  if (submitting.value) return
  if (!form.name.trim()) {
    toast.error('Zadejte název služby.')
    return
  }
  const input: ServiceItemInput = {
    name: form.name.trim(),
    unit: form.unit.trim() || 'h',
    unitPrice: num(form.unitPrice),
    vatRate: form.vatRate,
    isActive: form.isActive,
  }
  submitting.value = true
  try {
    if (editing.value) {
      await svc.update(editing.value.id, input)
      toast.success('Služba upravena.')
    } else {
      await svc.create(input)
      toast.success('Služba přidána.')
    }
    dialogOpen.value = false
    await reload()
  } catch {
    toast.error('Uložení se nezdařilo.')
  } finally {
    submitting.value = false
  }
}

async function onDelete() {
  if (!deleteId.value) return
  try {
    await svc.remove(deleteId.value)
    toast.success('Služba smazána.')
    deleteId.value = null
    await reload()
  } catch {
    toast.error('Smazání se nezdařilo.')
  }
}

const activeCount = computed(() => items.value.filter((i) => i.isActive).length)
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Ceník služeb</h1>
        <p class="mt-1 text-muted-foreground">
          Sazby práce a služeb pro pracovní list zakázky. Ceny jsou bez DPH (NET).
        </p>
      </div>
      <Button variant="coral" @click="openNew"> <Plus class="h-4 w-4" /> Nová služba </Button>
    </div>

    <div v-if="loading" class="mt-12 flex justify-center">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <LoadError v-else-if="loadError" class="mt-6" @retry="reload" />

    <div
      v-else-if="items.length === 0"
      class="mt-12 rounded-2xl border border-border bg-card p-12 text-center"
    >
      <Wrench class="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 class="mt-4 text-lg font-semibold">Zatím žádné služby</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Přidej sazby práce, které budeš účtovat na zakázkách.
      </p>
      <Button variant="coral" class="mt-4" @click="openNew">
        <Plus class="h-4 w-4" /> Nová služba
      </Button>
    </div>

    <template v-else>
      <p class="mt-6 text-sm text-muted-foreground">
        {{ items.length }} služeb · {{ activeCount }} aktivních
      </p>
      <div class="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
        <table class="w-full min-w-[560px] text-sm">
          <thead
            class="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"
          >
            <tr>
              <th class="px-4 py-3 text-left">Název</th>
              <th class="px-4 py-3 text-left">Jednotka</th>
              <th class="px-4 py-3 text-right">Cena / j. (bez DPH)</th>
              <th class="px-4 py-3 text-center">DPH</th>
              <th class="px-4 py-3 text-center">Stav</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.id"
              class="border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td class="px-4 py-3 font-medium">{{ item.name }}</td>
              <td class="px-4 py-3 text-muted-foreground">{{ item.unit }}</td>
              <td class="px-4 py-3 text-right">{{ formatCZK(item.unitPrice) }}</td>
              <td class="px-4 py-3 text-center text-muted-foreground">{{ item.vatRate }} %</td>
              <td class="px-4 py-3 text-center">
                <Badge :variant="item.isActive ? 'default' : 'outline'">
                  {{ item.isActive ? 'Aktivní' : 'Neaktivní' }}
                </Badge>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(item)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Smazat" @click="deleteId = item.id">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Dialog create / edit -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit službu' : 'Nová služba' }}</DialogTitle>
          <DialogDescription>Cena je bez DPH (NET) — DPH se dopočítá u plátce.</DialogDescription>
        </DialogHeader>

        <div class="grid gap-3">
          <div class="grid gap-1.5">
            <Label for="svc-name">Název</Label>
            <Input id="svc-name" v-model="form.name" placeholder="Např. Montážní práce" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label for="svc-unit">Jednotka</Label>
              <Input id="svc-unit" v-model="form.unit" placeholder="h / ks / m" />
            </div>
            <div class="grid gap-1.5">
              <Label for="svc-price">Cena / j. (bez DPH)</Label>
              <Input id="svc-price" v-model.number="form.unitPrice" type="number" min="0" />
            </div>
          </div>
          <div class="grid gap-1.5">
            <Label for="svc-vat">DPH</Label>
            <select
              id="svc-vat"
              v-model.number="form.vatRate"
              class="h-9 rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option v-for="r in vatRates" :key="r" :value="r">{{ r }} %</option>
            </select>
          </div>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox v-model="form.isActive" />
            <span>Aktivní (nabízet na zakázkách)</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="submitting" @click="dialogOpen = false"
            >Zrušit</Button
          >
          <Button variant="coral" :disabled="submitting" @click="save">
            {{ editing ? 'Uložit' : 'Vytvořit' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="!!deleteId" @update:open="(o: boolean) => !o && (deleteId = null)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat službu?</AlertDialogTitle>
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
