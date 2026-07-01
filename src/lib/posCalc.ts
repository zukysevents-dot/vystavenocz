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
  const net = round2(gross / (1 + item.vatRate / 100))
  return { lineTotal: gross, lineNet: net, lineVat: round2(gross - net) }
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

/**
 * Kolik má skupina zaplatit: groupShare = Σ(lineNet+lineVat)*fraction přes přiřazené položky,
 * groupRatio = podíl skupiny na mezisoučtu celého účtu, sleva na účet i tip se promítají
 * poměrně dle tohoto podílu (stejná sleva-na-účet % pro celý účet, tip rozpočítaný podle podílu).
 */
export function calcSplitGroupTotal(
  orderItems: PosSplitLineInput[],
  group: PosSplitGroupInput,
  discountPercent = 0,
  tipAmount = 0,
): number {
  const perItem = new Map(orderItems.map((it) => [it.itemId, calcPosLine(it)]))

  let groupShare = 0
  for (const { itemId, fraction } of group.items) {
    const line = perItem.get(itemId)
    if (!line) continue
    groupShare += (line.lineNet + line.lineVat) * fraction
  }
  groupShare = round2(groupShare)

  const orderSubtotalGross = round2(
    orderItems.reduce((sum, it) => sum + calcPosLine(it).lineTotal, 0),
  )
  const groupRatio = orderSubtotalGross > 0 ? groupShare / orderSubtotalGross : 0
  const factor = 1 - clampPercent(discountPercent) / 100

  return round2(groupShare * factor + clampAmount(tipAmount) * groupRatio)
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
