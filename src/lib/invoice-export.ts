import type { DocumentType, Invoice, InvoiceStatus } from '@/lib/types'

export interface InvoiceExportFilters {
  from: string
  to: string
  documentTypes: DocumentType[]
  statuses: InvoiceStatus[]
  clientKey: string
  currency: string
}

export interface InvoiceExportClientOption {
  key: string
  label: string
}

export interface InvoiceExportCurrencySummary {
  currency: string
  count: number
  subtotal: number
  vatTotal: number
  total: number
  averageTotal: number
}

export interface InvoiceExportSummary {
  count: number
  statusCounts: Record<InvoiceStatus, number>
  currencies: InvoiceExportCurrencySummary[]
}

export const DEFAULT_INVOICE_EXPORT_FILTERS: InvoiceExportFilters = {
  from: '',
  to: '',
  documentTypes: ['invoice', 'credit_note'],
  statuses: ['issued', 'paid', 'overdue'],
  clientKey: '',
  currency: '',
}

function normalizedCurrency(invoice: Invoice): string {
  return (invoice.currency || 'CZK').toUpperCase()
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function invoiceExportClientKey(invoice: Invoice): string {
  if (invoice.clientId) return `id:${invoice.clientId}`
  const name = invoice.clientSnapshot?.name?.trim().toLocaleLowerCase('cs-CZ') || 'bez-odberatele'
  return `name:${name}`
}

export function invoiceExportClientOptions(invoices: Invoice[]): InvoiceExportClientOption[] {
  const clients = new Map<string, string>()
  for (const invoice of invoices) {
    const key = invoiceExportClientKey(invoice)
    const label = invoice.clientSnapshot?.name?.trim() || 'Bez odběratele'
    if (!clients.has(key)) clients.set(key, label)
  }
  return [...clients.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'cs-CZ'))
}

export function invoiceExportCurrencies(invoices: Invoice[]): string[] {
  return [...new Set(invoices.map(normalizedCurrency))].sort((a, b) => a.localeCompare(b))
}

export function filterInvoiceExport(invoices: Invoice[], filters: InvoiceExportFilters): Invoice[] {
  const documentTypes = new Set(filters.documentTypes)
  const statuses = new Set(filters.statuses)
  const selectedCurrency = filters.currency.toUpperCase()

  return invoices
    .filter((invoice) => {
      if (!documentTypes.has(invoice.documentType) || !statuses.has(invoice.status)) return false
      if (filters.from && invoice.issueDate < filters.from) return false
      if (filters.to && invoice.issueDate > filters.to) return false
      if (filters.clientKey && invoiceExportClientKey(invoice) !== filters.clientKey) return false
      if (selectedCurrency && normalizedCurrency(invoice) !== selectedCurrency) return false
      return true
    })
    .sort((a, b) => {
      const byDate = b.issueDate.localeCompare(a.issueDate)
      if (byDate !== 0) return byDate
      const byNumber = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '', 'cs-CZ', {
        numeric: true,
      })
      return byNumber !== 0 ? byNumber : a.id.localeCompare(b.id)
    })
}

export function summarizeInvoiceExport(invoices: Invoice[]): InvoiceExportSummary {
  const statusCounts: Record<InvoiceStatus, number> = {
    draft: 0,
    issued: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
  }
  const currencies = new Map<string, InvoiceExportCurrencySummary>()

  for (const invoice of invoices) {
    statusCounts[invoice.status] += 1
    const currency = normalizedCurrency(invoice)
    const current = currencies.get(currency) ?? {
      currency,
      count: 0,
      subtotal: 0,
      vatTotal: 0,
      total: 0,
      averageTotal: 0,
    }
    current.count += 1
    current.subtotal = roundMoney(current.subtotal + invoice.subtotal)
    current.vatTotal = roundMoney(current.vatTotal + invoice.vatTotal)
    current.total = roundMoney(current.total + invoice.total)
    currencies.set(currency, current)
  }

  const currencySummaries = [...currencies.values()]
    .map((summary) => ({
      ...summary,
      averageTotal: summary.count ? roundMoney(summary.total / summary.count) : 0,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency))

  return { count: invoices.length, statusCounts, currencies: currencySummaries }
}
