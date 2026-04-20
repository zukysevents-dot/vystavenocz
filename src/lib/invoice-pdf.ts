/**
 * Generování PDF z DOM uzlu faktury pomocí html2canvas + jsPDF.
 */
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

/**
 * Vyrenderuje fakturu z DOM uzlu do PDF a vrátí jsPDF instanci.
 */
async function renderInvoicePdf(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error("Invoice element not found");

  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 0;
  let heightLeft = imgHeight;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

export async function downloadInvoicePdf(elementId: string, filename: string) {
  const pdf = await renderInvoicePdf(elementId);
  pdf.save(filename);
}

/**
 * Vyrenderuje fakturu jako Blob PDF — pro upload do Storage či odeslání e-mailem.
 */
export async function renderInvoicePdfBlob(elementId: string): Promise<Blob> {
  const pdf = await renderInvoicePdf(elementId);
  return pdf.output("blob");
}
