export type StocktakePhase = 'first' | 'recount'
export type StocktakeRangeKind = 'full' | 'partial' | 'cycle' | 'spot'

export interface StocktakeRange {
  kind: StocktakeRangeKind
  label: string
}

export interface StocktakeDraftScope {
  companyId: string | null
  userId: string
  locationId: string | null
}

export interface StocktakeDraftProduct {
  productId: string
  expectedQuantity: number
}

export interface StocktakeDraft {
  version: 1
  idempotencyKey: string
  scope: StocktakeDraftScope
  range: StocktakeRange
  productIds: string[]
  expectedQuantities: Record<string, number>
  firstCounts: Record<string, number | null>
  recountCounts: Record<string, number | null>
  note: string
  phase: StocktakePhase
  blindCount: boolean
  updatedAt: string
  // Vazba na serverový koncept je jen synchronizační metadata. Finální zápis stále používá
  // idempotentní POST /inventory/stocktake, takže koncept nikdy nemění skladový ledger.
  sharedDraft?: {
    id: string
    revision: number
    syncBlocked?: boolean
  }
}

export interface FinalStocktakeItem {
  productId: string
  countedQuantity: number
}

const PREFIX = 'vystaveno:stocktake-draft:v1'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const FULL_RANGE: StocktakeRange = { kind: 'full', label: 'Úplná inventura' }

function scopePart(value: string | null): string {
  return encodeURIComponent(value || '_')
}

export function stocktakeDraftKey(scope: StocktakeDraftScope): string {
  return [
    PREFIX,
    scopePart(scope.companyId),
    scopePart(scope.userId),
    scopePart(scope.locationId),
  ].join(':')
}

export function createStocktakeDraft(
  scope: StocktakeDraftScope,
  products: StocktakeDraftProduct[],
  idempotencyKey = crypto.randomUUID(),
  now = new Date(),
  range: StocktakeRange = FULL_RANGE,
): StocktakeDraft {
  const productIds = products.map((product) => product.productId)
  return {
    version: 1,
    idempotencyKey,
    scope,
    range,
    productIds,
    expectedQuantities: Object.fromEntries(
      products.map((product) => [product.productId, product.expectedQuantity]),
    ),
    firstCounts: Object.fromEntries(productIds.map((productId) => [productId, null])),
    recountCounts: Object.fromEntries(productIds.map((productId) => [productId, null])),
    note: 'Inventura',
    phase: 'first',
    blindCount: true,
    updatedAt: now.toISOString(),
  }
}

export function saveStocktakeDraft(draft: StocktakeDraft): boolean {
  try {
    localStorage.setItem(
      stocktakeDraftKey(draft.scope),
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    )
    return true
  } catch {
    return false
  }
}

export function loadStocktakeDraft(
  scope: StocktakeDraftScope,
  now = new Date(),
): StocktakeDraft | null {
  const key = stocktakeDraftKey(scope)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const draft = JSON.parse(raw) as unknown
    if (!isStocktakeDraft(draft) || !sameScope(draft.scope, scope)) {
      localStorage.removeItem(key)
      return null
    }
    const updatedAt = Date.parse(draft.updatedAt)
    if (!Number.isFinite(updatedAt) || now.getTime() - updatedAt > MAX_AGE_MS) {
      localStorage.removeItem(key)
      return null
    }
    return {
      ...draft,
      // Draft V1 před výběrem rozsahu znamenal úplnou inventuru. Zachováme jej, aby se
      // už rozpracované počítání neztratilo jen kvůli rozšíření workflow.
      range: validRange(draft.range) ? draft.range : FULL_RANGE,
    }
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function removeStocktakeDraft(scope: StocktakeDraftScope): void {
  localStorage.removeItem(stocktakeDraftKey(scope))
}

export function firstCountComplete(draft: StocktakeDraft): boolean {
  return draft.productIds.every((productId) => validCount(draft.firstCounts[productId]))
}

export function recountProductIds(draft: StocktakeDraft): string[] {
  return draft.productIds.filter((productId) => {
    const counted = draft.firstCounts[productId]
    return validCount(counted) && Math.abs(counted - draft.expectedQuantities[productId]) > 0.0001
  })
}

export function recountComplete(draft: StocktakeDraft): boolean {
  return recountProductIds(draft).every((productId) => validCount(draft.recountCounts[productId]))
}

export function finalStocktakeItems(draft: StocktakeDraft): FinalStocktakeItem[] | null {
  if (!firstCountComplete(draft) || draft.phase !== 'recount' || !recountComplete(draft))
    return null
  const recountIds = new Set(recountProductIds(draft))
  return draft.productIds.map((productId) => ({
    productId,
    countedQuantity: recountIds.has(productId)
      ? (draft.recountCounts[productId] as number)
      : (draft.firstCounts[productId] as number),
  }))
}

function sameScope(left: StocktakeDraftScope, right: StocktakeDraftScope): boolean {
  return (
    left.companyId === right.companyId &&
    left.userId === right.userId &&
    left.locationId === right.locationId
  )
}

function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1_000_000
}

function validExpected(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1_000_000
}

function isStocktakeDraft(value: unknown): value is StocktakeDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<StocktakeDraft>
  if (
    draft.version !== 1 ||
    typeof draft.idempotencyKey !== 'string' ||
    !draft.scope ||
    !Array.isArray(draft.productIds) ||
    !draft.expectedQuantities ||
    !draft.firstCounts ||
    !draft.recountCounts ||
    typeof draft.note !== 'string' ||
    (draft.phase !== 'first' && draft.phase !== 'recount') ||
    typeof draft.blindCount !== 'boolean' ||
    typeof draft.updatedAt !== 'string'
  )
    return false
  if (
    typeof draft.scope.userId !== 'string' ||
    (draft.scope.companyId !== null && typeof draft.scope.companyId !== 'string') ||
    (draft.scope.locationId !== null && typeof draft.scope.locationId !== 'string')
  )
    return false
  return draft.productIds.every(
    (productId) =>
      typeof productId === 'string' &&
      validExpected(draft.expectedQuantities?.[productId]) &&
      (draft.firstCounts?.[productId] === null || validCount(draft.firstCounts?.[productId])) &&
      (draft.recountCounts?.[productId] === null || validCount(draft.recountCounts?.[productId])),
  )
}

function validRange(value: unknown): value is StocktakeRange {
  if (!value || typeof value !== 'object') return false
  const range = value as Partial<StocktakeRange>
  return (
    (range.kind === 'full' ||
      range.kind === 'partial' ||
      range.kind === 'cycle' ||
      range.kind === 'spot') &&
    typeof range.label === 'string' &&
    range.label.length > 0 &&
    range.label.length <= 120
  )
}
