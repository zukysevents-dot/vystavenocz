import Papa from 'papaparse'
import type { RawTable } from '../types'

/**
 * Naparsuje CSV text na RawTable.
 *
 * Oddělovač se autodetekuje (české exporty běžně používají `;`), případný BOM
 * se odstraní, hlavičky se ořežou o okrajové mezery a prázdné řádky se vynechají.
 * Hodnoty zůstávají jako string — čištění a převody řeší až normalize fáze.
 */
export function parseCsv(text: string): RawTable {
  const clean = text.replace(/^﻿/, '')

  // papaparse duplicitní hlavičky tiše přejmenuje (name → name_1), takže by uživatel
  // importoval data z přejmenovaného sloupce. Detekuj je na surovém prvním řádku.
  const headerRow = Papa.parse<string[]>(clean, { header: false, preview: 1 }).data[0] ?? []
  const rawHeaders = headerRow.map((h) => h.trim()).filter((h) => h.length > 0)
  const dupes = rawHeaders.filter((h, i) => rawHeaders.indexOf(h) !== i)
  if (dupes.length) {
    const unique = [...new Set(dupes)].join(', ')
    throw new Error(
      `Soubor obsahuje duplicitní sloupce: ${unique}. Přejmenujte je a nahrajte znovu.`,
    )
  }

  const result = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })
  const headers = (result.meta.fields ?? []).filter((h) => h.length > 0)
  return { headers, rows: result.data }
}
