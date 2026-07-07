export interface PromotionLineInput {
  productId: string | null
  categoryId: string | null
  name: string
  quantity: number
  unitPrice: number
}

export interface PriceLevel {
  id: string
  name: string
  adjustmentPercent: number
}

export type PromotionScope = 'all' | 'products' | 'categories'
export type PromotionRuleType = 'percent' | 'fixed'

export interface PromotionRule {
  id: string
  name: string
  type: PromotionRuleType
  scope: PromotionScope
  percent?: number
  amount?: number
  productIds?: string[]
  categoryIds?: string[]
  daysOfWeek?: number[]
  startTime?: string
  endTime?: string
  minSubtotal?: number
  priority?: number
}

export interface LinePromotionResult {
  productId: string | null
  categoryId: string | null
  name: string
  quantity: number
  originalTotal: number
  priceLevelTotal: number
  finalTotal: number
  discounts: Array<{ ruleId: string; name: string; amount: number }>
}

export interface PromotionCalculation {
  lines: LinePromotionResult[]
  subtotalOriginal: number
  subtotalAfterPriceLevel: number
  discountTotal: number
  total: number
}

export interface LoyaltyPointsRule {
  crownsPerPoint: number
  multiplier?: number
}

export interface LoyaltyRedemptionRule {
  pointValue: number
  maxDiscountPercent: number
}

export function calculatePromotions(
  lines: PromotionLineInput[],
  rules: PromotionRule[],
  options: { now: Date; priceLevel?: PriceLevel | null },
): PromotionCalculation {
  const subtotalOriginal = round2(lines.reduce((sum, line) => sum + lineTotal(line), 0))
  const priceLevelFactor =
    1 + clampAdjustmentPercent(options.priceLevel?.adjustmentPercent ?? 0) / 100
  const activeRules = rules
    .filter((rule) => isRuleActive(rule, options.now, subtotalOriginal))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  const resultLines = lines.map((line) => {
    const originalTotal = lineTotal(line)
    const priceLevelTotal = round2(originalTotal * priceLevelFactor)
    let finalTotal = priceLevelTotal
    const discounts: LinePromotionResult['discounts'] = []

    for (const rule of activeRules) {
      if (!matchesScope(rule, line)) continue
      const amount = discountAmount(rule, finalTotal)
      if (amount <= 0) continue
      const applied = Math.min(amount, finalTotal)
      finalTotal = round2(finalTotal - applied)
      discounts.push({ ruleId: rule.id, name: rule.name, amount: applied })
    }

    return {
      productId: line.productId,
      categoryId: line.categoryId,
      name: line.name,
      quantity: line.quantity,
      originalTotal,
      priceLevelTotal,
      finalTotal,
      discounts,
    }
  })

  const subtotalAfterPriceLevel = round2(
    resultLines.reduce((sum, line) => sum + line.priceLevelTotal, 0),
  )
  const total = round2(resultLines.reduce((sum, line) => sum + line.finalTotal, 0))
  return {
    lines: resultLines,
    subtotalOriginal,
    subtotalAfterPriceLevel,
    discountTotal: round2(subtotalAfterPriceLevel - total),
    total,
  }
}

export function earnLoyaltyPoints(total: number, rule: LoyaltyPointsRule): number {
  if (!Number.isFinite(total) || total <= 0 || rule.crownsPerPoint <= 0) return 0
  return Math.floor((total / rule.crownsPerPoint) * (rule.multiplier ?? 1))
}

export function redeemLoyaltyPoints(
  points: number,
  total: number,
  rule: LoyaltyRedemptionRule,
): { pointsUsed: number; discountAmount: number } {
  if (points <= 0 || total <= 0 || rule.pointValue <= 0) return { pointsUsed: 0, discountAmount: 0 }
  const maxDiscount = round2(total * (clampDiscountPercent(rule.maxDiscountPercent) / 100))
  const wantedDiscount = round2(points * rule.pointValue)
  const cappedDiscount = Math.min(wantedDiscount, maxDiscount, total)
  const pointsUsed = Math.min(points, Math.floor(cappedDiscount / rule.pointValue))
  return {
    pointsUsed,
    discountAmount: round2(pointsUsed * rule.pointValue),
  }
}

function lineTotal(line: PromotionLineInput): number {
  return round2(Math.max(0, line.quantity) * Math.max(0, line.unitPrice))
}

function isRuleActive(rule: PromotionRule, now: Date, subtotal: number): boolean {
  if (rule.minSubtotal && subtotal < rule.minSubtotal) return false
  if (rule.daysOfWeek?.length && !rule.daysOfWeek.includes(now.getDay())) return false
  if (!rule.startTime || !rule.endTime) return true
  const current = minutes(now.getHours(), now.getMinutes())
  const start = parseTime(rule.startTime)
  const end = parseTime(rule.endTime)
  if (start === null || end === null) return false
  return start <= end ? current >= start && current <= end : current >= start || current <= end
}

function matchesScope(rule: PromotionRule, line: PromotionLineInput): boolean {
  if (rule.scope === 'all') return true
  if (rule.scope === 'products')
    return !!line.productId && !!rule.productIds?.includes(line.productId)
  return !!line.categoryId && !!rule.categoryIds?.includes(line.categoryId)
}

function discountAmount(rule: PromotionRule, base: number): number {
  if (rule.type === 'fixed') return Math.max(0, rule.amount ?? 0)
  return round2(base * (clampDiscountPercent(rule.percent ?? 0) / 100))
}

function clampAdjustmentPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(-100, value))
}

function clampDiscountPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return minutes(hour, minute)
}

function minutes(hour: number, minute: number): number {
  return hour * 60 + minute
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
