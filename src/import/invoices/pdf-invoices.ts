import type { InvoiceInput } from '@/composables/useInvoices'
import { calcLine, calcTotals, round2 } from '@/lib/invoice'
import type { InvoiceItem, VatRate } from '@/lib/types'
import {
  extractInvoiceFields,
  isEmptyParty,
  type ExtractedInvoiceFields,
} from './pdf-invoice-fields'
import { toVatRate } from './shared'
import type { ParsedImportedInvoice } from './types'

/**
 * Složení faktury z PDF.
 *
 * Vědomé omezení: jednotlivé fakturované řádky z PDF NEROZPADÁVÁME. Tabulku
 * položek kreslí každý program jinak a špatně rozpadnutý řádek by tiše rozhodil
 * základ daně. Místo toho vzniká souhrnná položka podle rekapitulace DPH —
 * součty pak sedí na originál, což je to, na čem u historického dokladu záleží.
 */

/**
 * Přiřadí strany dokladu napříč dávkou.
 *
 * Když na faktuře chybí popisky „Dodavatel/Odběratel", nejde z jednoho souboru
 * poznat, které IČO je čí. V dávce to ale poznat jde: dodavatel je pořád tentýž,
 * odběratelé se mění. Nejčastější IČO je tedy dodavatel — a to i tehdy, když
 * na jedné faktuře stojí až pod odběratelem.
 */
function resolveParties(batch: ExtractedInvoiceFields[]): void {
  const counts = new Map<string, number>()
  for (const f of batch) {
    for (const p of f.unassignedParties) {
      if (p.ico) counts.set(p.ico, (counts.get(p.ico) ?? 0) + 1)
    }
  }
  const supplierIco = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])[0]?.[0]

  for (const f of batch) {
    if (!f.unassignedParties.length) continue
    // Stranu, která už je přiřazená jako odběratel, nesmíme vzít jako dodavatele.
    const takenIco = [f.supplier.ico, f.customer.ico].filter(Boolean)
    const free = f.unassignedParties.filter((p) => !p.ico || !takenIco.includes(p.ico))

    if (isEmptyParty(f.supplier)) {
      const supplier = supplierIco
        ? (free.find((p) => p.ico === supplierIco) ?? null)
        : (free[0] ?? null)
      if (supplier) {
        f.supplier = supplier
        takenIco.push(supplier.ico)
      }
    }
    if (isEmptyParty(f.customer)) {
      const customer = free.find((p) => p.ico && !takenIco.includes(p.ico))
      if (customer) f.customer = customer
    }
    f.unassignedParties = []
  }
}

/** Sazba odvozená z poměru daně k základu (21,0 % → 21). */
function deriveRate(base: number, vat: number): VatRate {
  if (base <= 0) return 0
  return toVatRate(Math.round((vat / base) * 100))
}

/**
 * Položky dokladu. Preferuje rekapitulaci DPH (drží víc sazeb), jinak skládá
 * jednu souhrnnou položku ze základu a daně.
 */
function buildItems(
  f: ExtractedInvoiceFields,
  vatPayer: boolean,
  label: string,
): { items: InvoiceItem[]; warnings: string[] } {
  const warnings: string[] = []
  const line = (base: number, vatRate: VatRate, suffix = ''): InvoiceItem => ({
    id: `pdf-${vatRate}${suffix}`,
    description: suffix ? `${label} — sazba ${vatRate} %` : label,
    quantity: 1,
    unit: 'ks',
    unitPrice: round2(base),
    vatRate,
    ...calcLine({ quantity: 1, unitPrice: round2(base), vatRate }, vatPayer),
  })

  if (vatPayer && f.vatRows.length) {
    const items = f.vatRows.map((r, i) =>
      line(r.base, toVatRate(r.rate), f.vatRows.length > 1 ? `-${i}` : ''),
    )
    const unsupported = f.vatRows.filter((r) => ![0, 12, 21].includes(r.rate))
    for (const r of unsupported) {
      warnings.push(`Sazba ${r.rate} % už se v ČR nepoužívá — řádek se importuje jako 0 %.`)
    }
    return { items, warnings }
  }

  if (!vatPayer) {
    const base = f.total ?? f.subtotal ?? 0
    return { items: [line(base, 0)], warnings }
  }

  if (f.subtotal !== null && f.vatTotal !== null) {
    return { items: [line(f.subtotal, deriveRate(f.subtotal, f.vatTotal))], warnings }
  }

  // Zbývá jen celková částka — základ ani sazbu neznáme. Doklad se naimportuje
  // s nulovou daní a označí k ruční kontrole; tiché „nejspíš 21 %" by bylo horší.
  warnings.push('Z PDF se nepodařilo přečíst rozpad DPH — zkontrolujte základ a daň.')
  return { items: [line(f.total ?? 0, 0)], warnings }
}

function toParsed(
  f: ExtractedInvoiceFields,
  sourceFile: string,
  fallbackNumber: () => string,
): ParsedImportedInvoice {
  const warnings: string[] = []
  // Plátce poznáme podle DIČ dodavatele nebo podle toho, že doklad vyčísluje daň.
  const vatPayer = !!f.supplier.dic || f.vatRows.length > 0 || f.vatTotal !== null || f.vatHint

  const number = f.invoiceNumber ?? f.variableSymbol
  if (!number) warnings.push('V PDF se nepodařilo najít číslo faktury — přidělí se nové z řady.')
  if (!f.issueDate) warnings.push('V PDF se nepodařilo najít datum vystavení.')
  if (f.total === null) warnings.push('V PDF se nepodařilo najít celkovou částku.')
  if (!f.customer.name && !f.customer.ico)
    warnings.push('V PDF se nepodařilo rozpoznat odběratele.')

  const label = `Fakturováno dle dokladu ${number ?? sourceFile}`
  const built = buildItems(f, vatPayer, label)
  warnings.push(...built.warnings)

  const issueDate = f.issueDate ?? ''
  const input: InvoiceInput = {
    documentType: 'invoice',
    status: 'issued',
    invoiceNumber: number ?? fallbackNumber(),
    clientId: null,
    clientSnapshot: {
      name: f.customer.name ?? '',
      ico: f.customer.ico,
      dic: f.customer.dic,
      street: f.customer.street,
      city: f.customer.city,
      zip: f.customer.zip,
      country: 'CZ',
      email: null,
    },
    supplierSnapshot: {
      companyName: f.supplier.name,
      ico: f.supplier.ico,
      dic: f.supplier.dic,
      vatMode: vatPayer ? 'payer' : 'non_payer',
      street: f.supplier.street,
      city: f.supplier.city,
      zip: f.supplier.zip,
      country: 'CZ',
      bankAccount: null,
      iban: null,
      swift: null,
    },
    items: built.items,
    currency: f.currency,
    issueDate,
    dueDate: f.dueDate ?? '',
    taxableDate: f.taxableDate ?? issueDate,
    paidAt: null,
    variableSymbol: f.variableSymbol,
    constantSymbol: null,
    specificSymbol: null,
    paymentMethod: 'bank',
    notes: `Importováno z PDF (${sourceFile}).`,
  }

  // Kontrola proti originálu — u vytěžování je to jediná skutečná pojistka.
  const previewTotal = f.total ?? 0
  const computedTotal = round2(calcTotals(built.items, vatPayer).total)
  if (previewTotal > 0 && Math.abs(computedTotal - round2(previewTotal)) > 0.5) {
    warnings.push(
      `Vypočtený součet ${computedTotal} Kč nesouhlasí s částkou ${previewTotal} Kč z PDF — zkontrolujte doklad.`,
    )
  }

  return {
    input,
    vatPayer,
    previewTotal: previewTotal || computedTotal,
    warnings,
    source: 'pdf',
    sourceFile,
    needsReview: warnings.length > 0,
  }
}

/** Jedno PDF = jeden text. Dávka se předává celá kvůli rozpoznání dodavatele. */
export interface PdfInvoiceSource {
  fileName: string
  text: string
}

/**
 * Naparsuje dávku PDF faktur. `fallbackNumber` dodá číslo z firemní řady tam,
 * kde ho v dokladu nenajdeme — volá se jen při skutečné potřebě, aby se řada
 * nezbytečně neposouvala.
 */
export function parsePdfInvoices(
  sources: PdfInvoiceSource[],
  fallbackNumber: () => string,
): ParsedImportedInvoice[] {
  const extracted = sources.map((s) => extractInvoiceFields(s.text))
  resolveParties(extracted)
  return extracted.map((f, i) => toParsed(f, sources[i].fileName, fallbackNumber))
}

/** PDF bez textové vrstvy (sken) — aplikace neumí OCR, ať to uživatel ví hned. */
export function isScannedPdf(text: string): boolean {
  return text.replace(/\s/g, '').length < 40
}
