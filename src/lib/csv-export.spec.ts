import { describe, it, expect } from 'vitest'
import { buildCsv, safeCsvText } from '@/lib/csv-export'

describe('buildCsv', () => {
  it('spojí hlavičky a řádky oddělovačem ; a \\r\\n', () => {
    expect(
      buildCsv(
        ['A', 'B'],
        [
          ['1', '2'],
          ['3', '4'],
        ],
      ),
    ).toBe('A;B\r\n1;2\r\n3;4')
  })

  it('čísla mají desetinnou čárku (bez oddělovače tisíců)', () => {
    expect(buildCsv(['X'], [[1234.5]])).toBe('X\r\n1234,5')
    expect(buildCsv(['X'], [[2450]])).toBe('X\r\n2450')
  })

  it('buňka s ; " nebo novým řádkem se obalí uvozovkami (uvozovky zdvojené)', () => {
    expect(buildCsv(['X'], [['a;b']])).toBe('X\r\n"a;b"')
    expect(buildCsv(['X'], [['a"b']])).toBe('X\r\n"a""b"')
    expect(buildCsv(['X'], [['a\nb']])).toBe('X\r\n"a\nb"')
    expect(buildCsv(['X'], [['a\rb']])).toBe('X\r\n"a\rb"')
  })

  it('null/undefined → prázdná buňka', () => {
    expect(buildCsv(['A', 'B'], [[null, undefined]])).toBe('A;B\r\n;')
  })

  it('safeCsvText neutralizuje tabulkové vzorce v uživatelském textu', () => {
    expect(safeCsvText('=HYPERLINK("https://example.test")')).toBe(
      `'=HYPERLINK("https://example.test")`,
    )
    expect(safeCsvText('  -1+2')).toBe("'  -1+2")
    expect(safeCsvText('Běžná poznámka')).toBe('Běžná poznámka')
  })
})
