import { parseCsv } from './csv'
import { parseXlsx } from './xlsx'
import type { RawTable } from '../types'

/**
 * Načte nahraný soubor a vrátí RawTable podle přípony.
 * Podporuje CSV a XLSX; ostatní formáty odmítne se srozumitelnou chybou.
 */
export async function parseFile(file: File): Promise<RawTable> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) {
    return parseCsv(await file.text())
  }
  if (name.endsWith('.xlsx')) {
    return parseXlsx(file)
  }
  throw new Error(`Nepodporovaný formát „${file.name}". Umíme CSV a XLSX.`)
}
