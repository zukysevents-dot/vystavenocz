import type { EntityDraft, MatchReason } from './types'

/** Jeden porovnávací klíč: důvod shody + jak z entity získat porovnávanou hodnotu. */
export interface DedupKey<T> {
  reason: MatchReason
  value: (entity: T) => string | null
}

function norm(v: string | null): string | null {
  if (!v) return null
  const t = v.trim().toLowerCase()
  return t.length ? t : null
}

/**
 * Označí drafty, které se shodují s existujícími záznamy nebo s dřívějším řádkem
 * v souboru. Klíče se zkouší v pořadí priority (např. IČO před e-mailem).
 *
 * Mutuje `draft.duplicate` a u shody nastaví `draft.decision = 'skip'`.
 * `existing` nese `id` pro odkaz na konkrétní záznam; duplicita v rámci souboru
 * má `existingId = ''`.
 */
export function detectDuplicates<T>(
  drafts: EntityDraft<T>[],
  existing: (T & { id: string })[],
  keys: DedupKey<T>[],
): void {
  const index = new Map<string, string>() // "reason:hodnota" → existingId
  for (const e of existing) {
    for (const key of keys) {
      const v = norm(key.value(e))
      if (v) index.set(`${key.reason}:${v}`, e.id)
    }
  }

  for (const draft of drafts) {
    for (const key of keys) {
      const v = norm(key.value(draft.value))
      if (!v) continue
      const indexKey = `${key.reason}:${v}`
      const hit = index.get(indexKey)
      if (hit !== undefined) {
        draft.duplicate = { existingId: hit, reason: key.reason, confidence: 'exact' }
        draft.decision = 'skip'
        break
      }
      // Zaeviduj hodnotu pro detekci duplicit v rámci souboru (id ještě neznáme).
      index.set(indexKey, '')
    }
  }
}
