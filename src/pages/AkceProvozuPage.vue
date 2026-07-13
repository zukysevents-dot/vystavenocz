<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { BadgePercent, Clock, Crown, Gift, LoaderCircle, Plus, Trash2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { useCategories } from '@/composables/useCategories'
import { useProducts } from '@/composables/useProducts'
import { usePromotions, type PromotionRuleInput } from '@/composables/usePromotions'
import { isApiMode } from '@/lib/http'
import {
  earnLoyaltyPoints,
  redeemLoyaltyPoints,
  type PriceLevel,
  type PromotionCalculation,
  type PromotionLineInput,
  type PromotionRule,
  type PromotionRuleType,
  type PromotionScope,
} from '@/lib/promotions'
import type { Category, Product } from '@/lib/types'

const DEMO_DRINKS_CATEGORY_ID = '11111111-1111-4111-8111-111111111111'
const DEMO_FOOD_CATEGORY_ID = '22222222-2222-4222-8222-222222222222'
const DEMO_BEER_PRODUCT_ID = '33333333-3333-4333-8333-333333333333'
const DEMO_BURGER_PRODUCT_ID = '44444444-4444-4444-8444-444444444444'

const promotions = usePromotions()
const productsApi = useProducts()
const categoriesApi = useCategories()

const loading = ref(true)
const saving = ref(false)
const calculating = ref(false)
const priceLevels = ref<PriceLevel[]>([])
const rules = ref<PromotionRule[]>([])
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const selectedPriceLevelId = ref<string | null>(null)
const preview = ref<PromotionCalculation | null>(null)

const priceLevelForm = reactive({
  name: '',
  adjustmentPercent: -10,
})

const ruleForm = reactive({
  name: '',
  type: 'percent' as PromotionRuleType,
  scope: 'all' as PromotionScope,
  percent: 10,
  amount: 50,
  productId: '',
  categoryId: '',
  startTime: '',
  endTime: '',
  minSubtotal: 0,
  priority: 10,
})

const sampleBasket = computed<PromotionLineInput[]>(() => {
  const firstDrink = products.value.find(
    (p) => p.categoryId && categoryName(p.categoryId).includes('nápoj'),
  )
  const firstFood = products.value.find((p) => p.id !== firstDrink?.id)
  if (firstDrink || firstFood) {
    return [firstDrink, firstFood]
      .filter((product): product is Product => !!product)
      .map((product, index) => ({
        productId: product.id,
        categoryId: product.categoryId,
        name: product.name,
        quantity: index === 0 ? 2 : 1,
        unitPrice: product.salePrice,
      }))
  }
  return [
    {
      productId: DEMO_BEER_PRODUCT_ID,
      categoryId: DEMO_DRINKS_CATEGORY_ID,
      name: 'Pivo 0,5 l',
      quantity: 2,
      unitPrice: 55,
    },
    {
      productId: DEMO_BURGER_PRODUCT_ID,
      categoryId: DEMO_FOOD_CATEGORY_ID,
      name: 'Hovězí burger',
      quantity: 1,
      unitPrice: 199,
    },
  ]
})

const selectedPriceLevel = computed(
  () => priceLevels.value.find((level) => level.id === selectedPriceLevelId.value) ?? null,
)
const earnedPoints = computed(() =>
  earnLoyaltyPoints(preview.value?.total ?? 0, { crownsPerPoint: 10 }),
)
const redeemed = computed(() =>
  redeemLoyaltyPoints(120, preview.value?.total ?? 0, { pointValue: 1, maxDiscountPercent: 20 }),
)
const hasApiBackend = computed(() => isApiMode())

onMounted(load)
watch([selectedPriceLevelId, rules, sampleBasket], () => void refreshPreview(), { deep: true })

async function load(): Promise<void> {
  loading.value = true
  try {
    const [levels, promotionRules] = await Promise.all([
      promotions.listPriceLevels(),
      promotions.listPromotions(),
    ])
    priceLevels.value = levels
    rules.value = promotionRules
    selectedPriceLevelId.value = levels[0]?.id ?? null

    await productsApi.load()
    products.value = productsApi.products.value
    if (isApiMode()) {
      categories.value = await categoriesApi.list()
    }
    await refreshPreview()
  } catch (error) {
    console.error(error)
    toast.error('Akce a ceny se nepodařilo načíst.')
  } finally {
    loading.value = false
  }
}

async function refreshPreview(): Promise<void> {
  calculating.value = true
  try {
    preview.value = await promotions.calculate(
      sampleBasket.value,
      selectedPriceLevelId.value,
      rules.value,
      selectedPriceLevel.value,
    )
  } catch (error) {
    console.error(error)
    toast.error('Náhled ceny se nepodařilo spočítat.')
  } finally {
    calculating.value = false
  }
}

async function savePriceLevel(): Promise<void> {
  if (!priceLevelForm.name.trim()) {
    toast.warning('Zadejte název cenové hladiny.')
    return
  }
  saving.value = true
  try {
    const created = await promotions.createPriceLevel({
      name: priceLevelForm.name.trim(),
      adjustmentPercent: Number(priceLevelForm.adjustmentPercent) || 0,
    })
    priceLevels.value = [...priceLevels.value, created]
    selectedPriceLevelId.value = created.id
    priceLevelForm.name = ''
    priceLevelForm.adjustmentPercent = -10
    toast.success('Cenová hladina uložena.')
  } catch (error) {
    console.error(error)
    toast.error('Cenovou hladinu se nepodařilo uložit.')
  } finally {
    saving.value = false
  }
}

async function saveRule(): Promise<void> {
  if (!ruleForm.name.trim()) {
    toast.warning('Zadejte název akce.')
    return
  }
  const input = buildRuleInput()
  if (input.scope === 'products' && !input.productIds?.length) {
    toast.warning('Vyberte produkt.')
    return
  }
  if (input.scope === 'categories' && !input.categoryIds?.length) {
    toast.warning('Vyberte kategorii.')
    return
  }

  saving.value = true
  try {
    const created = await promotions.createPromotion(input)
    rules.value = [...rules.value, created]
    ruleForm.name = ''
    toast.success('Akční pravidlo uloženo.')
  } catch (error) {
    console.error(error)
    toast.error('Akční pravidlo se nepodařilo uložit.')
  } finally {
    saving.value = false
  }
}

async function removePriceLevel(level: PriceLevel): Promise<void> {
  await promotions.removePriceLevel(level.id)
  priceLevels.value = priceLevels.value.filter((item) => item.id !== level.id)
  if (selectedPriceLevelId.value === level.id)
    selectedPriceLevelId.value = priceLevels.value[0]?.id ?? null
  toast.success('Cenová hladina odstraněna.')
}

async function removeRule(rule: PromotionRule): Promise<void> {
  await promotions.removePromotion(rule.id)
  rules.value = rules.value.filter((item) => item.id !== rule.id)
  toast.success('Akční pravidlo odstraněno.')
}

function buildRuleInput(): PromotionRuleInput {
  return {
    name: ruleForm.name.trim(),
    type: ruleForm.type,
    scope: ruleForm.scope,
    percent: ruleForm.type === 'percent' ? Number(ruleForm.percent) || 0 : undefined,
    amount: ruleForm.type === 'fixed' ? Number(ruleForm.amount) || 0 : undefined,
    productIds: ruleForm.scope === 'products' ? [ruleForm.productId] : [],
    categoryIds: ruleForm.scope === 'categories' ? [ruleForm.categoryId] : [],
    daysOfWeek: [],
    startTime: ruleForm.startTime || undefined,
    endTime: ruleForm.endTime || undefined,
    minSubtotal: Number(ruleForm.minSubtotal) > 0 ? Number(ruleForm.minSubtotal) : undefined,
    priority: Number(ruleForm.priority) || 0,
  }
}

function categoryName(id: string | null): string {
  if (!id) return ''
  return (
    categories.value.find((category) => category.id === id)?.name.toLocaleLowerCase('cs-CZ') ?? ''
  )
}

function scopeLabel(scope: PromotionScope): string {
  if (scope === 'products') return 'Produkty'
  if (scope === 'categories') return 'Kategorie'
  return 'Celý účet'
}

function formatRuleValue(rule: PromotionRule): string {
  return rule.type === 'percent' ? `${rule.percent ?? 0} %` : formatCZK(rule.amount ?? 0)
}

function formatCZK(value: number): string {
  return value.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' })
}
</script>

<template>
  <div class="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Akce a ceny</h1>
        <p class="mt-1 text-muted-foreground">
          Cenové hladiny, slevová pravidla a kontrola výsledné ceny.
        </p>
      </div>
      <Badge :variant="hasApiBackend ? 'default' : 'secondary'">
        {{ hasApiBackend ? 'Přesný výpočet' : 'Ukázkový výpočet' }}
      </Badge>
    </div>

    <div v-if="loading" class="mt-8 flex items-center gap-2 text-muted-foreground">
      <LoaderCircle class="h-4 w-4 animate-spin" /> Načítám akce a ceny…
    </div>

    <template v-else>
      <div class="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section class="rounded-xl border border-border bg-card p-5">
          <div class="flex items-center gap-2">
            <Crown class="h-5 w-5 text-primary" />
            <h2 class="font-semibold">Cenové hladiny</h2>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_130px_auto]">
            <div class="space-y-2">
              <Label for="price-level-name">Název</Label>
              <Input id="price-level-name" v-model="priceLevelForm.name" placeholder="VIP host" />
            </div>
            <div class="space-y-2">
              <Label for="price-level-percent">Úprava %</Label>
              <Input
                id="price-level-percent"
                v-model.number="priceLevelForm.adjustmentPercent"
                type="number"
                step="0.1"
              />
            </div>
            <Button class="self-end" :disabled="saving" @click="savePriceLevel">
              <Plus class="h-4 w-4" /> Přidat
            </Button>
          </div>

          <div class="mt-5 space-y-2">
            <label for="price-level" class="text-sm text-muted-foreground"
              >Náhled pro hladinu</label
            >
            <select
              id="price-level"
              v-model="selectedPriceLevelId"
              class="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option :value="null">Bez cenové hladiny</option>
              <option v-for="level in priceLevels" :key="level.id" :value="level.id">
                {{ level.name }} ({{ level.adjustmentPercent }} %)
              </option>
            </select>
          </div>

          <div class="mt-4 divide-y divide-border rounded-lg border border-border">
            <div
              v-for="level in priceLevels"
              :key="level.id"
              class="flex items-center justify-between gap-3 p-3"
            >
              <div>
                <div class="font-medium">{{ level.name }}</div>
                <div class="text-sm text-muted-foreground">{{ level.adjustmentPercent }} %</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                title="Smazat hladinu"
                @click="removePriceLevel(level)"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div v-if="!priceLevels.length" class="p-3 text-sm text-muted-foreground">
              Zatím žádné cenové hladiny.
            </div>
          </div>
        </section>

        <section class="rounded-xl border border-border bg-card p-5">
          <div class="flex items-center gap-2">
            <BadgePercent class="h-5 w-5 text-primary" />
            <h2 class="font-semibold">Akční pravidla</h2>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="space-y-2 sm:col-span-2">
              <Label for="rule-name">Název akce</Label>
              <Input id="rule-name" v-model="ruleForm.name" placeholder="Happy hour" />
            </div>
            <div class="space-y-2">
              <Label for="rule-type">Typ</Label>
              <select
                id="rule-type"
                v-model="ruleForm.type"
                class="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="percent">Procentní sleva</option>
                <option value="fixed">Pevná sleva</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="rule-scope">Platí na</Label>
              <select
                id="rule-scope"
                v-model="ruleForm.scope"
                class="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">Celý účet</option>
                <option value="categories" :disabled="!categories.length">Kategorii</option>
                <option value="products" :disabled="!products.length">Produkt</option>
              </select>
            </div>
            <div v-if="ruleForm.type === 'percent'" class="space-y-2">
              <Label for="rule-percent">Sleva %</Label>
              <Input
                id="rule-percent"
                v-model.number="ruleForm.percent"
                type="number"
                min="0"
                max="100"
              />
            </div>
            <div v-else class="space-y-2">
              <Label for="rule-amount">Sleva Kč</Label>
              <Input id="rule-amount" v-model.number="ruleForm.amount" type="number" min="0" />
            </div>
            <div class="space-y-2">
              <Label for="rule-priority">Priorita</Label>
              <Input id="rule-priority" v-model.number="ruleForm.priority" type="number" />
            </div>
            <div v-if="ruleForm.scope === 'categories'" class="space-y-2 sm:col-span-2">
              <Label for="rule-category">Kategorie</Label>
              <select
                id="rule-category"
                v-model="ruleForm.categoryId"
                class="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Vyberte kategorii</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div v-if="ruleForm.scope === 'products'" class="space-y-2 sm:col-span-2">
              <Label for="rule-product">Produkt</Label>
              <select
                id="rule-product"
                v-model="ruleForm.productId"
                class="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Vyberte produkt</option>
                <option v-for="product in products" :key="product.id" :value="product.id">
                  {{ product.name }} · {{ formatCZK(product.salePrice) }}
                </option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="rule-start">Od</Label>
              <Input id="rule-start" v-model="ruleForm.startTime" type="time" />
            </div>
            <div class="space-y-2">
              <Label for="rule-end">Do</Label>
              <Input id="rule-end" v-model="ruleForm.endTime" type="time" />
            </div>
            <div class="space-y-2">
              <Label for="rule-min">Min. útrata</Label>
              <Input id="rule-min" v-model.number="ruleForm.minSubtotal" type="number" min="0" />
            </div>
            <Button class="self-end" :disabled="saving" @click="saveRule">
              <Plus class="h-4 w-4" /> Přidat akci
            </Button>
          </div>

          <div class="mt-5 space-y-3">
            <div v-for="rule in rules" :key="rule.id" class="rounded-lg border border-border p-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-medium">{{ rule.name }}</div>
                  <div class="mt-1 text-sm text-muted-foreground">
                    {{ formatRuleValue(rule) }} · {{ scopeLabel(rule.scope) }} · priorita
                    {{ rule.priority ?? 0 }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Badge variant="outline">
                    <Clock v-if="rule.startTime" class="mr-1 h-3 w-3" />
                    {{ rule.startTime ? `${rule.startTime}-${rule.endTime}` : 'Stále' }}
                  </Badge>
                  <Button variant="ghost" size="icon" title="Smazat akci" @click="removeRule(rule)">
                    <Trash2 class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
            <div
              v-if="!rules.length"
              class="rounded-lg border border-border p-3 text-sm text-muted-foreground"
            >
              Zatím žádná akční pravidla.
            </div>
          </div>
        </section>
      </div>

      <section class="mt-4 rounded-xl border border-border bg-card p-5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Gift class="h-5 w-5 text-primary" />
            <h2 class="font-semibold">Kontrola výsledné ceny</h2>
          </div>
          <LoaderCircle v-if="calculating" class="h-4 w-4 animate-spin text-muted-foreground" />
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[560px] text-sm">
            <thead class="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th class="py-2 text-left">Položka</th>
                <th class="py-2 text-right">Původně</th>
                <th class="py-2 text-right">Po hladině</th>
                <th class="py-2 text-right">Finálně</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in preview?.lines ?? []"
                :key="`${line.productId}-${line.name}`"
                class="border-b last:border-0"
              >
                <td class="py-3">
                  <div class="font-medium">{{ line.name }}</div>
                  <div v-if="line.discounts.length" class="mt-1 text-xs text-primary">
                    {{ line.discounts.map((d) => `${d.name} −${formatCZK(d.amount)}`).join(', ') }}
                  </div>
                </td>
                <td class="py-3 text-right">{{ formatCZK(line.originalTotal) }}</td>
                <td class="py-3 text-right">{{ formatCZK(line.priceLevelTotal) }}</td>
                <td class="py-3 text-right font-semibold">{{ formatCZK(line.finalTotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-5">
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-xs text-muted-foreground">Před akcemi</div>
            <div class="mt-1 font-semibold">{{ formatCZK(preview?.subtotalOriginal ?? 0) }}</div>
          </div>
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-xs text-muted-foreground">Sleva celkem</div>
            <div class="mt-1 font-semibold text-primary">
              −{{ formatCZK(preview?.discountTotal ?? 0) }}
            </div>
          </div>
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-xs text-muted-foreground">K úhradě</div>
            <div class="mt-1 font-semibold">{{ formatCZK(preview?.total ?? 0) }}</div>
          </div>
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-xs text-muted-foreground">Body za účet</div>
            <div class="mt-1 font-semibold">{{ earnedPoints }}</div>
          </div>
          <div class="rounded-lg bg-muted/50 p-3">
            <div class="text-xs text-muted-foreground">Uplatnění 120 bodů</div>
            <div class="mt-1 font-semibold">−{{ formatCZK(redeemed.discountAmount) }}</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
