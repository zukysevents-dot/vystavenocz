import type { InvoiceInput } from '@/composables/useInvoices'
import { calcLine, calcTotals, round2 } from '@/lib/invoice'
import type { InvoiceItem } from '@/lib/types'
import { num, toVatRate } from './shared'
import type { ParsedImportedInvoice } from './types'

/**
 * Import ISDOC — českého národního standardu strukturované faktury.
 *
 * Proč zrovna ISDOC: umí ho vyexportovat Pohoda, Money S3/S4, ABRA, Helios,
 * iDoklad, Fakturoid i většina dalších českých účetních programů. Jeden parser
 * proto pokryje „import odkudkoli" líp než deset proprietárních formátů —
 * a na rozdíl od PDF jsou data strukturovaná, takže se nic nehádá.
 *
 * Parser je záměrně tolerantní k namespace i verzi (ISDOC 5.x i 6.x, s prefixem
 * i bez): cizí exporty se v těchhle detailech liší a striktní shoda by je
 * zbytečně odmítala.
 */

/** Najde potomky podle lokálního jména bez ohledu na namespace/prefix. */
function all(el: Element | Document | null, local: string): Element[] {
  if (!el) return []
  return Array.from(el.getElementsByTagNameNS('*', local))
}

function first(el: Element | Document | null, local: string): Element | null {
  return all(el, local)[0] ?? null
}

/** Text prvního potomka daného jména (prázdný řetězec, když chybí). */
function text(el: Element | Document | null, local: string): string {
  if (!el) return ''
  return first(el, local)?.textContent?.trim() ?? ''
}

/**
 * Text přímého potomka — pro jména, která se opakují ve vnořených blocích.
 * `ID` je na faktuře číslo dokladu, ale i identifikace strany a číslo řádku;
 * bez tohohle omezení by se z hlavičky vytáhlo IČO dodavatele.
 */
function childText(el: Element | null, local: string): string {
  if (!el) return ''
  const child = Array.from(el.children).find((c) => c.localName === local)
  return child?.textContent?.trim() ?? ''
}

/** Vytáhne jméno, IČO, DIČ a adresu z bloku `<Party>`. */
function parseParty(block: Element | null) {
  const party = first(block, 'Party')
  const address = first(party, 'PostalAddress')
  // Vlastní export píše do prázdných polí pomlčku, ať je ISDOC schéma-validní —
  // při čtení zpátky ji nesmíme uložit jako skutečnou hodnotu.
  const clean = (v: string) => (v && v !== '—' ? v : '')
  const street = [text(address, 'StreetName'), text(address, 'BuildingNumber')]
    .map(clean)
    .filter(Boolean)
    .join(' ')

  return {
    name: clean(text(first(party, 'PartyName'), 'Name')),
    ico: clean(text(first(party, 'PartyIdentification'), 'ID')),
    dic: clean(text(first(party, 'PartyTaxScheme'), 'CompanyID')),
    street,
    city: clean(text(address, 'CityName')),
    zip: clean(text(address, 'PostalZone')),
    country: clean(text(first(address, 'Country'), 'IdentificationCode')) || 'CZ',
    email: clean(text(party, 'ElectronicMail')),
  }
}

/** Splatnost — ISDOC ji podle verze nese pod různými jmény. */
function findDueDate(root: Element): string {
  for (const tag of ['PaymentDueDate', 'DueDate', 'RequestedDeliveryDate']) {
    const v = text(root, tag)
    if (v) return v.slice(0, 10)
  }
  return ''
}

function parseInvoice(root: Element, sourceFile?: string): ParsedImportedInvoice {
  const warnings: string[] = []
  const vatPayer = childText(root, 'VATApplicable').toLowerCase() !== 'false'
  const supplier = parseParty(first(root, 'AccountingSupplierParty'))
  const client = parseParty(first(root, 'AccountingCustomerParty'))
  const docType = childText(root, 'DocumentType')

  const lineEls = all(root, 'InvoiceLine')
  const items: InvoiceItem[] = lineEls.map((ln, i) => {
    const quantity = num(text(ln, 'InvoicedQuantity')) || 1
    const lineBase = num(text(ln, 'LineExtensionAmount'))
    // Jednotková cena bez DPH; když chybí, dopočítá se ze základu řádku
    // (některé exporty ji u slev či zaokrouhlení vynechávají).
    const unitPrice = num(text(ln, 'UnitPrice')) || (quantity ? round2(lineBase / quantity) : 0)
    const rate = first(ln, 'ClassifiedTaxCategory')
    const rawRate = Math.round(num(text(rate, 'Percent')))
    if (vatPayer && ![0, 12, 21].includes(rawRate)) {
      warnings.push(`Nepodporovaná sazba DPH ${rawRate} % na řádku „${text(ln, 'Description')}".`)
    }
    const vatRate = toVatRate(rawRate)

    return {
      id: `isdoc-${i}`,
      description: text(ln, 'Description') || text(ln, 'Note') || `Položka ${i + 1}`,
      quantity,
      unit: first(ln, 'InvoicedQuantity')?.getAttribute('unitCode') || 'ks',
      unitPrice,
      vatRate,
      ...calcLine({ quantity, unitPrice, vatRate }, vatPayer),
    }
  })

  if (!items.length) warnings.push('Faktura nemá žádné položky.')

  const issueDate = childText(root, 'IssueDate').slice(0, 10)
  const payment = first(root, 'PaymentMeans')

  const input: InvoiceInput = {
    // Dobropis (DocumentType 2) se v aplikaci vystavuje serverem, ne importem —
    // historický doklad se proto uloží jako faktura se zápornými částkami z originálu.
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: childText(root, 'ID') || null,
    clientId: null,
    clientSnapshot: {
      name: client.name,
      ico: client.ico || null,
      dic: client.dic || null,
      street: client.street || null,
      city: client.city || null,
      zip: client.zip || null,
      country: client.country,
      email: client.email || null,
    },
    supplierSnapshot: {
      companyName: supplier.name || null,
      ico: supplier.ico || null,
      dic: supplier.dic || null,
      vatMode: vatPayer ? 'payer' : 'non_payer',
      street: supplier.street || null,
      city: supplier.city || null,
      zip: supplier.zip || null,
      country: supplier.country,
      bankAccount:
        [text(payment, 'AccountID'), text(payment, 'BankCode')].filter(Boolean).join('/') || null,
      iban: text(payment, 'IBAN') || null,
      swift: text(payment, 'BIC') || null,
    },
    items,
    currency: childText(root, 'LocalCurrencyCode') || 'CZK',
    issueDate,
    dueDate: findDueDate(root),
    taxableDate: childText(root, 'TaxPointDate').slice(0, 10) || issueDate,
    paidAt: null,
    variableSymbol: text(root, 'VariableSymbol') || null,
    constantSymbol: text(root, 'ConstantSymbol') || null,
    specificSymbol: text(root, 'SpecificSymbol') || null,
    paymentMethod: 'bank',
    notes: childText(root, 'Note') || null,
  }

  if (docType === '2') {
    warnings.push('Originál je dobropis — zkontrolujte znaménka částek po importu.')
  }
  if (!input.invoiceNumber) warnings.push('V dokladu chybí číslo faktury.')
  if (!issueDate) warnings.push('V dokladu chybí datum vystavení.')

  // Kontrola proti originálu: součet řádků vs. deklarovaná splatná částka.
  const totalEl = first(root, 'LegalMonetaryTotal')
  const previewTotal = num(text(totalEl, 'PayableAmount') || text(totalEl, 'TaxInclusiveAmount'))
  const computedTotal = round2(calcTotals(items, vatPayer).total)
  if (previewTotal > 0 && Math.abs(computedTotal - round2(previewTotal)) > 0.5) {
    warnings.push(
      `Vypočtený součet ${computedTotal} Kč nesouhlasí s originálem ${previewTotal} Kč — zkontrolujte řádky.`,
    )
  }

  return { input, vatPayer, previewTotal, warnings, source: 'isdoc', sourceFile }
}

/** Pozná, jestli XML je ISDOC (a ne třeba Fakturoid export). */
export function isIsdocXml(xml: string): boolean {
  return /<(\w+:)?Invoice[\s>]/.test(xml) && /isdoc/i.test(xml)
}

/**
 * Naparsuje ISDOC XML. Soubor obvykle nese jednu fakturu, ale ISDOCX/dávkové
 * exporty jich umí mít víc, takže se zpracují všechny nalezené `<Invoice>`.
 */
export function parseIsdocInvoices(xml: string, sourceFile?: string): ParsedImportedInvoice[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Soubor není platné XML.')
  }

  const roots = all(doc, 'Invoice').filter(
    (el) => all(el, 'InvoiceLine').length > 0 || all(el, 'LegalMonetaryTotal').length > 0,
  )
  if (!roots.length) {
    throw new Error('XML nevypadá jako ISDOC faktura (chybí <Invoice>).')
  }

  return roots.map((root) => parseInvoice(root, sourceFile))
}
