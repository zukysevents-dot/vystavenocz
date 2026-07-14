import { describe, expect, it } from 'vitest'
import {
  INVOICE_RECOVERY_TTL_MS,
  clearInvoiceEditorRecovery,
  invoiceEditorRecoveryKey,
  loadInvoiceEditorRecovery,
  pruneInvoiceEditorRecoveries,
  saveInvoiceEditorRecovery,
} from './invoice-editor-recovery'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('invoice editor recovery', () => {
  it('isolates drafts by user, company and invoice', () => {
    expect(invoiceEditorRecoveryKey('u1', 'c1', null, 's1')).not.toBe(
      invoiceEditorRecoveryKey('u1', 'c2', null, 's1'),
    )
    expect(invoiceEditorRecoveryKey('u1', 'c1', 'i1', 's1')).not.toBe(
      invoiceEditorRecoveryKey('u1', 'c1', 'i2', 's1'),
    )
    expect(invoiceEditorRecoveryKey('u1', 'c1', 'i1', 's1')).not.toBe(
      invoiceEditorRecoveryKey('u2', 'c1', 'i1', 's1'),
    )
    expect(invoiceEditorRecoveryKey('u1', 'c1', 'i1', 's1')).not.toBe(
      invoiceEditorRecoveryKey('u1', 'c1', 'i1', 's2'),
    )
  })

  it('saves, loads and clears a valid recovery', () => {
    const storage = memoryStorage()
    const key = invoiceEditorRecoveryKey('u1', 'c1', null, 's1')
    const now = new Date('2026-07-14T10:00:00.000Z')

    saveInvoiceEditorRecovery(storage, key, { notes: 'Rozpracováno' }, now)

    expect(loadInvoiceEditorRecovery<{ notes: string }>(storage, key, now.getTime())).toEqual({
      version: 1,
      savedAt: now.toISOString(),
      draft: { notes: 'Rozpracováno' },
    })
    clearInvoiceEditorRecovery(storage, key)
    expect(loadInvoiceEditorRecovery(storage, key, now.getTime())).toBeNull()
  })

  it('removes expired and malformed recoveries', () => {
    const storage = memoryStorage()
    const key = invoiceEditorRecoveryKey('u1', 'c1', null, 's1')
    const now = new Date('2026-07-14T10:00:00.000Z')

    saveInvoiceEditorRecovery(
      storage,
      key,
      { notes: 'Staré' },
      new Date(now.getTime() - INVOICE_RECOVERY_TTL_MS - 1),
    )
    expect(loadInvoiceEditorRecovery(storage, key, now.getTime())).toBeNull()

    storage.setItem(key, '{broken')
    expect(loadInvoiceEditorRecovery(storage, key, now.getTime())).toBeNull()
    expect(storage.getItem(key)).toBeNull()
  })

  it('does not claim a recovery was saved when storage rejects the write', () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }

    expect(
      saveInvoiceEditorRecovery(storage, invoiceEditorRecoveryKey('u1', 'c1', null, 's1'), {
        notes: 'Neuložitelné',
      }),
    ).toBeNull()
  })

  it('prunes expired orphaned sessions without removing current recoveries', () => {
    const storage = memoryStorage()
    const now = new Date('2026-07-14T10:00:00.000Z')
    const currentKey = invoiceEditorRecoveryKey('u1', 'c1', null, 'current-session')
    const orphanedKey = invoiceEditorRecoveryKey('u1', 'c1', null, 'closed-tab-session')

    saveInvoiceEditorRecovery(storage, currentKey, { notes: 'Aktuální' }, now)
    saveInvoiceEditorRecovery(
      storage,
      orphanedKey,
      { notes: 'Opuštěné' },
      new Date(now.getTime() - INVOICE_RECOVERY_TTL_MS - 1),
    )
    storage.setItem('unrelated-key', 'keep')

    expect(pruneInvoiceEditorRecoveries(storage, now.getTime())).toBe(1)
    expect(storage.getItem(orphanedKey)).toBeNull()
    expect(storage.getItem(currentKey)).not.toBeNull()
    expect(storage.getItem('unrelated-key')).toBe('keep')
  })
})
