import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createStocktakeDraft,
  finalStocktakeItems,
  firstCountComplete,
  loadStocktakeDraft,
  recountComplete,
  recountProductIds,
  removeStocktakeDraft,
  saveStocktakeDraft,
  stocktakeDraftKey,
} from './stocktake-draft'

const scope = { companyId: 'company-a', userId: 'user-a', locationId: 'bar-a' }
const products = [
  { productId: 'coffee', expectedQuantity: 5 },
  { productId: 'milk', expectedQuantity: 3 },
]

describe('stocktake draft', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('izoluje průběh firmou, uživatelem a pobočkou', () => {
    expect(stocktakeDraftKey(scope)).not.toBe(
      stocktakeDraftKey({ ...scope, companyId: 'company-b' }),
    )
    expect(stocktakeDraftKey(scope)).not.toBe(stocktakeDraftKey({ ...scope, userId: 'user-b' }))
    expect(stocktakeDraftKey(scope)).not.toBe(stocktakeDraftKey({ ...scope, locationId: 'bar-b' }))
  })

  it('obnoví slepý první průchod se stejným idempotency klíčem', () => {
    const draft = createStocktakeDraft(
      scope,
      products,
      '11111111-1111-4111-8111-111111111111',
      new Date('2026-07-15T10:00:00Z'),
    )
    draft.firstCounts.coffee = 2
    expect(saveStocktakeDraft(draft)).toBe(true)

    const restored = loadStocktakeDraft(scope, new Date('2026-07-15T11:00:00Z'))

    expect(restored?.blindCount).toBe(true)
    expect(restored?.firstCounts.coffee).toBe(2)
    expect(restored?.idempotencyKey).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('uchová zvolený rozsah inventury a starší koncept doplní jako úplný', () => {
    const draft = createStocktakeDraft(
      scope,
      [products[0]],
      undefined,
      new Date('2026-07-15T10:00:00Z'),
      { kind: 'spot', label: 'Namátková kontrola' },
    )
    expect(saveStocktakeDraft(draft)).toBe(true)
    expect(loadStocktakeDraft(scope)?.range).toEqual({ kind: 'spot', label: 'Namátková kontrola' })

    const legacy = { ...draft }
    delete (legacy as Partial<typeof draft>).range
    localStorage.setItem(stocktakeDraftKey(scope), JSON.stringify(legacy))
    expect(loadStocktakeDraft(scope)?.range).toEqual({ kind: 'full', label: 'Úplná inventura' })
  })

  it('zahodí poškozený nebo starší než sedmidenní průběh', () => {
    localStorage.setItem(stocktakeDraftKey(scope), '{broken')
    expect(loadStocktakeDraft(scope)).toBeNull()

    const stale = createStocktakeDraft(scope, products, undefined, new Date('2026-07-01T00:00:00Z'))
    expect(saveStocktakeDraft(stale)).toBe(true)
    const stored = JSON.parse(localStorage.getItem(stocktakeDraftKey(scope))!)
    stored.updatedAt = '2026-07-01T00:00:00.000Z'
    localStorage.setItem(stocktakeDraftKey(scope), JSON.stringify(stored))
    expect(loadStocktakeDraft(scope, new Date('2026-07-15T00:00:00Z'))).toBeNull()
  })

  it('vyžádá první počet všech položek a druhý počet pouze rozdílů', () => {
    const draft = createStocktakeDraft(scope, products)
    draft.firstCounts.coffee = 4
    draft.firstCounts.milk = 3
    expect(firstCountComplete(draft)).toBe(true)
    expect(recountProductIds(draft)).toEqual(['coffee'])
    draft.phase = 'recount'
    expect(recountComplete(draft)).toBe(false)
    draft.recountCounts.coffee = 5
    expect(recountComplete(draft)).toBe(true)
    expect(finalStocktakeItems(draft)).toEqual([
      { productId: 'coffee', countedQuantity: 5 },
      { productId: 'milk', countedQuantity: 3 },
    ])
  })

  it('bez druhého průchodu nevytvoří finální payload', () => {
    const draft = createStocktakeDraft(scope, products)
    draft.firstCounts.coffee = 5
    draft.firstCounts.milk = 3
    expect(finalStocktakeItems(draft)).toBeNull()
    removeStocktakeDraft(scope)
    expect(localStorage.getItem(stocktakeDraftKey(scope))).toBeNull()
  })
})
