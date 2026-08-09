import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { itemsToLines } from './pdf-lines'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * Vytáhne textovou vrstvu z PDF. Vrací prázdný řetězec u naskenovaných faktur
 * (obrázek bez textu) — volající to musí poznat a nabídnout ruční doplnění,
 * protože OCR aplikace neumí.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // pdf.js si buffer přebírá do workeru; kopie brání „detached ArrayBuffer“
  // při opakovaném čtení téhož souboru (druhý pokus by jinak spadl).
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes) })
  const doc = await task.promise
  try {
    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const items = content.items
        .filter((it): it is TextItem => 'str' in it)
        .map((it) => ({
          str: it.str,
          x: it.transform[4],
          y: it.transform[5],
          width: it.width,
          height: it.height,
        }))
      pages.push(itemsToLines(items).join('\n'))
      page.cleanup()
    }
    return pages.join('\n').trim()
  } finally {
    // Uvolní worker i buffer — bez toho by dávka desítek faktur držela paměť.
    await task.destroy()
  }
}
