/**
 * Klientské generování PDF faktury (bez serveru).
 * Zachytí vyrenderovaný <InvoiceDocument> (HTML) přes html2canvas-pro do bitmapy
 * a vloží ji do A4 PDF (jsPDF). Rasterizace = věrná podoba náhledu + plná česká
 * diakritika z fontu. Knihovny se načítají líně až při exportu.
 *
 * Bez textové vrstvy je PDF čistě obrázek — prohlížeče jako Chrome takový soubor
 * považují za naskenovaný dokument a nabídnou/spustí vlastní OCR „vylepšení",
 * které při zobrazení zahodí vizuální rozvržení (tabulky, sloupce, rámečky) a
 * ukáže jen přetečený prostý text. Proto pod obrázek přidáváme neviditelnou
 * textovou vrstvu (`renderingMode: 'invisible'`) se skutečným obsahem faktury —
 * PDF pak má reálný vyhledatelný text a prohlížeč OCR přepis nespouští, vizuál
 * zůstává beze změny (text je neviditelný).
 */

/** Vyrenderuje element faktury do jsPDF dokumentu (A4, případně víc stran). */
async function renderToPdf(element: HTMLElement) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  })
  // JPEG (ne PNG) — bílá faktura se komprimuje na zlomek velikosti, text zůstává čitelný.
  const imgData = canvas.toDataURL('image/jpeg', 0.92)

  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (canvas.height * pageW) / canvas.width

  let heightLeft = imgH
  let position = 0
  pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH)
  heightLeft -= pageH
  // Delší faktura → rozdělíme na další A4 stránky (tolerance 1 mm proti prázdné stránce z zaokrouhlení).
  while (heightLeft > 1) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH)
    heightLeft -= pageH
  }

  addInvisibleTextLayer(pdf, element, pageW, pageH)

  return pdf
}

/**
 * Přidá přes celý obrázek faktury neviditelnou textovou vrstvu se skutečným
 * obsahem (podle textových uzlů zdrojového elementu). Pozice jsou jen přibližné
 * (z `Range.getBoundingClientRect()`) — u neviditelného textu nevadí, jde jen
 * o to, aby PDF obsahovalo reálný text, ne aby se dal vizuálně 1:1 vybrat.
 */
function addInvisibleTextLayer(
  pdf: import('jspdf').jsPDF,
  element: HTMLElement,
  pageW: number,
  pageH: number,
): void {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0) return
  const mmPerPx = pageW / rect.width
  const totalPages = pdf.getNumberOfPages()
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let node: Node | null = walker.nextNode()
  while (node) {
    const text = node.textContent?.trim()
    if (!text) {
      node = walker.nextNode()
      continue
    }
    range.selectNodeContents(node)
    const r = range.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      const xMm = (r.left - rect.left) * mmPerPx
      const yMm = (r.top - rect.top) * mmPerPx
      const fontSizeMm = r.height * mmPerPx
      const page = Math.min(Math.floor(yMm / pageH), totalPages - 1)
      pdf.setPage(page + 1)
      pdf.setFontSize(fontSizeMm * 2.83465) // mm → pt (1 mm = 2.83465 pt)
      pdf.text(text, xMm, yMm - page * pageH + fontSizeMm * 0.8, {
        renderingMode: 'invisible',
        maxWidth: Math.max(pageW - xMm, 1),
      })
    }
    node = walker.nextNode()
  }
}

/** Stáhne fakturu jako PDF soubor. */
export async function downloadInvoicePdf(element: HTMLElement, filename: string): Promise<void> {
  const pdf = await renderToPdf(element)
  pdf.save(filename)
}

/** Vrátí fakturu jako PDF Blob (pro pozdější odeslání e-mailem — F6-49). */
export async function renderInvoicePdfBlob(element: HTMLElement): Promise<Blob> {
  const pdf = await renderToPdf(element)
  return pdf.output('blob')
}
