/**
 * Generování faktur jako vektorové PDF přes @react-pdf/renderer.
 * Plná česká diakritika (Inter latin-ext), selectovatelný text, malé soubory.
 */
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { InvoicePdfDocument, type InvoicePdfProps } from "@/lib/pdf/InvoicePdfDoc";
import {
  buildSpayd,
  calcTotals,
  czAccountToIban,
  variableSymbolFromInvoiceNumber,
} from "@/lib/invoice";

/**
 * Vrátí data pro <InvoicePdfDocument /> obohacená o QR platbu (pokud má smysl).
 */
async function enrichWithQr(props: InvoicePdfProps): Promise<InvoicePdfProps> {
  if (props.qrDataUrl !== undefined) return props; // volající už dodal
  const { supplier, items, currency = "CZK", invoiceNumber, variableSymbol, paymentMethod = "bank_transfer" } = props;
  if (paymentMethod !== "bank_transfer") return { ...props, qrDataUrl: null };

  const vatPayer = supplier.vat_mode === "payer";
  const totals = calcTotals(items, vatPayer);
  const iban =
    supplier.iban?.replace(/\s/g, "") ||
    (supplier.bank_account ? czAccountToIban(supplier.bank_account) : null);

  if (!iban || totals.total <= 0) return { ...props, qrDataUrl: null };

  const vs = variableSymbol || variableSymbolFromInvoiceNumber(invoiceNumber);
  const spayd = buildSpayd({
    iban,
    amount: totals.total,
    currency,
    variableSymbol: vs,
    message: invoiceNumber,
    swift: supplier.swift,
  });
  try {
    const qrDataUrl = await QRCode.toDataURL(spayd, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: "M",
    });
    return { ...props, qrDataUrl };
  } catch {
    return { ...props, qrDataUrl: null };
  }
}

/**
 * Vyrenderuje fakturu jako Blob PDF — pro upload do Storage či odeslání e-mailem.
 */
export async function renderInvoicePdfBlob(props: InvoicePdfProps): Promise<Blob> {
  const enriched = await enrichWithQr(props);
  const blob = await pdf(<InvoicePdfDocument {...enriched} />).toBlob();
  return blob;
}

/**
 * Stáhne PDF v prohlížeči pod daným názvem.
 */
export async function downloadInvoicePdf(props: InvoicePdfProps, filename: string): Promise<void> {
  const blob = await renderInvoicePdfBlob(props);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Necháme URL chvilku platnou kvůli download zpracování
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
