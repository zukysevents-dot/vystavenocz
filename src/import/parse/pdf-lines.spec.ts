import { describe, it, expect } from 'vitest'
import { itemsToLines, type PositionedText } from './pdf-lines'

/** Úsek textu na dané pozici; šířka se odvodí od délky, ať se testy píšou krátce. */
function part(str: string, x: number, y: number, width = str.length * 5): PositionedText {
  return { str, x, y, width, height: 10 }
}

describe('itemsToLines', () => {
  it('spojí úseky jednoho řádku a seřadí je zleva', () => {
    expect(itemsToLines([part('světa', 60, 700), part('Ahoj', 10, 700)])).toEqual(['Ahoj světa'])
  })

  it('řadí řádky shora dolů (PDF má počátek dole)', () => {
    expect(itemsToLines([part('dole', 10, 100), part('nahoře', 10, 700)])).toEqual([
      'nahoře',
      'dole',
    ])
  })

  it('nevloží mezeru mezi úseky, které na sebe navazují', () => {
    // Tohle je reálné chování PDF: slovo se láme kolem diakritiky na víc úseků.
    // Bez tohohle by z „IČO" vzniklo „I Č O" a vytěžování by IČO nenašlo.
    const lines = itemsToLines([
      part('I', 10, 700, 5),
      part('Č', 15, 700, 5),
      part('O', 20, 700, 5),
      part(': 12345678', 25, 700, 50),
    ])
    expect(lines).toEqual(['IČO: 12345678'])
  })

  it('mezeru vloží, když mezi úseky skutečně je', () => {
    expect(itemsToLines([part('Celkem', 10, 700, 30), part('12 100,00', 60, 700)])).toEqual([
      'Celkem 12 100,00',
    ])
  })

  it('tolerantní k drobnému rozdílu ve výšce řádku', () => {
    expect(itemsToLines([part('a', 10, 700), part('b', 30, 701.5)])).toEqual(['a b'])
  })

  it('nezdvojí mezeru, když ji úsek už obsahuje', () => {
    expect(itemsToLines([part('Datum ', 10, 700, 30), part('vystavení', 60, 700)])).toEqual([
      'Datum vystavení',
    ])
  })

  it('přeskočí prázdné úseky', () => {
    expect(itemsToLines([part('  ', 10, 700), part('text', 20, 700)])).toEqual(['text'])
  })
})
