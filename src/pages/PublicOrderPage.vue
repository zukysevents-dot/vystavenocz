<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bike,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBasket,
  Trash2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ModifierSelectDialog from '@/components/app/ModifierSelectDialog.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePublicOrders } from '@/composables/usePublicOrders'
import { formatAllergens } from '@/lib/allergens'
import { formatCZK } from '@/lib/invoice'
import type {
  ModifierOption,
  OrderFulfillment,
  PublicMenuCategory,
  PublicMenuProduct,
  PublicOrderConfirmation,
} from '@/lib/types'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
const tableId = computed(() => {
  const value = route.query.table
  return typeof value === 'string' && value.trim() ? value.trim() : null
})
const tableName = computed(() => {
  const value = route.query.name
  return typeof value === 'string' && value.trim() ? value.trim() : 'váš stůl'
})
const tableMode = computed(() => !!tableId.value)
const publicOrders = usePublicOrders()

const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const submitError = ref(false)
const confirmation = ref<PublicOrderConfirmation | null>(null)
const categories = ref<PublicMenuCategory[]>([])
const products = ref<PublicMenuProduct[]>([])
const checkoutPanel = ref<HTMLElement | null>(null)
const cart = ref<PublicCartLine[]>([])
const modifierDialogOpen = ref(false)
const modifierProduct = ref<PublicMenuProduct | null>(null)

interface PublicCartLine {
  id: string
  productId: string
  quantity: number
  modifierOptionIds: string[]
}

type PublicCartModifier = ModifierOption & { groupName: string }

interface PublicCartItem {
  line: PublicCartLine
  product: PublicMenuProduct
  modifiers: PublicCartModifier[]
  unitPrice: number
  lineTotal: number
}

const form = reactive<{
  customerName: string
  customerPhone: string
  note: string
  fulfillment: OrderFulfillment
  address: string
}>({
  customerName: '',
  customerPhone: '',
  note: '',
  fulfillment: 'pickup',
  address: '',
})

const uncategorizedCategory: PublicMenuCategory = {
  id: '__uncategorized__',
  name: 'Menu',
  sortOrder: 9999,
}

const groupedMenu = computed(() => {
  const visibleProducts = products.value.filter((p) => p.available)
  const categoryRows = categories.value
    .map((category) => ({
      category,
      products: visibleProducts.filter((p) => p.categoryId === category.id),
    }))
    .filter((group) => group.products.length > 0)
  const uncategorizedProducts = visibleProducts.filter(
    (p) => !p.categoryId || !categories.value.some((c) => c.id === p.categoryId),
  )
  if (uncategorizedProducts.length) {
    categoryRows.push({ category: uncategorizedCategory, products: uncategorizedProducts })
  }
  return categoryRows
})

const cartItems = computed(() =>
  cart.value
    .map((line) => {
      const product = products.value.find((p) => p.id === line.productId)
      if (!product) return null
      const modifiers = selectedModifierOptions(product, line.modifierOptionIds)
      const unitPrice = productUnitPrice(product, line.modifierOptionIds)
      return {
        line,
        product,
        modifiers,
        unitPrice,
        lineTotal: unitPrice * line.quantity,
      }
    })
    .filter((row): row is PublicCartItem => !!row),
)

const itemCount = computed(() =>
  cartItems.value.reduce((sum, row) => sum + Number(row.line.quantity || 0), 0),
)
const itemCountWord = computed(() =>
  itemCount.value === 1
    ? 'položka'
    : itemCount.value >= 2 && itemCount.value <= 4
      ? 'položky'
      : 'položek',
)
const total = computed(() => cartItems.value.reduce((sum, row) => sum + row.lineTotal, 0))
const canSubmit = computed(
  () =>
    itemCount.value > 0 &&
    !!form.customerName.trim() &&
    (tableMode.value || form.fulfillment === 'pickup' || !!form.address.trim()),
)
const showMobileCartBar = computed(
  () =>
    !loading.value &&
    !loadError.value &&
    !confirmation.value &&
    products.value.length > 0 &&
    itemCount.value > 0,
)
const modifierDialogProduct = computed(() =>
  modifierProduct.value
    ? {
        id: modifierProduct.value.id,
        name: modifierProduct.value.name,
        salePrice: modifierProduct.value.priceWithVat,
      }
    : null,
)
const modifierDialogGroups = computed(() => modifierProduct.value?.modifierGroups ?? [])

onMounted(async () => {
  try {
    const response = await publicOrders.menu(slug.value)
    categories.value = response.categories
    products.value = response.products.map((product) => ({
      ...product,
      modifierGroups: product.modifierGroups ?? [],
    }))
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})

function add(product: PublicMenuProduct) {
  if (product.modifierGroups.length > 0) {
    modifierProduct.value = product
    modifierDialogOpen.value = true
    return
  }
  addCartLine(product, [])
}

function addCartLine(product: PublicMenuProduct, modifierOptionIds: string[]) {
  const normalizedModifierOptionIds = normalizeModifierOptionIds(modifierOptionIds)
  const key = cartKey(product.id, normalizedModifierOptionIds)
  const existing = cart.value.find(
    (line) => cartKey(line.productId, line.modifierOptionIds) === key,
  )
  if (existing) existing.quantity += 1
  else {
    cart.value.push({
      id: crypto.randomUUID(),
      productId: product.id,
      quantity: 1,
      modifierOptionIds: normalizedModifierOptionIds,
    })
  }
}

function confirmModifiers(modifierOptionIds: string[]) {
  if (modifierProduct.value) addCartLine(modifierProduct.value, modifierOptionIds)
  modifierDialogOpen.value = false
}

function decrease(lineId: string) {
  const line = cart.value.find((row) => row.id === lineId)
  if (!line) return
  line.quantity -= 1
  if (line.quantity <= 0) remove(lineId)
}

function remove(lineId: string) {
  cart.value = cart.value.filter((line) => line.id !== lineId)
}

function cartKey(productId: string, modifierOptionIds: string[]) {
  return `${productId}:${normalizeModifierOptionIds(modifierOptionIds).join('|')}`
}

function normalizeModifierOptionIds(modifierOptionIds: string[]) {
  return [...modifierOptionIds].sort()
}

function selectedModifierOptions(product: PublicMenuProduct, modifierOptionIds: string[]) {
  const selected = new Set(modifierOptionIds)
  return product.modifierGroups
    .flatMap((group) => group.options.map((option) => ({ ...option, groupName: group.name })))
    .filter((option) => selected.has(option.id))
}

function productUnitPrice(product: PublicMenuProduct, modifierOptionIds: string[]) {
  return (
    product.priceWithVat +
    selectedModifierOptions(product, modifierOptionIds).reduce(
      (sum, option) => sum + option.priceDelta,
      0,
    )
  )
}

function scrollToCheckout() {
  checkoutPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function submit() {
  if (submitting.value || !canSubmit.value) return
  submitting.value = true
  submitError.value = false
  try {
    confirmation.value = await publicOrders.order(slug.value, {
      items: cartItems.value.map((row) => ({
        productId: row.product.id,
        quantity: row.line.quantity,
        ...(row.line.modifierOptionIds.length
          ? { modifierOptionIds: row.line.modifierOptionIds }
          : {}),
      })),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim() || null,
      note: form.note.trim() || null,
      fulfillment: form.fulfillment,
      address: !tableMode.value && form.fulfillment === 'delivery' ? form.address.trim() : null,
      tableId: tableId.value,
    })
  } catch {
    submitError.value = true
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:py-10" :class="showMobileCartBar ? 'pb-28' : ''">
    <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
          {{ tableMode ? 'Objednávka ke stolu' : 'Online objednávka' }}
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            tableMode
              ? 'Vyberte jídlo a objednávka půjde rovnou do kuchyně k vašemu stolu.'
              : 'Vyberte jídlo, zvolte vyzvednutí nebo rozvoz a objednávka půjde rovnou do kuchyně.'
          }}
        </p>
        <div
          v-if="tableMode"
          class="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium"
        >
          <MapPin class="h-4 w-4 text-primary" />
          {{ tableName }}
        </div>
      </div>
      <div
        class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
      >
        <ShoppingBasket class="h-4 w-4 text-primary" />
        <span>{{ itemCount }} položek</span>
        <span class="font-semibold">{{ formatCZK(total) }}</span>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <Loader2 class="h-6 w-6 animate-spin text-primary" />
    </div>

    <div v-else-if="loadError" class="rounded-lg border border-border bg-card p-8 text-center">
      <h2 class="text-lg font-semibold">Objednávky nejsou dostupné</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Odkaz je neplatný nebo tato firma zatím online objednávky nenabízí.
      </p>
    </div>

    <div v-else-if="confirmation" class="rounded-lg border border-border bg-card p-8 text-center">
      <CheckCircle2 class="mx-auto h-12 w-12 text-success" />
      <h2 class="mt-4 text-lg font-semibold">Objednávka přijata</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Celkem {{ formatCZK(confirmation.total) }}.
        {{
          tableMode
            ? 'Objednávka už je v kuchyni a zaplatíte ji u obsluhy.'
            : 'Objednávka už je v provozu.'
        }}
      </p>
      <p class="mt-2 text-xs text-muted-foreground">ID objednávky: {{ confirmation.orderId }}</p>
    </div>

    <div
      v-else-if="products.length === 0"
      class="rounded-lg border border-border bg-card p-8 text-center"
    >
      <h2 class="text-lg font-semibold">Menu je prázdné</h2>
      <p class="mt-1 text-sm text-muted-foreground">Provoz zatím nemá žádné položky k objednání.</p>
    </div>

    <div v-else class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="space-y-5">
        <section v-for="group in groupedMenu" :key="group.category.id">
          <h2 class="mb-3 text-lg font-semibold">{{ group.category.name }}</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <article
              v-for="product in group.products"
              :key="product.id"
              class="flex min-h-28 flex-col justify-between rounded-lg border border-border bg-card p-4"
            >
              <div>
                <h3 class="font-semibold leading-tight">{{ product.name }}</h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ formatCZK(product.priceWithVat) }}
                </p>
                <p v-if="product.allergens?.length" class="mt-1 text-xs text-muted-foreground">
                  Alergeny: {{ formatAllergens(product.allergens) }}
                </p>
              </div>
              <Button type="button" variant="outline" class="mt-3 w-full" @click="add(product)">
                <Plus class="h-4 w-4" />
                {{ product.modifierGroups.length ? 'Vybrat' : 'Přidat' }}
              </Button>
            </article>
          </div>
        </section>
      </div>

      <aside
        ref="checkoutPanel"
        class="h-fit rounded-lg border border-border bg-card p-4 lg:sticky lg:top-24"
      >
        <h2 class="flex items-center gap-2 font-semibold">
          <ShoppingBasket class="h-4 w-4 text-primary" />
          Košík
        </h2>

        <div v-if="cartItems.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          Zatím nic v košíku.
        </div>

        <div v-else class="mt-3 divide-y divide-border">
          <div v-for="row in cartItems" :key="row.line.id" class="py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">{{ row.product.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ row.line.quantity }} × {{ formatCZK(row.unitPrice) }}
                </div>
                <div v-if="row.modifiers.length" class="mt-1 space-y-0.5">
                  <div
                    v-for="modifier in row.modifiers"
                    :key="modifier.id"
                    class="text-xs text-muted-foreground"
                  >
                    {{ modifier.name }}
                    <span v-if="modifier.priceDelta">
                      ({{ modifier.priceDelta > 0 ? '+' : '' }}{{ formatCZK(modifier.priceDelta) }})
                    </span>
                  </div>
                </div>
              </div>
              <div class="font-semibold tabular-nums">
                {{ formatCZK(row.lineTotal) }}
              </div>
            </div>
            <div class="mt-2 flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="h-8 w-8"
                @click="decrease(row.line.id)"
              >
                <Minus class="h-3.5 w-3.5" />
              </Button>
              <span class="w-10 text-center text-sm tabular-nums">{{ row.line.quantity }}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="h-8 w-8"
                @click="addCartLine(row.product, row.line.modifierOptionIds)"
              >
                <Plus class="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="ml-auto h-8 w-8"
                title="Odebrat položku"
                @click="remove(row.line.id)"
              >
                <Trash2 class="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <form class="mt-4 space-y-4 border-t border-border pt-4" @submit.prevent="submit">
          <div v-if="!tableMode" class="grid grid-cols-2 gap-2">
            <Button
              type="button"
              :variant="form.fulfillment === 'pickup' ? 'coral' : 'outline'"
              @click="form.fulfillment = 'pickup'"
            >
              <PackageCheck class="h-4 w-4" />
              Výdej
            </Button>
            <Button
              type="button"
              :variant="form.fulfillment === 'delivery' ? 'coral' : 'outline'"
              @click="form.fulfillment = 'delivery'"
            >
              <Bike class="h-4 w-4" />
              Rozvoz
            </Button>
          </div>

          <div class="grid gap-1.5">
            <Label for="po-name">Jméno</Label>
            <Input id="po-name" v-model="form.customerName" placeholder="Vaše jméno" />
          </div>

          <div class="grid gap-1.5">
            <Label for="po-phone">Telefon</Label>
            <Input id="po-phone" v-model="form.customerPhone" placeholder="nepovinné" />
          </div>

          <div v-if="form.fulfillment === 'delivery'" class="grid gap-1.5">
            <Label for="po-address">Adresa rozvozu</Label>
            <Textarea id="po-address" v-model="form.address" rows="2" />
          </div>

          <div class="grid gap-1.5">
            <Label for="po-note">Poznámka</Label>
            <Textarea id="po-note" v-model="form.note" rows="2" placeholder="např. bez cibule" />
          </div>

          <div class="flex items-center justify-between border-t border-border pt-3">
            <span class="text-sm text-muted-foreground">Celkem</span>
            <span class="text-lg font-bold tabular-nums">{{ formatCZK(total) }}</span>
          </div>

          <p v-if="submitError" class="text-sm text-destructive">
            Odeslání se nezdařilo. Zkontrolujte údaje a zkuste to znovu.
          </p>

          <Button type="submit" variant="coral" class="w-full" :disabled="!canSubmit || submitting">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            Odeslat objednávku
          </Button>
        </form>
      </aside>
    </div>

    <ModifierSelectDialog
      v-model:open="modifierDialogOpen"
      :product="modifierDialogProduct"
      :groups="modifierDialogGroups"
      confirm-label="Přidat do košíku"
      @confirm="confirmModifiers"
    />

    <div
      v-if="showMobileCartBar"
      class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur lg:hidden"
    >
      <div class="mx-auto flex max-w-6xl items-center gap-3">
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold">
            {{ itemCount }} {{ itemCountWord }} v košíku
          </div>
          <div class="text-xs text-muted-foreground">{{ formatCZK(total) }}</div>
        </div>
        <Button type="button" variant="coral" size="sm" class="shrink-0" @click="scrollToCheckout">
          <ShoppingBasket class="h-4 w-4" />
          Košík
        </Button>
      </div>
    </div>
  </div>
</template>
