import type { ImportBatch } from './types'

const LEDGER_KEY = 'vystaveno:import-batches'

function read(): ImportBatch[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY)
    return raw ? (JSON.parse(raw) as ImportBatch[]) : []
  } catch {
    return []
  }
}

function write(batches: ImportBatch[]): void {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(batches))
}

/**
 * Import ledger — historie dávek v localStorage. Slouží jako audit a zároveň
 * jako klíč pro best-effort rollback (drží ID vytvořených entit).
 */
export function useImportLedger() {
  function list(): ImportBatch[] {
    return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  function record(batch: ImportBatch): void {
    write([...read(), batch])
  }

  function get(id: string): ImportBatch | undefined {
    return read().find((b) => b.id === id)
  }

  /**
   * Smaže entity vytvořené v dávce přes předaný `remove` (volající ho dodá podle
   * entity, např. `useClients().remove`). Po úplném úspěchu dávku z ledgeru odebere.
   */
  async function rollback(
    id: string,
    remove: (entityId: string) => Promise<void>,
  ): Promise<{ removed: number; failed: number }> {
    const batch = get(id)
    if (!batch) return { removed: 0, failed: 0 }
    let removed = 0
    let failed = 0
    for (const entityId of batch.createdIds) {
      try {
        await remove(entityId)
        removed++
      } catch {
        failed++
      }
    }
    if (failed === 0) write(read().filter((b) => b.id !== id))
    return { removed, failed }
  }

  return { list, record, get, rollback }
}
