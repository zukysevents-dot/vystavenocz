import { describe, it, expect, vi } from 'vitest'

// read-excel-file je nahrazena spy — testujeme NAŠI transformaci matice na RawTable,
// ne samotnou knihovnu (tu pokrývá reálný e2e s .xlsx fixtures).
const { readXlsxFile } = vi.hoisted(() => ({ readXlsxFile: vi.fn() }))
vi.mock('read-excel-file/browser', () => ({ default: readXlsxFile }))

import { parseXlsx } from './xlsx'

describe('parseXlsx', () => {
  // read-excel-file v9 vrací pole listů [{ sheet, data }] — mock kopíruje reálný tvar.
  const sheet = (data: unknown[][]) => [{ sheet: 'Klienti', data }]

  it('převede list na RawTable (čísla→string, ořez hlaviček, prázdné řádky pryč)', async () => {
    readXlsxFile.mockResolvedValueOnce(
      sheet([
        ['name', ' ico ', 'email'],
        ['Acme s.r.o.', 27082440, 'info@acme.cz'],
        ['Beta', null, null],
        [null, null, null],
      ]),
    )
    const t = await parseXlsx(new File([], 'k.xlsx'))
    expect(t.headers).toEqual(['name', 'ico', 'email'])
    expect(t.rows).toHaveLength(2)
    expect(t.rows[0]).toEqual({ name: 'Acme s.r.o.', ico: '27082440', email: 'info@acme.cz' })
    expect(t.rows[1]).toEqual({ name: 'Beta', ico: '', email: '' })
  })

  it('odmítne duplicitní hlavičky', async () => {
    readXlsxFile.mockResolvedValueOnce(
      sheet([
        ['name', 'name'],
        ['A', 'B'],
      ]),
    )
    await expect(parseXlsx(new File([], 'k.xlsx'))).rejects.toThrow(/duplicitní/)
  })

  it('žádný list → prázdné headers i rows', async () => {
    readXlsxFile.mockResolvedValueOnce([])
    const t = await parseXlsx(new File([], 'k.xlsx'))
    expect(t).toEqual({ headers: [], rows: [] })
  })
})
