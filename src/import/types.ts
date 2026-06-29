/**
 * Typy importního / migračního modulu (fáze F9).
 *
 * Datový model je sdílený napříč pipeline: parse → mapování → validace →
 * detekce duplicit → commit → audit. Roste po krocích, jak přibývají entity.
 */

/** Surová tabulka po naparsování souboru: hlavičky + řádky jako mapa header→hodnota. */
export interface RawTable {
  headers: string[]
  rows: Record<string, string>[]
}

/** Entita, kterou import naplňuje. Rozšiřuje se s každým novým importérem. */
export type ImportEntity = 'clients'

/** Mapování cílové pole entity → název zdrojového sloupce (nebo null = nemapováno). */
export type ColumnMapping = Record<string, string | null>

export type IssueLevel = 'error' | 'warning'

/** Nález validace na jednom řádku. `message` je česky, rovnou do UI. */
export interface ValidationIssue {
  field: string
  level: IssueLevel
  message: string
}

export type MatchReason = 'ico' | 'email' | 'name'

export interface DuplicateMatch {
  existingId: string // '' = duplicita v rámci nahraného souboru
  reason: MatchReason
  confidence: 'exact' | 'fuzzy'
}

export type RowDecision = 'create' | 'skip' | 'overwrite'

/** Jeden řádek importu od naparsování po rozhodnutí, co s ním. */
export interface EntityDraft<T> {
  rowIndex: number
  raw: Record<string, string>
  value: T // namapovaná + vyčištěná entita (XInput); před validací nemusí být kompletní
  issues: ValidationIssue[]
  duplicate?: DuplicateMatch
  decision: RowDecision
}

/**
 * Deklarativní popis „jak ze surového exportu zdroje udělat naši entitu".
 * Přidání nového zdroje = nový adaptér, beze změny pipeline i UI.
 */
export interface ImportSourceAdapter<TInput> {
  id: string // 'generic-clients'
  source: string // 'Fakturoid' (label zdroje)
  entity: ImportEntity
  label: string
  defaultMapping: ColumnMapping
  /** Heuristika pro autodetekci zdroje podle hlaviček. */
  detect?(headers: string[]): boolean
  /** Po namapování, před validací: čištění a převody na typovanou entitu. */
  transform?(row: Record<string, string>, mapped: Record<string, string>): Partial<TInput>
}

/** Záznam o jednom importu — slouží zároveň jako audit i klíč pro rollback. */
export interface ImportBatch {
  id: string
  source: string
  entity: ImportEntity
  adapterId: string
  createdAt: string
  createdIds: string[] // ids vytvořených entit → rollback
  counts: { created: number; skipped: number; failed: number; overwritten: number }
}

export interface ImportResult {
  batch: ImportBatch
  errors: { rowIndex: number; message: string }[]
}
