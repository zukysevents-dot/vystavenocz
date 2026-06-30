import type { Invoice } from './types'

/**
 * Věrnost & návraty (F-modul). Čistá logika nad fakturami — segmentuje zákazníky
 * podle toho, kdy naposledy nakoupili, počítá obrat a sestavuje win-back seznam
 * (spící zákazníci) i text oslovení. Žádný stav ani server; `today` kvůli testovatelnosti.
 */

export type Segment = 'active' | 'at_risk' | 'dormant'

export interface CustomerStat {
  key: string // clientId nebo „name:<jméno>"
  name: string
  email: string | null
  revenue: number
  invoiceCount: number
  lastPurchase: string | null // ISO datum poslední faktury
  daysSince: number
  segment: Segment
}

export interface LoyaltySummary {
  customers: number
  active: number
  atRisk: number
  dormant: number
  totalRevenue: number
}

const DAY_MS = 86_400_000

// Hranice segmentů ve dnech od poslední faktury.
const ACTIVE_MAX = 90
const AT_RISK_MAX = 180

const SEGMENT_LABELS: Record<Segment, string> = {
  active: 'Aktivní',
  at_risk: 'Pozor',
  dormant: 'Spící',
}

export function segmentLabel(s: Segment): string {
  return SEGMENT_LABELS[s]
}

/**
 * Doklad, který se počítá do obratu: vystavená CZK faktura (koncept/storno/dobropis ne).
 * Cizí měny do CZK obratu nemícháme — stejné pravidlo jako Cashflow přehled.
 */
function isRevenue(inv: Invoice): boolean {
  const czk = !inv.currency || inv.currency === 'CZK'
  return (
    czk && inv.documentType === 'invoice' && inv.status !== 'draft' && inv.status !== 'cancelled'
  )
}

function parseDateOnly(s: string): number | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function daysSince(dateIso: string, today: Date): number {
  const then = parseDateOnly(dateIso)
  if (then === null) return 0
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.max(0, Math.floor((now - then) / DAY_MS))
}

function segmentFor(days: number): Segment {
  if (days <= ACTIVE_MAX) return 'active'
  if (days <= AT_RISK_MAX) return 'at_risk'
  return 'dormant'
}

/**
 * Statistiky zákazníků z faktur, seřazené podle obratu sestupně. Seskupuje se podle
 * `clientId` (jméno/e-mail se bere z nejnovější faktury daného zákazníka).
 */
export function buildCustomerStats(invoices: Invoice[], today: Date): CustomerStat[] {
  interface Acc {
    key: string
    name: string
    email: string | null
    revenue: number
    invoiceCount: number
    lastPurchase: string | null
  }
  const map = new Map<string, Acc>()

  for (const inv of invoices) {
    if (!isRevenue(inv)) continue
    const name = inv.clientSnapshot?.name?.trim() || 'Neznámý zákazník'
    const key = inv.clientId || `name:${name}`
    const entry =
      map.get(key) ??
      ({
        key,
        name,
        email: inv.clientSnapshot?.email ?? null,
        revenue: 0,
        invoiceCount: 0,
        lastPurchase: null,
      } as Acc)
    entry.revenue += inv.total
    entry.invoiceCount += 1
    // Jméno i e-mail z nejnovější faktury (podle data vystavení).
    if (!entry.lastPurchase || (inv.issueDate || '') > entry.lastPurchase) {
      entry.lastPurchase = inv.issueDate || entry.lastPurchase
      entry.name = name
      if (inv.clientSnapshot?.email) entry.email = inv.clientSnapshot.email
    }
    map.set(key, entry)
  }

  return [...map.values()]
    .map((a) => {
      const d = a.lastPurchase ? daysSince(a.lastPurchase, today) : 0
      return {
        key: a.key,
        name: a.name,
        email: a.email,
        revenue: a.revenue,
        invoiceCount: a.invoiceCount,
        lastPurchase: a.lastPurchase,
        daysSince: d,
        segment: segmentFor(d),
      }
    })
    .sort((x, y) => y.revenue - x.revenue)
}

export function summarize(stats: CustomerStat[]): LoyaltySummary {
  return {
    customers: stats.length,
    active: stats.filter((s) => s.segment === 'active').length,
    atRisk: stats.filter((s) => s.segment === 'at_risk').length,
    dormant: stats.filter((s) => s.segment === 'dormant').length,
    totalRevenue: stats.reduce((a, s) => a + s.revenue, 0),
  }
}

/** Win-back: spící zákazníci (od nejcennějšího), které má smysl oslovit. */
export function winBack(stats: CustomerStat[]): CustomerStat[] {
  return stats.filter((s) => s.segment === 'dormant') // už seřazené podle obratu
}

/** Top zákazníci podle obratu. */
export function topCustomers(stats: CustomerStat[], limit = 10): CustomerStat[] {
  return stats.slice(0, limit)
}

export interface OutreachEmail {
  to: string | null
  subject: string
  body: string
}

/** Text oslovení spícího zákazníka (win-back). Vlídný tón, bez tlaku. */
export function buildWinBackEmail(stat: CustomerStat): OutreachEmail {
  const body = [
    `Dobrý den,`,
    '',
    `nějakou dobu jsme se neviděli a rádi bychom se Vám připomněli. Pokud bychom Vám mohli zase být užiteční, ozvěte se — rádi pomůžeme.`,
    '',
    `Těšíme se na Vás.`,
  ].join('\n')
  return {
    to: stat.email,
    subject: 'Rádi bychom se Vám připomněli',
    body,
  }
}

export function outreachMailto(email: OutreachEmail): string {
  const params = new URLSearchParams({ subject: email.subject, body: email.body })
  return `mailto:${email.to ?? ''}?${params.toString()}`
}
