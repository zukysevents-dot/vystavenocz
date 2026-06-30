import type { Invoice } from './types'
import { formatCZK, formatDate } from './invoice'

/**
 * Cashflow & upomínky (F-modul). Čistá logika nad fakturami — počítá pohledávky,
 * stáří po splatnosti (aging) a text upomínky. Žádný stav ani server: vše se odvodí
 * z faktur, které appka už má. `today` se předává kvůli testovatelnosti.
 */

export type AgingBucketKey = 'current' | 'd1_30' | 'd31_60' | 'd61_90' | 'd90plus'

export interface OutstandingInvoice {
  invoice: Invoice
  daysOverdue: number // 0 = ještě není po splatnosti
  bucket: AgingBucketKey
}

export interface AgingBucket {
  key: AgingBucketKey
  label: string
  amount: number
  count: number
}

export interface Debtor {
  name: string
  email: string | null
  amount: number
  count: number
  maxDaysOverdue: number
}

export interface CashflowSummary {
  totalOutstanding: number
  overdueAmount: number
  outstandingCount: number
  overdueCount: number
}

const DAY_MS = 86_400_000

const BUCKET_LABELS: Record<AgingBucketKey, string> = {
  current: 'Do splatnosti',
  d1_30: '1–30 dní',
  d31_60: '31–60 dní',
  d61_90: '61–90 dní',
  d90plus: 'Více než 90 dní',
}

export const AGING_ORDER: AgingBucketKey[] = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90plus']

/**
 * Nezaplacená pohledávka = řádná faktura ve stavu vystaveno/po splatnosti.
 * Koncept/zaplaceno/storno nepočítáme; dobropisy (credit_note) také ne — mají
 * opačné znaménko a do přehledu pohledávek nepatří.
 */
export function isOutstanding(inv: Invoice): boolean {
  return inv.documentType === 'invoice' && (inv.status === 'issued' || inv.status === 'overdue')
}

/** Pohledávka vedená v CZK (prázdná měna = legacy CZK data). Cizí měny do CZK součtů nemícháme. */
function isCzk(inv: Invoice): boolean {
  return !inv.currency || inv.currency === 'CZK'
}

/** Kolik nezaplacených faktur je v cizí měně (a tedy mimo CZK přehled). */
export function otherCurrencyCount(invoices: Invoice[]): number {
  return invoices.filter((i) => isOutstanding(i) && !isCzk(i)).length
}

/**
 * Počet dní po splatnosti (0 pokud ještě nedospěla nebo nemá datum splatnosti).
 * Počítá se v kalendářních dnech, nezávisle na časovém pásmu: `dueDate` je date-only
 * řetězec, `today` se redukuje na lokální kalendářní den.
 */
export function daysOverdue(inv: Invoice, today: Date): number {
  const due = parseDateOnly(inv.dueDate)
  if (due === null) return 0
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const diff = Math.floor((now - due) / DAY_MS)
  return diff > 0 ? diff : 0
}

/** Date-only ISO řetězec ('2024-02-01' i s časem) → UTC půlnoc daného dne, jinak null. */
function parseDateOnly(s: string): number | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function bucketFor(days: number): AgingBucketKey {
  if (days <= 0) return 'current'
  if (days <= 30) return 'd1_30'
  if (days <= 60) return 'd31_60'
  if (days <= 90) return 'd61_90'
  return 'd90plus'
}

/**
 * Nezaplacené CZK faktury obohacené o stáří, seřazené od nejdéle po splatnosti.
 * Cizí měny se vynechávají (viz otherCurrencyCount), aby se nesčítaly do CZK přehledu.
 */
export function buildOutstanding(invoices: Invoice[], today: Date): OutstandingInvoice[] {
  return invoices
    .filter((inv) => isOutstanding(inv) && isCzk(inv))
    .map((invoice) => {
      const d = daysOverdue(invoice, today)
      return { invoice, daysOverdue: d, bucket: bucketFor(d) }
    })
    .sort(
      (a, b) =>
        b.daysOverdue - a.daysOverdue ||
        (a.invoice.dueDate || '').localeCompare(b.invoice.dueDate || ''),
    )
}

export function summarize(outstanding: OutstandingInvoice[]): CashflowSummary {
  const overdue = outstanding.filter((o) => o.daysOverdue > 0)
  return {
    totalOutstanding: sum(outstanding.map((o) => o.invoice.total)),
    overdueAmount: sum(overdue.map((o) => o.invoice.total)),
    outstandingCount: outstanding.length,
    overdueCount: overdue.length,
  }
}

/** Aging rozpad — vrací všech 5 kategorií ve fixním pořadí (i prázdné, kvůli stabilnímu UI). */
export function agingBuckets(outstanding: OutstandingInvoice[]): AgingBucket[] {
  return AGING_ORDER.map((key) => {
    const items = outstanding.filter((o) => o.bucket === key)
    return {
      key,
      label: BUCKET_LABELS[key],
      amount: sum(items.map((o) => o.invoice.total)),
      count: items.length,
    }
  })
}

/**
 * Dlužníci seřazení podle dlužné částky sestupně. Seskupuje se podle `clientId`
 * (dva různí klienti se stejným názvem firmy se tak neslijí); jméno je jen label.
 * Faktury bez clientId se klíčují jménem (lepší než vše do jednoho koše).
 */
export function debtors(outstanding: OutstandingInvoice[]): Debtor[] {
  const map = new Map<string, Debtor>()
  for (const o of outstanding) {
    const name = o.invoice.clientSnapshot?.name?.trim() || 'Neznámý odběratel'
    const key = o.invoice.clientId || `name:${name}`
    const entry = map.get(key) ?? {
      name,
      email: o.invoice.clientSnapshot?.email ?? null,
      amount: 0,
      count: 0,
      maxDaysOverdue: 0,
    }
    entry.amount += o.invoice.total
    entry.count += 1
    entry.maxDaysOverdue = Math.max(entry.maxDaysOverdue, o.daysOverdue)
    if (!entry.email && o.invoice.clientSnapshot?.email)
      entry.email = o.invoice.clientSnapshot.email
    map.set(key, entry)
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

export interface ReminderEmail {
  to: string | null
  subject: string
  body: string
}

/** Text upomínky pro jednu fakturu. Zdvořilý tón, bez výhrůžek — MVP. */
export function buildReminder(inv: Invoice, today: Date): ReminderEmail {
  const number = inv.invoiceNumber || 'bez čísla'
  const days = daysOverdue(inv, today)
  const supplier = inv.supplierSnapshot?.companyName || inv.supplierSnapshot?.fullName || ''
  const overdueLine =
    days > 0
      ? `byla splatná ${formatDate(inv.dueDate)} a její úhradu zatím neevidujeme (po splatnosti ${days} ${dayWord(days)}).`
      : `je splatná ${formatDate(inv.dueDate)} a její úhradu zatím neevidujeme.`

  const body = [
    'Dobrý den,',
    '',
    `dovolujeme si Vás upozornit, že faktura č. ${number} na částku ${formatCZK(inv.total)} ${overdueLine}`,
    '',
    'Prosíme o její úhradu v nejbližším možném termínu. Pokud platba mezitím proběhla, považujte tuto zprávu za bezpředmětnou.',
    '',
    'Děkujeme za spolupráci.',
    supplier ? `\n${supplier}` : '',
  ].join('\n')

  return {
    to: inv.clientSnapshot?.email ?? null,
    subject: `Upomínka: faktura č. ${number}`,
    body,
  }
}

/** Sestaví mailto: odkaz z upomínky (správně zakódovaný). */
export function reminderMailto(reminder: ReminderEmail): string {
  const params = new URLSearchParams({ subject: reminder.subject, body: reminder.body })
  return `mailto:${reminder.to ?? ''}?${params.toString()}`
}

function dayWord(days: number): string {
  if (days === 1) return 'den'
  if (days >= 2 && days <= 4) return 'dny'
  return 'dní'
}

function sum(nums: number[]): number {
  return nums.reduce((a, n) => a + n, 0)
}
