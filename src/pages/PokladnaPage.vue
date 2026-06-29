<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Loader2,
  Minus,
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  ShoppingCart,
  Package,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ReceiptDialog from '@/components/ReceiptDialog.vue'
import { useProducts } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import { useSales } from '@/composables/useSales'
import { formatCZK } from '@/lib/invoice'
import { buildReceipt, type ReceiptInfo } from '@/lib/receipt'
import { isApiMode } from '@/lib/http'
import { useCompanyStore } from '@/stores/company'
import { toast } from '@/components/ui/sonner'
import type { Category, PaymentMethod, Product } from '@/lib/types'

const { products, load } = useProducts()
const categoriesApi = useCategories()
const sales = useSales()
const companyStore = useCompanyStore()

const loading = ref(true)
const paying = ref(false)
const apiMode = isApiMode()

// Účtenka po zaplacení (náhled + tisk/PDF).
const receiptOpen = ref(false)
const receiptData = ref<ReceiptInfo | null>(null)

const categories = ref<Category[]>([])
const selectedCat = ref('')
const visibleProducts = computed(() =>
  selectedCat.value
    ? products.value.filter((p) => p.categoryId === selectedCat.value)
    : products.value,
)

interface CartLine {
  product: Product
  quantity: number
}
const cart = ref<CartLine[]>([])

const total = computed(() =>
  cart.value.reduce((sum, l) => sum + l.product.salePrice * l.quantity, 0),
)
const itemCount = computed(() => cart.value.reduce((sum, l) => sum + l.quantity, 0))

onMounted(async () => {
  companyStore.init() // profil firmy (název/adresa) pro hlavičku účtenky
  if (!apiMode) {
    loading.value = false
    return
  }
  loading.value = true
  await load()
  try {
    categories.value = await categoriesApi.list()
  } catch (e) {
    console.error(e)
  }
  loading.value = false
})

function addToCart(p: Product) {
  const line = cart.value.find((l) => l.product.id === p.id)
  if (line) line.quantity++
  else cart.value.push({ product: p, quantity: 1 })
}

function inc(line: CartLine) {
  line.quantity++
}
function dec(line: CartLine) {
  line.quantity--
  if (line.quantity <= 0) cart.value = cart.value.filter((l) => l !== line)
}
function removeLine(line: CartLine) {
  cart.value = cart.value.filter((l) => l !== line)
}
function clearCart() {
  cart.value = []
}

async function pay(method: PaymentMethod) {
  if (!cart.value.length || paying.value) return
  paying.value = true
  try {
    const receiptLines = cart.value.map((l) => ({
      name: l.product.name,
      qty: l.quantity,
      total: l.product.salePrice * l.quantity,
    }))
    const items = cart.value.map((l) => ({
      productId: l.product.id,
      description: l.product.name,
      quantity: l.quantity,
      unitPrice: l.product.salePrice,
      vatRate: l.product.vatRate,
    }))
    const sale = await sales.create(method, items)
    receiptData.value = buildReceipt({
      company: companyStore.company,
      items: receiptLines,
      total: sale.total,
      method,
      id: sale.id,
    })
    receiptOpen.value = true // účtenka po zaplacení (náhled + tisk)
    toast.success(`Zaplaceno ${formatCZK(sale.total)} ${method === 'Cash' ? 'hotově' : 'kartou'}.`)
    clearCart()
  } catch (e) {
    toast.error('Prodej se nepodařilo dokončit. Zkontrolujte připojení k serveru.')
    console.error(e)
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div class="p-4 sm:p-6">
    <h1 class="mb-4 text-2xl font-bold tracking-tight">Pokladna</h1>

    <!-- POS funguje jen proti reálnému backendu -->
    <div
      v-if="!apiMode"
      class="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground"
    >
      <ShoppingCart class="mx-auto h-10 w-10" />
      <p class="mt-3 font-semibold text-foreground">Pokladna potřebuje připojení k serveru</p>
      <p class="mt-1 text-sm">
        Nastavte <code>VITE_API_URL</code> a spusťte backend (vystaveno-api).
      </p>
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-[1fr_360px]">
      <!-- Dlaždice produktů -->
      <div class="rounded-2xl border border-border bg-card p-4">
        <div v-if="loading" class="flex justify-center p-12">
          <Loader2 class="h-6 w-6 animate-spin text-primary" />
        </div>
        <div
          v-else-if="products.length === 0"
          class="flex flex-col items-center p-12 text-center text-muted-foreground"
        >
          <Package class="h-10 w-10" />
          <p class="mt-3 font-semibold text-foreground">Zatím žádné produkty</p>
          <p class="mt-1 text-sm">Nejdřív přidejte produkty do katalogu.</p>
          <Button as-child variant="coral" class="mt-4">
            <RouterLink to="/app/sklad"><Plus class="h-4 w-4" /> Přidat produkty</RouterLink>
          </Button>
        </div>
        <template v-else>
          <div v-if="categories.length" class="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                selectedCat === ''
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              "
              @click="selectedCat = ''"
            >
              Vše
            </button>
            <button
              v-for="c in categories"
              :key="c.id"
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              :class="
                selectedCat === c.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              "
              @click="selectedCat = c.id"
            >
              {{ c.name }}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button
              v-for="p in visibleProducts"
              :key="p.id"
              type="button"
              class="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary-soft active:scale-[0.98]"
              @click="addToCart(p)"
            >
              <span class="font-semibold leading-tight">{{ p.name }}</span>
              <span class="mt-2 text-sm font-bold text-primary tabular-nums">{{
                formatCZK(p.salePrice)
              }}</span>
            </button>
          </div>
        </template>
      </div>

      <!-- Košík -->
      <div class="flex h-fit flex-col rounded-2xl border border-border bg-card lg:sticky lg:top-4">
        <div class="flex items-center justify-between border-b border-border p-4">
          <div class="flex items-center gap-2 font-semibold">
            <ShoppingCart class="h-5 w-5" /> Účtenka
            <span v-if="itemCount" class="text-sm text-muted-foreground">({{ itemCount }})</span>
          </div>
          <Button
            v-if="cart.length"
            variant="ghost"
            size="sm"
            class="text-muted-foreground"
            @click="clearCart"
          >
            Vyprázdnit
          </Button>
        </div>

        <div v-if="!cart.length" class="p-8 text-center text-sm text-muted-foreground">
          Klepnutím na produkt ho přidáte na účtenku.
        </div>
        <div v-else class="divide-y divide-border">
          <div v-for="line in cart" :key="line.product.id" class="flex items-center gap-2 p-3">
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium">{{ line.product.name }}</div>
              <div class="text-xs text-muted-foreground tabular-nums">
                {{ formatCZK(line.product.salePrice) }} × {{ line.quantity }}
              </div>
            </div>
            <div class="flex items-center gap-1">
              <Button variant="outline" size="icon" class="h-8 w-8" @click="dec(line)">
                <Minus class="h-3.5 w-3.5" />
              </Button>
              <span class="w-6 text-center tabular-nums">{{ line.quantity }}</span>
              <Button variant="outline" size="icon" class="h-8 w-8" @click="inc(line)">
                <Plus class="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                title="Odebrat"
                @click="removeLine(line)"
              >
                <Trash2 class="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <div class="border-t border-border p-4">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-sm text-muted-foreground">Celkem</span>
            <span class="text-2xl font-bold tabular-nums">{{ formatCZK(total) }}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <Button
              variant="coral"
              size="lg"
              :disabled="!cart.length || paying"
              @click="pay('Cash')"
            >
              <Loader2 v-if="paying" class="h-4 w-4 animate-spin" />
              <Banknote v-else class="h-4 w-4" /> Hotově
            </Button>
            <Button
              variant="outline"
              size="lg"
              :disabled="!cart.length || paying"
              @click="pay('Card')"
            >
              <CreditCard class="h-4 w-4" /> Kartou
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Účtenka po zaplacení (náhled + tisk/PDF) -->
    <ReceiptDialog v-model:open="receiptOpen" :receipt="receiptData" />
  </div>
</template>
