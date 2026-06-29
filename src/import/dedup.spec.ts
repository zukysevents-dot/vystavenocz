import { describe, it, expect } from 'vitest'
import { detectDuplicates, type DedupKey } from './dedup'
import type { EntityDraft } from './types'

interface C {
  name: string
  ico: string | null
  email: string | null
}

const keys: DedupKey<C>[] = [
  { reason: 'ico', value: (c) => c.ico },
  { reason: 'email', value: (c) => c.email },
  { reason: 'name', value: (c) => c.name },
]

function draft(value: C, rowIndex = 0): EntityDraft<C> {
  return { rowIndex, raw: {}, value, issues: [], decision: 'create' }
}

describe('detectDuplicates', () => {
  it('označí shodu podle IČO proti existujícím', () => {
    const drafts = [draft({ name: 'Acme', ico: '27082440', email: null })]
    detectDuplicates(drafts, [{ id: 'c1', name: 'Acme staré', ico: '27082440', email: null }], keys)
    expect(drafts[0].duplicate).toEqual({ existingId: 'c1', reason: 'ico', confidence: 'exact' })
    expect(drafts[0].decision).toBe('skip')
  })

  it('shoda podle e-mailu je case-insensitive', () => {
    const drafts = [draft({ name: 'X', ico: null, email: 'A@B.cz' })]
    detectDuplicates(drafts, [{ id: 'c2', name: 'Y', ico: null, email: 'a@b.cz' }], keys)
    expect(drafts[0].duplicate?.reason).toBe('email')
  })

  it('bez shody → zůstává create', () => {
    const drafts = [draft({ name: 'Nový', ico: '12345678', email: null })]
    detectDuplicates(drafts, [], keys)
    expect(drafts[0].duplicate).toBeUndefined()
    expect(drafts[0].decision).toBe('create')
  })

  it('detekuje duplicitu v rámci souboru', () => {
    const drafts = [
      draft({ name: 'A', ico: '27082440', email: null }, 0),
      draft({ name: 'A kopie', ico: '27082440', email: null }, 1),
    ]
    detectDuplicates(drafts, [], keys)
    expect(drafts[0].duplicate).toBeUndefined()
    expect(drafts[1].duplicate).toEqual({ existingId: '', reason: 'ico', confidence: 'exact' })
  })
})
