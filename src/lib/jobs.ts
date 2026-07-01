import type { Job, JobStatus } from './types'

/**
 * Zakázky & výjezdy — čistá logika ziskovosti. Výnos = prodej materiálu + odpracované
 * hodiny × sazba; náklad = nákup materiálu; zisk = výnos − náklad. Práce se bere jako
 * čistý výnos (mzdové náklady se zde nesledují — MVP).
 */

const STATUS_LABELS: Record<JobStatus, string> = {
  quote: 'Nabídka',
  in_progress: 'Probíhá',
  done: 'Hotovo',
  invoiced: 'Vyfakturováno',
}

export function jobStatusLabel(s: JobStatus): string {
  return STATUS_LABELS[s]
}

/** Ošetří vstup do finančního výpočtu: nezáporné konečné číslo (NaN/−∞ → 0). */
export function nonNegative(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function jobRevenue(job: Job): number {
  return job.materialPrice + job.hours * job.hourlyRate
}

export function jobCost(job: Job): number {
  return job.materialCost
}

export function jobProfit(job: Job): number {
  return jobRevenue(job) - jobCost(job)
}

/** Marže jako podíl (0–1). Při nulovém výnosu vrací 0. */
export function jobMargin(job: Job): number {
  const rev = jobRevenue(job)
  return rev === 0 ? 0 : jobProfit(job) / rev
}

export interface JobsSummary {
  count: number
  revenue: number
  cost: number
  profit: number
  margin: number // vážená marže = zisk / výnos
}

export function summarizeJobs(jobs: Job[]): JobsSummary {
  const revenue = jobs.reduce((a, j) => a + jobRevenue(j), 0)
  const cost = jobs.reduce((a, j) => a + jobCost(j), 0)
  const profit = revenue - cost
  return {
    count: jobs.length,
    revenue,
    cost,
    profit,
    margin: revenue === 0 ? 0 : profit / revenue,
  }
}
