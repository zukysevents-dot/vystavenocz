import { describe, it, expect } from 'vitest'
import { validateClient, hasBlockingError } from './validate'

describe('validateClient', () => {
  it('chybějící název → blokující error', () => {
    const issues = validateClient({ name: '' })
    expect(issues.some((i) => i.field === 'name' && i.level === 'error')).toBe(true)
    expect(hasBlockingError(issues)).toBe(true)
  })

  it('neplatné IČO → warning, ne blokující', () => {
    const issues = validateClient({ name: 'Acme', ico: '27082441' })
    expect(issues.some((i) => i.field === 'ico' && i.level === 'warning')).toBe(true)
    expect(hasBlockingError(issues)).toBe(false)
  })

  it('platná data → bez nálezů', () => {
    const issues = validateClient({ name: 'Acme', ico: '27082440', email: 'info@acme.cz' })
    expect(issues).toEqual([])
  })

  it('neplatný e-mail → warning', () => {
    const issues = validateClient({ name: 'Acme', email: 'nesmysl' })
    expect(issues.some((i) => i.field === 'email' && i.level === 'warning')).toBe(true)
  })
})
