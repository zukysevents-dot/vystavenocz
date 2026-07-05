import { describe, it, expect } from 'vitest'
import { posReportRange } from '@/lib/posReports'

// Rozsahy se počítají z LOKÁLNÍHO data (obchodní den), inkluzivně [from, to].
describe('posReportRange', () => {
  // Půlnoc lokálně — kontrola, že se nepoužívá UTC (jinak by from/to spadlo na jiný den).
  const today = new Date(2026, 6, 5) // 5. 7. 2026 (měsíc 0-based → červenec)

  it('today = jeden den [dnes, dnes]', () => {
    expect(posReportRange('today', today)).toEqual({ from: '2026-07-05', to: '2026-07-05' })
  })

  it('last7 = dnes a 6 předchozích dní (7 dní celkem)', () => {
    expect(posReportRange('last7', today)).toEqual({ from: '2026-06-29', to: '2026-07-05' })
  })

  it('last30 = dnes a 29 předchozích dní', () => {
    expect(posReportRange('last30', today)).toEqual({ from: '2026-06-06', to: '2026-07-05' })
  })

  it('thisMonth = od 1. dne měsíce do dneška', () => {
    expect(posReportRange('thisMonth', today)).toEqual({ from: '2026-07-01', to: '2026-07-05' })
  })

  it('thisMonth přes přechod měsíce drží správný rok/měsíc', () => {
    expect(posReportRange('thisMonth', new Date(2026, 0, 1))).toEqual({
      from: '2026-01-01',
      to: '2026-01-01',
    })
  })
})
