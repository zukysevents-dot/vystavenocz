import type { Company, PaymentMethod } from '@/lib/types'
import type { ReceiptLine } from '@/components/SaleReceipt.vue'

// Data tiskové účtenky (POS i Restaurace) — sestavená po zaplacení.
export interface ReceiptInfo {
  businessName: string
  address?: string
  ico?: string
  dic?: string
  receiptNumber: string
  dateTime: string
  table?: string
  items: ReceiptLine[]
  discountPercent?: number
  discountAmount?: number
  tipAmount?: number
  total: number
  paymentMethod: string
}

interface BuildReceiptArgs {
  company: Company | null
  items: ReceiptLine[]
  discountPercent?: number
  discountAmount?: number
  tipAmount?: number
  total: number
  method: PaymentMethod
  /** Zdroj čísla účtenky (id prodeje/účtu) — zkrátí se na čitelný kód. */
  id: string
  table?: string
}

export function buildReceipt({
  company,
  items,
  discountPercent,
  discountAmount,
  tipAmount,
  total,
  method,
  id,
  table,
}: BuildReceiptArgs): ReceiptInfo {
  const address = [company?.street, [company?.zip, company?.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  return {
    businessName: company?.companyName || company?.fullName || 'Účtenka',
    address: address || undefined,
    ico: company?.ico || undefined,
    dic: company?.dic || undefined,
    receiptNumber: id.slice(0, 8).toUpperCase(),
    dateTime: new Date().toLocaleString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    table,
    items,
    discountPercent: discountPercent || undefined,
    discountAmount: discountAmount || undefined,
    tipAmount: tipAmount || undefined,
    total,
    paymentMethod: method === 'Cash' ? 'Hotově' : 'Kartou',
  }
}
