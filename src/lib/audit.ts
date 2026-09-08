export interface AuditEntry {
  id: string
  userId: string
  actorEmail: string | null
  action: string
  entity: string
  entityId: string
  dataJson: string | null
  createdAt: string
}

// Pokrývá VŠECHNY akce, které server zapisuje (`AuditActions.cs`) — ne jen hrstku. Dřív jich tu bylo
// 15 ze 127, takže se uživateli běžně ukázal anglický název z kódu („DayCloseReopened"). Když se na
// serveru objeví nová akce, doplň ji sem; fallback ji zobrazí čitelně, ale pořád anglicky.
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  // Prodej a provoz
  SaleCancelled: 'Storno prodeje',
  SalesImported: 'Import prodejů',
  SalesLocationBackfilled: 'Doplnění provozovny k prodejům',
  OrderCancelled: 'Zrušení účtu',
  OrderDiscountUpdated: 'Sleva / spropitné na účtu',
  DayClosed: 'Uzavření dne',
  DayCloseReopened: 'Znovuotevření uzávěrky',
  ProductPriceChanged: 'Změna ceny produktu',
  ProductionBatchCreated: 'Výroba polotovaru',
  ShiftsPublished: 'Publikování směn',
  AttendanceCorrected: 'Oprava docházky',
  // Firma, tým a přístupy
  CompanyCreated: 'Založení firmy',
  CompanyModulesUpdated: 'Změna modulů',
  CompanySettingsUpdated: 'Změna firmy',
  MembershipCreated: 'Přidání člena',
  MemberRoleChanged: 'Změna role',
  MemberRemoved: 'Odebrání člena',
  MemberPinSet: 'Nastavení PINu',
  MemberPinRevoked: 'Zrušení PINu',
  MemberPinLogin: 'Přihlášení PINem',
  InvitationCreated: 'Pozvánka vytvořena',
  InvitationRevoked: 'Pozvánka zrušena',
  InvitationAccepted: 'Pozvánka přijata',
  AccountDeleted: 'Smazání účtu',
  // Faktury
  InvoiceDraftCreated: 'Vytvoření konceptu faktury',
  InvoiceDraftUpdated: 'Úprava konceptu faktury',
  InvoiceDraftDeleted: 'Smazání konceptu faktury',
  InvoiceItemsChanged: 'Změna položek faktury',
  InvoiceIssued: 'Vystavení faktury',
  InvoiceSent: 'Odeslání faktury',
  InvoicePaid: 'Úhrada faktury',
  InvoicePaymentDeleted: 'Smazání úhrady',
  InvoiceOverdue: 'Faktura po splatnosti',
  InvoiceCancelled: 'Storno faktury',
  InvoiceStatusChanged: 'Změna stavu faktury',
  InvoiceNumberChanged: 'Změna čísla faktury',
  InvoiceImported: 'Import faktury',
  InvoiceCreditNoteCreated: 'Vystavení dobropisu',
  InvoiceConvertedFromProforma: 'Převod zálohové na fakturu',
  RecurringInvoiceGenerated: 'Vygenerování pravidelné faktury',
  RecurringTemplateCreated: 'Vytvoření šablony faktury',
  RecurringTemplateUpdated: 'Úprava šablony faktury',
  RecurringTemplateDeleted: 'Smazání šablony faktury',
  RecurringTemplatePaused: 'Pozastavení šablony faktury',
  RecurringTemplateResumed: 'Obnovení šablony faktury',
  RecurringTemplateGenerationFailed: 'Chyba generování pravidelné faktury',
  // Klienti a klientská zóna
  ClientCreated: 'Vytvoření klienta',
  ClientUpdated: 'Úprava klienta',
  ClientArchived: 'Archivace klienta',
  ClientRestored: 'Obnovení klienta',
  ClientDeleted: 'Smazání klienta',
  ClientPortalTokenGenerated: 'Vytvoření přístupu do klientské zóny',
  ClientPortalTokenRevoked: 'Zrušení přístupu do klientské zóny',
  CrmTaskCancelled: 'Zrušení úkolu',
  // Sklad, dodavatelé a nákup
  StockDocumentCreated: 'Vytvoření skladového dokladu',
  StockDocumentConfirmed: 'Potvrzení skladového dokladu',
  StockDocumentCancelled: 'Storno skladového dokladu',
  StockDocumentFileUploaded: 'Příloha ke skladovému dokladu',
  StockDocumentFileDeleted: 'Smazání přílohy skladového dokladu',
  SupplierCreated: 'Vytvoření dodavatele',
  SupplierUpdated: 'Úprava dodavatele',
  SupplierArchived: 'Archivace dodavatele',
  SupplierProductUpdated: 'Změna balení a ceny dodavatele',
  SupplierInvoiceRecorded: 'Záznam přijaté faktury',
  PurchaseOrderCreated: 'Vytvoření nákupní objednávky',
  PurchaseOrderSent: 'Odeslání nákupní objednávky',
  PurchaseOrderEmailSent: 'Odeslání objednávky e-mailem',
  PurchaseOrderReceived: 'Příjem nákupní objednávky',
  PurchaseOrderReceiptDrafted: 'Koncept příjemky',
  PurchaseOrderCancelled: 'Zrušení nákupní objednávky',
  // Zakázky a nabídky
  JobStatusChanged: 'Změna stavu zakázky',
  JobCreatedFromQuote: 'Zakázka z nabídky',
  JobInvoiced: 'Fakturace zakázky',
  JobMaterialConsumed: 'Výdej materiálu na zakázku',
  JobMaterialReturned: 'Vrácení materiálu ze zakázky',
  JobHandoverCreated: 'Předání zakázky',
  JobFileUploaded: 'Příloha k zakázce',
  JobFileDeleted: 'Smazání přílohy zakázky',
  QuoteStatusChanged: 'Změna stavu nabídky',
  QuoteEmailSent: 'Odeslání nabídky e-mailem',
  // Schvalování
  ApprovalRequested: 'Žádost o schválení',
  ApprovalApproved: 'Schváleno',
  ApprovalRejected: 'Zamítnuto',
  ApprovalSettingsUpdated: 'Změna limitů schvalování',
  OverrideApproved: 'Schválení výjimky',
  // Předplatné a fakturace služby
  SubscriptionPlanChanged: 'Změna tarifu',
  SubscriptionTrialStarted: 'Zahájení zkušební doby',
  SubscriptionClaimAccepted: 'Uplatnění kódu',
  EntitlementGranted: 'Zpřístupnění modulu',
  EntitlementRevoked: 'Odebrání modulu',
  BillingEventProcessed: 'Zpracování platby předplatného',
  GrowthInvitationCreated: 'Vytvoření doporučení',
  GrowthInvitationRedeemed: 'Uplatnění doporučení',
  PartnerProfileSubmitted: 'Žádost partnera',
  // Zařízení, integrace a podpisy
  PosTerminalRegistered: 'Registrace pokladny',
  PosTerminalRevoked: 'Odpojení pokladny',
  TerminalDeviceRegistered: 'Registrace terminálu',
  TerminalDeviceUpdated: 'Úprava terminálu',
  TerminalDeviceDeactivated: 'Deaktivace terminálu',
  TerminalPaymentReconciled: 'Spárování platby terminálem',
  TerminalPaymentRefunded: 'Vrácení platby terminálem',
  TerminalPaymentResolved: 'Dořešení platby terminálem',
  PrintAgentRegistered: 'Registrace tiskárny',
  PrintAgentRevoked: 'Odpojení tiskárny',
  PaymentProviderConnectionCreated: 'Vytvoření platebního napojení',
  PaymentProviderConnectionUpdated: 'Úprava platebního napojení',
  PaymentProviderConnectionDeleted: 'Smazání platebního napojení',
  IntegrationSecretCreated: 'Uložení přístupového klíče',
  IntegrationSecretUpdated: 'Změna přístupového klíče',
  IntegrationSecretDeleted: 'Smazání přístupového klíče',
  IntegrationSecretsRevoked: 'Zneplatnění přístupových klíčů',
  ApiTokenCreated: 'Vytvoření API tokenu',
  ApiTokenRevoked: 'Zrušení API tokenu',
  WebhookSubscriptionCreated: 'Vytvoření webhooku',
  WebhookSubscriptionUpdated: 'Úprava webhooku',
  WebhookSubscriptionDeleted: 'Smazání webhooku',
  SigningEnvelopeCreated: 'Vytvoření obálky k podpisu',
  SigningEnvelopeSent: 'Odeslání obálky k podpisu',
  SigningEnvelopeCancelled: 'Zrušení obálky k podpisu',
  SigningEnvelopeProviderEventApplied: 'Aktualizace stavu podpisu',
  SigningProviderConnectionCreated: 'Vytvoření napojení podpisů',
  SigningProviderConnectionUpdated: 'Úprava napojení podpisů',
  SigningProviderConnectionDeleted: 'Smazání napojení podpisů',
  SigningProviderSecretCreated: 'Uložení klíče podpisů',
  SigningProviderSecretUpdated: 'Změna klíče podpisů',
  SigningProviderSecretDeleted: 'Smazání klíče podpisů',
  SigningProviderSecretsRevoked: 'Zneplatnění klíčů podpisů',
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? humanizeKey(action)
}

/**
 * Záchranná síť pro název, který slovník nezná: „DayCloseReopened" → „Day close reopened".
 * Pořád anglicky, ale čitelně — a nevypadá to jako kus kódu, který propadl do UI.
 */
function humanizeKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function auditEntityLabel(entity: string): string {
  switch (entity) {
    case 'Sale':
      return 'Prodej'
    case 'Order':
      return 'Účet'
    case 'DayClose':
      return 'Uzávěrka'
    case 'Product':
      return 'Produkt'
    case 'Company':
      return 'Firma'
    case 'CompanyMembership':
      return 'Člen firmy'
    case 'Invoice':
      return 'Faktura'
    default:
      return entity
  }
}

export function parseAuditData(dataJson: string | null): Record<string, unknown> | null {
  if (!dataJson) return null
  try {
    const parsed = JSON.parse(dataJson) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

// Popisky detailů záznamu. Server posílá klíče tak, jak se jmenují v kódu (`businessDay`,
// `zReportNumber`) a stránka je vypisovala surově — uživatel četl „BUSINESSDAY" a „ZREPORTNUMBER".
const AUDIT_DATA_LABELS: Record<string, string> = {
  businessDay: 'Obchodní den',
  locationId: 'Provozovna',
  zReportNumber: 'Číslo Z-reportu',
  originalZReportNumber: 'Původní Z-report',
  originalClosedAt: 'Původně uzavřeno',
  originalClosedByUserId: 'Původně uzavřel',
  supersededByCloseId: 'Nahrazeno uzávěrkou',
  reason: 'Důvod',
  note: 'Poznámka',
  total: 'Celkem',
  totalNet: 'Základ',
  totalVat: 'DPH',
  cashCounted: 'Napočítaná hotovost',
  cashExpected: 'Očekávaná hotovost',
  cashDifference: 'Rozdíl hotovosti',
  discountPercent: 'Sleva',
  tipAmount: 'Spropitné',
  paymentMethod: 'Způsob úhrady',
  saleId: 'Prodej',
  orderId: 'Účet',
  invoiceId: 'Faktura',
  clientId: 'Klient',
  productId: 'Produkt',
  employeeId: 'Zaměstnanec',
  email: 'E-mail',
  role: 'Role',
  from: 'Z',
  to: 'Na',
  oldPrice: 'Původní cena',
  newPrice: 'Nová cena',
  quantity: 'Množství',
  modules: 'Moduly',
  number: 'Číslo',
  status: 'Stav',
}

/** Popisek detailu; neznámý klíč se aspoň rozdělí na slova, ať nevypadá jako kus kódu. */
export function auditDataLabel(key: string): string {
  return AUDIT_DATA_LABELS[key] ?? humanizeKey(key)
}

export function auditDataValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return new Intl.NumberFormat('cs-CZ').format(value)
  if (typeof value === 'boolean') return value ? 'ano' : 'ne'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}
