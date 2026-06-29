import type { ColumnMapping, EntityDraft, ImportSourceAdapter, RawTable } from './types'

/**
 * Aplikuje mapování sloupců na surovou tabulku a vytvoří drafty entit.
 *
 * Pro každý řádek vybere namapované sloupce a nechá adaptér (pokud má `transform`)
 * převést je na typovanou entitu. Validace a duplicity běží až na výsledných draftech.
 */
export function applyMapping<T>(
  table: RawTable,
  mapping: ColumnMapping,
  adapter: ImportSourceAdapter<T>,
): EntityDraft<T>[] {
  return table.rows.map((raw, rowIndex) => {
    const mapped: Record<string, string> = {}
    for (const [field, header] of Object.entries(mapping)) {
      if (header && header in raw) mapped[field] = raw[header]
    }
    const value = (adapter.transform ? adapter.transform(raw, mapped) : mapped) as T
    return { rowIndex, raw, value, issues: [], decision: 'create' as const }
  })
}
