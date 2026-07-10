import { describe, it, expect } from 'vitest'
import { jobStatusLabel, jobPriorityLabel, jobNextStatuses, computeJobTotals } from '@/lib/jobs'
import type { JobMaterialItem, JobStatus, JobWorkItem } from '@/lib/types'

function work(over: Partial<JobWorkItem> = {}): JobWorkItem {
  return {
    id: 'w1',
    serviceItemId: null,
    description: 'Montáž',
    quantity: 2,
    unitPrice: 500,
    vatRate: 21,
    sortOrder: 0,
    ...over,
  }
}
function material(over: Partial<JobMaterialItem> = {}): JobMaterialItem {
  return {
    id: 'm1',
    productId: 'p1',
    description: 'Kabel',
    quantity: 1,
    unitPrice: 300,
    vatRate: 21,
    sortOrder: 0,
    ...over,
  }
}

describe('jobStatusLabel', () => {
  it.each<[JobStatus, string]>([
    ['scheduled', 'Naplánováno'],
    ['in_progress', 'Probíhá'],
    ['waiting', 'Čeká'],
    ['done', 'Hotovo'],
    ['cancelled', 'Zrušeno'],
  ])('%s → %s', (s, label) => {
    expect(jobStatusLabel(s)).toBe(label)
  })
})

describe('jobPriorityLabel', () => {
  it('lokalizuje priority', () => {
    expect(jobPriorityLabel('low')).toBe('Nízká')
    expect(jobPriorityLabel('normal')).toBe('Normální')
    expect(jobPriorityLabel('high')).toBe('Vysoká')
    expect(jobPriorityLabel('urgent')).toBe('Urgentní')
  })
})

describe('jobNextStatuses (stavový automat)', () => {
  it('scheduled → in_progress / cancelled', () => {
    expect(jobNextStatuses('scheduled')).toEqual(['in_progress', 'cancelled'])
  })
  it('in_progress → waiting / done / cancelled', () => {
    expect(jobNextStatuses('in_progress')).toEqual(['waiting', 'done', 'cancelled'])
  })
  it('waiting → in_progress / done / cancelled', () => {
    expect(jobNextStatuses('waiting')).toEqual(['in_progress', 'done', 'cancelled'])
  })
  it('done a cancelled jsou koncové (žádný přechod)', () => {
    expect(jobNextStatuses('done')).toEqual([])
    expect(jobNextStatuses('cancelled')).toEqual([])
  })
})

describe('computeJobTotals', () => {
  it('plátce DPH: net práce/materiálu + 21 % DPH', () => {
    // práce 2×500 = 1000, materiál 1×300 = 300 → net 1300, DPH 273, total 1573
    const t = computeJobTotals([work()], [material()], true)
    expect(t.workNet).toBe(1000)
    expect(t.materialNet).toBe(300)
    expect(t.net).toBe(1300)
    expect(t.vat).toBe(273)
    expect(t.total).toBe(1573)
  })
  it('neplátce: bez DPH', () => {
    const t = computeJobTotals([work()], [material()], false)
    expect(t.net).toBe(1300)
    expect(t.vat).toBe(0)
    expect(t.total).toBe(1300)
  })
  it('prázdný pracovní list → samé nuly', () => {
    expect(computeJobTotals([], [], true)).toEqual({
      workNet: 0,
      materialNet: 0,
      net: 0,
      vat: 0,
      total: 0,
    })
  })
  it('smíšené sazby DPH se sečtou správně', () => {
    // práce 1×1000 @21 % (210), materiál 1×1000 @12 % (120) → net 2000, DPH 330, total 2330
    const t = computeJobTotals(
      [work({ quantity: 1, unitPrice: 1000, vatRate: 21 })],
      [material({ quantity: 1, unitPrice: 1000, vatRate: 12 })],
      true,
    )
    expect(t.net).toBe(2000)
    expect(t.vat).toBe(330)
    expect(t.total).toBe(2330)
  })
})
