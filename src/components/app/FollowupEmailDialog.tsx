import { useEffect, useState } from "react";
import { Loader2, Mail, Send, AlertTriangle, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  sendInvoiceReminder,
  sendInvoiceThankYou,
} from "@/lib/email/send-followups.functions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FollowupKind = "reminder" | "thank-you";

export type FollowupContext = {
  invoiceId: string;
  invoiceNumber: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: FollowupKind;
  context: FollowupContext | null;
  onSent?: () => void;
};

const COPY = {
  reminder: {
    title: "Poslat upomínku",
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    description:
      "Zdvořilá připomínka klientovi, že faktura je po splatnosti. PDF se neposílá — pouze odkaz a QR.",
    defaultSubject: (n: string) => `Upomínka — faktura ${n} po splatnosti`,
    button: "Poslat upomínku",
    notePlaceholder: "Např. Děkuji předem za úhradu, dejte vědět, kdyby bylo cokoliv potřeba.",
  },
  "thank-you": {
    title: "Poděkovat za platbu",
    icon: PartyPopper,
    iconClass: "text-emerald-600",
    description:
      "Krátké poděkování za uhrazení faktury. Buduje vztah s klientem na další spolupráci.",
    defaultSubject: (n: string) => `Děkuji za platbu — faktura ${n}`,
    button: "Poslat poděkování",
    notePlaceholder: "Např. Těším se na další spolupráci. Pěkný zbytek týdne!",
  },
} as const;

export function FollowupEmailDialog({
  open,
  onOpenChange,
  kind,
  context,
  onSent,
}: Props) {
  const reminderFn = useServerFn(sendInvoiceReminder);
  const thankYouFn = useServerFn(sendInvoiceThankYou);

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [sending, setSending] = useState(false);

  const copy = COPY[kind];

  useEffect(() => {
    if (!context || !open) return;
    setTo(context.recipientEmail ?? "");
    setCc("");
    setSubject(copy.defaultSubject(context.invoiceNumber));
    setPersonalNote("");
    setLevel(1);
  }, [context, open, copy]);

  if (!context) return null;

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Zadejte e-mail příjemce.");
      return;
    }
    setSending(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Chybí přihlašovací token.");

      if (kind === "reminder") {
        await reminderFn({
          data: {
            invoiceId: context.invoiceId,
            to: to.trim(),
            cc: cc.trim() || undefined,
            subject: subject.trim(),
            personalNote: personalNote.trim() || undefined,
            level,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await thankYouFn({
          data: {
            invoiceId: context.invoiceId,
            to: to.trim(),
            cc: cc.trim() || undefined,
            subject: subject.trim(),
            personalNote: personalNote.trim() || undefined,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      toast.success(kind === "reminder" ? "Upomínka odeslána" : "Poděkování odesláno", {
        description: `Faktura ${context.invoiceNumber} → ${to.trim()}`,
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

  const Icon = copy.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${copy.iconClass}`} />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fu-to">Příjemce *</Label>
            <Input
              id="fu-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="klient@example.com"
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fu-cc">Kopie (volitelné)</Label>
            <Input
              id="fu-cc"
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="kopie@example.com"
              disabled={sending}
            />
          </div>

          {kind === "reminder" && (
            <div className="space-y-1.5">
              <Label htmlFor="fu-level">Stupeň upomínky</Label>
              <Select
                value={String(level)}
                onValueChange={(v) => setLevel(Number(v) as 1 | 2 | 3)}
                disabled={sending}
              >
                <SelectTrigger id="fu-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1. upomínka — zdvořilé připomenutí</SelectItem>
                  <SelectItem value="2">2. upomínka — důraznější tón</SelectItem>
                  <SelectItem value="3">Poslední upomínka — před vymáháním</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fu-subject">Předmět</Label>
            <Input
              id="fu-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fu-message">
              Osobní vzkaz <span className="font-normal text-muted-foreground">(volitelné)</span>
            </Label>
            <Textarea
              id="fu-message"
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              rows={4}
              disabled={sending}
              className="font-sans"
              placeholder={copy.notePlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              {kind === "reminder"
                ? "Souhrn faktury, QR platba a odkaz se přidají automaticky."
                : "Souhrn faktury a datum platby se přidají automaticky."}
            </p>
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
                <Send className="h-4 w-4" /> {copy.button}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
