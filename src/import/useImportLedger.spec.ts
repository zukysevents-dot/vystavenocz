import { describe, it, expect, beforeEach } from 'vitest'
import { useImportLedger } from './useImportLedger'
import type { ImportBatch } from './types'

function batch(id: string, createdIds: string[], createdAt: string): ImportBatch {
  return {
    id,
    source: 'CSV',
    entity: 'clients',
    adapterId: 'generic-clients',
    createdAt,
    createdIds,
    counts: { created: createdIds.length, skipped: 0, failed: 0, overwritten: 0 },
  }
}

describe('useImportLedger', () => {
  beforeEach(() => localStorage.clear())

  it('zaznamená a vrátí dávky (nejnovější první)', () => {
    const ledger = useImportLedger()
    ledger.record(batch('b1', ['x'], '2026-01-01T00:00:00Z'))
    ledger.record(batch('b2', ['y'], '2026-02-01T00:00:00Z'))
    expect(ledger.list().map((b) => b.id)).toEqual(['b2', 'b1'])
  })

  it('rollback smaže entity a odebere dávku', async () => {
    const ledger = useImportLedger()
    ledger.record(batch('b1', ['a', 'b'], '2026-01-01T00:00:00Z'))
    const removed: string[] = []
    const res = await ledger.rollback('b1', async (id) => {
      removed.push(id)
    })
    expect(res).toEqual({ removed: 2, failed: 0 })
    expect(removed).toEqual(['a', 'b'])
    expect(ledger.list()).toEqual([])
  })

  it('při selhání mazání dávku ponechá', async () => {
    const ledger = useImportLedger()
    ledger.record(batch('b1', ['a'], '2026-01-01T00:00:00Z'))
    const res = await ledger.rollback('b1', async () => {
      throw new Error('fail')
    })
    expect(res).toEqual({ removed: 0, failed: 1 })
    expect(ledger.list()).toHaveLength(1)
  })
})
