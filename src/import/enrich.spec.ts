import { describe, it, expect } from 'vitest'
import { mergeAres } from './enrich'
import type { AresResult } from '@/composables/useAres'

const ares: AresResult = {
  ico: '27082440',
  dic: 'CZ27082440',
  companyName: 'Alza.cz a.s.',
  street: 'Jankovcova 1522/53',
  city: 'Praha 7',
  zip: '17000',
  country: 'CZ',
}

describe('mergeAres', () => {
  it('doplní jen prázdná pole', () => {
    const patch = mergeAres({ name: 'Vlastní název', ico: '27082440', city: null }, ares)
    expect(patch).toEqual({
      dic: 'CZ27082440',
      street: 'Jankovcova 1522/53',
      city: 'Praha 7',
      zip: '17000',
    })
    // existující název se nepřepíše
    expect(patch.name).toBeUndefined()
  })

  it('vše vyplněné → prázdný patch', () => {
    const patch = mergeAres({ name: 'X', dic: 'CZ1', street: 'A', city: 'B', zip: 'C' }, ares)
    expect(patch).toEqual({})
  })

  it('prázdný název → doplní z ARES', () => {
    expect(mergeAres({ name: '' }, ares).name).toBe('Alza.cz a.s.')
  })
})
