import { describe, expect, it } from 'vitest'
import { visibleHelpGuides } from './help'

describe('visibleHelpGuides', () => {
  it('shows only guides for enabled modules', () => {
    expect(visibleHelpGuides(['core', 'gastro'], 'Owner').map((guide) => guide.id)).toEqual([
      'first-steps',
      'restaurant',
      'modifiers',
    ])
  })

  it('does not expose manager guidance to an employee', () => {
    expect(
      visibleHelpGuides(['core', 'pos', 'gastro', 'stock'], 'Employee').map((guide) => guide.id),
    ).toEqual(['cash-register', 'restaurant'])
  })
})
