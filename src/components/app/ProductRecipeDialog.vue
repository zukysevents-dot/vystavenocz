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
import { useProductRecipes } from '@/composables/useProductRecipes'
import { isApiMode } from '@/lib/http'
import { formatCZK } from '@/lib/invoice'
import type { Product } from '@/lib/types'

type RecipeRow = {
  id: string
  productId: string
  quantity: number
}

const props = defineProps<{
  open: boolean
  product: Product | null
  products: Product[]
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const recipesApi = useProductRecipes()
const apiMode = isApiMode()

const rows = ref<RecipeRow[]>([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)

const ingredientProducts = computed(() =>
  props.products
    .filter((p) => p.id !== props.product?.id)
    .sort((a, b) => a.name.localeCompare(b.name, 'cs')),
)

const estimatedCost = computed(() =>
  rows.value.reduce((sum, row) => {
    const product = props.products.find((p) => p.id === row.productId)
    return sum + (Number(product?.purchasePrice) || 0) * (Number(row.quantity) || 0)
  }, 0),
)
const salePrice = computed(() => Number(props.product?.salePrice) || 0)
const grossMargin = computed(() => salePrice.value - estimatedCost.value)
const grossMarginPercent = computed(() =>
  salePrice.value === 0 ? 0 : (grossMargin.value / salePrice.value) * 100,
)
const foodCostPercent = computed(() =>
  salePrice.value === 0 ? 0 : (estimatedCost.value / salePrice.value) * 100,
)

function setOpen(open: boolean) {
  emit('update:open', open)
}

function addIngredient() {
  const firstAvailable = ingredientProducts.value.find(
    (p) => !rows.value.some((row) => row.productId === p.id),
  )
  rows.value.push({
    id: crypto.randomUUID(),
    productId: firstAvailable?.id ?? '',
    quantity: 1,
  })
}

function removeIngredient(id: string) {
  rows.value = rows.value.filter((row) => row.id !== id)
}

function productLabel(productId: string): string {
  const product = props.products.find((p) => p.id === productId)
  if (!product) return 'Vyberte surovinu'
  return `${product.name} (${product.sku})`
}

function lineCost(row: RecipeRow): number {
  const product = props.products.find((p) => p.id === row.productId)
  return (Number(product?.purchasePrice) || 0) * (Number(row.quantity) || 0)
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} %`
}

async function loadRecipe() {
  const product = props.product
  if (!product || !apiMode) {
    rows.value = []
    return
  }

  loading.value = true
  try {
    const loaded = await recipesApi.get(product.id)
    rows.value =
      loaded?.ingredients.map((ingredient) => ({
        id: crypto.randomUUID(),
        productId: ingredient.productId,
        quantity: ingredient.quantity,
      })) ?? []
  } catch (e) {
    toast.error('Recepturu se nepodařilo načíst.')
    console.error(e)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function validateRows(): boolean {
  if (!props.product) return false
  if (rows.value.length === 0) {
    toast.error('Přidejte alespoň jednu surovinu.')
    return false
  }

  const selected = new Set<string>()
  for (const row of rows.value) {
    if (!row.productId) {
      toast.error('Vyberte surovinu u každého řádku.')
      return false
    }
    if (row.productId === props.product.id) {
      toast.error('Produkt nemůže být surovinou sám sobě.')
      return false
    }
    if (selected.has(row.productId)) {
      toast.error('Každá surovina může být v receptuře jen jednou.')
      return false
    }
    if (!(Number(row.quantity) > 0)) {
      toast.error('Množství suroviny musí být kladné.')
      return false
    }
    selected.add(row.productId)
  }
  return true
}

async function saveRecipe() {
  const product = props.product
  if (!product || !validateRows()) return

  saving.value = true
  try {
    await recipesApi.upsert(
      product.id,
      rows.value.map((row) => ({ productId: row.productId, quantity: Number(row.quantity) })),
    )
    toast.success('Receptura uložena.')
    setOpen(false)
  } catch (e) {
    toast.error('Uložení receptury selhalo.')
    console.error(e)
  } finally {
    saving.value = false
  }
}

async function deleteRecipe() {
  const product = props.product
  if (!product) return

  deleting.value = true
  try {
    await recipesApi.remove(product.id)
    rows.value = []
    toast.success('Receptura smazána.')
    setOpen(false)
  } catch (e) {
    toast.error('Smazání receptury selhalo.')
    console.error(e)
  } finally {
    deleting.value = false
  }
}

watch(
  () => [props.open, props.product?.id] as const,
  ([open]) => {
    if (open) void loadRecipe()
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="setOpen">
    <DialogContent class="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Receptura</DialogTitle>
        <DialogDescription>
          {{ product ? productLabel(product.id) : 'Vyberte produkt' }}
        </DialogDescription>
      </DialogHeader>

      <div
        v-if="!apiMode"
        class="rounded-lg border border-border p-4 text-sm text-muted-foreground"
      >
        Receptury jsou dostupné po připojení k API.
      </div>

      <div v-else-if="loading" class="flex justify-center py-10">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <div v-else class="space-y-5">
        <div class="rounded-lg border border-border">
          <div
            class="grid grid-cols-[1fr_8rem_6rem_2.5rem] gap-3 border-b border-border px-3 py-2 text-sm text-muted-foreground"
          >
            <div>Surovina</div>
            <div>Množství</div>
            <div class="text-right">Náklad</div>
            <div />
          </div>

          <div v-if="rows.length === 0" class="p-6 text-center text-sm text-muted-foreground">
            Zatím žádné suroviny.
          </div>

          <div
            v-for="row in rows"
            :key="row.id"
            class="grid grid-cols-[1fr_8rem_6rem_2.5rem] items-end gap-3 border-b border-border px-3 py-3 last:border-b-0"
          >
            <div class="space-y-2">
              <Label :for="`ingredient-${row.id}`" class="sr-only">Surovina</Label>
              <select
                :id="`ingredient-${row.id}`"
                v-model="row.productId"
                class="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Vyberte surovinu</option>
                <option
                  v-for="ingredient in ingredientProducts"
                  :key="ingredient.id"
                  :value="ingredient.id"
                >
                  {{ ingredient.name }} ({{ ingredient.sku }})
                </option>
              </select>
            </div>

            <div class="space-y-2">
              <Label :for="`quantity-${row.id}`" class="sr-only">Množství</Label>
              <Input
                :id="`quantity-${row.id}`"
                v-model.number="row.quantity"
                type="number"
                min="0"
                step="0.001"
              />
            </div>

            <div class="pb-2 text-right text-sm font-medium tabular-nums">
              {{ formatCZK(lineCost(row)) }}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Odebrat surovinu"
              @click="removeIngredient(row.id)"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" @click="addIngredient">
            <Plus class="h-4 w-4" /> Přidat surovinu
          </Button>
          <div
            class="grid w-full grid-cols-2 gap-3 rounded-lg border border-border p-3 text-right sm:w-auto sm:min-w-[34rem] sm:grid-cols-4"
          >
            <div>
              <div class="text-sm text-muted-foreground">Náklady</div>
              <div class="text-lg font-semibold tabular-nums">
                {{ formatCZK(estimatedCost) }}
              </div>
            </div>
            <div>
              <div class="text-sm text-muted-foreground">Prodej</div>
              <div class="text-lg font-semibold tabular-nums">
                {{ formatCZK(salePrice) }}
              </div>
            </div>
            <div>
              <div class="text-sm text-muted-foreground">Marže</div>
              <div class="text-lg font-semibold tabular-nums">
                {{ formatCZK(grossMargin) }}
              </div>
              <div class="text-xs text-muted-foreground tabular-nums">
                {{ formatPercent(grossMarginPercent) }}
              </div>
            </div>
            <div>
              <div class="text-sm text-muted-foreground">Food cost</div>
              <div class="text-lg font-semibold tabular-nums">
                {{ formatPercent(foodCostPercent) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" @click="setOpen(false)">Zavřít</Button>
        <Button
          v-if="apiMode && rows.length > 0"
          type="button"
          variant="outline"
          :disabled="deleting || saving"
          @click="deleteRecipe"
        >
          <Loader2 v-if="deleting" class="h-4 w-4 animate-spin" />
          Smazat recepturu
        </Button>
        <Button type="button" variant="coral" :disabled="!apiMode || saving" @click="saveRecipe">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Uložit recepturu
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
