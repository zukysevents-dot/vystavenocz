// Provozní přehled (manažerská analytika prodejů) — kontrakt s backend endpointy
// GET /api/v1/pos-reports/summary, /revenue, /costs, /staff, /losses a /dead-items.

export interface PosVatLine {
  vatRate: number
  net: number
  vat: number
  gross: number
}

export interface PosProductLine {
  productId: string | null
  name: string
  quantity: number
  revenueGross: number
}

export interface PosSalesSummary {
  from: string
  to: string
  currency: string
  saleCount: number
  total: number
  totalNet: number
  totalVat: number
  cashTotal: number
  cardTotal: number
  tipTotal: number
  discountTotal: number
  cancelledCount: number
  cancelledTotal: number
  averageSale: number
  vatBreakdown: PosVatLine[]
  topProducts: PosProductLine[]
}

export interface PosRevenueBucket {
  periodStart: string
  periodEnd: string
  total: number
  saleCount: number
}

export interface PosRevenue {
  from: string
  to: string
  granularity: string
  currency: string
  series: PosRevenueBucket[]
}

export interface PosProductCostLine {
  productId: string
  name: string
  quantity: number
  revenueGross: number
  estimatedCost: number
  grossMargin: number
  grossMarginPercent: number
  foodCostPercent: number
  hasCostBasis: boolean
}

export interface PosCostSummary {
  from: string
  to: string
  currency: string
  productRevenueGross: number
  unlinkedRevenueGross: number
  estimatedCost: number
  grossMargin: number
  grossMarginPercent: number
  foodCostPercent: number
  missingCostProductCount: number
  products: PosProductCostLine[]
}

export interface PosStaffPerformanceLine {
  employeeId: string | null
  employeeName: string
  saleCount: number
  total: number
  cashTotal: number
  cardTotal: number
  tipTotal: number
  discountTotal: number
  cancelledCount: number
  cancelledTotal: number
  averageSale: number
}

export interface PosStaffPerformance {
  from: string
  to: string
  currency: string
  saleCount: number
  total: number
  tipTotal: number
  discountTotal: number
  cancelledCount: number
  cancelledTotal: number
  staff: PosStaffPerformanceLine[]
}

export type PosLossType =
  | 'Issue'
  | 'WriteOff'
  | 'StaffMeal'
  | 'Breakage'
  | 'Expiration'
  | 'Correction'
  | 'Stocktaking'

export interface PosLossReasonLine {
  type: PosLossType
  movementCount: number
  quantityLost: number
  lossValue: number
  quantityGained: number
  gainValue: number
}

export interface PosLossProductLine {
  productId: string
  name: string
  sku: string
  type: PosLossType
  quantityLost: number
  lossValue: number
  hasCostBasis: boolean
}

export interface PosLossSummary {
  from: string
  to: string
  currency: string
  operationalLossValue: number
  inventoryLossValue: number
  inventoryGainValue: number
  totalLossValue: number
  missingCostProductCount: number
  reasons: PosLossReasonLine[]
  products: PosLossProductLine[]
}

export interface PosDeadItemLine {
  productId: string
  name: string
  sku: string
  stockQuantity: number
  unitCost: number | null
  stockValue: number | null
  lastSoldAt: string | null
  daysSinceLastSale: number | null
}

export interface PosDeadItems {
  from: string
  to: string
  currency: string
  productCount: number
  knownStockValue: number
  missingCostProductCount: number
  products: PosDeadItemLine[]
}

// Rychlé rozsahy období pro přehled. Hranice se počítají z LOKÁLNÍHO data (obchodní den obsluhy),
// ne z UTC — jinak by se u půlnoci rozsah posunul o den.
export type PosReportPreset = 'today' | 'last7' | 'last30' | 'thisMonth'

export interface PosDateRange {
  from: string // yyyy-MM-dd
  to: string // yyyy-MM-dd
}

function isoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

// Rozsah [from, to] (inkluzivní) pro daný preset vůči „dnešku". `today` se předává kvůli testovatelnosti.
export function posReportRange(preset: PosReportPreset, today: Date): PosDateRange {
  const to = isoLocal(today)
  switch (preset) {
    case 'today':
      return { from: to, to }
    case 'last7':
      return { from: isoLocal(addDays(today, -6)), to } // dnes + 6 předchozích = 7 dní
    case 'last30':
      return { from: isoLocal(addDays(today, -29)), to }
    case 'thisMonth':
      return { from: isoLocal(new Date(today.getFullYear(), today.getMonth(), 1)), to }
  }
}
