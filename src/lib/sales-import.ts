import type { RawTable } from '@/import/types'
import type { PaymentMethod } from '@/lib/types'

export interface SalesImportItemInput {
  externalId: string | null
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  discountPercent: number
  lineNet: number
  lineVat: number
  lineTotal: number
}

export interface SalesImportSaleInput {
  externalId: string
  soldAt: string
  locationId: string | null
  paymentMethod: PaymentMethod
  totalNet: number
  totalVat: number
  total: number
  tipAmount: number
  discountPercent: number
  items: SalesImportItemInput[]
}

export interface SalesImportRequest {
  source: string
  dryRun: boolean
  sales: SalesImportSaleInput[]
}

export interface SalesImportSummary {
  total: number
  imported: number
  skipped: number
  failed: number
}

export interface SalesImportResponse {
  batchId: string | null
  dryRun: boolean
  summary: SalesImportSummary
  errors: Array<{ externalId: string | null; rowIndex: number | null; message: string }>
}

export interface SalesImportPreview {
  source: string
  sales: SalesImportSaleInput[]
  rowCount: number
  errors: Array<{ rowIndex: number; message: string }>
}

const receiptAliases = [
  'externalId',
  'external_id',
  'receiptId',
  'receipt_id',
  'receipt',
  'uctenka',
  'účtenka',
  'cislo_uctenky',
  'číslo účtenky',
  'doklad',
  'orderId',
]
const soldAtAliases = [
  'soldAt',
  'sold_at',
  'datum',
  'date',
  'cas',
  'čas',
  'timestamp',
  'created_at',
]
const paymentAliases = ['paymentMethod', 'payment_method', 'platba', 'payment', 'typ platby']
const locationAliases = ['locationId', 'location_id', 'pobocka_id', 'provozovna_id']
const itemIdAliases = ['itemExternalId', 'item_external_id', 'itemId', 'item_id', 'polozka_id']
const descriptionAliases = [
  'description',
  'product',
  'produkt',
  'polozka',
  'položka',
  'name',
  'nazev',
]
const quantityAliases = ['quantity', 'qty', 'mnozstvi', 'množství', 'ks']
const unitPriceAliases = ['unitPrice', 'unit_price', 'cena_ks', 'cena ks', 'cena', 'price']
const vatRateAliases = ['vatRate', 'vat_rate', 'dph', 'vat', 'sazba_dph']
const lineNetAliases = ['lineNet', 'line_net', 'zaklad', 'základ', 'base']
const lineVatAliases = ['lineVat', 'line_vat', 'dph_castka', 'dph částka', 'vat_amount']
const lineTotalAliases = ['lineTotal', 'line_total', 'celkem_radek', 'celkem řádek', 'total']
const saleTotalAliases = [
  'saleTotal',
  'sale_total',
  'uctenka_celkem',
  'účtenka celkem',
  'receipt_total',
]
const tipAliases = ['tipAmount', 'tip_amount', 'spropitne', 'spropitné', 'tip']
const discountAliases = ['discountPercent', 'discount_percent', 'sleva_pct', 'sleva %']

export function buildSalesImportPreview(table: RawTable, source: string): SalesImportPreview {
  const groups = new Map<string, { rows: Record<string, string>[]; rowIndexes: number[] }>()
  const errors: SalesImportPreview['errors'] = []

  table.rows.forEach((row, index) => {
    const rowIndex = index + 2
    const externalId = pick(row, receiptAliases).trim()
    if (!externalId) {
      errors.push({ rowIndex, message: 'Chybí číslo účtenky / externalId.' })
      return
    }
    const group = groups.get(externalId) ?? { rows: [], rowIndexes: [] }
    group.rows.push(row)
    group.rowIndexes.push(rowIndex)
    groups.set(externalId, group)
  })

  const sales: SalesImportSaleInput[] = []
  for (const [externalId, group] of groups) {
    const first = group.rows[0]
    const soldAt = normalizeDate(pick(first, soldAtAliases))
    if (!soldAt) {
      errors.push({ rowIndex: group.rowIndexes[0], message: `Účtenka ${externalId}: chybí datum.` })
      continue
    }

    const items: SalesImportItemInput[] = []
    for (const [index, row] of group.rows.entries()) {
      const item = buildItem(row)
      if (!item.description) {
        errors.push({
          rowIndex: group.rowIndexes[index],
          message: `Účtenka ${externalId}: chybí název položky.`,
        })
        continue
      }
      items.push(item)
    }
    if (!items.length) continue

    const lineNet = round2(items.reduce((sum, i) => sum + i.lineNet, 0))
    const lineVat = round2(items.reduce((sum, i) => sum + i.lineVat, 0))
    const lineTotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0))
    const tipAmount = numberOr(pick(first, tipAliases), 0)
    const explicitTotal = numberOr(pick(first, saleTotalAliases), 0)
    const total = explicitTotal > 0 ? explicitTotal : round2(lineTotal + tipAmount)

    sales.push({
      externalId,
      soldAt,
      locationId: pick(first, locationAliases).trim() || null,
      paymentMethod: normalizePayment(pick(first, paymentAliases)),
      totalNet: lineNet,
      totalVat: lineVat,
      total,
      tipAmount,
      discountPercent: numberOr(pick(first, discountAliases), 0),
      items,
    })
  }

  return { source, sales, rowCount: table.rows.length, errors }
}

function buildItem(row: Record<string, string>): SalesImportItemInput {
  const quantity = numberOr(pick(row, quantityAliases), 1)
  const vatRate = numberOr(pick(row, vatRateAliases), 21)
  const unitPrice = numberOr(pick(row, unitPriceAliases), 0)
  const explicitTotal = numberOr(pick(row, lineTotalAliases), 0)
  const lineTotal = explicitTotal > 0 ? explicitTotal : round2(quantity * unitPrice)
  const explicitNet = numberOr(pick(row, lineNetAliases), 0)
  const explicitVat = numberOr(pick(row, lineVatAliases), 0)
  const lineNet = explicitNet > 0 ? explicitNet : round2(lineTotal / (1 + vatRate / 100))
  const lineVat = explicitVat > 0 ? explicitVat : round2(lineTotal - lineNet)

  return {
    externalId: pick(row, itemIdAliases).trim() || null,
    description: pick(row, descriptionAliases).trim(),
    quantity,
    unitPrice: unitPrice > 0 ? unitPrice : round2(lineTotal / Math.max(quantity, 1)),
    vatRate,
    discountPercent: numberOr(pick(row, discountAliases), 0),
    lineNet,
    lineVat,
    lineTotal,
  }
}

function pick(row: Record<string, string>, aliases: string[]): string {
  const entries = Object.entries(row)
  for (const alias of aliases) {
    const wanted = key(alias)
    const found = entries.find(([header]) => key(header) === wanted)
    if (found) return found[1] ?? ''
  }
  return ''
}

function key(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function numberOr(value: string, fallback: number): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizePayment(value: string): PaymentMethod {
  const normalized = key(value)
  if (normalized.includes('card') || normalized.includes('kart')) return 'Card'
  return 'Cash'
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()

  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (!match) return null
  const [, day, month, year, hour = '0', minute = '0'] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
