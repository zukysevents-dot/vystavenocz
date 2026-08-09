import type { InvoiceInput } from '@/composables/useInvoices'

/** Formát, ze kterého faktura přišla — kvůli hlášení a míře důvěry v UI. */
export type InvoiceImportSource = 'fakturoid-xml' | 'isdoc' | 'pdf'

export const SOURCE_LABEL: Record<InvoiceImportSource, string> = {
  'fakturoid-xml': 'Fakturoid XML',
  isdoc: 'ISDOC',
  pdf: 'PDF',
}

/**
 * Naparsovaná faktura připravená k importu — společný tvar pro všechny zdroje
 * (Fakturoid XML, ISDOC, PDF), aby náhled i commit měly jeden kód.
 */
export interface ParsedImportedInvoice {
  input: InvoiceInput
  vatPayer: boolean
  /** Celková částka podle originálu — proti ní se kontroluje součet řádků. */
  previewTotal: number
  warnings: string[]
  source: InvoiceImportSource
  /** Název zdrojového souboru — v dávce ze ZIPu jinak nejde dohledat, co je špatně. */
  sourceFile?: string
  /**
   * Jen u PDF: pole se vytěžovala z textu, ne ze strukturovaných dat.
   * `true` = něco podstatného chybí nebo nesedí → uživatel to má zkontrolovat.
   */
  needsReview?: boolean
}
