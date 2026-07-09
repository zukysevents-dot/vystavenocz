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

  // DPH se odvozuje ze sazby řádku, ne ze samostatného lineVat — tím je ISDOC vnitřně
  // konzistentní i pro importované doklady, kde by neplátce mohl mít nenulové lineVat.
  const lines = inv.items.map((it) => {
    const pct = payer ? it.vatRate : 0
    const lineVat = payer ? it.lineVat : 0
    const lineIncl = it.lineSubtotal + lineVat
    return { it, pct, lineVat, lineIncl }
  })

  const linesXml = lines
    .map(({ it, pct, lineVat, lineIncl }, i) => {
      return (
        `<InvoiceLine>` +
        `<ID>${i + 1}</ID>` +
        `<InvoicedQuantity unitCode="${esc(it.unit || 'ks')}">${n2(it.quantity)}</InvoicedQuantity>` +
        `<LineExtensionAmount>${n2(it.lineSubtotal)}</LineExtensionAmount>` +
        `<LineExtensionAmountTaxInclusive>${n2(lineIncl)}</LineExtensionAmountTaxInclusive>` +
        `<LineExtensionTaxAmount>${n2(lineVat)}</LineExtensionTaxAmount>` +
        `<UnitPrice>${n2(it.unitPrice)}</UnitPrice>` +
        `<UnitPriceTaxInclusive>${n2(it.unitPrice * (1 + pct / 100))}</UnitPriceTaxInclusive>` +
        `<ClassifiedTaxCategory><Percent>${n2(pct)}</Percent><VATCalculationMethod>${method}</VATCalculationMethod><VATApplicable>${vatApplicable}</VATApplicable></ClassifiedTaxCategory>` +
        `<Item><Description>${esc(it.description)}</Description></Item>` +
        `</InvoiceLine>`
      )
    })
    .join('')

  // Skupiny DPH podle sazby + součtové totály — vše ze stejných (sazbou odvozených)
  // hodnot, aby header i LegalMonetaryTotal seděly na řádky bez ohledu na zdroj dat.
  const groups = new Map<number, { base: number; vat: number; incl: number }>()
  let totalBase = 0
  let totalVat = 0
  let totalIncl = 0
  for (const { it, pct, lineVat, lineIncl } of lines) {
    const g = groups.get(pct) ?? { base: 0, vat: 0, incl: 0 }
    g.base += it.lineSubtotal
    g.vat += lineVat
    g.incl += lineIncl
    groups.set(pct, g)
    totalBase += it.lineSubtotal
    totalVat += lineVat
    totalIncl += lineIncl
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
    `<TaxTotal>${subTotalsXml}<TaxAmount>${n2(totalVat)}</TaxAmount></TaxTotal>` +
    `<LegalMonetaryTotal>` +
    `<TaxExclusiveAmount>${n2(totalBase)}</TaxExclusiveAmount>` +
    `<TaxInclusiveAmount>${n2(totalIncl)}</TaxInclusiveAmount>` +
    `<AlreadyClaimedTaxExclusiveAmount>0.00</AlreadyClaimedTaxExclusiveAmount>` +
    `<AlreadyClaimedTaxInclusiveAmount>0.00</AlreadyClaimedTaxInclusiveAmount>` +
    `<DifferenceTaxExclusiveAmount>${n2(totalBase)}</DifferenceTaxExclusiveAmount>` +
    `<DifferenceTaxInclusiveAmount>${n2(totalIncl)}</DifferenceTaxInclusiveAmount>` +
    `<PaidDepositsAmount>0.00</PaidDepositsAmount>` +
    `<PayableAmount>${n2(totalIncl)}</PayableAmount>` +
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

/**
 * ISDOC nabízíme jen pro CZK faktury s aspoň jednou položkou:
 *  - cizí měna by vyžadovala přepočet na CZK kurzem ČNB k DUZP, který frontend nemá,
 *  - ISDOC schéma vyžaduje aspoň jeden řádek (prázdný doklad je nevalidní).
 * Radši nenabízet než exportovat špatně.
 */
export function canExportIsdoc(inv: Invoice): boolean {
  // Proforma (zálohová) není daňový doklad → ISDOC se pro ni nenabízí.
  return (
    inv.documentType !== 'proforma' &&
    (!inv.currency || inv.currency === 'CZK') &&
    inv.items.length > 0
  )
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
  if (!canExportIsdoc(inv)) return // cizí měna se nenabízí (viz canExportIsdoc)
  triggerDownload(isdocFilename(inv), invoiceToIsdoc(inv), 'application/xml;charset=utf-8')
}

export function downloadInvoicesCsv(invoices: Invoice[], filename: string): void {
  // BOM (﻿) → Excel správně načte české znaky.
  triggerDownload(filename, '﻿' + invoicesToCsv(invoices), 'text/csv;charset=utf-8')
}
