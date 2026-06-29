import type { InvoiceInput } from '@/composables/useInvoices'
import { calcLine } from '@/lib/invoice'
import type { InvoiceItem, InvoiceStatus, VatRate } from '@/lib/types'

function text(el: Element, tag: string): string {
  return el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''
}

function num(s: string): number {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function toVatRate(s: string): VatRate {
  const n = Math.round(num(s))
  return n === 12 ? 12 : n === 21 ? 21 : 0
}

function mapStatus(s: string): InvoiceStatus {
  if (s === 'paid') return 'paid'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'overdue') return 'overdue'
  return 'issued'
}

/** Naparsovaná faktura: vstup pro import + pomocná data pro náhled. */
export interface ParsedFakturoidInvoice {
  input: InvoiceInput
  vatPayer: boolean
  previewTotal: number
}

/**
 * Naparsuje Fakturoid XML export faktur na naše `InvoiceInput` (včetně řádků,
 * dat, stavu, dodavatele i odběratele). Zachovává původní číslo i stav — to je
 * smysl historického importu (číslo se NEpřečísluje).
 */
export function parseFakturoidInvoices(xml: string): ParsedFakturoidInvoice[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Soubor není platné XML.')
  }
  const invoices = Array.from(doc.getElementsByTagName('invoice'))
  if (!invoices.length) {
    throw new Error('XML nevypadá jako export faktur z Fakturoidu (chybí <invoice>).')
  }

  return invoices.map((inv) => {
    const vatPayer = !!text(inv, 'your_vat_no') // má DIČ → plátce DPH
    const items: InvoiceItem[] = Array.from(inv.getElementsByTagName('line')).map((ln, i) => {
      const quantity = num(text(ln, 'quantity')) || 1
      const unitPrice = num(text(ln, 'unit_price'))
      const vatRate = toVatRate(text(ln, 'vat_rate'))
      return {
        id: `imp-${i}`,
        description: text(ln, 'name'),
        quantity,
        unit: text(ln, 'unit_name') || 'ks',
        unitPrice,
        vatRate,
        ...calcLine({ quantity, unitPrice, vatRate }, vatPayer),
      }
    })

    const input: InvoiceInput = {
      documentType: 'invoice',
      status: mapStatus(text(inv, 'status')),
      invoiceNumber: text(inv, 'number') || null,
      clientId: null,
      clientSnapshot: {
        name: text(inv, 'client_name'),
        ico: text(inv, 'client_registration_no') || null,
        dic: text(inv, 'client_vat_no') || null,
        street: text(inv, 'client_street') || null,
        city: text(inv, 'client_city') || null,
        zip: text(inv, 'client_zip') || null,
        country: text(inv, 'client_country') || 'CZ',
        email: null,
      },
      supplierSnapshot: {
        companyName: text(inv, 'your_name') || null,
        ico: text(inv, 'your_registration_no') || null,
        dic: text(inv, 'your_vat_no') || null,
        vatMode: vatPayer ? 'payer' : 'non_payer',
        street: text(inv, 'your_street') || null,
        city: text(inv, 'your_city') || null,
        zip: text(inv, 'your_zip') || null,
        country: text(inv, 'your_country') || 'CZ',
        bankAccount: text(inv, 'bank_account') || null,
        iban: text(inv, 'iban') || null,
        swift: text(inv, 'swift_bic') || null,
      },
      items,
      currency: text(inv, 'currency') || 'CZK',
      issueDate: text(inv, 'issued_on'),
      dueDate: text(inv, 'due_on'),
      taxableDate: text(inv, 'taxable_fulfillment_due') || text(inv, 'issued_on'),
      paidAt: text(inv, 'paid_on') || null,
      variableSymbol: text(inv, 'variable_symbol') || null,
      constantSymbol: null,
      specificSymbol: null,
      paymentMethod: text(inv, 'payment_method') || 'bank',
      notes: text(inv, 'note') || null,
    }

    return { input, vatPayer, previewTotal: num(text(inv, 'total')) }
  })
}
