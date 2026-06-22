/**
 * Klientské generování PDF faktury (bez serveru).
 * Zachytí vyrenderovaný <InvoiceDocument> (HTML) přes html2canvas-pro do bitmapy
 * a vloží ji do A4 PDF (jsPDF). Rasterizace = věrná podoba náhledu + plná česká
 * diakritika z fontu. Knihovny se načítají líně až při exportu.
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
  return pdf
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
