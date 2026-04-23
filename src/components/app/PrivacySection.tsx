/**
 * Sekce „Moje data a soukromí" — GDPR funkce v nastavení.
 * - Stáhnout všechna data (JSON + CSV + ZIP s PDF)
 * - Zobrazit historii bezpečnostních událostí
 * - Anonymizovat účet (právo být zapomenut, čl. 17 GDPR)
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import JSZip from "jszip";
import { toast } from "sonner";
import { Loader2, Download, ShieldAlert, History, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { exportUserData, anonymizeAccount, listAuditLogs } from "@/lib/gdpr/gdpr.functions";

type AuditLog = {
  id: string;
  event_type: string;
  description: string | null;
  ip_address: string | null;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  "data.exported": "Stažení dat",
  "account.anonymized": "Anonymizace účtu",
  "invoice.sent": "Odeslání faktury",
  "invoice.deleted": "Smazání faktury",
  "login": "Přihlášení",
};

export function PrivacySection() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const exportFn = useServerFn(exportUserData);
  const anonymizeFn = useServerFn(anonymizeAccount);
  const listLogsFn = useServerFn(listAuditLogs);

  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportFn();
      const zip = new JSZip();

      // UTF-8 BOM pro Excel kompatibilitu
      const bom = "\uFEFF";
      zip.file("data.json", result.json);
      zip.file("klienti.csv", bom + result.csvClients);
      zip.file("faktury.csv", bom + result.csvInvoices);
      zip.file(
        "README.txt",
        [
          "Export vašich dat z aplikace Vystaveno.cz",
          `Datum exportu: ${new Date().toLocaleString("cs-CZ")}`,
          "",
          `Faktur: ${result.counts.invoices}`,
          `Klientů: ${result.counts.clients}`,
          `PDF souborů: ${result.counts.pdfs}`,
          "",
          "Obsah ZIP:",
          "  data.json     — kompletní data (profil, klienti, faktury, položky)",
          "  klienti.csv   — seznam klientů (otevřete v Excelu)",
          "  faktury.csv   — seznam faktur (otevřete v Excelu)",
          "  faktury/      — PDF všech vystavených faktur",
        ].join("\n"),
      );

      if (result.pdfFiles.length > 0) {
        const folder = zip.folder("faktury");
        for (const pdf of result.pdfFiles) {
          folder?.file(pdf.name, pdf.base64, { base64: true });
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vystaveno-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export dat byl stažen.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export selhal.");
    } finally {
      setExporting(false);
    }
  }

  async function handleAnonymize() {
    if (confirmText.trim() !== "ANONYMIZOVAT") {
      toast.error("Pro potvrzení napište přesně ANONYMIZOVAT.");
      return;
    }
    setAnonymizing(true);
    try {
      await anonymizeFn({ data: { confirmation: confirmText.trim() } });
      toast.success("Účet byl anonymizován. Budete odhlášeni.");
      setShowConfirm(false);
      // Odhlásit a přesměrovat
      setTimeout(async () => {
        await signOut();
        navigate({ to: "/" });
      }, 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Anonymizace selhala.");
    } finally {
      setAnonymizing(false);
    }
  }

  async function handleShowLogs() {
    setShowLogs(true);
    if (logs !== null) return;
    setLoadingLogs(true);
    try {
      const result = await listLogsFn();
      setLogs(result.logs);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Načtení historie selhalo.");
    } finally {
      setLoadingLogs(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Moje data a soukromí
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Práva podle GDPR — kdykoliv si můžete stáhnout svá data nebo požádat o jejich anonymizaci.
      </p>

      <div className="mt-5 space-y-3">
        {/* Export dat */}
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Download className="h-4 w-4" /> Stáhnout všechna moje data
            </div>
            <p className="text-xs text-muted-foreground">
              ZIP s JSON exportem, CSV tabulkami klientů a faktur a všemi PDF.
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline" size="sm">
            {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
            {exporting ? "Připravuji…" : "Stáhnout"}
          </Button>
        </div>

        {/* Audit log */}
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4" /> Historie bezpečnostních událostí
            </div>
            <p className="text-xs text-muted-foreground">
              Přehled posledních 100 akcí (přihlášení, exporty, smazání).
            </p>
          </div>
          <Button onClick={handleShowLogs} variant="outline" size="sm">
            <Eye className="h-4 w-4" /> Zobrazit
          </Button>
        </div>

        {/* Anonymizace */}
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <ShieldAlert className="h-4 w-4" /> Anonymizovat účet
            </div>
            <p className="text-xs text-muted-foreground">
              Smaže klienty a vyprázdní osobní údaje. Vystavené faktury zůstanou kvůli zákonu o
              účetnictví anonymizované. Akce je <strong>nevratná</strong>.
            </p>
          </div>
          <Button
            onClick={() => setShowConfirm(true)}
            variant="destructive"
            size="sm"
          >
            Anonymizovat účet
          </Button>
        </div>
      </div>

      {/* Potvrzovací dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anonymizovat účet?</DialogTitle>
            <DialogDescription>
              Tato akce je nevratná. Smažeme všechny vaše klienty a vyprázdníme osobní údaje
              v profilu. Vystavené faktury zůstanou v anonymizované podobě, aby vyhovovaly zákonu
              o účetnictví (uchovávání 5+ let).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Pro potvrzení napište slovo <strong>ANONYMIZOVAT</strong>:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ANONYMIZOVAT"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={anonymizing}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleAnonymize}
              disabled={anonymizing || confirmText.trim() !== "ANONYMIZOVAT"}
            >
              {anonymizing && <Loader2 className="h-4 w-4 animate-spin" />}
              Anonymizovat účet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit log dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historie bezpečnostních událostí</DialogTitle>
            <DialogDescription>
              Posledních 100 zaznamenaných akcí ve vašem účtu.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {loadingLogs && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loadingLogs && logs && logs.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Zatím žádné záznamy.
              </p>
            )}
            {!loadingLogs && logs && logs.length > 0 && (
              <ul className="divide-y divide-border">
                {logs.map((log) => (
                  <li key={log.id} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {EVENT_LABELS[log.event_type] || log.event_type}
                        </p>
                        {log.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{log.description}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{new Date(log.created_at).toLocaleString("cs-CZ")}</div>
                        {log.ip_address && (
                          <div className="mt-0.5 font-mono">{log.ip_address}</div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}