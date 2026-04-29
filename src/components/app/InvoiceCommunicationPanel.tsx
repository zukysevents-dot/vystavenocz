import { useEffect, useState, useCallback } from "react";
import { Mail, AlertTriangle, PartyPopper, FileText, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type EmailKind = "invoice" | "reminder" | "thank_you";

type EmailLogRow = {
  id: string;
  kind: EmailKind;
  level: number | null;
  recipient: string;
  cc: string | null;
  subject: string;
  status: "sent" | "failed";
  error_message: string | null;
  created_at: string;
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("cs-CZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function kindLabel(kind: EmailKind, level: number | null): { label: string; icon: React.ReactNode; tone: string } {
  if (kind === "invoice")
    return {
      label: "Faktura",
      icon: <FileText className="h-4 w-4" />,
      tone: "text-primary bg-primary/10",
    };
  if (kind === "thank_you")
    return {
      label: "Poděkování",
      icon: <PartyPopper className="h-4 w-4" />,
      tone: "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40",
    };
  // reminder
  const lvl = level ?? 1;
  const txt =
    lvl === 3 ? "Poslední upomínka" : lvl === 2 ? "Upomínka 2" : "Upomínka 1";
  return {
    label: txt,
    icon: <AlertTriangle className="h-4 w-4" />,
    tone:
      lvl === 3
        ? "text-destructive bg-destructive/10"
        : "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  };
}

export function InvoiceCommunicationPanel({ invoiceId }: { invoiceId: string }) {
  const [rows, setRows] = useState<EmailLogRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("id, kind, level, recipient, cc, subject, status, error_message, created_at")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data ?? []) as EmailLogRow[]);
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-6 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Komunikace</h3>
          {rows && rows.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {rows.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Obnovit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Obnovit
        </button>
      </div>

      <div className="px-4 py-3">
        {loading && rows === null ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Načítám historii…
          </div>
        ) : error ? (
          <p className="py-3 text-sm text-destructive">Nepodařilo se načíst historii: {error}</p>
        ) : !rows || rows.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">
            Zatím nebyl odeslán žádný e-mail. Po odeslání faktury, upomínky nebo poděkování se zde objeví záznam.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const k = kindLabel(r.kind, r.level);
              return (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${k.tone}`}
                  >
                    {k.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{k.label}</span>
                      {r.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> odesláno
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                          <XCircle className="h-3 w-3" /> selhalo
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDateTime(r.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.recipient}
                      {r.cc ? ` · kopie: ${r.cc}` : ""}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-foreground/80">{r.subject}</p>
                    {r.status === "failed" && r.error_message && (
                      <p className="mt-1 text-xs text-destructive">{r.error_message}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}