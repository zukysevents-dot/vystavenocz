/**
 * Generický CSV export pro seznamy (klienti, dlužníci, tržby po pobočkách…).
 * Konvence českého Excelu: oddělovač `;`, desetinná čárka, BOM (kvůli diakritice), `\r\n`.
 * Faktury/účetní mají vlastní export v `accounting-export.ts` (ISDOC + specifické sloupce).
 */

export type CsvValue = string | number | null | undefined

/** Číslo → desetinná čárka (bez oddělovače tisíců, ať to Excel čte jako číslo). */
function formatNum(n: number): string {
  return String(n).replace('.', ',')
}

/** Buňka: uvozovky jen když obsahuje `;`, `"` nebo nový řádek (uvozovky se zdvojují). */
function cell(v: CsvValue): string {
  const s = typeof v === 'number' ? formatNum(v) : (v ?? '')
  return /["\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Sestaví CSV text z hlaviček a řádků (bez BOM). */
export function buildCsv(columns: string[], rows: CsvValue[][]): string {
  const lines = [columns.map(cell).join(';'), ...rows.map((r) => r.map(cell).join(';'))]
  return lines.join('\r\n')
}

/** Stáhne seznam jako `.csv` (s BOM, aby Excel správně zobrazil diakritiku). */
export function downloadCsv(filename: string, columns: string[], rows: CsvValue[][]): void {
  const content = '﻿' + buildCsv(columns, rows)
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
