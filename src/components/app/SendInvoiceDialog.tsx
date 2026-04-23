import { useEffect, useState } from "react";
import { Loader2, Mail, Send, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { sendInvoiceEmail } from "@/lib/email/send-invoice.functions";
import { renderInvoicePdfBlob } from "@/lib/invoice-pdf";
import type { InvoicePdfProps } from "@/lib/pdf/InvoicePdfDoc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type SendInvoiceContext = {
  invoiceId: string;
  invoiceNumber: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  supplierName?: string | null;
  total?: number;
  currency?: string;
  dueDate?: string;
  /** Props pro vektorové PDF generování (@react-pdf/renderer). */
  pdfProps: InvoicePdfProps;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: SendInvoiceContext | null;
  onSent?: () => void;
};

export function SendInvoiceDialog({ open, onOpenChange, context, onSent }: Props) {
  const sendFn = useServerFn(sendInvoiceEmail);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!context || !open) return;
    setTo(context.recipientEmail ?? "");
    setCc("");
    const supplier = context.supplierName ?? "";
    setSubject(`Faktura ${context.invoiceNumber}${supplier ? ` od ${supplier}` : ""}`);
    setPersonalNote("");
  }, [context, open]);

  if (!context) return null;

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Zadejte e-mail příjemce.");
      return;
    }
    setSending(true);
    try {
      // 1) Vygeneruj PDF (vektorové, s českou diakritikou)
      const blob = await renderInvoicePdfBlob(context.pdfProps);

      // 2) Nahraj do Storage pod {user_id}/{invoice_id}.pdf
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Nejste přihlášeni.");
      const path = `${userData.user.id}/${context.invoiceId}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("invoices")
        .upload(path, blob, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw new Error("Nahrání PDF selhalo: " + upErr.message);

      // 3) Získej access token pro server fn
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Chybí přihlašovací token.");

      // 4) Zavolej server funkci s Authorization header
      await sendFn({
        data: {
          invoiceId: context.invoiceId,
          pdfPath: path,
          to: to.trim(),
          cc: cc.trim() || undefined,
          subject: subject.trim(),
          personalNote: personalNote.trim() || undefined,
          filename: `${context.invoiceNumber}.pdf`,
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      // Bug #2: update statusu draft → issued provedeme na klientovi,
      // aby update proběhl pod RLS autentizovaného uživatele.
      const { error: statusErr } = await supabase
        .from("invoices")
        .update({ status: "issued" })
        .eq("id", context.invoiceId)
        .eq("status", "draft");
      if (statusErr) {
        console.warn("Aktualizace stavu faktury selhala:", statusErr);
      }

      // Bug #3: explicitní success toast s delším trváním, ať je vidět.
      toast.success("E-mail odeslán", {
        description: `Faktura ${context.invoiceNumber} byla odeslána na ${to.trim()}.`,
        duration: 6000,
      });
      onOpenChange(false);
      onSent?.();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Odeslání selhalo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Odeslat fakturu e-mailem
          </DialogTitle>
          <DialogDescription>
            Faktura {context.invoiceNumber} bude odeslána jako PDF v příloze.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="send-to">Příjemce *</Label>
            <Input
              id="send-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="klient@example.com"
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="send-cc">Kopie (volitelné)</Label>
            <Input
              id="send-cc"
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="kopie@example.com"
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="send-subject">Předmět</Label>
            <Input
              id="send-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="send-message">Osobní vzkaz <span className="font-normal text-muted-foreground">(volitelné)</span></Label>
            <Textarea
              id="send-message"
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              rows={4}
              disabled={sending}
              className="font-sans"
              placeholder="Např. Děkujeme za spolupráci v tomto měsíci…"
            />
            <p className="text-xs text-muted-foreground">
              Pozdrav, shrnutí faktury (částka, splatnost), QR platba a odkaz se přidají automaticky.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            Příloha: <span className="font-medium text-foreground">{context.invoiceNumber}.pdf</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Zrušit
          </Button>
          <Button variant="coral" onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Odesílám…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Odeslat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
