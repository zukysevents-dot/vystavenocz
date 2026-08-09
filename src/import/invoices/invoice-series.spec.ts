import { describe, it, expect } from 'vitest'
import { parseNumberPattern, inferSeriesFromNumbers } from './invoice-series'

describe('parseNumberPattern', () => {
  it('rozebere číslo s rokem a pomlčkou', () => {
    expect(parseNumberPattern('2024-0042')).toMatchObject({
      format: '{year}-{seq}',
      seq: 42,
      year: 2024,
      seqWidth: 4,
    })
  })

  it('rozebere číslo s prefixem', () => {
    expect(parseNumberPattern('FA2024001')).toMatchObject({
      prefix: 'FA',
      format: '{prefix}{year}{seq}',
      seq: 1,
      year: 2024,
      seqWidth: 3,
    })
  })

  it('rozebere pořadí před rokem', () => {
    expect(parseNumberPattern('0042/2024')).toMatchObject({
      format: '{seq}/{year}',
      seq: 42,
      year: 2024,
    })
  })

  it('zvládne číslo bez roku', () => {
    expect(parseNumberPattern('0042')).toMatchObject({ seq: 42, year: null, seqWidth: 4 })
  })

  it('samotný rok bere jako pořadí, ne jako rok', () => {
    // Jinak by číslo zůstalo bez sekvence a řada by neměla na co navázat.
    expect(parseNumberPattern('2024')).toMatchObject({ seq: 2024, year: null })
  })

  it('vrátí null bez číslic', () => {
    expect(parseNumberPattern('FAKTURA')).toBeNull()
    expect(parseNumberPattern('')).toBeNull()
  })
})

// Rok se předává explicitně — jinak by testy začaly padat se změnou kalendáře.
describe('inferSeriesFromNumbers', () => {
  it('naváže na nejvyšší číslo ve stejném roce', () => {
    const s = inferSeriesFromNumbers(['2024-0001', '2024-0042', '2024-0007'], 2024)
    expect(s).toMatchObject({
      nextSeq: 43,
      preview: '2024-0043',
      basedOn: '2024-0042',
      resetForNewYear: false,
    })
  })

  it('ignoruje starší roky — pořadí se každý rok vrací na začátek', () => {
    const s = inferSeriesFromNumbers(['2023-0500', '2024-0003'], 2024)
    expect(s).toMatchObject({ nextSeq: 4, preview: '2024-0004', year: 2024 })
  })

  it('u importu ze starších let začne letos od jedné', () => {
    // Navázat v roce 2026 číslem 43 podle faktur z 2024 by řadu rozbilo.
    const s = inferSeriesFromNumbers(['2024-0042'], 2026)
    expect(s).toMatchObject({
      nextSeq: 1,
      preview: '2026-0001',
      year: 2024,
      resetForNewYear: true,
    })
  })

  it('u čísel bez roku naváže pořadím bez ohledu na kalendář', () => {
    const s = inferSeriesFromNumbers(['0042'], 2026)
    expect(s).toMatchObject({ nextSeq: 43, preview: '0043', resetForNewYear: false })
  })

  it('zachová šířku pořadí zákazníka', () => {
    // Třímístná řada se nesmí tiše rozšířit na čtyři místa.
    expect(inferSeriesFromNumbers(['FA2024009'], 2024)?.preview).toBe('FA2024010')
  })

  it('vrátí null, když čísla nemají rozpoznatelný tvar', () => {
    expect(inferSeriesFromNumbers(['', 'FAKTURA'])).toBeNull()
  })
})
