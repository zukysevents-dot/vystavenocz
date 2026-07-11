import { calcLine, round2 } from './invoice'
import type { JobMaterialItem, JobPriority, JobStatus, JobTotals, JobWorkItem } from './types'

/**
 * Zakázky V2 (modul jobs) — čistá logika. Součty pracovního listu se počítají stejnou
 * matematikou jako faktura (calcLine nad položkami), aby po vyfakturování částky seděly.
 * Stavový automat určuje povolené přechody (zbytek vynucuje backend).
 */

const STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: 'Naplánováno',
  in_progress: 'Probíhá',
  waiting: 'Čeká',
  done: 'Hotovo',
  cancelled: 'Zrušeno',
}

export function jobStatusLabel(s: JobStatus): string {
  return STATUS_LABELS[s]
}

const PRIORITY_LABELS: Record<JobPriority, string> = {
  low: 'Nízká',
  normal: 'Normální',
  high: 'Vysoká',
  urgent: 'Urgentní',
}

export function jobPriorityLabel(p: JobPriority): string {
  return PRIORITY_LABELS[p]
}

// Stavový automat zakázky: hotová/zrušená jsou koncové. Backend je zdroj pravdy; tohle je UX vrstva.
const NEXT_STATUSES: Record<JobStatus, JobStatus[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['waiting', 'done', 'cancelled'],
  waiting: ['in_progress', 'done', 'cancelled'],
  done: [],
  cancelled: [],
}

/** Povolené následující stavy zakázky (pro tlačítka přechodu). */
export function jobNextStatuses(status: JobStatus): JobStatus[] {
  return NEXT_STATUSES[status]
}

/**
 * Součty pracovního listu — práce i materiál jsou NET (bez DPH); DPH se přičítá jen u plátce.
 * V API režimu je zdroj pravdy serverem vrácený `Job.totals`; tohle je fallback/živý náhled.
 */
export function computeJobTotals(
  workItems: JobWorkItem[],
  materialItems: JobMaterialItem[],
  vatPayer: boolean,
): JobTotals {
  let workNet = 0
  let materialNet = 0
  let vat = 0
  for (const it of workItems) {
    const line = calcLine(it, vatPayer)
    workNet += line.lineSubtotal
    vat += line.lineVat
  }
  for (const it of materialItems) {
    const line = calcLine(it, vatPayer)
    materialNet += line.lineSubtotal
    vat += line.lineVat
  }
  workNet = round2(workNet)
  materialNet = round2(materialNet)
  vat = round2(vat)
  const net = round2(workNet + materialNet)
  return { workNet, materialNet, net, vat, total: round2(net + vat) }
}
