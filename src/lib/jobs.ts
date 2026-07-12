import { calcLine, round2 } from './invoice'
import type { Job, JobMaterialItem, JobPriority, JobStatus, JobTotals, JobWorkItem } from './types'

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
 * Fallback/živý náhled pro mock; v API režimu má přednost serverová pravda (`resolveJobTotals`).
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

/**
 * Zdaněnost dokladu je serverová pravda: pokud backend vrátil jakékoli DPH (na součtu nebo řádku),
 * zakázka JE zdaněná bez ohledu na lokální `vatMode` overlay (backend `/company` vatMode nevrací,
 * takže v API režimu je `vatPayer` často nespolehlivě `false`). V mocku rozhoduje `vatPayer`.
 */
export function jobIsTaxed(
  job: Pick<Job, 'vatTotal' | 'workItems' | 'materialItems'>,
  vatPayer: boolean,
): boolean {
  if ((job.vatTotal ?? 0) > 0) return true
  if ((job.workItems ?? []).some((w) => (w.lineVat ?? 0) > 0)) return true
  if ((job.materialItems ?? []).some((m) => (m.lineVat ?? 0) > 0)) return true
  return vatPayer
}

/** Součet řádku vč. DPH: preferuje serverem spočítaný `lineTotal`, jinak dopočítá (mock/živý náhled). */
export function jobLineTotal(item: JobWorkItem | JobMaterialItem, vatPayer: boolean): number {
  if (typeof item.lineTotal === 'number') return item.lineTotal
  return calcLine(item, vatPayer).lineTotal
}

/**
 * Součty pracovního listu se zdrojem pravdy na serveru: preferuje ploché `subtotal/vatTotal/total`
 * (Services & Jobs V2 kontrakt), rozpad Práce/Materiál skládá ze serverových řádkových `lineNet`.
 * Když serverová čísla chybí (mock / živý náhled), dopočítá je `computeJobTotals` z `vatPayer`.
 */
export function resolveJobTotals(job: Job, vatPayer: boolean): JobTotals {
  const workItems = job.workItems ?? []
  const materialItems = job.materialItems ?? []
  if (typeof job.subtotal === 'number' && typeof job.total === 'number') {
    const workNet = round2(workItems.reduce((sum, w) => sum + (w.lineNet ?? 0), 0))
    const materialNet = round2(materialItems.reduce((sum, m) => sum + (m.lineNet ?? 0), 0))
    return { workNet, materialNet, net: job.subtotal, vat: job.vatTotal ?? 0, total: job.total }
  }
  return computeJobTotals(workItems, materialItems, vatPayer)
}
