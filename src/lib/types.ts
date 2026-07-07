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
  publicSlug: string | null
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

export interface ProductRecipeIngredient {
  productId: string
  productName: string
  productSku: string
  quantity: number
  wastePercent: number
  effectiveQuantity: number
  purchasePrice: number | null
  estimatedCost: number
}

export interface ProductRecipe {
  productId: string
  ingredients: ProductRecipeIngredient[]
  estimatedCost: number
  salePrice: number
  grossMargin: number
  grossMarginPercent: number
  foodCostPercent: number
}

export interface ProductRecipeInput {
  productId: string
  quantity: number
  wastePercent?: number
}

// Gastro modifikátory (volby/příplatky k produktu). SelectionType Single = právě jedna volba, Multi = víc voleb
// (limit MaxSelect). PriceDelta = příplatek/sleva k ceně produktu vč. DPH (může být 0 i záporná).
export type ModifierSelectionType = 'Single' | 'Multi'

export interface ModifierOption {
  id: string
  name: string
  priceDelta: number
  sortOrder: number
}

export interface ModifierGroup {
  id: string
  name: string
  selectionType: ModifierSelectionType
  isRequired: boolean
  maxSelect: number | null
  sortOrder: number
  options: ModifierOption[]
}

export interface ModifierOptionInput {
  name: string
  priceDelta: number
  sortOrder: number
}

export interface ModifierGroupInput {
  name: string
  selectionType: ModifierSelectionType
  isRequired: boolean
  maxSelect: number | null
  sortOrder: number
  options: ModifierOptionInput[]
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

// Pobočka / provozovna (modul Pobočky & vedení). Modely nesou locationId → tady dostane význam.
export interface Location {
  id: string
  name: string
  address: string | null
  isActive: boolean
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
  /** Kdo prodej uskutečnil (pro provize). Plní backend podle přihlášeného/vybraného zaměstnance. */
  employeeId: string | null
  paymentMethod: PaymentMethod
  status: SaleStatus
  discountPercent: number
  tipAmount: number
  /** Přijatá hotovost (jen platba hotově se zadanou částkou), jinak null. */
  cashReceived: number | null
  /** Vráceno = cashReceived − total (počítá backend), jinak null. */
  cashChange: number | null
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

// --- Schvalování rizikových akcí ---

export type ApprovalType = 'SaleStorno' | 'StockIssue' | 'Stocktake'
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected'

export interface ApprovalRequest {
  id: string
  type: ApprovalType
  status: ApprovalStatus
  summary: string
  estimatedValue: number
  locationId: string | null
  requestedByUserId: string
  requestedByName: string | null
  createdAt: string
  resolvedByUserId: string | null
  resolvedByName: string | null
  resolvedAt: string | null
  resolutionNote: string | null
}

export interface ApprovalSettings {
  stornoLimit: number | null
  writeOffLimit: number | null
  stocktakeLimit: number | null
}

export function isApprovalRequest(value: unknown): value is ApprovalRequest {
  const candidate = value as Partial<ApprovalRequest> | null
  return Boolean(
    candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.summary === 'string' &&
    (candidate.type === 'SaleStorno' ||
      candidate.type === 'StockIssue' ||
      candidate.type === 'Stocktake') &&
    (candidate.status === 'Pending' ||
      candidate.status === 'Approved' ||
      candidate.status === 'Rejected'),
  )
}

// --- Uzávěrka: zavření dne / Z-report (Fáze 2) ---

/** Řádek rozpadu DPH v Z-reportu — zafixovaný v okamžiku zavření dne. */
export interface DayCloseVatLine {
  vatRate: number
  net: number
  vat: number
  gross: number
}

/** Řádek prodaného produktu v Z-reportu (pro inventuru) — zafixovaný v okamžiku zavření dne. */
export interface DayCloseProductLine {
  productId: string | null
  name: string
  quantity: number
  revenueGross: number
}

/**
 * Stav obchodního dne pro danou pobočku. Když `status === 'Open'`, den ještě není
 * uzavřen a nese jen `date`/`locationId`. Když `'Closed'`, jsou vyplněná zafixovaná
 * čísla Z-reportu; hotovostní pole (`cash*`) můžou být null, pokud uzávěrka hotovosti neproběhla.
 */
export interface DayCloseResponse {
  status: 'Open' | 'Closed'
  date: string
  locationId: string
  // Vyplněné jen když status === 'Closed':
  zReportNumber?: number
  closedAt?: string
  saleCount?: number
  totalNet?: number
  totalVat?: number
  total?: number
  cashTotal?: number
  cardTotal?: number
  tipTotal?: number
  discountTotal?: number
  cancelledCount?: number
  cancelledTotal?: number
  vatBreakdown?: DayCloseVatLine[]
  productBreakdown?: DayCloseProductLine[]
  cashOpening?: number | null
  cashPayIns?: number | null
  cashPayOuts?: number | null
  cashCountedClosing?: number | null
  cashDrop?: number | null
  cashExpectedClosing?: number | null
  cashDifference?: number | null
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
export type OrderFulfillment = 'pickup' | 'delivery'

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

// Split účtu — čistě zobrazovací/organizační rozpočet nad Order, NENÍ platební transakce.
// Jedna položka smí mít nenulovou frakci ve víc skupinách zároveň (sdílené jídlo).
export interface OrderSplitItemShare {
  itemId: string
  fraction: number // 0–1, podíl na lineTotal/lineNet/lineVat dané OrderItemLine
}
export interface OrderSplitGroup {
  id: string
  label: string
  items: OrderSplitItemShare[]
}

export interface Order {
  id: string
  tableId: string | null
  locationId: string | null
  status: OrderStatus
  saleId: string | null
  openedAt: string
  closedAt: string | null
  discountPercent: number
  tipAmount: number
  totalNet: number
  totalVat: number
  total: number
  splitGroups: OrderSplitGroup[]
  items: OrderItemLine[]
}

export interface KitchenQueueItem {
  itemId: string
  orderId: string
  tableName: string | null
  customerName?: string | null
  fulfillment?: OrderFulfillment | null
  productName: string
  quantity: number
  course: string | null
  note: string | null
  kitchenSection: CategoryKitchenSection
  kitchenStatus: KitchenStatus
  sentToKitchenAt: string | null
  kitchenStatusUpdatedAt: string | null
}

export interface PublicMenuCategory {
  id: string
  name: string
  sortOrder: number
}

export interface PublicMenuProduct {
  id: string
  name: string
  categoryId: string | null
  priceWithVat: number
  vatRate: number
  available: boolean
}

export interface PublicMenuResponse {
  categories: PublicMenuCategory[]
  products: PublicMenuProduct[]
}

export interface PublicOrderItemInput {
  productId: string
  quantity: number
}

export interface PublicOrderRequest {
  items: PublicOrderItemInput[]
  customerName: string
  customerPhone?: string | null
  note?: string | null
  fulfillment: OrderFulfillment
  address?: string | null
  tableId?: string | null
}

export interface PublicOrderConfirmation {
  orderId: string
  total: number
  currency: string
}

// --- Sklad / zásoby ---

export type StockMovementType =
  | 'Receipt'
  | 'Issue'
  | 'WriteOff'
  | 'StaffMeal'
  | 'Breakage'
  | 'Expiration'
  | 'Correction'
  | 'Sale'
  | 'StornoSale'
  | 'Stocktaking'
  | 'TransferOut'
  | 'TransferIn'

export interface StockLevel {
  productId: string
  productName: string
  productSku: string
  quantity: number
  locationId: string | null
}

// Centrální sklad: přehled zásob napříč pobočkami (matice produkt × provozovna).
// `locationId: null` (a `locationName: null`) = nezařazený sklad → UI „Nezařazeno".
export interface StockLocationColumn {
  locationId: string | null
  locationName: string | null
}

export interface StockByLocationCell {
  locationId: string | null
  quantity: number
}

export interface StockByLocationRow {
  productId: string
  productName: string
  productSku: string
  totalQuantity: number
  cells: StockByLocationCell[]
}

export interface StockByLocationResponse {
  locations: StockLocationColumn[]
  // Mirror PagedResult<StockByLocationRow> (inline, ať types.ts nezávisí na composables).
  products: {
    items: StockByLocationRow[]
    total: number
    page: number
    pageSize: number
  }
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
  relatedPurchaseReceiptId: string | null
  createdAt: string
}

export interface StocktakeItem {
  productId: string
  systemQuantity: number
  countedQuantity: number
  difference: number
}

export interface Stocktake {
  id: string
  locationId: string | null
  note: string | null
  createdAt: string
  items: StocktakeItem[]
}

export interface PurchaseReceiptItem {
  productId: string
  productName: string
  productSku: string
  quantity: number
  unitCost: number | null
  lineCost: number | null
}

export interface PurchaseReceipt {
  id: string
  locationId: string | null
  supplierName: string | null
  documentNumber: string | null
  receivedOn: string
  note: string | null
  totalCost: number | null
  createdAt: string
  items: PurchaseReceiptItem[]
}

export interface PurchaseReceiptItemInput {
  productId: string
  quantity: number
  unitCost?: number | null
}

export interface CreatePurchaseReceiptRequest {
  supplierName: string | null
  documentNumber: string | null
  receivedOn: string | null
  note: string | null
  locationId: string | null
  items: PurchaseReceiptItemInput[]
}

export interface PurchaseSuggestionItem {
  productId: string
  productName: string
  productSku: string
  currentQuantity: number
  minQuantity: number
  consumedQuantity: number
  averageDailyUsage: number
  targetQuantity: number
  recommendedOrderQuantity: number
  purchasePrice: number | null
  estimatedCost: number | null
  daysOfStockRemaining: number | null
}

export interface PurchaseSuggestionsResponse {
  from: string
  to: string
  daysAhead: number
  locationId: string | null
  items: PurchaseSuggestionItem[]
}

export interface StockMirrorItem {
  productId: string
  productName: string
  productSku: string
  openingQuantity: number
  receivedQuantity: number
  soldQuantity: number
  stornoQuantity: number
  issuedQuantity: number
  correctionQuantity: number
  stocktakingQuantity: number
  expectedQuantity: number
  actualQuantity: number
  varianceQuantity: number
  unitCost: number | null
  varianceValue: number | null
}

export interface StockMirror {
  from: string
  to: string
  items: StockMirrorItem[]
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
