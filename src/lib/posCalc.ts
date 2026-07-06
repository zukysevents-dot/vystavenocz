/**
 * Sdílený výpočet pro Pokladnu i Restauraci: řádky (ceny VČETNĚ DPH) → mezisoučet →
 * sleva na účet (%) → DPH rozpad → spropitné. Výsledek je jen náhled před odesláním —
 * po odpovědi serveru zůstává zdrojem pravdy server response (stejně jako dnešní
 * lineNet/lineVat/lineTotal na SaleItemLine).
 */
import { round2 } from '@/lib/invoice'

/** Sleva na účet i procentní pole obecně — platné procento 0–100. */
export function clampPercent(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0
}

/** Spropitné — nezáporná částka v Kč. */
export function clampAmount(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

export interface PosCalcLineInput {
  quantity: number
  unitPrice: number // cena VČETNĚ DPH
  vatRate: number
  discountPercent?: number
}

export interface PosLineCalc {
  lineTotal: number // gross po řádkové slevě
  lineNet: number
  lineVat: number
}

/** Rozpočítá cenu VČETNĚ DPH na net/vat podle sazby (opak calcLine v invoice.ts, kde je unitPrice bez DPH). */
export function calcPosLine(item: PosCalcLineInput): PosLineCalc {
  const gross = round2(
    item.quantity * item.unitPrice * (1 - clampPercent(item.discountPercent) / 100),
  )
  // DPH extrakce SHODNĚ s backend SaleCalculator: zaokrouhlí se DPH a základ je dopočet.
  // Backend validuje cashReceived >= server Total — haléřový rozdíl náhledu na midpointu
  // by jinak obsluze zablokoval platbu „přesnou částkou" (422).
  const vat = round2((gross * item.vatRate) / (100 + item.vatRate))
  return { lineTotal: gross, lineNet: round2(gross - vat), lineVat: vat }
}

export interface PosTotals {
  subtotalNet: number
  subtotalVat: number
  subtotalGross: number // mezisoučet PŘED slevou na účet
  discountAmount: number // částka odečtená slevou na účet (Kč, z mezisoučtu vč. DPH)
  totalNet: number
  totalVat: number
  total: number // = totalNet + totalVat + tipAmount
}

/**
 * Pořadí výpočtu: řádková sleva (v calcPosLine) → mezisoučet → sleva na účet (%,
 * aplikovaná stejným faktorem na net i vat — zachová poměr DPH sazeb) → + tip mimo DPH.
 */
export function calcPosTotals(
  items: PosCalcLineInput[],
  discountPercent = 0,
  tipAmount = 0,
): PosTotals {
  let subtotalNet = 0
  let subtotalVat = 0
  for (const it of items) {
    const { lineNet, lineVat } = calcPosLine(it)
    subtotalNet += lineNet
    subtotalVat += lineVat
  }
  subtotalNet = round2(subtotalNet)
  subtotalVat = round2(subtotalVat)
  const subtotalGross = round2(subtotalNet + subtotalVat)

  const factor = 1 - clampPercent(discountPercent) / 100
  const totalNet = round2(subtotalNet * factor)
  const totalVat = round2(subtotalVat * factor)
  const tip = clampAmount(tipAmount)

  return {
    subtotalNet,
    subtotalVat,
    subtotalGross,
    discountAmount: round2(subtotalGross - (totalNet + totalVat)),
    totalNet,
    totalVat,
    total: round2(totalNet + totalVat + tip),
  }
}

// --- Split účtu (Dávka B) — čistě výpočetní/zobrazovací rozpočet nad Order, není platba. ---

export interface PosSplitLineInput extends PosCalcLineInput {
  itemId: string
}

export interface PosSplitGroupInput {
  items: { itemId: string; fraction: number }[]
}

export interface PosSplitPaymentRow {
  itemId: string
  quantity: number // zaokrouhlené množství — PŘESNĚ to, co se pošle do pay-items
  gross: number // řádková cena vč. DPH před slevou na účet
}

export interface PosSplitPayment {
  items: PosSplitPaymentRow[]
  gross: number // placená část vč. DPH před slevou na účet
  discountAmount: number // sleva na účet připadající na placenou část
  tipAmount: number // poměrné spropitné placené části
  total: number // budoucí Sale.Total — proti němu backend validuje cashReceived
}

/**
 * Kolik má skupina zaplatit — MUSÍ dávat stejný výsledek jako backend pay-items +
 * SaleCalculator: zaokrouhlené množství → řádkový gross → DPH extrakce po řádku →
 * sleva na účet faktorem na net/vat → poměrné spropitné podle hrubých mezisoučtů
 * (při zaplacení všeho celé spropitné). Backend validuje cashReceived >= Sale.Total,
 * takže haléřový rozdíl náhledu by obsluze zablokoval platbu „přesnou částkou".
 */
export function calcSplitGroupPayment(
  orderItems: PosSplitLineInput[],
  group: PosSplitGroupInput,
  discountPercent = 0,
  tipAmount = 0,
): PosSplitPayment {
  const byId = new Map(orderItems.map((it) => [it.itemId, it]))
  const rows: (PosSplitPaymentRow & { net: number; vat: number })[] = []
  for (const { itemId, fraction } of group.items) {
    const item = byId.get(itemId)
    if (!item) continue
    const quantity = round2(item.quantity * fraction)
    if (quantity <= 0) continue
    const gross = round2(item.unitPrice * quantity)
    const vat = round2((gross * item.vatRate) / (100 + item.vatRate))
    rows.push({ itemId, quantity, gross, vat, net: round2(gross - vat) })
  }

  const selectedGross = round2(rows.reduce((sum, r) => sum + r.gross, 0))
  const orderGross = round2(
    orderItems.reduce((sum, it) => sum + round2(it.unitPrice * it.quantity), 0),
  )
  const paysEverything =
    orderItems.length > 0 &&
    orderItems.every((it) => {
      const row = rows.find((r) => r.itemId === it.itemId)
      return !!row && row.quantity === round2(it.quantity)
    })
  const tip = clampAmount(tipAmount)
  const tipShare = paysEverything
    ? tip
    : orderGross === 0
      ? 0
      : round2((tip * selectedGross) / orderGross)

  const factor = 1 - clampPercent(discountPercent) / 100
  const totalNet = round2(rows.reduce((sum, r) => sum + r.net, 0) * factor)
  const totalVat = round2(rows.reduce((sum, r) => sum + r.vat, 0) * factor)
  const paidGrossAfterDiscount = round2(totalNet + totalVat)

  return {
    items: rows.map(({ itemId, quantity, gross }) => ({ itemId, quantity, gross })),
    gross: selectedGross,
    discountAmount: round2(selectedGross - paidGrossAfterDiscount),
    tipAmount: tipShare,
    total: round2(paidGrossAfterDiscount + tipShare),
  }
}

/** Součet frakcí přes všechny skupiny pro danou položku — nesmí přesáhnout 1. */
export function totalAssignedFraction(
  groups: PosSplitGroupInput[],
  itemId: string,
  excludeGroup?: PosSplitGroupInput,
): number {
  return round2(
    groups
      .filter((g) => g !== excludeGroup)
      .reduce((sum, g) => sum + (g.items.find((i) => i.itemId === itemId)?.fraction ?? 0), 0),
  )
}
