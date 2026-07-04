import { describe, it, expect } from 'vitest'
import { detectEntity } from './detectEntity'

describe('detectEntity', () => {
  it('rozpozná klienty podle IČO/e-mailu/adresy', () => {
    expect(detectEntity(['name', 'ico', 'dic', 'email', 'telefon', 'mesto'])).toBe('clients')
  })

  it('rozpozná produkty podle SKU/ceny/DPH/skladem', () => {
    expect(detectEntity(['nazev', 'sku', 'ean', 'cena', 'dph', 'skladem'])).toBe('products')
  })

  it('zvládá diakritiku a velikost písmen v hlavičkách', () => {
    expect(detectEntity(['Název', 'Kategorie', 'Množství', 'Cena'])).toBe('products')
  })

  it('vrátí null u neznámého/sdíleného souboru (fallback na přepínač)', () => {
    expect(detectEntity(['nazev', 'poznamka'])).toBeNull()
    expect(detectEntity([])).toBeNull()
  })

  it('sdílené pole „název" nerozhoduje samo o sobě', () => {
    expect(detectEntity(['name'])).toBeNull()
  })
})
