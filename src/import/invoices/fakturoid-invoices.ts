import type { InvoiceInput } from '@/composables/useInvoices'
import { calcLine, calcTotals, round2 } from '@/lib/invoice'
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

/** Naparsovaná faktura: vstup pro import + náhled + případná varování (finanční kontrola). */
export interface ParsedFakturoidInvoice {
  input: InvoiceInput
  vatPayer: boolean
  previewTotal: number
  warnings: string[]
}

/**
 * Naparsuje Fakturoid XML export faktur na naše `InvoiceInput` (řádky, datumy,
 * stav, dodavatel i odběratel). Zachovává původní číslo i stav (smysl historického
 * importu — číslo se NEpřečísluje).
 *
 * Finanční pojistky:
 *  - základ řádku bere z `unit_price_without_vat` (Fakturoid umí ceny s/bez DPH —
 *    bez tohoto by se u „cen s DPH" připočetlo DPH podruhé a částka by se nafoukla),
 *  - vypočtený součet porovná s `<total>` z XML; nesoulad → varování (ne tichý import),
 *  - nepodporovaná sazba DPH u plátce → varování.
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
    const warnings: string[] = []

    const items: InvoiceItem[] = Array.from(inv.getElementsByTagName('line')).map((ln, i) => {
      const quantity = num(text(ln, 'quantity')) || 1
      // Deterministicky bereme základ BEZ DPH (fallback unit_price, kdyby tag chyběl).
      const unitPrice = num(text(ln, 'unit_price_without_vat') || text(ln, 'unit_price'))
      const rawRate = Math.round(num(text(ln, 'vat_rate')))
      if (vatPayer && ![0, 12, 21].includes(rawRate)) {
        warnings.push(`Nepodporovaná sazba DPH ${rawRate} % na řádku „${text(ln, 'name')}".`)
      }
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

    // Kontrola součtu: vypočtený total vs <total> z XML (tolerance na zaokrouhlení).
    const previewTotal = num(text(inv, 'total'))
    const computedTotal = round2(calcTotals(items, vatPayer).total)
    if (previewTotal > 0 && Math.abs(computedTotal - round2(previewTotal)) > 0.5) {
      warnings.push(
        `Vypočtený součet ${computedTotal} Kč nesouhlasí s originálem ${previewTotal} Kč — zkontrolujte řádky.`,
      )
    }

    return { input, vatPayer, previewTotal, warnings }
  })
}
