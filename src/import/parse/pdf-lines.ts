/** Textový úsek ze stránky PDF — jen to, co ke složení řádků potřebujeme. */
export interface PositionedText {
  str: string
  /** Vodorovná pozice v bodech (počátek vlevo). */
  x: number
  /** Svislá pozice v bodech (počátek DOLE, větší hodnota je výš). */
  y: number
  /** Šířka úseku v bodech — podle ní se pozná, jestli za ním následuje mezera. */
  width: number
  /** Výška písma v bodech, měřítko pro práh mezery. */
  height: number
}

/** Dva úseky na stejném řádku se liší v Y nanejvýš o tuhle mezeru (v bodech). */
const LINE_TOLERANCE = 2.5

/** Mezera mezi úseky se počítá až od téhle části výšky písma. */
const SPACE_RATIO = 0.25

/**
 * Spojí úseky jednoho řádku do textu.
 *
 * Zásadní je nevkládat mezeru tam, kde v dokladu žádná není. PDF často rozdělí
 * slovo na víc úseků — typicky kolem diakritiky — a naivní spojení mezerou
 * udělá z „IČO" řetězec „I Č O" a z „Celkem k úhradě" zase „Celkem k úhrad ě".
 * Vytěžování pak nenajde ani IČO, ani částku k úhradě. Mezera se proto vkládá
 * jen tehdy, když mezi koncem předchozího úseku a začátkem dalšího skutečně je.
 */
function joinRow(parts: PositionedText[]): string {
  const sorted = [...parts].sort((a, b) => a.x - b.x)
  let out = ''
  let prevEnd: number | null = null
  let prevHeight = 0

  for (const part of sorted) {
    if (prevEnd !== null && !/\s$/.test(out) && !/^\s/.test(part.str)) {
      const gap = part.x - prevEnd
      const scale = part.height || prevHeight || 10
      if (gap > scale * SPACE_RATIO) out += ' '
    }
    out += part.str
    prevEnd = part.x + part.width
    prevHeight = part.height || prevHeight
  }

  return out.replace(/[ \t]{2,}/g, ' ').trim()
}

/**
 * Poskládá textové úseky jedné stránky zpět do řádků.
 *
 * PDF nedrží text po řádcích — je to změť úseků s pozicí. Faktura se ale
 * vytěžuje řádkově („Datum vystavení: 1. 3. 2024"), takže bez tohohle kroku
 * by popisek a hodnota skončily každý jinde a nenašlo by se nic.
 *
 * Úseky se seskupí podle Y (shora dolů) a v řádku seřadí podle X (zleva).
 * Dvousloupcová hlavička tím splyne do jednoho řádku — s tím počítá až
 * vytěžování stran, které je rozlišuje pořadím údajů.
 */
export function itemsToLines(items: PositionedText[]): string[] {
  const rows: { y: number; parts: PositionedText[] }[] = []

  for (const item of items) {
    if (!item.str.trim()) continue
    const row = rows.find((r) => Math.abs(r.y - item.y) <= LINE_TOLERANCE)
    if (row) row.parts.push(item)
    else rows.push({ y: item.y, parts: [item] })
  }

  return rows
    .sort((a, b) => b.y - a.y) // PDF má počátek dole vlevo → větší Y je výš
    .map((r) => joinRow(r.parts))
    .filter(Boolean)
}
