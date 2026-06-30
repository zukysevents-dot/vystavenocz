import type { Invoice, InvoiceStatus } from './types'

/**
 * Export pro účetní (modul Účtárna). Dvě formy:
 *  - ISDOC 6.0.1 (XML) — český standard strukturované faktury, načte Pohoda/Money/Helios…
 *  - CSV přehledu faktur za období — pro ruční zpracování / import do Excelu.
 *
 * ISDOC šablona byla ověřena proti oficiálnímu XSD (isdoc.cz 6.0.1) přes xmllint
 * pro plátce (více sazeb DPH) i neplátce — výstup je schéma-validní.
 */

const ISDOC_NS = 'http://isdoc.cz/namespace/2013'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Částka na 2 desetinná místa s tečkou (ISDOC formát). */
function n2(n: number): string {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2)
}

function countryName(code: string): string {
  return code === 'CZ' || !code ? 'Česká republika' : code
}

/** Rozdělí adresní řádek na ulici a číslo (ISDOC je vyžaduje zvlášť). */
function splitStreet(street: string | null | undefined): { name: string; number: string } {
  const s = (street || '').trim()
  const m = /^(.*?)\s+(\d+[\d/A-Za-z]*)$/.exec(s)
  if (m) return { name: m[1], number: m[2] }
  return { name: s || '—', number: '—' }
}

function addressXml(
  street: string | null | undefined,
  city: string | null | undefined,
  zip: string | null | undefined,
  country: string | null | undefined,
): string {
  const { name, number } = splitStreet(street)
  const code = country || 'CZ'
  return (
    `<PostalAddress>` +
    `<StreetName>${esc(name)}</StreetName>` +
    `<BuildingNumber>${esc(number)}</BuildingNumber>` +
    `<CityName>${esc(city || '—')}</CityName>` +
    `<PostalZone>${esc(zip || '—')}</PostalZone>` +
    `<Country><IdentificationCode>${esc(code)}</IdentificationCode><Name>${esc(countryName(code))}</Name></Country>` +
    `</PostalAddress>`
  )
}

function partyXml(
  name: string | null | undefined,
  ico: string | null | undefined,
  dic: string | null | undefined,
  address: string,
): string {
  const taxScheme = dic
    ? `<PartyTaxScheme><CompanyID>${esc(dic)}</CompanyID><TaxScheme>VAT</TaxScheme></PartyTaxScheme>`
    : ''
  return (
    `<Party>` +
    `<PartyIdentification><ID>${esc(ico || '—')}</ID></PartyIdentification>` +
    `<PartyName><Name>${esc(name || '—')}</Name></PartyName>` +
    address +
    taxScheme +
    `</Party>`
  )
}

/** Vygeneruje schéma-validní ISDOC 6.0.1 XML pro jednu fakturu. */
export function invoiceToIsdoc(inv: Invoice): string {
  const payer = inv.supplierSnapshot?.vatMode === 'payer'
  const vatApplicable = payer ? 'true' : 'false'
  const method = '0' // výpočet z částky bez daně

  const linesXml = inv.items
    .map((it, i) => {
      const pct = payer ? it.vatRate : 0
      return (
        `<InvoiceLine>` +
        `<ID>${i + 1}</ID>` +
        `<InvoicedQuantity unitCode="${esc(it.unit || 'ks')}">${n2(it.quantity)}</InvoicedQuantity>` +
        `<LineExtensionAmount>${n2(it.lineSubtotal)}</LineExtensionAmount>` +
        `<LineExtensionAmountTaxInclusive>${n2(it.lineTotal)}</LineExtensionAmountTaxInclusive>` +
        `<LineExtensionTaxAmount>${n2(it.lineVat)}</LineExtensionTaxAmount>` +
        `<UnitPrice>${n2(it.unitPrice)}</UnitPrice>` +
        `<UnitPriceTaxInclusive>${n2(it.unitPrice * (1 + pct / 100))}</UnitPriceTaxInclusive>` +
        `<ClassifiedTaxCategory><Percent>${n2(pct)}</Percent><VATCalculationMethod>${method}</VATCalculationMethod><VATApplicable>${vatApplicable}</VATApplicable></ClassifiedTaxCategory>` +
        `<Item><Description>${esc(it.description)}</Description></Item>` +
        `</InvoiceLine>`
      )
    })
    .join('')

  // Skupiny DPH podle sazby (neplátce → jediná skupina 0 %).
  const groups = new Map<number, { base: number; vat: number; incl: number }>()
  for (const it of inv.items) {
    const pct = payer ? it.vatRate : 0
    const g = groups.get(pct) ?? { base: 0, vat: 0, incl: 0 }
    g.base += it.lineSubtotal
    g.vat += it.lineVat
    g.incl += it.lineTotal
    groups.set(pct, g)
  }
  const subTotalsXml = [...groups.entries()]
    .map(
      ([pct, g]) =>
        `<TaxSubTotal>` +
        `<TaxableAmount>${n2(g.base)}</TaxableAmount>` +
        `<TaxAmount>${n2(g.vat)}</TaxAmount>` +
        `<TaxInclusiveAmount>${n2(g.incl)}</TaxInclusiveAmount>` +
        `<AlreadyClaimedTaxableAmount>0.00</AlreadyClaimedTaxableAmount>` +
        `<AlreadyClaimedTaxAmount>0.00</AlreadyClaimedTaxAmount>` +
        `<AlreadyClaimedTaxInclusiveAmount>0.00</AlreadyClaimedTaxInclusiveAmount>` +
        `<DifferenceTaxableAmount>${n2(g.base)}</DifferenceTaxableAmount>` +
        `<DifferenceTaxAmount>${n2(g.vat)}</DifferenceTaxAmount>` +
        `<DifferenceTaxInclusiveAmount>${n2(g.incl)}</DifferenceTaxInclusiveAmount>` +
        `<TaxCategory><Percent>${n2(pct)}</Percent><VATApplicable>${vatApplicable}</VATApplicable></TaxCategory>` +
        `</TaxSubTotal>`,
    )
    .join('')

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Invoice xmlns="${ISDOC_NS}" version="6.0.1">` +
    `<DocumentType>${inv.documentType === 'credit_note' ? '2' : '1'}</DocumentType>` +
    `<ID>${esc(inv.invoiceNumber || '—')}</ID>` +
    `<UUID>${esc(inv.id)}</UUID>` +
    `<IssueDate>${esc(inv.issueDate)}</IssueDate>` +
    (inv.taxableDate ? `<TaxPointDate>${esc(inv.taxableDate)}</TaxPointDate>` : '') +
    `<VATApplicable>${vatApplicable}</VATApplicable>` +
    `<ElectronicPossibilityAgreementReference/>` +
    (inv.notes ? `<Note>${esc(inv.notes)}</Note>` : '') +
    `<LocalCurrencyCode>${esc(inv.currency || 'CZK')}</LocalCurrencyCode>` +
    `<CurrRate>1</CurrRate>` +
    `<RefCurrRate>1</RefCurrRate>` +
    `<AccountingSupplierParty>` +
    partyXml(
      inv.supplierSnapshot?.companyName,
      inv.supplierSnapshot?.ico,
      inv.supplierSnapshot?.dic,
      addressXml(
        inv.supplierSnapshot?.street,
        inv.supplierSnapshot?.city,
        inv.supplierSnapshot?.zip,
        inv.supplierSnapshot?.country,
      ),
    ) +
    `</AccountingSupplierParty>` +
    `<AccountingCustomerParty>` +
    partyXml(
      inv.clientSnapshot?.name,
      inv.clientSnapshot?.ico,
      inv.clientSnapshot?.dic,
      addressXml(
        inv.clientSnapshot?.street,
        inv.clientSnapshot?.city,
        inv.clientSnapshot?.zip,
        inv.clientSnapshot?.country,
      ),
    ) +
    `</AccountingCustomerParty>` +
    `<InvoiceLines>${linesXml}</InvoiceLines>` +
    `<TaxTotal>${subTotalsXml}<TaxAmount>${n2(inv.vatTotal)}</TaxAmount></TaxTotal>` +
    `<LegalMonetaryTotal>` +
    `<TaxExclusiveAmount>${n2(inv.subtotal)}</TaxExclusiveAmount>` +
    `<TaxInclusiveAmount>${n2(inv.total)}</TaxInclusiveAmount>` +
    `<AlreadyClaimedTaxExclusiveAmount>0.00</AlreadyClaimedTaxExclusiveAmount>` +
    `<AlreadyClaimedTaxInclusiveAmount>0.00</AlreadyClaimedTaxInclusiveAmount>` +
    `<DifferenceTaxExclusiveAmount>${n2(inv.subtotal)}</DifferenceTaxExclusiveAmount>` +
    `<DifferenceTaxInclusiveAmount>${n2(inv.total)}</DifferenceTaxInclusiveAmount>` +
    `<PaidDepositsAmount>0.00</PaidDepositsAmount>` +
    `<PayableAmount>${n2(inv.total)}</PayableAmount>` +
    `</LegalMonetaryTotal>` +
    `</Invoice>`
  )
}

const STATUS_CS: Record<InvoiceStatus, string> = {
  draft: 'Koncept',
  issued: 'Vystaveno',
  paid: 'Zaplaceno',
  overdue: 'Po splatnosti',
  cancelled: 'Stornováno',
}

/** Číslo s desetinnou čárkou (české Excel CSV). */
function csvNum(n: number): string {
  return n2(n).replace('.', ',')
}

/** Obalí pole do uvozovek, jen když obsahuje oddělovač/uvozovku/nový řádek. */
function csvCell(v: string): string {
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/**
 * Přehled faktur jako CSV pro účetní. Oddělovač `;` a desetinná čárka = konvence
 * českého Excelu. BOM se přidává až při stažení (downloadInvoicesCsv).
 */
export function invoicesToCsv(invoices: Invoice[]): string {
  const header = [
    'Číslo',
    'Vystaveno',
    'DUZP',
    'Splatnost',
    'Odběratel',
    'IČO',
    'DIČ',
    'Základ',
    'DPH',
    'Celkem',
    'Měna',
    'Stav',
    'VS',
    'Uhrazeno',
  ]
  const rows = invoices.map((inv) =>
    [
      inv.invoiceNumber || '',
      inv.issueDate || '',
      inv.taxableDate || '',
      inv.dueDate || '',
      inv.clientSnapshot?.name || '',
      inv.clientSnapshot?.ico || '',
      inv.clientSnapshot?.dic || '',
      csvNum(inv.subtotal),
      csvNum(inv.vatTotal),
      csvNum(inv.total),
      inv.currency || 'CZK',
      STATUS_CS[inv.status] ?? inv.status,
      inv.variableSymbol || '',
      inv.paidAt ? inv.paidAt.slice(0, 10) : '',
    ]
      .map((c) => csvCell(String(c)))
      .join(';'),
  )
  return [header.join(';'), ...rows].join('\r\n')
}

/** Bezpečný název souboru z čísla faktury. */
export function isdocFilename(inv: Invoice): string {
  const base = (inv.invoiceNumber || inv.id).replace(/[^\w-]+/g, '_')
  return `${base}.isdoc`
}

// --- Stažení v prohlížeči (mimo unit testy) ---

function triggerDownload(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadIsdoc(inv: Invoice): void {
  triggerDownload(isdocFilename(inv), invoiceToIsdoc(inv), 'application/xml;charset=utf-8')
}

export function downloadInvoicesCsv(invoices: Invoice[], filename: string): void {
  // BOM (﻿) → Excel správně načte české znaky.
  triggerDownload(filename, '﻿' + invoicesToCsv(invoices), 'text/csv;charset=utf-8')
}
