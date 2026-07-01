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
  defaultPaymentDays: number
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
  invoiceNumber: string | null // koncept nemá číslo — přidělí ho server při vystavení (issue)
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

// --- POS / Katalog (parita s backend vystaveno-api) ---

export interface Product {
  id: string
  name: string
  sku: string
  ean: string | null
  salePrice: number // prodejní cena VČETNĚ DPH (retail/pokladna)
  vatRate: number
  purchasePrice: number | null
  minQuantity: number
  categoryId: string | null
}

export type JobStatus = 'quote' | 'in_progress' | 'done' | 'invoiced'

// Zakázka / výjezd (modul Zakázky) — materiál + hodiny → ziskovost.
export interface Job {
  id: string
  name: string
  clientName: string | null
  status: JobStatus
  materialCost: number // nákupní cena materiálu (náklad)
  materialPrice: number // prodejní cena materiálu zákazníkovi (výnos)
  hours: number
  hourlyRate: number // sazba za hodinu práce (výnos)
  note: string | null
  createdAt: string
  updatedAt: string
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
  vatRate: VatRate
}

// Cenová nabídka (modul Nabídky) — může se převést na fakturu.
export interface Quote {
  id: string
  number: string
  clientName: string | null
  status: QuoteStatus
  items: QuoteItem[]
  validUntil: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

// Směna (modul Směny & provize) — plánovaná směna zaměstnance → mzdový podklad.
export interface Shift {
  id: string
  employeeName: string
  date: string // YYYY-MM-DD
  start: string // HH:mm
  end: string // HH:mm
  hourlyRate: number
  note: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentMethod = 'Cash' | 'Card'
export type SaleStatus = 'Completed' | 'Cancelled'

export interface SaleItemLine {
  id: string
  description: string | null
  productId: string | null
  quantity: number
  unitPrice: number
  vatRate: number
  discountPercent: number
  lineNet: number
  lineVat: number
  lineTotal: number
}

export interface Sale {
  id: string
  locationId: string | null
  paymentMethod: PaymentMethod
  status: SaleStatus
  totalNet: number
  totalVat: number
  total: number
  soldAt: string
  items: SaleItemLine[]
}

export interface DailySalesSummary {
  date: string
  count: number
  totalNet: number
  totalVat: number
  total: number
  cashTotal: number
  cardTotal: number
}

// --- Gastro: mapa stolů ---

export type TableShape = 'Rect' | 'Circle'

export interface Floor {
  id: string
  name: string
  sortOrder: number
  locationId: string | null
}

export interface DiningTable {
  id: string
  floorId: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  seats: number
  shape: TableShape
}

export type CategoryKitchenSection = 'None' | 'Kitchen' | 'Bar'

export interface Category {
  id: string
  name: string
  color: string | null
  sortOrder: number
  parentId: string | null
  kitchenSection: CategoryKitchenSection
}

// --- Gastro: otevřené účty na stole ---

export type OrderStatus = 'Open' | 'Closed' | 'Cancelled'
export type KitchenStatus = 'New' | 'Sent' | 'Preparing' | 'Ready' | 'Served'

export interface OrderItemLine {
  id: string
  productId: string | null
  name: string
  quantity: number
  unitPrice: number
  vatRate: number
  course: string | null
  note: string | null
  kitchenSection: CategoryKitchenSection
  kitchenStatus: KitchenStatus
  lineTotal: number
}

export interface Order {
  id: string
  tableId: string | null
  locationId: string | null
  status: OrderStatus
  saleId: string | null
  openedAt: string
  closedAt: string | null
  total: number
  items: OrderItemLine[]
}

export interface KitchenQueueItem {
  itemId: string
  orderId: string
  tableName: string | null
  productName: string
  quantity: number
  course: string | null
  note: string | null
  kitchenSection: CategoryKitchenSection
  kitchenStatus: KitchenStatus
  sentToKitchenAt: string | null
}

// --- Sklad / zásoby ---

export type StockMovementType =
  | 'Receipt'
  | 'Issue'
  | 'Correction'
  | 'Sale'
  | 'StornoSale'
  | 'Stocktaking'

export interface StockLevel {
  productId: string
  productName: string
  productSku: string
  quantity: number
}

export interface StockMovement {
  id: string
  productId: string
  locationId: string | null
  type: StockMovementType
  quantity: number
  quantityAfter: number
  note: string | null
  relatedSaleId: string | null
  relatedStocktakeId: string | null
  createdAt: string
}

// --- Docházka ---

export type AttendanceStatus = 'Open' | 'Closed'

export interface Employee {
  id: string
  fullName: string
  userId: string | null
  locationId: string | null
  isActive: boolean
}

export interface AttendanceBreak {
  id: string
  startAt: string
  endAt: string | null
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  locationId: string | null
  clockInAt: string
  clockOutAt: string | null
  status: AttendanceStatus
  breaks: AttendanceBreak[]
}

export interface AttendanceSummaryItem {
  employeeId: string
  employeeName: string
  workedMinutes: number
}

export interface AttendanceSummary {
  year: number
  month: number
  items: AttendanceSummaryItem[]
}

// --- Rezervace (booking) ---

export type ReservationStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'NoShow'

export interface Service {
  id: string
  name: string
  durationMinutes: number
  price: number
  vatRate: number
  isActive: boolean
}

export interface Resource {
  id: string
  name: string
  locationId: string | null
  isActive: boolean
}

export interface Reservation {
  id: string
  resourceId: string
  serviceId: string
  serviceName: string
  startsAt: string
  endsAt: string
  status: ReservationStatus
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  note: string | null
  saleId: string | null
}
