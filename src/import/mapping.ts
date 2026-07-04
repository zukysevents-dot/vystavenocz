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
  extraFields: string[] = [],
): EntityDraft<T>[] {
  return table.rows.map((raw, rowIndex) => {
    const mapped: Record<string, string> = {}
    for (const [field, header] of Object.entries(mapping)) {
      if (header && header in raw) mapped[field] = raw[header]
    }
    // Ne-entitní sloupce (kategorie, množství) vyjmi z mapped do extras — nesmí
    // protéct do entity (ops.create), spotřebují je až cascade hooky.
    const extras: Record<string, string> = {}
    for (const f of extraFields) {
      if (f in mapped) {
        extras[f] = mapped[f]
        delete mapped[f]
      }
    }
    const value = (adapter.transform ? adapter.transform(raw, mapped) : mapped) as T
    return { rowIndex, raw, value, extras, issues: [], decision: 'create' as const }
  })
}
