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

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  SaleCancelled: 'Storno prodeje',
  OrderDiscountUpdated: 'Sleva / spropitné na účtu',
  DayClosed: 'Uzavření dne',
  ProductPriceChanged: 'Změna ceny produktu',
  CompanyModulesUpdated: 'Změna modulů',
  CompanySettingsUpdated: 'Změna firmy',
  MemberRoleChanged: 'Změna role',
  MemberRemoved: 'Odebrání člena',
  InvitationCreated: 'Pozvánka vytvořena',
  InvitationRevoked: 'Pozvánka zrušena',
  InvitationAccepted: 'Pozvánka přijata',
  InvoiceCancelled: 'Storno faktury',
  InvoiceIssued: 'Vystavení faktury',
  InvoicePaid: 'Úhrada faktury',
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
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

export function auditDataValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return new Intl.NumberFormat('cs-CZ').format(value)
  if (typeof value === 'boolean') return value ? 'ano' : 'ne'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}
