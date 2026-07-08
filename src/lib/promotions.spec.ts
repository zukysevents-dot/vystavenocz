import { describe, expect, it } from 'vitest'
import {
  calculatePromotions,
  earnLoyaltyPoints,
  redeemLoyaltyPoints,
  type PromotionLineInput,
  type PromotionRule,
} from './promotions'

const lines: PromotionLineInput[] = [
  { productId: 'beer', categoryId: 'drinks', name: 'Pivo', quantity: 2, unitPrice: 55 },
  { productId: 'burger', categoryId: 'food', name: 'Burger', quantity: 1, unitPrice: 199 },
]

describe('calculatePromotions', () => {
  it('aplikuje happy hour procentní slevu jen v aktivním čase', () => {
    const rules: PromotionRule[] = [
      {
        id: 'happy',
        name: 'Happy hour nápoje',
        type: 'percent',
        scope: 'categories',
        categoryIds: ['drinks'],
        percent: 20,
        daysOfWeek: [3],
        startTime: '16:00',
        endTime: '18:00',
      },
    ]

    const active = calculatePromotions(lines, rules, {
      now: new Date('2026-07-08T16:30:00'),
      priceLevel: null,
    })
    const inactive = calculatePromotions(lines, rules, {
      now: new Date('2026-07-08T19:00:00'),
      priceLevel: null,
    })

    expect(active.discountTotal).toBe(22)
    expect(active.total).toBe(287)
    expect(inactive.discountTotal).toBe(0)
    expect(inactive.total).toBe(309)
  })

  it('cenová hladina upraví základ před akcemi', () => {
    const result = calculatePromotions(lines, [], {
      now: new Date('2026-07-08T12:00:00'),
      priceLevel: { id: 'vip', name: 'VIP', adjustmentPercent: -10 },
    })

    expect(result.subtotalOriginal).toBe(309)
    expect(result.subtotalAfterPriceLevel).toBe(278.1)
    expect(result.total).toBe(278.1)
  })

  it('kombinuje cenovou hladinu a produktovou slevu v prioritním pořadí', () => {
    const result = calculatePromotions(
      lines,
      [
        {
          id: 'burger-week',
          name: 'Burger week',
          type: 'percent',
          scope: 'products',
          productIds: ['burger'],
          percent: 50,
          priority: 10,
        },
      ],
      {
        now: new Date('2026-07-08T12:00:00'),
        priceLevel: { id: 'vip', name: 'VIP', adjustmentPercent: -10 },
      },
    )

    expect(result.discountTotal).toBe(89.55)
    expect(result.total).toBe(188.55)
  })

  it('fixní sleva nemůže snížit řádek pod nulu', () => {
    const result = calculatePromotions(
      [{ productId: 'coffee', categoryId: 'drinks', name: 'Espresso', quantity: 1, unitPrice: 55 }],
      [{ id: 'coupon', name: 'Kupón 100 Kč', type: 'fixed', scope: 'all', amount: 100 }],
      { now: new Date('2026-07-08T12:00:00'), priceLevel: null },
    )

    expect(result.discountTotal).toBe(55)
    expect(result.total).toBe(0)
  })
})

describe('loyalty points', () => {
  it('počítá body z obratu podle pravidla', () => {
    expect(earnLoyaltyPoints(309, { crownsPerPoint: 10 })).toBe(30)
    expect(earnLoyaltyPoints(309, { crownsPerPoint: 10, multiplier: 2 })).toBe(61)
  })

  it('uplatnění bodů respektuje maximální procento slevy z účtu', () => {
    expect(
      redeemLoyaltyPoints(100, 500, {
        pointValue: 1,
        maxDiscountPercent: 20,
      }),
    ).toEqual({ pointsUsed: 100, discountAmount: 100 })
    expect(
      redeemLoyaltyPoints(500, 500, {
        pointValue: 1,
        maxDiscountPercent: 20,
      }),
    ).toEqual({ pointsUsed: 100, discountAmount: 100 })
  })
})
