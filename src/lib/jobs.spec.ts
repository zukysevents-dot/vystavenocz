import { describe, it, expect } from 'vitest'
import {
  jobRevenue,
  jobCost,
  jobProfit,
  jobMargin,
  summarizeJobs,
  jobStatusLabel,
} from '@/lib/jobs'
import type { Job } from '@/lib/types'

function job(over: Partial<Job> = {}): Job {
  return {
    id: 'j1',
    name: 'Oprava kotle',
    clientName: 'Novák',
    status: 'in_progress',
    materialCost: 800,
    materialPrice: 1000,
    hours: 3,
    hourlyRate: 500,
    note: null,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...over,
  }
}

describe('ziskovost zakázky', () => {
  it('výnos = materiál (prodej) + hodiny × sazba', () => {
    expect(jobRevenue(job())).toBe(1000 + 3 * 500) // 2500
  })
  it('náklad = nákup materiálu', () => {
    expect(jobCost(job())).toBe(800)
  })
  it('zisk = výnos − náklad', () => {
    expect(jobProfit(job())).toBe(2500 - 800) // 1700
  })
  it('marže = zisk / výnos', () => {
    expect(jobMargin(job())).toBeCloseTo(1700 / 2500, 5)
  })
  it('nulový výnos → marže 0 (žádné dělení nulou)', () => {
    expect(jobMargin(job({ materialPrice: 0, hours: 0, hourlyRate: 0 }))).toBe(0)
  })
  it('ztrátová zakázka → záporný zisk', () => {
    expect(
      jobProfit(job({ materialCost: 3000, materialPrice: 1000, hours: 0, hourlyRate: 0 })),
    ).toBe(-2000)
  })
})

describe('summarizeJobs', () => {
  it('sečte výnos, náklad, zisk a spočítá váženou marži', () => {
    const s = summarizeJobs([
      job({ materialCost: 800, materialPrice: 1000, hours: 3, hourlyRate: 500 }), // rev 2500, cost 800
      job({ materialCost: 200, materialPrice: 0, hours: 1, hourlyRate: 800 }), // rev 800, cost 200
    ])
    expect(s.count).toBe(2)
    expect(s.revenue).toBe(3300)
    expect(s.cost).toBe(1000)
    expect(s.profit).toBe(2300)
    expect(s.margin).toBeCloseTo(2300 / 3300, 5)
  })
  it('prázdný seznam → nuly bez dělení nulou', () => {
    expect(summarizeJobs([])).toEqual({ count: 0, revenue: 0, cost: 0, profit: 0, margin: 0 })
  })
})

describe('jobStatusLabel', () => {
  it('lokalizuje stavy', () => {
    expect(jobStatusLabel('quote')).toBe('Nabídka')
    expect(jobStatusLabel('invoiced')).toBe('Vyfakturováno')
  })
})
