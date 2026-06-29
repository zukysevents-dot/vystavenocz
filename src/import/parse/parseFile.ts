import { parseCsv } from './csv'
import { parseXlsx } from './xlsx'
import { parseFakturoidClientsXml } from './fakturoid-xml'
import type { RawTable } from '../types'

/**
 * Načte nahraný soubor a vrátí RawTable podle přípony.
 * CSV/XLSX = obecná tabulka; XML = Fakturoid export faktur (vytáhne klienty).
 */
export async function parseFile(file: File): Promise<RawTable> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) {
    return parseCsv(await file.text())
  }
  if (name.endsWith('.xlsx')) {
    return parseXlsx(file)
  }
  if (name.endsWith('.xml')) {
    return parseFakturoidClientsXml(await file.text())
  }
  throw new Error(`Nepodporovaný formát „${file.name}". Umíme CSV, XLSX a Fakturoid XML.`)
}
