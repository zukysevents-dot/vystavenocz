import { http, isApiMode } from '@/lib/http'
import {
  calculatePromotions,
  type PriceLevel,
  type PromotionCalculation,
  type PromotionLineInput,
  type PromotionRule,
  type PromotionRuleType,
  type PromotionScope,
} from '@/lib/promotions'
import type { PagedResult } from '@/composables/useApi'

type ApiPromotionType = 'Percent' | 'Fixed'
type ApiPromotionScope = 'All' | 'Products' | 'Categories'

interface ApiPriceLevel {
  id: string
  name: string
  adjustmentPercent: number
}

interface ApiPromotion {
  id: string
  name: string
  type: ApiPromotionType
  scope: ApiPromotionScope
  percent: number | null
  amount: number | null
  productIds: string[]
  categoryIds: string[]
  daysOfWeek: number[]
  startTime: string | null
  endTime: string | null
  minSubtotal: number | null
  priority: number
}

export type PriceLevelInput = Omit<PriceLevel, 'id'>
export type PromotionRuleInput = Omit<PromotionRule, 'id'>

const PRICE_LEVEL_STORAGE = 'vystaveno:price-levels'
const PROMOTIONS_STORAGE = 'vystaveno:promotions'

export function usePromotions() {
  async function listPriceLevels(): Promise<PriceLevel[]> {
    if (!isApiMode()) return readMock<PriceLevel>(PRICE_LEVEL_STORAGE, defaultPriceLevels())
    const result = await http.get<PagedResult<ApiPriceLevel>>('/price-levels?pageSize=100')
    return result.items.map(mapPriceLevel)
  }

  async function createPriceLevel(input: PriceLevelInput): Promise<PriceLevel> {
    if (!isApiMode()) return createMock(PRICE_LEVEL_STORAGE, input)
    return mapPriceLevel(await http.post<ApiPriceLevel>('/price-levels', input))
  }

  async function updatePriceLevel(id: string, input: PriceLevelInput): Promise<PriceLevel> {
    if (!isApiMode()) return updateMock(PRICE_LEVEL_STORAGE, id, input)
    return mapPriceLevel(await http.put<ApiPriceLevel>(`/price-levels/${id}`, input))
  }

  async function removePriceLevel(id: string): Promise<void> {
    if (!isApiMode()) return removeMock(PRICE_LEVEL_STORAGE, id)
    await http.del(`/price-levels/${id}`)
  }

  async function listPromotions(): Promise<PromotionRule[]> {
    if (!isApiMode()) return readMock<PromotionRule>(PROMOTIONS_STORAGE, defaultPromotions())
    const result = await http.get<PagedResult<ApiPromotion>>('/promotions?pageSize=100')
    return result.items.map(mapPromotion)
  }

  async function createPromotion(input: PromotionRuleInput): Promise<PromotionRule> {
    if (!isApiMode()) return createMock(PROMOTIONS_STORAGE, input)
    return mapPromotion(await http.post<ApiPromotion>('/promotions', toApiPromotion(input)))
  }

  async function updatePromotion(id: string, input: PromotionRuleInput): Promise<PromotionRule> {
    if (!isApiMode()) return updateMock(PROMOTIONS_STORAGE, id, input)
    return mapPromotion(await http.put<ApiPromotion>(`/promotions/${id}`, toApiPromotion(input)))
  }

  async function removePromotion(id: string): Promise<void> {
    if (!isApiMode()) return removeMock(PROMOTIONS_STORAGE, id)
    await http.del(`/promotions/${id}`)
  }

  async function calculate(
    lines: PromotionLineInput[],
    priceLevelId: string | null,
    fallbackRules: PromotionRule[],
    fallbackPriceLevel: PriceLevel | null,
  ): Promise<PromotionCalculation> {
    if (!isApiMode()) {
      return calculatePromotions(lines, fallbackRules, {
        now: new Date(),
        priceLevel: fallbackPriceLevel,
      })
    }
    const payload = {
      priceLevelId,
      lines: lines.map((line) => ({
        productId: line.productId,
        categoryId: line.categoryId,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    }
    return http.post<PromotionCalculation>('/promotions/calculate', payload)
  }

  return {
    listPriceLevels,
    createPriceLevel,
    updatePriceLevel,
    removePriceLevel,
    listPromotions,
    createPromotion,
    updatePromotion,
    removePromotion,
    calculate,
  }
}

function mapPriceLevel(level: ApiPriceLevel): PriceLevel {
  return { id: level.id, name: level.name, adjustmentPercent: level.adjustmentPercent }
}

function mapPromotion(promotion: ApiPromotion): PromotionRule {
  return {
    id: promotion.id,
    name: promotion.name,
    type: fromApiType(promotion.type),
    scope: fromApiScope(promotion.scope),
    percent: promotion.percent ?? undefined,
    amount: promotion.amount ?? undefined,
    productIds: promotion.productIds,
    categoryIds: promotion.categoryIds,
    daysOfWeek: promotion.daysOfWeek,
    startTime: promotion.startTime ?? undefined,
    endTime: promotion.endTime ?? undefined,
    minSubtotal: promotion.minSubtotal ?? undefined,
    priority: promotion.priority,
  }
}

function toApiPromotion(promotion: PromotionRuleInput): Omit<ApiPromotion, 'id'> {
  return {
    name: promotion.name,
    type: promotion.type === 'percent' ? 'Percent' : 'Fixed',
    scope: toApiScope(promotion.scope),
    percent: promotion.type === 'percent' ? (promotion.percent ?? 0) : null,
    amount: promotion.type === 'fixed' ? (promotion.amount ?? 0) : null,
    productIds: promotion.scope === 'products' ? (promotion.productIds ?? []) : [],
    categoryIds: promotion.scope === 'categories' ? (promotion.categoryIds ?? []) : [],
    daysOfWeek: promotion.daysOfWeek ?? [],
    startTime: promotion.startTime || null,
    endTime: promotion.endTime || null,
    minSubtotal: promotion.minSubtotal ?? null,
    priority: promotion.priority ?? 0,
  }
}

function fromApiType(type: ApiPromotionType): PromotionRuleType {
  return type === 'Percent' ? 'percent' : 'fixed'
}

function fromApiScope(scope: ApiPromotionScope): PromotionScope {
  if (scope === 'Products') return 'products'
  if (scope === 'Categories') return 'categories'
  return 'all'
}

function toApiScope(scope: PromotionScope): ApiPromotionScope {
  if (scope === 'products') return 'Products'
  if (scope === 'categories') return 'Categories'
  return 'All'
}

function readMock<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : fallback
  } catch {
    return fallback
  }
}

function writeMock<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

function createMock<T extends { id: string }>(key: string, input: Omit<T, 'id'>): T {
  const items = readMock<T>(key, [])
  const item = { ...input, id: crypto.randomUUID() } as T
  writeMock(key, [...items, item])
  return item
}

function updateMock<T extends { id: string }>(key: string, id: string, input: Omit<T, 'id'>): T {
  const items = readMock<T>(key, [])
  const item = { ...input, id } as T
  writeMock(
    key,
    items.map((existing) => (existing.id === id ? item : existing)),
  )
  return item
}

function removeMock<T extends { id: string }>(key: string, id: string): void {
  writeMock(
    key,
    readMock<T>(key, []).filter((item) => item.id !== id),
  )
}

function defaultPriceLevels(): PriceLevel[] {
  return [
    { id: 'standard', name: 'Standard', adjustmentPercent: 0 },
    { id: 'vip', name: 'VIP host', adjustmentPercent: -10 },
    { id: 'staff', name: 'Personál', adjustmentPercent: -30 },
  ]
}

function defaultPromotions(): PromotionRule[] {
  return [
    {
      id: 'happy-drinks',
      name: 'Happy hour nápoje',
      type: 'percent',
      scope: 'categories',
      categoryIds: ['drinks'],
      percent: 20,
      daysOfWeek: [new Date().getDay()],
      startTime: '00:00',
      endTime: '23:59',
      priority: 20,
    },
    {
      id: 'burger-week',
      name: 'Burger week',
      type: 'percent',
      scope: 'products',
      productIds: ['burger'],
      percent: 15,
      priority: 10,
    },
  ]
}
