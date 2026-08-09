import { describe, expect, it } from 'vitest'
import { groupItemsByCourse, normalizeOrderCourse, ORDER_COURSES } from './order-courses'

describe('order courses', () => {
  it('používá srozumitelné pořadí výdeje', () => {
    expect(ORDER_COURSES).toEqual(['Předkrm', 'Hlavní chod', 'Dezert'])
  })

  it('přeloží staré číselné chody bez ztráty otevřených objednávek', () => {
    expect(normalizeOrderCourse('1. chod')).toBe('Předkrm')
    expect(normalizeOrderCourse('2. chod')).toBe('Hlavní chod')
    expect(normalizeOrderCourse('3. chod')).toBe('Dezert')
  })

  it('seřadí skupiny a nezařazené položky nechá nakonec', () => {
    const groups = groupItemsByCourse([
      { id: 'dessert', course: 'Dezert' },
      { id: 'none', course: null },
      { id: 'main', course: '2. chod' },
      { id: 'starter', course: 'Předkrm' },
    ])

    expect(groups.map((group) => group.label)).toEqual([
      'Předkrm',
      'Hlavní chod',
      'Dezert',
      'Bez chodu',
    ])
    expect(groups.map((group) => group.items[0]?.id)).toEqual([
      'starter',
      'main',
      'dessert',
      'none',
    ])
  })

  it('bez použitých chodů nevykreslí zbytečný oddělovač', () => {
    const groups = groupItemsByCourse([
      { id: 'a', course: null },
      { id: 'b', course: null },
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.label).toBeNull()
  })
})
