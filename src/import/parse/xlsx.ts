import type { RawTable } from '../types'

/** Sjednotí buňku z read-excel-file na string (čísla, data, prázdné buňky). */
function cellToString(cell: unknown): string {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell)
}

/**
 * Naparsuje XLSX na RawTable přes read-excel-file (jen čtení, bez SheetJS CVE).
 *
 * Knihovna se načítá lazy (dynamic import), aby nebyla v hlavním bundlu — XLSX
 * potřebuje jen ten, kdo reálně importuje. Bere první list; první řádek jsou
 * hlavičky, ostatní řádky se mapují na header→hodnota (vše jako string).
 */
export async function parseXlsx(file: File): Promise<RawTable> {
  const mod = await import('read-excel-file/browser')
  const readXlsxFile = mod.default as unknown as (
    input: Blob,
  ) => Promise<unknown[][] | { data: unknown[][] }[]>
  const result = await readXlsxFile(file)
  // read-excel-file v9 vrací pole listů [{sheet,data}] → bereme první list.
  // (Starší tvar = holá matice řádků, proto fallback přes Array.isArray.)
  const matrix: unknown[][] = Array.isArray(result[0])
    ? (result as unknown[][])
    : ((result as { data: unknown[][] }[])[0]?.data ?? [])
  if (!matrix.length) return { headers: [], rows: [] }

  // Hlavičky s původním indexem sloupce (prázdné se přeskočí, index se zachová).
  const headerCols: { name: string; col: number }[] = []
  matrix[0].forEach((cell, col) => {
    const name = cellToString(cell).trim()
    if (name.length > 0) headerCols.push({ name, col })
  })
  const headers = headerCols.map((h) => h.name)

  // Duplicitní hlavičky → stejná ochrana jako u CSV (jinak tichá ztráta dat).
  const dupes = headers.filter((h, i) => headers.indexOf(h) !== i)
  if (dupes.length) {
    const unique = [...new Set(dupes)].join(', ')
    throw new Error(
      `Soubor obsahuje duplicitní sloupce: ${unique}. Přejmenujte je a nahrajte znovu.`,
    )
  }

  const rows = matrix
    .slice(1)
    .map((row) => {
      const rec: Record<string, string> = {}
      for (const { name, col } of headerCols) rec[name] = cellToString(row[col])
      return rec
    })
    .filter((rec) => Object.values(rec).some((v) => v.length > 0)) // vynech prázdné řádky
  return { headers, rows }
}
