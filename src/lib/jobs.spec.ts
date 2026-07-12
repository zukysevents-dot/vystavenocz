import { describe, it, expect } from 'vitest'
import {
  jobStatusLabel,
  jobPriorityLabel,
  jobNextStatuses,
  computeJobTotals,
  jobIsTaxed,
  jobLineTotal,
  resolveJobTotals,
} from '@/lib/jobs'
import type { Job, JobMaterialItem, JobStatus, JobWorkItem } from '@/lib/types'

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
function job(over: Partial<Job> = {}): Job {
  return {
    id: 'j1',
    number: 'ZAK-2026-001',
    name: 'Revize',
    clientId: 'c1',
    clientName: 'Klient s.r.o.',
    siteAddress: null,
    status: 'scheduled',
    priority: 'normal',
    scheduledAt: null,
    assignedEmployeeId: null,
    locationId: null,
    sourceQuoteId: null,
    invoiceId: null,
    note: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    workItems: [],
    materialItems: [],
    checklist: [],
    events: [],
    handover: null,
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

describe('resolveJobTotals (server je zdroj pravdy)', () => {
  it('preferuje serverová čísla i když je vatPayer=false (backend /company vatMode nevrací)', () => {
    // Server: práce 2×950 = 1900 (+399 DPH), materiál 1×220 = 220 (+26,4) → net 2120, DPH 425,4, total 2545,4
    const j = job({
      workItems: [work({ unitPrice: 950, lineNet: 1900, lineVat: 399, lineTotal: 2299 })],
      materialItems: [
        material({ unitPrice: 220, vatRate: 12, lineNet: 220, lineVat: 26.4, lineTotal: 246.4 }),
      ],
      subtotal: 2120,
      vatTotal: 425.4,
      total: 2545.4,
    })
    const t = resolveJobTotals(j, false)
    expect(t.workNet).toBe(1900)
    expect(t.materialNet).toBe(220)
    expect(t.net).toBe(2120)
    expect(t.vat).toBe(425.4)
    expect(t.total).toBe(2545.4)
  })
  it('bez serverových součtů (mock) dopočítá z položek přes vatPayer', () => {
    const j = job({ workItems: [work()], materialItems: [material()] })
    expect(resolveJobTotals(j, true).total).toBe(1573)
    expect(resolveJobTotals(j, false).total).toBe(1300)
  })
})

describe('jobLineTotal', () => {
  it('preferuje serverem spočítaný lineTotal', () => {
    expect(jobLineTotal(work({ lineTotal: 2299 }), false)).toBe(2299)
  })
  it('bez serverového lineTotal dopočítá přes calcLine', () => {
    // 2×500 @21 % u plátce → 1210
    expect(jobLineTotal(work(), true)).toBe(1210)
    expect(jobLineTotal(work(), false)).toBe(1000)
  })
})

describe('jobIsTaxed', () => {
  it('serverové DPH na součtu → zdaněno i při vatPayer=false', () => {
    expect(jobIsTaxed(job({ vatTotal: 425.4 }), false)).toBe(true)
  })
  it('serverové DPH na řádku → zdaněno i při vatPayer=false', () => {
    expect(jobIsTaxed(job({ workItems: [work({ lineVat: 399 })] }), false)).toBe(true)
  })
  it('bez serverového DPH rozhoduje vatPayer (mock)', () => {
    expect(jobIsTaxed(job(), true)).toBe(true)
    expect(jobIsTaxed(job(), false)).toBe(false)
  })
})
