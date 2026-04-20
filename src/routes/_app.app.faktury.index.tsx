import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus, FileText, Search, MoreVertical, Pencil, Trash2,
  Download, CheckCircle2, Send, Loader2, Mail, Ban, FileMinus,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCZK, formatDate } from "@/lib/invoice";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { SendInvoiceDialog, type SendInvoiceContext } from "@/components/app/SendInvoiceDialog";

export const Route = createFileRoute("/_app/app/faktury/")({
  head: () => ({ meta: [{ title: "Faktury — Fakturio" }] }),
  component: InvoicesListPage,
});

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  total: number;
  currency: string;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  client_snapshot: { name?: string };
  variable_symbol: string | null;
  payment_method: string;
  notes: string | null;
  taxable_date: string;
  supplier_snapshot: Record<string, unknown>;
  document_type: "invoice" | "credit_note";
  original_invoice_id: string | null;
};

const statusLabels: Record<InvoiceRow["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Koncept", variant: "secondary" },
  issued: { label: "Vystaveno", variant: "default" },
  paid: { label: "Zaplaceno", variant: "outline" },
  overdue: { label: "Po splatnosti", variant: "destructive" },
  cancelled: { label: "Stornováno", variant: "secondary" },
};

function InvoicesListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [pdfPayload, setPdfPayload] = useState<null | {
    invoice: InvoiceRow;
    items: Array<{
      id: string; description: string; quantity: number; unit: string;
      unit_price: number; vat_rate: number;
    }>;
    originalInvoiceNumber?: string | null;
  }>(null);
  const [sendCtx, setSendCtx] = useState<SendInvoiceContext | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [preparingSendId, setPreparingSendId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Nepodařilo se načíst faktury.");
    } else {
      // auto-mark overdue
      const today = new Date().toISOString().slice(0, 10);
      const updated = (data as InvoiceRow[]).map((inv) =>
        inv.status === "issued" && inv.due_date < today ? { ...inv, status: "overdue" as const } : inv,
      );
      setInvoices(updated);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // U dobropisu dotáhneme číslo původní faktury — chceme ho zobrazit v PDF
  // ("k faktuře FA-…"). Pro běžné faktury vrátíme null bez síťového volání.
  const fetchOriginalNumber = async (inv: InvoiceRow): Promise<string | null> => {
    if (inv.document_type !== "credit_note" || !inv.original_invoice_id) return null;
    const { data } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("id", inv.original_invoice_id)
      .maybeSingle();
    return data?.invoice_number ?? null;
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.client_snapshot?.name || "").toLowerCase().includes(q)
    );
  });

  const markPaid = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("Nepodařilo se aktualizovat.");
    toast.success("Označeno jako zaplaceno.");
    load();
  };

  const reissue = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "issued" })
      .eq("id", id);
    if (error) return toast.error("Nepodařilo se aktualizovat.");
    toast.success("Faktura vystavena.");
    load();
  };

  const remove = async () => {
    if (!deletingId) return;
    // Safety: only drafts may be hard-deleted (Czech accounting law requires
    // an audit trail for issued documents). The dropdown already enforces
    // this, but we double-check here in case state drifts.
    const target = invoices.find((i) => i.id === deletingId);
    if (target && target.status !== "draft") {
      toast.error("Smazat lze jen koncepty. Vystavené faktury stornujte.");
      setDeletingId(null);
      return;
    }
    await supabase.from("invoice_items").delete().eq("invoice_id", deletingId);
    const { error } = await supabase.from("invoices").delete().eq("id", deletingId);
    if (error) return toast.error("Nepodařilo se smazat.");
    toast.success("Faktura smazána.");
    setDeletingId(null);
    load();
  };

  const cancelInvoice = async () => {
    if (!cancellingId) return;
    const { error } = await supabase
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("id", cancellingId);
    if (error) {
      toast.error("Nepodařilo se stornovat fakturu.");
      return;
    }
    toast.success("Faktura stornována.");
    setCancellingId(null);
    load();
  };

  const exportPdf = async (inv: InvoiceRow) => {
    setPdfLoadingId(inv.id);
    try {
      const { data: items, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("position");
      if (error) throw error;
      const originalInvoiceNumber = await fetchOriginalNumber(inv);
      setPdfPayload({
        invoice: inv,
        items: items as NonNullable<typeof pdfPayload>["items"],
        originalInvoiceNumber,
      });
      // wait for next paint
      await new Promise((r) => setTimeout(r, 200));
      await downloadInvoicePdf("invoice-document", `${inv.invoice_number}.pdf`);
      toast.success("PDF staženo.");
    } catch (e) {
      console.error(e);
      toast.error("Nepodařilo se vygenerovat PDF.");
    } finally {
      setPdfPayload(null);
      setPdfLoadingId(null);
    }
  };

  const openSend = async (inv: InvoiceRow) => {
    setPreparingSendId(inv.id);
    try {
      const { data: items, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id)
        .order("position");
      if (error) throw error;
      const originalInvoiceNumber = await fetchOriginalNumber(inv);
      setPdfPayload({
        invoice: inv,
        items: items as NonNullable<typeof pdfPayload>["items"],
        originalInvoiceNumber,
      });
      // počkej na render
      await new Promise((r) => setTimeout(r, 200));
      const supplier = (inv.supplier_snapshot as { company_name?: string; full_name?: string }) || {};
      const client = inv.client_snapshot as { name?: string; email?: string };
      setSendCtx({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        recipientEmail: client?.email ?? null,
        recipientName: client?.name ?? null,
        supplierName: supplier.company_name ?? supplier.full_name ?? null,
        total: Number(inv.total),
        currency: inv.currency,
        dueDate: inv.due_date,
        pdfElementId: "invoice-document",
      });
      setSendOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Nepodařilo se připravit fakturu k odeslání.");
      setPdfPayload(null);
    } finally {
      setPreparingSendId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faktury</h1>
          <p className="mt-1 text-muted-foreground">Spravujte své faktury a sledujte platby.</p>
        </div>
        <Button variant="coral" onClick={() => navigate({ to: "/app/faktury/editor" })}>
          <Plus className="h-4 w-4" /> Nová faktura
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hledat fakturu nebo klienta…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-border bg-card p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">
            {invoices.length === 0 ? "Zatím žádné faktury" : "Nic nenalezeno"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoices.length === 0 ? "Vystavte svou první fakturu jediným kliknutím." : "Zkuste změnit hledaný výraz."}
          </p>
          {invoices.length === 0 && (
            <Button variant="coral" className="mt-4" onClick={() => navigate({ to: "/app/faktury/editor" })}>
              <Plus className="h-4 w-4" /> Vytvořit fakturu
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Číslo</th>
                <th className="px-4 py-3 text-left">Odběratel</th>
                <th className="px-4 py-3 text-left">Vystaveno</th>
                <th className="px-4 py-3 text-left">Splatnost</th>
                <th className="px-4 py-3 text-right">Částka</th>
                <th className="px-4 py-3 text-center">Stav</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const st = statusLabels[inv.status];
                return (
                  <tr
                    key={inv.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
                    onClick={() => navigate({ to: "/app/faktury/editor", search: { id: inv.id } })}
                  >
                    <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.client_snapshot?.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issue_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCZK(Number(inv.total), inv.currency)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            {pdfLoadingId === inv.id || preparingSendId === inv.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <MoreVertical className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate({ to: "/app/faktury/editor", search: { id: inv.id } })}>
                            <Pencil className="h-4 w-4" /> Upravit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openSend(inv)}>
                            <Mail className="h-4 w-4" /> Odeslat e-mailem
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportPdf(inv)}>
                            <Download className="h-4 w-4" /> Stáhnout PDF
                          </DropdownMenuItem>
                          {inv.status !== "paid" && inv.status !== "draft" && inv.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => markPaid(inv.id)}>
                              <CheckCircle2 className="h-4 w-4" /> Označit zaplaceno
                            </DropdownMenuItem>
                          )}
                          {inv.status === "draft" && (
                            <DropdownMenuItem onClick={() => reissue(inv.id)}>
                              <Send className="h-4 w-4" /> Vystavit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {inv.status === "draft" ? (
                            <DropdownMenuItem
                              onClick={() => setDeletingId(inv.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" /> Smazat koncept
                            </DropdownMenuItem>
                          ) : inv.status !== "cancelled" ? (
                            <DropdownMenuItem
                              onClick={() => setCancellingId(inv.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="h-4 w-4" /> Stornovat
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Hidden invoice render for PDF export */}
      {pdfPayload && (
        <div style={{ position: "fixed", left: "-10000px", top: 0 }} aria-hidden>
          <InvoiceDocument
            supplier={pdfPayload.invoice.supplier_snapshot as never}
            client={pdfPayload.invoice.client_snapshot as never}
            items={pdfPayload.items.map((i) => ({
              id: i.id,
              description: i.description,
              quantity: Number(i.quantity),
              unit: i.unit,
              unit_price: Number(i.unit_price),
              vat_rate: Number(i.vat_rate) as 0 | 12 | 21,
            }))}
            invoiceNumber={pdfPayload.invoice.invoice_number}
            issueDate={pdfPayload.invoice.issue_date}
            dueDate={pdfPayload.invoice.due_date}
            taxableDate={pdfPayload.invoice.taxable_date}
            variableSymbol={pdfPayload.invoice.variable_symbol || undefined}
            notes={pdfPayload.invoice.notes || undefined}
            paymentMethod={pdfPayload.invoice.payment_method}
            currency={pdfPayload.invoice.currency}
            cancelled={pdfPayload.invoice.status === "cancelled"}
          />
        </div>
      )}

      <SendInvoiceDialog
        open={sendOpen}
        onOpenChange={(o) => {
          setSendOpen(o);
          if (!o) {
            setSendCtx(null);
            setPdfPayload(null);
          }
        }}
        context={sendCtx}
        onSent={() => load()}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat koncept?</AlertDialogTitle>
            <AlertDialogDescription>
              Tuto akci nelze vrátit. Koncept a jeho položky budou trvale smazány.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancellingId} onOpenChange={(o) => !o && setCancellingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stornovat fakturu?</AlertDialogTitle>
            <AlertDialogDescription>
              Vystavené faktury nelze podle zákona o účetnictví mazat. Faktura
              zůstane v evidenci se stavem „Stornováno" pro audit, ale nebude
              se započítávat do přehledů a plateb.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={cancelInvoice}>Stornovat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
