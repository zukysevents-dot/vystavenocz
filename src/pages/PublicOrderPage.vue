<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bike,
  CheckCircle2,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBasket,
  Trash2,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { usePublicOrders } from '@/composables/usePublicOrders'
import { formatCZK } from '@/lib/invoice'
import type {
  OrderFulfillment,
  PublicMenuCategory,
  PublicMenuProduct,
  PublicOrderConfirmation,
} from '@/lib/types'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
const publicOrders = usePublicOrders()

const loading = ref(true)
const loadError = ref(false)
const submitting = ref(false)
const submitError = ref(false)
const confirmation = ref<PublicOrderConfirmation | null>(null)
const categories = ref<PublicMenuCategory[]>([])
const products = ref<PublicMenuProduct[]>([])
const cart = reactive<Record<string, number>>({})

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
  Object.entries(cart)
    .map(([productId, quantity]) => ({
      product: products.value.find((p) => p.id === productId),
      quantity,
    }))
    .filter((row): row is { product: PublicMenuProduct; quantity: number } => !!row.product),
)

const itemCount = computed(() =>
  cartItems.value.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
)
const total = computed(() =>
  cartItems.value.reduce((sum, row) => sum + row.product.priceWithVat * row.quantity, 0),
)
const canSubmit = computed(
  () =>
    itemCount.value > 0 &&
    !!form.customerName.trim() &&
    (form.fulfillment === 'pickup' || !!form.address.trim()),
)

onMounted(async () => {
  try {
    const response = await publicOrders.menu(slug.value)
    categories.value = response.categories
    products.value = response.products
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})

function add(product: PublicMenuProduct) {
  cart[product.id] = (cart[product.id] ?? 0) + 1
}

function decrease(productId: string) {
  const next = (cart[productId] ?? 0) - 1
  if (next > 0) cart[productId] = next
  else delete cart[productId]
}

function remove(productId: string) {
  delete cart[productId]
}

async function submit() {
  if (submitting.value || !canSubmit.value) return
  submitting.value = true
  submitError.value = false
  try {
    confirmation.value = await publicOrders.order(slug.value, {
      items: cartItems.value.map((row) => ({
        productId: row.product.id,
        quantity: row.quantity,
      })),
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim() || null,
      note: form.note.trim() || null,
      fulfillment: form.fulfillment,
      address: form.fulfillment === 'delivery' ? form.address.trim() : null,
    })
  } catch {
    submitError.value = true
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:py-10">
    <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Online objednávka</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Vyberte jídlo, zvolte vyzvednutí nebo rozvoz a objednávka půjde rovnou do kuchyně.
        </p>
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
        Celkem {{ formatCZK(confirmation.total) }}. Objednávka už je v provozu.
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
              </div>
              <Button type="button" variant="outline" class="mt-3 w-full" @click="add(product)">
                <Plus class="h-4 w-4" />
                Přidat
              </Button>
            </article>
          </div>
        </section>
      </div>

      <aside class="h-fit rounded-lg border border-border bg-card p-4 lg:sticky lg:top-24">
        <h2 class="flex items-center gap-2 font-semibold">
          <ShoppingBasket class="h-4 w-4 text-primary" />
          Košík
        </h2>

        <div v-if="cartItems.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          Zatím nic v košíku.
        </div>

        <div v-else class="mt-3 divide-y divide-border">
          <div v-for="row in cartItems" :key="row.product.id" class="py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">{{ row.product.name }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ row.quantity }} × {{ formatCZK(row.product.priceWithVat) }}
                </div>
              </div>
              <div class="font-semibold tabular-nums">
                {{ formatCZK(row.product.priceWithVat * row.quantity) }}
              </div>
            </div>
            <div class="mt-2 flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="h-8 w-8"
                @click="decrease(row.product.id)"
              >
                <Minus class="h-3.5 w-3.5" />
              </Button>
              <span class="w-10 text-center text-sm tabular-nums">{{ row.quantity }}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="h-8 w-8"
                @click="add(row.product)"
              >
                <Plus class="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="ml-auto h-8 w-8"
                title="Odebrat položku"
                @click="remove(row.product.id)"
              >
                <Trash2 class="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <form class="mt-4 space-y-4 border-t border-border pt-4" @submit.prevent="submit">
          <div class="grid grid-cols-2 gap-2">
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
  </div>
</template>
