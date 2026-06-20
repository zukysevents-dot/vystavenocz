/**
 * Doménové typy Vystaveno.cz (frontend).
 * Odvozeno ze staré React appky (Prod:src/lib/invoice.ts + supabase types.ts),
 * převedeno do camelCase. Mapování na případné snake_case API řeší useApi (F0-06).
 */

export type VatMode = 'payer' | 'identified' | 'non_payer'
export type VatRate = 0 | 12 | 21
export type DocumentType = 'invoice' | 'credit_note'
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'

export interface Client {
  id: string
  name: string
  ico: string | null
  dic: string | null
  email: string | null
  phone: string | null
  street: string | null
  city: string | null
  zip: string | null
  country: string
  defaultPaymentDays: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  companyName: string | null
  fullName: string | null
  email: string
  ico: string | null
  dic: string | null
  vatMode: VatMode
  street: string | null
  city: string | null
  zip: string | null
  country: string
  bankAccount: string | null
  iban: string | null
  swift: string | null
  logoUrl: string | null
  invoiceColor: string | null
  invoiceNumberPrefix: string | null
  invoiceNumberFormat: string | null
  nextInvoiceSeq: number
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: VatRate
  lineSubtotal: number
  lineVat: number
  lineTotal: number
}

export interface ClientSnapshot {
  name: string
  ico?: string | null
  dic?: string | null
  street?: string | null
  city?: string | null
  zip?: string | null
  country?: string
  email?: string | null
}

export interface SupplierSnapshot {
  companyName: string | null
  fullName?: string | null
  ico: string | null
  dic: string | null
  vatMode?: VatMode
  street: string | null
  city: string | null
  zip: string | null
  country?: string
  bankAccount?: string | null
  iban?: string | null
  swift?: string | null
  email?: string | null
  logoUrl?: string | null
  invoiceColor?: string | null
}

export interface Invoice {
  id: string
  documentType: DocumentType
  status: InvoiceStatus
  invoiceNumber: string
  clientId: string | null
  clientSnapshot: ClientSnapshot
  supplierSnapshot: SupplierSnapshot
  items: InvoiceItem[]
  currency: string
  issueDate: string
  dueDate: string
  taxableDate: string
  paidAt: string | null
  variableSymbol: string | null
  constantSymbol: string | null
  specificSymbol: string | null
  paymentMethod: string
  subtotal: number
  vatTotal: number
  total: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type SubscriptionPlan = 'free' | 'trial' | 'pro'

export interface Subscription {
  active: boolean
  plan: SubscriptionPlan
  trialEndsAt: string | null
  subscriptionUntil: string | null
}

export interface User {
  id: string
  email: string
  fullName: string | null
}
