import { describe, expect, it } from 'vitest'
import { visibleHelpGuides } from './help'

describe('visibleHelpGuides', () => {
  it('shows only guides for enabled modules', () => {
    expect(visibleHelpGuides(['core', 'gastro'], 'Owner').map((guide) => guide.id)).toEqual([
      'first-steps',
      'growth-referral-partner',
      'restaurant',
      'modifiers',
    ])
  })

  it('does not expose manager guidance to an employee', () => {
    expect(
      visibleHelpGuides(['core', 'pos', 'gastro', 'stock'], 'Employee').map((guide) => guide.id),
    ).toEqual(['cash-register', 'restaurant'])
  })

  // Provoz bez kuchyňských bonů nesmí dostat návod na tlačítko, které v jeho aplikaci není.
  it('krok o odeslání na stanice zmizí, když provoz bony nepoužívá', () => {
    const withTickets = visibleHelpGuides(['core', 'gastro'], 'Owner').find(
      (guide) => guide.id === 'restaurant',
    )!
    const withoutTickets = visibleHelpGuides(['core', 'gastro'], 'Owner', false).find(
      (guide) => guide.id === 'restaurant',
    )!

    expect(withTickets.steps.map((s) => s.title)).toContain('Odešlete na stanice a zaplaťte')
    expect(withoutTickets.steps.map((s) => s.title)).not.toContain('Odešlete na stanice a zaplaťte')
    expect(withoutTickets.steps.map((s) => s.title)).toContain('Zaplaťte účet')
    // Počet kroků se nemění — jeden se jen vymění za druhý, návod nesmí zůstat useknutý.
    expect(withoutTickets.steps).toHaveLength(withTickets.steps.length)
  })
})
