import { describe, it, expect, vi } from 'vitest'
import { parseCsv } from './csv'
import { parseFile } from './parseFile'

// XLSX větev testujeme jen na úrovni směrování (parseXlsx je zmockovaná).
vi.mock('./xlsx', () => ({
  parseXlsx: vi.fn(async () => ({ headers: ['from-xlsx'], rows: [{ 'from-xlsx': 'v' }] })),
}))

describe('parseCsv', () => {
  it('naparsuje CSV s hlavičkou a čárkou', () => {
    const t = parseCsv('name,email\nAcme s.r.o.,info@acme.cz\nJana,jana@example.cz')
    expect(t.headers).toEqual(['name', 'email'])
    expect(t.rows).toHaveLength(2)
    expect(t.rows[0]).toEqual({ name: 'Acme s.r.o.', email: 'info@acme.cz' })
  })

  it('autodetekuje středník jako oddělovač (české exporty)', () => {
    const t = parseCsv('name;ico\nAcme;12345678')
    expect(t.headers).toEqual(['name', 'ico'])
    expect(t.rows[0]).toEqual({ name: 'Acme', ico: '12345678' })
  })

  it('ořeže mezery v hlavičkách', () => {
    const t = parseCsv(' name , email \nAcme,a@b.cz')
    expect(t.headers).toEqual(['name', 'email'])
  })

  it('vynechá prázdné řádky', () => {
    const t = parseCsv('name\nAcme\n\n\nBeta\n')
    expect(t.rows).toHaveLength(2)
  })

  it('zachová prázdné buňky jako prázdný řetězec', () => {
    const t = parseCsv('name,ico\nAcme,')
    expect(t.rows[0]).toEqual({ name: 'Acme', ico: '' })
  })

  it('odstraní BOM ze začátku souboru', () => {
    const t = parseCsv('﻿name,email\nAcme,a@b.cz')
    expect(t.headers).toEqual(['name', 'email'])
  })

  it('odmítne duplicitní hlavičky (tichá ztráta dat)', () => {
    expect(() => parseCsv('name,name\nA,B')).toThrow(/duplicitní/)
  })

  it('jen hlavička bez řádků → prázdné rows', () => {
    const t = parseCsv('name,email')
    expect(t.headers).toEqual(['name', 'email'])
    expect(t.rows).toEqual([])
  })

  it('prázdný vstup → prázdné headers i rows', () => {
    const t = parseCsv('')
    expect(t.headers).toEqual([])
    expect(t.rows).toEqual([])
  })
})

describe('parseFile', () => {
  it('naparsuje .csv soubor', async () => {
    const file = new File(['name,email\nAcme,a@b.cz'], 'klienti.csv', { type: 'text/csv' })
    const t = await parseFile(file)
    expect(t.headers).toEqual(['name', 'email'])
    expect(t.rows[0]).toEqual({ name: 'Acme', email: 'a@b.cz' })
  })

  it('.xlsx soubor směruje na parseXlsx', async () => {
    const file = new File([], 'klienti.xlsx')
    const t = await parseFile(file)
    expect(t.headers).toEqual(['from-xlsx'])
  })

  it('odmítne nepodporovaný formát', async () => {
    const file = new File([''], 'data.pdf')
    await expect(parseFile(file)).rejects.toThrow(/Nepodporovaný/)
  })
})
