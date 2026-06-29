import { parseCsv } from './csv'
import type { RawTable } from '../types'

/**
 * Načte nahraný soubor a vrátí RawTable.
 *
 * Zatím podporuje jen CSV; XLSX větev přibude v navazujícím kroku (do té doby
 * vyhodí srozumitelnou chybu, ať uživatel ví, co nahrát).
 */
export async function parseFile(file: File): Promise<RawTable> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) {
    return parseCsv(await file.text())
  }
  throw new Error(`Nepodporovaný formát „${file.name}". Zatím umíme jen CSV.`)
}
