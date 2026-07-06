import { describe, it, expect } from 'vitest'
import {
  clampPercent,
  clampAmount,
  calcPosLine,
  calcPosTotals,
  calcSplitGroupPayment,
  totalAssignedFraction,
} from '@/lib/posCalc'
import { round2 } from '@/lib/invoice'

describe('clampPercent', () => {
  it('ořízne na 0–100', () => {
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(150)).toBe(100)
    expect(clampPercent(42)).toBe(42)
    expect(clampPercent('abc')).toBe(0)
    expect(clampPercent(undefined)).toBe(0)
  })
})

describe('clampAmount', () => {
  it('ořízne na nezáporné', () => {
    expect(clampAmount(-10)).toBe(0)
    expect(clampAmount(50)).toBe(50)
    expect(clampAmount('abc')).toBe(0)
  })
})

describe('calcPosLine', () => {
  it('rozpočítá cenu VČETNĚ DPH na net/vat podle sazby', () => {
    // 121 vč. DPH 21 % → net 100, vat 21
    expect(calcPosLine({ quantity: 1, unitPrice: 121, vatRate: 21 })).toEqual({
      lineTotal: 121,
      lineNet: 100,
      lineVat: 21,
    })
  })

  it('aplikuje řádkovou slevu před rozpadem DPH', () => {
    // 2× 121 se slevou 50 % → gross 121, net 100, vat 21
    expect(calcPosLine({ quantity: 2, unitPrice: 121, vatRate: 21, discountPercent: 50 })).toEqual({
      lineTotal: 121,
      lineNet: 100,
      lineVat: 21,
    })
  })

  it('bez sazby DPH (0 %) vrátí celou cenu jako net', () => {
    expect(calcPosLine({ quantity: 1, unitPrice: 100, vatRate: 0 })).toEqual({
      lineTotal: 100,
      lineNet: 100,
      lineVat: 0,
    })
  })

  it('na midpointu zaokrouhluje DPH první (parita s backend SaleCalculator)', () => {
    // gross 0,14 @ 12 %: DPH 0,015 → 0,02 (zaokrouhluje se DPH, základ je dopočet).
    // Zaokrouhlení základu první by dalo net 0,13 / vat 0,01 a FE total by se rozešel se serverem.
    expect(calcPosLine({ quantity: 1, unitPrice: 0.14, vatRate: 12 })).toEqual({
      lineTotal: 0.14,
      lineNet: 0.12,
      lineVat: 0.02,
    })
  })
})

describe('calcPosTotals', () => {
  const items = [
    { quantity: 1, unitPrice: 121, vatRate: 21 }, // net 100, vat 21
    { quantity: 1, unitPrice: 112, vatRate: 12 }, // net 100, vat 12
  ]

  it('bez slevy na účet a bez tipu = prostý součet řádků', () => {
    const t = calcPosTotals(items)
    expect(t.subtotalNet).toBe(200)
    expect(t.subtotalVat).toBe(33)
    expect(t.subtotalGross).toBe(233)
    expect(t.discountAmount).toBe(0)
    expect(t.totalNet).toBe(200)
    expect(t.totalVat).toBe(33)
    expect(t.total).toBe(233)
  })

  it('sleva na účet zachová poměr DPH sazeb', () => {
    const t = calcPosTotals(items, 10) // -10 %
    expect(t.totalNet).toBe(180)
    expect(t.totalVat).toBe(29.7)
    expect(t.discountAmount).toBe(23.3)
    expect(t.total).toBe(209.7)
  })

  it('spropitné se přičte k total a NEVSTUPUJE do totalNet/totalVat', () => {
    const t = calcPosTotals(items, 0, 50)
    expect(t.totalNet).toBe(200)
    expect(t.totalVat).toBe(33)
    expect(t.total).toBe(283)
  })

  it('sleva na účet i tip zároveň', () => {
    const t = calcPosTotals(items, 10, 20)
    expect(t.total).toBe(229.7) // 180 + 29.7 + 20
  })

  it('sleva 100 % vynuluje totalNet/totalVat, tip zůstává', () => {
    const t = calcPosTotals(items, 100, 30)
    expect(t.totalNet).toBe(0)
    expect(t.totalVat).toBe(0)
    expect(t.total).toBe(30)
  })

  it('prázdné položky → nulové součty', () => {
    const t = calcPosTotals([])
    expect(t).toEqual({
      subtotalNet: 0,
      subtotalVat: 0,
      subtotalGross: 0,
      discountAmount: 0,
      totalNet: 0,
      totalVat: 0,
      total: 0,
    })
  })

  it('záporný nebo neplatný tip se ořízne na 0', () => {
    expect(calcPosTotals(items, 0, -50).total).toBe(233)
  })

  it('discountPercent mimo 0–100 předaný přímo se interně ořízne (bez volání clampPercent zvlášť)', () => {
    // -20 % → chová se jako 0 %
    expect(calcPosTotals(items, -20).total).toBe(233)
    // 150 % → chová se jako 100 %
    const t = calcPosTotals(items, 150, 10)
    expect(t.totalNet).toBe(0)
    expect(t.totalVat).toBe(0)
    expect(t.total).toBe(10)
  })

  it('neplatný (NaN/Infinity) discountPercent i tipAmount se ořízne na 0 (clampPercent/clampAmount vrací 0 pro non-finite)', () => {
    expect(calcPosTotals(items, NaN, NaN).total).toBe(233)
    // Infinity není finite → clampPercent i clampAmount ho ořízne na 0 (žádná sleva, žádný tip)
    const t = calcPosTotals(items, Infinity, Infinity)
    expect(t.totalNet).toBe(200)
    expect(t.total).toBe(233)
  })

  it('desetinné procento slevy (12.5 %)', () => {
    const t = calcPosTotals(items, 12.5)
    expect(t.totalNet).toBe(175) // 200 * 0.875
    expect(t.totalVat).toBe(28.88) // round2(33 * 0.875 = 28.875)
  })

  it('mix tří sazeb DPH (21 %, 15 %, 0 %) se slevou na účet zachová poměr každé sazby', () => {
    const mixedItems = [
      { quantity: 1, unitPrice: 121, vatRate: 21 }, // net 100, vat 21
      { quantity: 1, unitPrice: 115, vatRate: 15 }, // net 100, vat 15
      { quantity: 1, unitPrice: 100, vatRate: 0 }, // net 100, vat 0
    ]
    const t = calcPosTotals(mixedItems, 10)
    expect(t.subtotalNet).toBe(300)
    expect(t.subtotalVat).toBe(36)
    expect(t.totalNet).toBe(270) // 300 * 0.9
    expect(t.totalVat).toBe(32.4) // 36 * 0.9
    expect(t.total).toBe(302.4)
  })

  it('zaokrouhlovací hranice — halíř na .005 se zaokrouhlí konzistentně (round half up)', () => {
    // 3 položky po 33.33 vč. DPH 21 % → net se dělí nerovnoměrně (opakující desetinné číslo)
    const oddItems = [
      { quantity: 1, unitPrice: 33.33, vatRate: 21 },
      { quantity: 1, unitPrice: 33.33, vatRate: 21 },
      { quantity: 1, unitPrice: 33.33, vatRate: 21 },
    ]
    const t = calcPosTotals(oddItems, 33.33)
    // Ověřujeme jen determinismus a konzistenci zaokrouhlení na 2 des. místa, ne konkrétní "magickou" hodnotu.
    expect(Number.isInteger(t.totalNet * 100)).toBe(true)
    expect(Number.isInteger(t.totalVat * 100)).toBe(true)
    expect(Number.isInteger(t.total * 100)).toBe(true)
    expect(t.total).toBe(round2(t.totalNet + t.totalVat + 0))
  })

  it('velmi velké částky zůstanou přesné na 2 des. místa (žádná float chyba)', () => {
    const bigItems = [{ quantity: 1000, unitPrice: 999.99, vatRate: 21 }]
    const t = calcPosTotals(bigItems, 5, 1000)
    expect(t.subtotalGross).toBe(999990)
    expect(Number.isInteger(t.total * 100)).toBe(true)
  })

  it('velmi malé částky (haléře) se nepropadnou na 0 kvůli zaokrouhlení', () => {
    const tinyItems = [{ quantity: 1, unitPrice: 0.01, vatRate: 21 }]
    const t = calcPosTotals(tinyItems, 0)
    expect(t.subtotalGross).toBe(0.01)
    expect(t.total).toBe(0.01)
  })
})

describe('calcSplitGroupPayment', () => {
  const orderItems = [
    { itemId: 'i1', quantity: 1, unitPrice: 121, vatRate: 21 }, // net 100, vat 21, gross 121
    { itemId: 'i2', quantity: 1, unitPrice: 121, vatRate: 21 }, // net 100, vat 21, gross 121
  ]

  it('celá položka jedné skupině, žádná sleva ani tip', () => {
    const payment = calcSplitGroupPayment(orderItems, { items: [{ itemId: 'i1', fraction: 1 }] })
    expect(payment.total).toBe(121)
    expect(payment.items).toEqual([{ itemId: 'i1', quantity: 1, gross: 121 }])
    expect(payment.discountAmount).toBe(0)
    expect(payment.tipAmount).toBe(0)
  })

  it('sdílená položka napůl mezi dvě skupiny se sečte na 100 %', () => {
    const a = calcSplitGroupPayment(orderItems, { items: [{ itemId: 'i1', fraction: 0.5 }] })
    const b = calcSplitGroupPayment(orderItems, { items: [{ itemId: 'i1', fraction: 0.5 }] })
    expect(a.total).toBe(60.5)
    expect(a.total + b.total).toBe(121)
    expect(a.items[0].quantity).toBe(0.5) // množství, které se reálně pošle do pay-items
  })

  it('sleva na účet se promítne poměrně i do skupiny', () => {
    // skupina má celý účet (obě položky) → sleva 10 % z celého groupShare
    const payment = calcSplitGroupPayment(
      orderItems,
      {
        items: [
          { itemId: 'i1', fraction: 1 },
          { itemId: 'i2', fraction: 1 },
        ],
      },
      10,
    )
    expect(payment.total).toBe(217.8) // 242 * 0.9
    expect(payment.discountAmount).toBe(24.2)
  })

  it('tip se rozpočítá dle podílu skupiny na hrubém mezisoučtu', () => {
    // skupina má polovinu účtu (jedna celá položka z 242 celkem) → poloviční podíl na tipu
    const payment = calcSplitGroupPayment(
      orderItems,
      { items: [{ itemId: 'i1', fraction: 1 }] },
      0,
      40,
    )
    expect(payment.total).toBe(141) // 121 + 40*(121/242) = 121 + 20
    expect(payment.tipAmount).toBe(20)
  })

  it('skupina platící celý účet dostane celé spropitné (jako backend paysEverything)', () => {
    const payment = calcSplitGroupPayment(
      orderItems,
      {
        items: [
          { itemId: 'i1', fraction: 1 },
          { itemId: 'i2', fraction: 1 },
        ],
      },
      0,
      35,
    )
    expect(payment.tipAmount).toBe(35)
    expect(payment.total).toBe(277) // 242 + 35
  })

  it('parita se serverem: frakce 2/3 zaokrouhlí množství a gross po řádku, ne agregát', () => {
    // Backend počítá gross = round(unitPrice × round2(qty×fraction)) per řádek:
    // qty 0.67 → 67 Kč × 2 položky = 134, NE round2(200×2/3) = 133.33.
    const items = [
      { itemId: 'a', quantity: 1, unitPrice: 100, vatRate: 21 },
      { itemId: 'b', quantity: 1, unitPrice: 100, vatRate: 21 },
    ]
    const payment = calcSplitGroupPayment(items, {
      items: [
        { itemId: 'a', fraction: 2 / 3 },
        { itemId: 'b', fraction: 2 / 3 },
      ],
    })
    expect(payment.items.map((r) => r.quantity)).toEqual([0.67, 0.67])
    expect(payment.total).toBe(134)
  })

  it('neexistující itemId ve skupině se ignoruje (0 příspěvek)', () => {
    const payment = calcSplitGroupPayment(orderItems, {
      items: [{ itemId: 'neexistuje', fraction: 1 }],
    })
    expect(payment.total).toBe(0)
    expect(payment.items).toEqual([])
  })

  it('prázdné položky objednávky → 0 bez dělení nulou', () => {
    const payment = calcSplitGroupPayment([], { items: [{ itemId: 'i1', fraction: 1 }] }, 10, 50)
    expect(payment.total).toBe(0)
  })
})

describe('totalAssignedFraction', () => {
  const groupA = { items: [{ itemId: 'i1', fraction: 0.5 }] }
  const groupB = {
    items: [
      { itemId: 'i1', fraction: 0.3 },
      { itemId: 'i2', fraction: 1 },
    ],
  }

  it('sečte frakce napříč skupinami pro danou položku', () => {
    expect(totalAssignedFraction([groupA, groupB], 'i1')).toBe(0.8)
    expect(totalAssignedFraction([groupA, groupB], 'i2')).toBe(1)
  })

  it('nepřiřazená položka → 0', () => {
    expect(totalAssignedFraction([groupA, groupB], 'i3')).toBe(0)
  })

  it('vyloučí zadanou skupinu (pro validaci při editaci té skupiny)', () => {
    expect(totalAssignedFraction([groupA, groupB], 'i1', groupA)).toBe(0.3)
  })
})
