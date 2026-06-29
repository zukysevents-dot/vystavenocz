/**
 * Čištění a normalizace hodnot z importovaných souborů.
 * Čisté funkce bez vedlejších efektů — snadno testovatelné.
 */

/** Ponechá jen číslice z IČO; prázdné → null. Validitu řeší isValidIco zvlášť. */
export function normalizeIco(value: string | null | undefined): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  return digits.length ? digits : null
}

/** Kontrola českého IČO přes mod-11 (8 číslic + kontrolní číslice). */
export function isValidIco(ico: string): boolean {
  if (!/^\d{8}$/.test(ico)) return false
  const d = ico.split('').map(Number)
  const sum = d.slice(0, 7).reduce((acc, n, i) => acc + n * (8 - i), 0)
  const mod = sum % 11
  const check = mod === 0 ? 1 : mod === 1 ? 0 : 11 - mod
  return check === d[7]
}

/** Sjednotí DIČ: bez mezer, velkými písmeny. */
export function normalizeDic(value: string | null | undefined): string | null {
  if (!value) return null
  const cleaned = value.replace(/\s+/g, '').toUpperCase()
  return cleaned.length ? cleaned : null
}

/** Telefon na +420 tvar pro běžná česká čísla; jinak ponechá očištěné. */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null
  let v = value.replace(/[^\d+]/g, '')
  if (v.startsWith('00')) v = '+' + v.slice(2)
  if (/^\d{9}$/.test(v)) v = '+420' + v
  return v.length ? v : null
}

/** Ořízne řetězec; prázdný (nebo undefined) → null. */
export function trimOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  const t = value.trim()
  return t.length ? t : null
}

/** Cena z textu: „1 290,50 Kč" → 1290.5. Prázdné / nečíselné → 0. */
export function parsePrice(value: string | null | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(/[^\d,.-]/g, '')
  // CZ formát s desetinnou čárkou: tečky jsou oddělovače tisíců → odstranit je.
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}
