/**
 * Pomocník: ze záznamu faktury (DB) sestaví props pro <InvoicePdfDocument />.
 */
import type { InvoicePdfProps } from "@/lib/pdf/InvoicePdfDoc";
import type { ClientSnapshot, InvoiceItemDraft, SupplierSnapshot } from "@/lib/invoice";

type DbItem = {
  id: string;
  description: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  vat_rate: number | string;
};

type DbInvoice = {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  taxable_date: string;
  variable_symbol: string | null;
  constant_symbol?: string | null;
  specific_symbol?: string | null;
  notes: string | null;
  payment_method: string;
  currency: string;
  status: string;
  document_type: "invoice" | "credit_note";
  supplier_snapshot: unknown;
  client_snapshot: unknown;
};

export function invoiceToPdfProps(
  inv: DbInvoice,
  items: DbItem[],
  originalInvoiceNumber: string | null = null,
): InvoicePdfProps {
  return {
    supplier: inv.supplier_snapshot as SupplierSnapshot,
    client: inv.client_snapshot as ClientSnapshot,
    items: items.map(
      (i): InvoiceItemDraft => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unit_price: Number(i.unit_price),
        vat_rate: Number(i.vat_rate) as 0 | 12 | 21,
      }),
    ),
    invoiceNumber: inv.invoice_number,
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    taxableDate: inv.taxable_date,
    variableSymbol: inv.variable_symbol || undefined,
    constantSymbol: inv.constant_symbol ?? null,
    specificSymbol: inv.specific_symbol ?? null,
    notes: inv.notes || undefined,
    paymentMethod: inv.payment_method,
    currency: inv.currency,
    cancelled: inv.status === "cancelled",
    documentType: inv.document_type,
    originalInvoiceNumber,
  };
}