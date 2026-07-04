import type { ProductInput } from '@/composables/useProducts'
import { useCategories } from '@/composables/useCategories'
import { useInventory } from '@/composables/useInventory'
import { isApiMode } from '@/lib/http'
import type { EntityDraft } from '../types'

/**
 * Cascade při importu produktů (jen API mód — kategorie/sklad nemají mock backend).
 *
 * Dvě části řízené configem:
 *  - resolver (před commitem): ze sloupce „kategorie" založí chybějící kategorie
 *    (dedup podle názvu case-insensitive, každou právě jednou) a přiřadí produktu
 *    `categoryId`. POST /categories NENÍ idempotentní → dedup MUSÍ být na klientu.
 *  - postCreate (po vytvoření produktu): naskladní počáteční množství. Volá se JEN
 *    u nově vytvořených produktů (ne u „přepsat") — naskladnění je přírůstkové,
 *    jinak by opakovaný import zásobu nafoukl.
 */

/** Před commitem: založí chybějící kategorie a doplní draftům `value.categoryId`. */
export function createProductRefsResolver() {
  const categories = useCategories()
  return async (drafts: EntityDraft<ProductInput>[]): Promise<void> => {
    if (!isApiMode()) return
    // Unikátní neprázdné názvy kategorií z importu (klíč = normalizovaný název).
    const wanted = new Map<string, string>()
    for (const d of drafts) {
      const name = d.extras?.category?.trim()
      if (name) wanted.set(name.toLowerCase(), name)
    }
    if (wanted.size === 0) return

    // Mapa existujících kategorií (název → id); doplňuje se o nově založené.
    const byName = new Map<string, string>()
    for (const c of await categories.list()) byName.set(c.name.trim().toLowerCase(), c.id)
    for (const [key, name] of wanted) {
      if (!byName.has(key)) {
        const created = await categories.create({ name })
        byName.set(key, created.id)
      }
    }

    for (const d of drafts) {
      const key = d.extras?.category?.trim().toLowerCase()
      if (key && byName.has(key)) d.value.categoryId = byName.get(key) ?? null
    }
  }
}

/** Po vytvoření produktu: naskladní počáteční množství (jen kladné číslo). */
export function createProductPostCreate() {
  const inventory = useInventory()
  return async (createdId: string, draft: EntityDraft<ProductInput>): Promise<void> => {
    if (!isApiMode()) return
    const raw = draft.extras?.quantity
    if (!raw) return
    const qty = Number(raw.replace(',', '.').replace(/[^\d.-]/g, ''))
    if (!Number.isFinite(qty) || qty <= 0) return
    await inventory.receive(createdId, qty, 'Počáteční stav z importu')
  }
}
