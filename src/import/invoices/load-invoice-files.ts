import { unzipArchive, looksLikeZip, type ArchiveEntry } from '../parse/zip'
import { parseFakturoidInvoices } from './fakturoid-invoices'
import { isIsdocXml, parseIsdocInvoices } from './isdoc-invoices'
import { isScannedPdf, parsePdfInvoices, type PdfInvoiceSource } from './pdf-invoices'
import type { ParsedImportedInvoice } from './types'

/**
 * Načtení faktur z čehokoli, co zákazník přinese z jiného programu.
 *
 * Podporované vstupy:
 *  - **ISDOC / ISDOCX** — český standard e-fakturace, umí ho Pohoda, Money,
 *    ABRA, Helios i iDoklad. Strukturovaná data, nic se nehádá.
 *  - **Fakturoid XML** — dosavadní cesta, beze změny.
 *  - **PDF** — vytěžení z textové vrstvy pro případ, že zákazník nemá nic lepšího.
 *  - **ZIP** — dávka čehokoli z výše uvedeného, včetně podsložek.
 */

/** Chyba u jednoho souboru — zbytek dávky kvůli ní nesmí spadnout. */
export interface FileLoadError {
  fileName: string
  message: string
}

export interface LoadResult {
  invoices: ParsedImportedInvoice[]
  errors: FileLoadError[]
  /** Kolik souborů se vůbec zpracovávalo (po rozbalení archivů). */
  processedFiles: number
}

const SUPPORTED = /\.(zip|pdf|isdoc|isdocx|xml)$/i

function baseName(path: string): string {
  return path.split('/').pop() || path
}

/** Rozbalí archiv; ISDOCX je ZIP, jehož obsahem je ISDOC. */
async function expand(entry: ArchiveEntry, depth: number): Promise<ArchiveEntry[]> {
  if (depth > 2) return [] // pojistka proti vnořeným archivům bez konce
  const nested = await unzipArchive(entry.bytes)
  const out: ArchiveEntry[] = []
  for (const child of nested) {
    if (looksLikeZip(child.bytes) && /\.(zip|isdocx)$/i.test(child.name)) {
      out.push(...(await expand(child, depth + 1)))
    } else {
      out.push(child)
    }
  }
  return out
}

/** Rozloží nahrané soubory na plochý seznam — archivy se rozbalí. */
async function flatten(files: File[], errors: FileLoadError[]): Promise<ArchiveEntry[]> {
  const out: ArchiveEntry[] = []
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const isArchive = /\.(zip|isdocx)$/i.test(file.name) || looksLikeZip(bytes)
    if (!isArchive) {
      out.push({ name: file.name, bytes })
      continue
    }
    try {
      const entries = await expand({ name: file.name, bytes }, 0)
      if (!entries.length) {
        errors.push({ fileName: file.name, message: 'Archiv je prázdný.' })
      }
      out.push(...entries)
    } catch {
      errors.push({ fileName: file.name, message: 'Archiv se nepodařilo rozbalit.' })
    }
  }
  return out
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes)
}

/**
 * Načte faktury ze zadaných souborů.
 *
 * `fallbackNumber` dodá číslo z firemní řady dokladům, kde ho v originálu
 * nenajdeme (týká se jen PDF — strukturované formáty číslo vždy nesou).
 */
export async function loadInvoiceFiles(
  files: File[],
  fallbackNumber: () => string,
): Promise<LoadResult> {
  const errors: FileLoadError[] = []
  const entries = await flatten(files, errors)
  const relevant = entries.filter((e) => SUPPORTED.test(e.name))

  if (!entries.length && !errors.length) {
    throw new Error('Nevybrali jste žádný soubor.')
  }
  if (!relevant.length) {
    throw new Error('Ve vybraných souborech není žádná faktura (čekáme PDF, ISDOC, XML nebo ZIP).')
  }

  const invoices: ParsedImportedInvoice[] = []
  // PDF se sbírají a parsují až společně — dodavatele poznáme podle toho,
  // že se napříč dávkou opakuje, což z jednoho souboru nejde.
  const pdfSources: PdfInvoiceSource[] = []

  // pdf.js váží stovky kB. Načte se až u prvního PDF, aby import ISDOC/XML
  // nestahoval čtečku, kterou vůbec nepoužije.
  let readPdf: ((bytes: Uint8Array) => Promise<string>) | null = null

  for (const entry of relevant) {
    const name = baseName(entry.name)
    try {
      if (/\.pdf$/i.test(entry.name)) {
        readPdf ??= (await import('../parse/pdf')).extractPdfText
        const text = await readPdf(entry.bytes)
        if (isScannedPdf(text)) {
          errors.push({
            fileName: name,
            message: 'PDF je nejspíš sken bez textu — přečíst ho neumíme, zadejte fakturu ručně.',
          })
          continue
        }
        pdfSources.push({ fileName: name, text })
        continue
      }

      const xml = decodeText(entry.bytes)
      if (isIsdocXml(xml)) {
        invoices.push(...parseIsdocInvoices(xml, name))
      } else {
        invoices.push(
          ...parseFakturoidInvoices(xml).map((p) => ({
            ...p,
            source: 'fakturoid-xml' as const,
            sourceFile: name,
          })),
        )
      }
    } catch (e) {
      errors.push({ fileName: name, message: e instanceof Error ? e.message : 'Neznámá chyba.' })
    }
  }

  if (pdfSources.length) {
    invoices.push(...parsePdfInvoices(pdfSources, fallbackNumber))
  }

  return { invoices, errors, processedFiles: relevant.length }
}
