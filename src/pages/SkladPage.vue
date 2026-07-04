<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus, Search, Loader2, Pencil, Trash2, Package, Tags, Upload } from 'lucide-vue-next'
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
import { useProducts, type ProductInput } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import { toast } from '@/components/ui/sonner'
import type { Category, Product } from '@/lib/types'

const { products, load, create, update, remove } = useProducts()
const categoriesApi = useCategories()
const apiMode = isApiMode()
const categories = ref<Category[]>([])

const loading = ref(true)
const search = ref('')
const editing = ref<Product | null>(null)
const dialogOpen = ref(false)
const deleteId = ref<string | null>(null)
const deleteOpen = ref(false)
const submitting = ref(false)

function askDelete(id: string) {
  deleteId.value = id
  deleteOpen.value = true
}

const VAT_RATES = [0, 12, 21]

type ProductForm = {
  name: string
  salePrice: number
  vatRate: number
  sku: string
  ean: string
  categoryId: string
}

const emptyForm: ProductForm = {
  name: '',
  salePrice: 0,
  vatRate: 21,
  sku: '',
  ean: '',
  categoryId: '',
}
const form = reactive<ProductForm>({ ...emptyForm })

onMounted(async () => {
  loading.value = true
  await load()
  if (apiMode) {
    try {
      categories.value = await categoriesApi.list()
    } catch (e) {
      console.error(e)
    }
  }
  loading.value = false
})

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return products.value.filter((p) => {
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })
})

function openCreate() {
  editing.value = null
  dialogOpen.value = true
}

function openEdit(p: Product) {
  editing.value = p
  dialogOpen.value = true
}

watch(dialogOpen, (open) => {
  if (open) {
    if (editing.value) {
      const p = editing.value
      Object.assign(form, {
        name: p.name,
        salePrice: p.salePrice,
        vatRate: p.vatRate,
        sku: p.sku,
        ean: p.ean ?? '',
        categoryId: p.categoryId ?? '',
      })
    } else {
      Object.assign(form, { ...emptyForm })
    }
  }
})

async function onSubmit() {
  if (!form.name.trim()) {
    toast.error('Zadejte název produktu.')
    return
  }
  if (!form.sku.trim()) {
    toast.error('Zadejte kód produktu (SKU).')
    return
  }
  submitting.value = true
  const payload: ProductInput = {
    name: form.name.trim(),
    sku: form.sku.trim(),
    ean: form.ean.trim() || null,
    salePrice: Number(form.salePrice) || 0,
    vatRate: form.vatRate,
    purchasePrice: null,
    minQuantity: 0,
    categoryId: form.categoryId || null,
  }
  try {
    if (editing.value) {
      await update(editing.value.id, payload)
      toast.success('Produkt upraven.')
    } else {
      await create(payload)
      toast.success('Produkt přidán.')
    }
    dialogOpen.value = false
  } catch (e) {
    toast.error('Uložení selhalo. Zkontrolujte připojení k serveru.')
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
    await remove(id)
    toast.success('Produkt smazán.')
  } catch (e) {
    toast.error('Smazání selhalo.')
    console.error(e)
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Sklad / katalog</h1>
        <p class="mt-1 text-muted-foreground">Produkty a ceny pro prodej na pokladně.</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" as-child>
          <RouterLink to="/app/import?entity=products"
            ><Upload class="h-4 w-4" /> Importovat</RouterLink
          >
        </Button>
        <Button variant="outline" as-child>
          <RouterLink to="/app/kategorie"><Tags class="h-4 w-4" /> Kategorie</RouterLink>
        </Button>
        <Button variant="coral" @click="openCreate"> <Plus class="h-4 w-4" /> Nový produkt </Button>
      </div>
    </div>

    <div class="mt-6 relative">
      <Search
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input v-model="search" class="pl-9" placeholder="Hledat podle názvu nebo kódu…" />
    </div>

    <div class="mt-6 rounded-2xl border border-border bg-card">
      <div v-if="loading" class="flex justify-center p-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center p-12 text-center">
        <Package class="h-10 w-10 text-muted-foreground" />
        <h3 class="mt-3 text-lg font-semibold">
          {{ products.length === 0 ? 'Zatím žádné produkty' : 'Nic nenalezeno' }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            products.length === 0
              ? 'Přidejte první produkt, který budete prodávat na pokladně.'
              : 'Zkuste jiný hledaný výraz.'
          }}
        </p>
        <Button v-if="products.length === 0" variant="coral" class="mt-4" @click="openCreate">
          <Plus class="h-4 w-4" /> Přidat produkt
        </Button>
      </div>
      <div v-else class="divide-y divide-border">
        <div
          v-for="p in filtered"
          :key="p.id"
          class="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/40"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary"
            >
              <Package class="h-5 w-5" />
            </div>
            <div>
              <div class="font-semibold">{{ p.name }}</div>
              <div class="text-sm text-muted-foreground">{{ p.sku }} • DPH {{ p.vatRate }} %</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="font-semibold tabular-nums">{{ formatCZK(p.salePrice) }}</div>
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon" title="Upravit" @click="openEdit(p)">
                <Pencil class="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Smazat" @click="askDelete(p.id)">
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog formuláře (create / edit) -->
    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editing ? 'Upravit produkt' : 'Nový produkt' }}</DialogTitle>
          <DialogDescription>Cena je uvedená včetně DPH (jako na pokladně).</DialogDescription>
        </DialogHeader>

        <form class="space-y-5" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="p-name">Název *</Label>
            <Input id="p-name" v-model="form.name" required placeholder="Espresso" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="p-price">Cena vč. DPH (Kč) *</Label>
              <Input
                id="p-price"
                v-model.number="form.salePrice"
                type="number"
                :min="0"
                step="0.01"
                required
              />
            </div>
            <div class="space-y-2">
              <Label>Sazba DPH</Label>
              <div class="flex gap-2">
                <Button
                  v-for="r in VAT_RATES"
                  :key="r"
                  type="button"
                  :variant="form.vatRate === r ? 'coral' : 'outline'"
                  class="flex-1"
                  @click="form.vatRate = r"
                >
                  {{ r }} %
                </Button>
              </div>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label for="p-sku">Kód (SKU) *</Label>
              <Input id="p-sku" v-model="form.sku" required placeholder="ESP" />
            </div>
            <div class="space-y-2">
              <Label for="p-ean">Čárový kód (EAN)</Label>
              <Input id="p-ean" v-model="form.ean" inputmode="numeric" placeholder="volitelné" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="p-cat">Kategorie</Label>
            <select
              id="p-cat"
              v-model="form.categoryId"
              class="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— bez kategorie —</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" @click="dialogOpen = false">Zrušit</Button>
            <Button type="submit" variant="coral" :disabled="submitting">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              {{ editing ? 'Uložit změny' : 'Přidat produkt' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Potvrzení smazání -->
    <AlertDialog :open="deleteOpen" @update:open="(o) => (deleteOpen = o)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat produkt?</AlertDialogTitle>
          <AlertDialogDescription>
            Produkt se přestane nabízet na pokladně. Dříve vystavené účtenky zůstanou zachovány.
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
