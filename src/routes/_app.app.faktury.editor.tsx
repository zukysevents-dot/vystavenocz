import { createFileRoute, Link, useNavigate, useSearch, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Save, Download, Loader2, Eye, EyeOff, Mail, Lock, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { InvoiceDocument } from "@/components/app/InvoiceDocument";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { SendInvoiceDialog, type SendInvoiceContext } from "@/components/app/SendInvoiceDialog";
import { PaywallDialog } from "@/components/payments/PaywallDialog";
import { useSubscription } from "@/hooks/use-subscription";
import {
  InvoiceAssistant,
  applyPatchToItems,
  type InvoiceContext,
  type InvoicePatch,
} from "@/components/app/InvoiceAssistant";
import {
  buildInvoiceNumber,
  calcTotals,
  formatCZK,
  variableSymbolFromInvoiceNumber,
  type ClientSnapshot,
  type InvoiceItemDraft,
  type SupplierSnapshot,
  type VatRate,
} from "@/lib/invoice";

const searchSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().optional(),
  /** ID původní faktury, ze které se má vytvořit dobropis. */
  creditFor: z.string().optional(),
});

export const Route = createFileRoute("/_app/app/faktury/editor")({
  head: () => ({ meta: [{ title: "Editor faktury — Fakturio" }] }),
  validateSearch: searchSchema,
  component: InvoiceEditorPage,
});

type ClientRow = {
  id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
  email: string | null;
  default_payment_days: number;
};

type ProfileRow = {
  company_name: string | null;
  full_name: string | null;
  ico: string | null;
  dic: string | null;
  vat_mode: "payer" | "identified" | "non_payer";
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
  bank_account: string | null;
  iban: string | null;
  swift: string | null;
  email: string;
  logo_url: string | null;
  invoice_color: string | null;
  invoice_number_prefix: string | null;
  invoice_number_format: string | null;
  next_invoice_seq: number;
  credit_note_prefix: string | null;
  next_credit_note_seq: number;
};

const newItem = (): InvoiceItemDraft => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unit: "ks",
  unit_price: 0,
  vat_rate: 21,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function InvoiceEditorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_app/app/faktury/editor" });
  const editingId = search.id;
  const creditForId = search.creditFor;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  // Volby exportu PDF (přetahují se do <InvoiceDocument /> i pro náhled).
  const [pdfShowFooter, setPdfShowFooter] = useState(true);
  const [pdfShowVatBreakdown, setPdfShowVatBreakdown] = useState(true);
  const [pdfCreditNoteDisplay, setPdfCreditNoteDisplay] = useState<"full" | "compact">("full");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendCtx, setSendCtx] = useState<SendInvoiceContext | null>(null);
  const [preparingSend, setPreparingSend] = useState(false);
  const { hasAccess } = useSubscription();


  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  // Typ dokladu (faktura / dobropis) + vazba na původní fakturu při dobropisu.
  const [documentType, setDocumentType] = useState<"invoice" | "credit_note">("invoice");
  const [originalInvoiceId, setOriginalInvoiceId] = useState<string | null>(null);
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState<string | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [taxableDate, setTaxableDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDaysISO(14));
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [variableSymbol, setVariableSymbol] = useState("");
  const [constantSymbol, setConstantSymbol] = useState("");
  const [specificSymbol, setSpecificSymbol] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItemDraft[]>([newItem()]);

  const previewRef = useRef<HTMLDivElement>(null);

  // Unsaved-changes tracking. We start clean; mark dirty on the first user
  // edit, reset to clean after load and after a successful save. Programmatic
  // navigations done by the save flow set a ref so the blocker stays silent.
  const [dirty, setDirty] = useState(false);
  const skipBlockerRef = useRef(false);

  // Autosave: track loaded invoice status (only drafts/new are autosaved),
  // and show "Saved …" indicator in the header.
  const [loadedStatus, setLoadedStatus] = useState<"draft" | "issued" | "paid" | "overdue" | "cancelled" | null>(null);
  const [lastAutosaveAt, setLastAutosaveAt] = useState<Date | null>(null);
  const autosavingRef = useRef(false);

  // Stornovaný doklad je zamčený — nesmí se měnit ani znovu vystavit.
  const isCancelled = loadedStatus === "cancelled";

  // Load profile, clients, and (optionally) existing invoice
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [profRes, clientsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("clients").select("*").eq("user_id", user.id).order("name"),
      ]);
      if (profRes.data) setProfile(profRes.data as ProfileRow);
      if (clientsRes.data) setClients(clientsRes.data as ClientRow[]);

      if (editingId) {
        const { data: inv } = await supabase
          .from("invoices")
          .select("*, invoice_items(*), original_invoice:original_invoice_id(invoice_number)")
          .eq("id", editingId)
          .single();
        if (inv) {
          setInvoiceNumber(inv.invoice_number);
          setIssueDate(inv.issue_date);
          setTaxableDate(inv.taxable_date);
          setDueDate(inv.due_date);
          setPaymentMethod(inv.payment_method);
          setVariableSymbol(inv.variable_symbol || "");
          setNotes(inv.notes || "");
          setSelectedClientId(inv.client_id || "");
          setLoadedStatus(inv.status as typeof loadedStatus);
          setDocumentType((inv.document_type as "invoice" | "credit_note") || "invoice");
          setOriginalInvoiceId(inv.original_invoice_id ?? null);
          const orig = (inv as unknown as { original_invoice?: { invoice_number: string } | null }).original_invoice;
          setOriginalInvoiceNumber(orig?.invoice_number ?? null);
          const loadedItems = (inv.invoice_items as Array<{
            id: string;
            description: string;
            quantity: number;
            unit: string;
            unit_price: number;
            vat_rate: number;
          }>)
            .sort((a, b) => (a as unknown as { position: number }).position - (b as unknown as { position: number }).position)
            .map((it) => ({
              id: it.id,
              description: it.description,
              quantity: Number(it.quantity),
              unit: it.unit,
              unit_price: Number(it.unit_price),
              vat_rate: Number(it.vat_rate) as VatRate,
            }));
          setItems(loadedItems.length > 0 ? loadedItems : [newItem()]);
        }
      } else if (creditForId && profRes.data) {
        // Vytvoření dobropisu z existující faktury — předvyplníme položky
        // se zápornými množstvími, klienta převezmeme z originálu, číslo
        // vygenerujeme z vlastní řady dobropisů.
        const { data: src } = await supabase
          .from("invoices")
          .select("*, invoice_items(*)")
          .eq("id", creditForId)
          .single();
        if (src) {
          setDocumentType("credit_note");
          setOriginalInvoiceId(src.id);
          setOriginalInvoiceNumber(src.invoice_number);
          setSelectedClientId(src.client_id || "");
          setPaymentMethod(src.payment_method);
          setNotes(`Dobropis k faktuře ${src.invoice_number}.`);
          // Číslo dobropisu z vlastní řady (OD-YYYY-NNNN výchozí formát).
          const num = buildInvoiceNumber(
            profRes.data.credit_note_prefix || "OD",
            profRes.data.invoice_number_format || "{prefix}-{year}-{seq}",
            profRes.data.next_credit_note_seq || 1,
          );
          setInvoiceNumber(num);
          // Položky se zápornými množstvími — částky a sazby zachováme.
          const srcItems = (src.invoice_items as Array<{
            id: string;
            description: string;
            quantity: number;
            unit: string;
            unit_price: number;
            vat_rate: number;
            position: number;
          }>)
            .sort((a, b) => a.position - b.position)
            .map((it) => ({
              id: crypto.randomUUID(),
              description: it.description,
              quantity: -Math.abs(Number(it.quantity)),
              unit: it.unit,
              unit_price: Number(it.unit_price),
              vat_rate: Number(it.vat_rate) as VatRate,
            }));
          setItems(srcItems.length > 0 ? srcItems : [newItem()]);
        }
      } else {
        // pre-fill invoice number
        if (profRes.data) {
          const num = buildInvoiceNumber(
            profRes.data.invoice_number_prefix || "FA",
            profRes.data.invoice_number_format || "{prefix}-{year}-{seq}",
            profRes.data.next_invoice_seq || 1,
          );
          setInvoiceNumber(num);
        }
        // pre-select client from query
        if (search.clientId) setSelectedClientId(search.clientId);
      }

      setLoading(false);
      // Allow one render cycle for state to settle, then arm the dirty tracker.
      requestAnimationFrame(() => setDirty(false));
    })();
  }, [user, editingId, search.clientId, creditForId]);

  // Adjust due date when client changes
  useEffect(() => {
    if (!selectedClientId) return;
    const c = clients.find((x) => x.id === selectedClientId);
    if (c && !editingId) {
      setDueDate(addDaysISO(c.default_payment_days));
    }
  }, [selectedClientId, clients, editingId]);

  // Mark form dirty whenever any tracked field changes (after initial load).
  useEffect(() => {
    if (loading) return;
    setDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    invoiceNumber,
    issueDate,
    taxableDate,
    dueDate,
    paymentMethod,
    variableSymbol,
    notes,
    selectedClientId,
    items,
  ]);

  // Warn on tab close / hard refresh while there are unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for Chrome to actually display the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Warn on intra-app navigation (router-driven). Bypassed via skipBlockerRef
  // when the save flow itself triggers the redirect.
  useBlocker({
    shouldBlockFn: () => {
      if (!dirty || skipBlockerRef.current) return false;
      return !window.confirm(
        "Máte neuložené změny ve faktuře. Opravdu chcete odejít? Změny budou ztraceny.",
      );
    },
    enableBeforeUnload: false, // we own beforeunload above
  });

  // Autosave: každých 30 s tiše uložit draft, pokud je formulář dirty.
  // Spouštíme jen pro nové faktury a koncepty (vystavené/zaplacené/stornované
  // nikdy nepřepisujeme automaticky). Validace v save() ošetří chybějící data
  // (silent: true → žádné toasty).
  useEffect(() => {
    if (loading) return;
    const canAutosave = loadedStatus === null || loadedStatus === "draft";
    if (!canAutosave) return;

    const interval = setInterval(() => {
      if (!dirty || saving || autosavingRef.current) return;
      autosavingRef.current = true;
      void save("draft", { redirect: false, silent: true }).finally(() => {
        autosavingRef.current = false;
      });
    }, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadedStatus, dirty, saving]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const supplierSnapshot: SupplierSnapshot = useMemo(() => {
    if (!profile) {
      return {
        company_name: null, ico: null, dic: null, street: null, city: null, zip: null,
      };
    }
    return {
      company_name: profile.company_name,
      full_name: profile.full_name,
      ico: profile.ico,
      dic: profile.dic,
      vat_mode: profile.vat_mode,
      street: profile.street,
      city: profile.city,
      zip: profile.zip,
      country: profile.country,
      bank_account: profile.bank_account,
      iban: profile.iban,
      swift: profile.swift,
      email: profile.email,
      logo_url: profile.logo_url,
      invoice_color: profile.invoice_color,
    };
  }, [profile]);

  const clientSnapshot: ClientSnapshot = useMemo(() => {
    if (!selectedClient) {
      return { name: "— Vyberte odběratele —" };
    }
    return {
      name: selectedClient.name,
      ico: selectedClient.ico,
      dic: selectedClient.dic,
      street: selectedClient.street,
      city: selectedClient.city,
      zip: selectedClient.zip,
      country: selectedClient.country,
      email: selectedClient.email,
    };
  }, [selectedClient]);

  const totals = useMemo(
    () => calcTotals(items, profile?.vat_mode === "payer"),
    [items, profile?.vat_mode],
  );

  const updateItem = (id: string, patch: Partial<InvoiceItemDraft>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));
  const addItem = () => setItems((prev) => [...prev, newItem()]);

  const save = async (
    status: "draft" | "issued",
    opts: { redirect?: boolean; silent?: boolean } = {},
  ): Promise<string | null> => {
    const redirect = opts.redirect !== false;
    const silent = opts.silent === true;
    if (!user || !profile) return null;
    if (status === "issued" && !hasAccess) {
      setPaywallOpen(true);
      return null;
    }
    // Validace
    if (!invoiceNumber.trim()) {
      if (!silent) toast.error("Vyplňte číslo faktury.");
      return null;
    }
    // Ostrá validace platí jen pro vystavení faktury. Koncept lze uložit
    // i s neúplnými údaji — ať uživatel nepřijde o rozdělanou práci.
    if (status === "issued") {
      if (!selectedClient) {
        if (!silent) toast.error("Vyberte odběratele.");
        return null;
      }
      if (items.some((it) => !it.description.trim())) {
        if (!silent) toast.error("Vyplňte popis u všech položek.");
        return null;
      }
      if (items.some((it) => !Number.isFinite(it.quantity) || !Number.isFinite(it.unit_price))) {
        if (!silent) toast.error("Množství a cena musí být čísla.");
        return null;
      }
      if (new Date(dueDate) < new Date(issueDate)) {
        if (!silent) toast.error("Datum splatnosti nemůže být před datem vystavení.");
        return null;
      }
    }
    setSaving(true);
    try {
      const vs = variableSymbol || variableSymbolFromInvoiceNumber(invoiceNumber);
      const payload = {
        user_id: user.id,
        client_id: selectedClient?.id ?? null,
        invoice_number: invoiceNumber,
        status,
        supplier_snapshot: JSON.parse(JSON.stringify(supplierSnapshot)),
        client_snapshot: JSON.parse(JSON.stringify(clientSnapshot)),
        issue_date: issueDate,
        due_date: dueDate,
        taxable_date: taxableDate,
        currency: "CZK",
        subtotal: totals.subtotal,
        vat_total: totals.vat_total,
        total: totals.total,
        variable_symbol: vs,
        payment_method: paymentMethod,
        notes: notes || null,
        document_type: documentType,
        original_invoice_id: originalInvoiceId,
      };

      let invoiceId = editingId;

      if (editingId) {
        const { error } = await supabase.from("invoices").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase
          .from("invoices")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        invoiceId = ins.id;
        // Bump pořadové číslo z odpovídající řady (faktury vs. dobropisy).
        // Lokálně i v DB — zabrání reuse stejného čísla.
        if (documentType === "credit_note") {
          const nextSeq = (profile.next_credit_note_seq || 1) + 1;
          await supabase
            .from("profiles")
            .update({ next_credit_note_seq: nextSeq })
            .eq("id", user.id);
          setProfile({ ...profile, next_credit_note_seq: nextSeq });
        } else {
          const nextSeq = (profile.next_invoice_seq || 1) + 1;
          await supabase
            .from("profiles")
            .update({ next_invoice_seq: nextSeq })
            .eq("id", user.id);
          setProfile({ ...profile, next_invoice_seq: nextSeq });
        }
        // Po prvním uložení si "převezmeme" id do URL (?id=...), aby další
        // (auto)save proběhl jako UPDATE a nevytvořil duplicitní fakturu.
        if (!redirect && invoiceId) {
          skipBlockerRef.current = true;
          navigate({
            to: "/app/faktury/editor",
            search: { id: invoiceId },
            replace: true,
          });
          // Reset skipBlocker on next tick — replace navigation will have completed.
          setTimeout(() => { skipBlockerRef.current = false; }, 0);
        }
        setLoadedStatus(status);
      }

      const itemRows = items.map((it, idx) => {
        const qty = Number.isFinite(it.quantity) ? it.quantity : 0;
        const price = Number.isFinite(it.unit_price) ? it.unit_price : 0;
        const subtotal = Math.round((qty * price + Number.EPSILON) * 100) / 100;
        const vat = profile.vat_mode === "payer"
          ? Math.round((subtotal * it.vat_rate / 100 + Number.EPSILON) * 100) / 100
          : 0;
        return {
          invoice_id: invoiceId!,
          position: idx,
          description: it.description,
          quantity: qty,
          unit: it.unit,
          unit_price: price,
          vat_rate: it.vat_rate,
          line_subtotal: subtotal,
          line_vat: vat,
          line_total: Math.round((subtotal + vat + Number.EPSILON) * 100) / 100,
        };
      });
      // Insert nových položek NEJDŘÍV; až po úspěšném insertu smažeme staré.
      // Tím zabráníme tomu, že selhaný insert nechá fakturu úplně bez položek.
      let oldIds: string[] = [];
      if (editingId) {
        const { data: existing } = await supabase
          .from("invoice_items")
          .select("id")
          .eq("invoice_id", editingId);
        oldIds = (existing ?? []).map((r) => r.id);
      }
      const { error: itemsErr } = await supabase.from("invoice_items").insert(itemRows);
      if (itemsErr) throw itemsErr;
      if (editingId && oldIds.length > 0) {
        const { error: delErr } = await supabase
          .from("invoice_items")
          .delete()
          .in("id", oldIds);
        if (delErr) console.warn("Smazání starých položek selhalo:", delErr);
      }

      if (redirect) {
        toast.success(status === "draft" ? "Uloženo jako koncept." : "Faktura vystavena.");
        skipBlockerRef.current = true;
        setDirty(false);
        navigate({ to: "/app/faktury" });
      } else {
        // Tichý save (autosave) — jen označit jako čisté a zaznamenat čas.
        setDirty(false);
        if (silent) setLastAutosaveAt(new Date());
      }
      return invoiceId ?? null;
    } catch (e) {
      console.error(e);
      const msg = (e as Error).message || "";
      if (msg.includes("invoices_user_number_unique") || msg.toLowerCase().includes("duplicate")) {
        if (!silent) toast.error(`Faktura s číslem ${invoiceNumber} už existuje. Změňte číslo faktury.`);
      } else {
        if (!silent) toast.error("Nepodařilo se uložit fakturu: " + msg);
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      // ensure preview is visible
      setShowPreview(true);
      await new Promise((r) => setTimeout(r, 150));
      await downloadInvoicePdf("invoice-document", `${invoiceNumber || "faktura"}.pdf`);
      toast.success("PDF staženo.");
    } catch (e) {
      console.error(e);
      toast.error("Nepodařilo se vygenerovat PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!hasAccess) {
      setPaywallOpen(true);
      return;
    }
    setPreparingSend(true);
    try {
      // Ulož jako KONCEPT — fakturu vystavíme až po úspěšném odeslání e-mailu
      // (status update je v SendInvoiceDialog). Tím zabráníme tomu, že
      // uživatel zruší dialog, ale faktura už je nenávratně vystavená.
      const id = await save("draft", { redirect: false });
      if (!id) return;
      setShowPreview(true);
      await new Promise((r) => setTimeout(r, 200));
      setSendCtx({
        invoiceId: id,
        invoiceNumber,
        recipientEmail: selectedClient?.email ?? null,
        recipientName: selectedClient?.name ?? null,
        supplierName:
          supplierSnapshot.company_name ?? supplierSnapshot.full_name ?? null,
        total: totals.total,
        currency: "CZK",
        dueDate,
        pdfElementId: "invoice-document",
      });
      setSendOpen(true);
    } finally {
      setPreparingSend(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.company_name && !profile?.full_name) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-bold">Nejprve vyplňte údaje firmy</h1>
        <p className="mt-2 text-muted-foreground">Bez firemních údajů nemůžete vystavovat faktury.</p>
        <Button asChild className="mt-4" variant="coral">
          <Link to="/app/nastaveni">Jít do nastavení</Link>
        </Button>
      </div>
    );
  }

  // Pokud editujeme existující fakturu/dobropis, povolíme přístup i bez klientů
  // (uživatel mohl mezitím všechny klienty smazat — fakturu by jinak nešlo
  // ani otevřít, stáhnout PDF nebo stornovat).
  if (clients.length === 0 && !editingId) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-2xl font-bold">Nejprve přidejte klienta</h1>
        <p className="mt-2 text-muted-foreground">Pro vystavení faktury potřebujete alespoň jednoho odběratele.</p>
        <Button asChild className="mt-4" variant="coral">
          <Link to="/app/klienti">Přidat klienta</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/faktury"><ArrowLeft className="h-4 w-4" /> Zpět</Link>
          </Button>
          <div>
            <div className="text-sm font-semibold">
              {documentType === "credit_note"
                ? (editingId ? "Úprava dobropisu" : "Nový dobropis")
                : (editingId ? "Úprava faktury" : "Nová faktura")}
              {" — "}
              {invoiceNumber}
              {documentType === "credit_note" && originalInvoiceNumber && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  k {originalInvoiceNumber}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedClient?.name || "vyberte odběratele"} · {formatCZK(totals.total)}
              {(loadedStatus === null || loadedStatus === "draft") && (
                <span className="ml-2 text-[11px]">
                  {dirty ? (
                    <span className="text-coral">• neuložené změny</span>
                  ) : lastAutosaveAt ? (
                    <span className="text-primary">
                      • automaticky uloženo {lastAutosaveAt.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : null}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? "Skrýt náhled" : "Náhled"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloadingPdf}>
            {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                title="Možnosti exportu PDF"
                aria-label="Možnosti exportu PDF"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold">Možnosti exportu PDF</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Volby se promítnou do náhledu i staženého PDF.
                  </p>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="pdf-footer" className="text-sm">
                      Patička „Vystaveno v Fakturio"
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Diskrétní text v patičce dokumentu.
                    </p>
                  </div>
                  <Switch
                    id="pdf-footer"
                    checked={pdfShowFooter}
                    onCheckedChange={setPdfShowFooter}
                  />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="pdf-vat" className="text-sm">
                      Rozpis DPH po sazbách
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Jednotlivé řádky 21 % / 12 % / 0 %. Vypnuto = jen souhrnné DPH.
                    </p>
                  </div>
                  <Switch
                    id="pdf-vat"
                    checked={pdfShowVatBreakdown}
                    onCheckedChange={setPdfShowVatBreakdown}
                    disabled={profile?.vat_mode !== "payer"}
                  />
                </div>

                {documentType === "credit_note" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Zobrazení dobropisu</Label>
                    <Select
                      value={pdfCreditNoteDisplay}
                      onValueChange={(v) => setPdfCreditNoteDisplay(v as "full" | "compact")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          Plný titulek „Opravný daňový doklad — dobropis"
                        </SelectItem>
                        <SelectItem value="compact">
                          Kompaktní — badge „DOBROPIS" v rohu
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {!isCancelled && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={preparingSend || saving}
                title={hasAccess ? "Odeslat fakturu e-mailem" : "Vyžaduje aktivní předplatné"}
              >
                {preparingSend ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !hasAccess ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                E-mail
              </Button>
              <Button variant="outline" size="sm" onClick={() => save("draft")} disabled={saving}>
                <Save className="h-4 w-4" /> Koncept
              </Button>
              <Button
                variant="coral"
                size="sm"
                onClick={() => save("issued")}
                disabled={saving}
                title={hasAccess ? "Vystavit fakturu" : "Vyžaduje aktivní předplatné"}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !hasAccess ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Vystavit
              </Button>
            </>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              <Lock className="h-3.5 w-3.5" /> Stornováno · jen ke čtení
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Form */}
        <div className="w-full overflow-auto border-r border-border bg-background p-6 lg:w-1/2">
          {isCancelled && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Tento doklad je stornovaný a nelze ho upravovat.</p>
                <p className="mt-1 text-muted-foreground">
                  Stornované doklady jsou uchovávány jen pro evidenci. Pokud potřebujete provést opravu, vystavte
                  nový doklad nebo dobropis k původní faktuře.
                </p>
              </div>
            </div>
          )}
          <fieldset disabled={isCancelled} className="contents">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Základ</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Číslo faktury">
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
              </Field>
              <Field label="Odběratel">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger><SelectValue placeholder="Vyberte klienta" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Datum vystavení">
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </Field>
              <Field label="Datum splatnosti">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field label={profile?.vat_mode === "payer" ? "DUZP" : "Datum plnění"}>
                <Input type="date" value={taxableDate} onChange={(e) => setTaxableDate(e.target.value)} />
              </Field>
              <Field label="Variabilní symbol">
                <Input value={variableSymbol} onChange={(e) => setVariableSymbol(e.target.value)} placeholder="auto z čísla faktury" />
              </Field>
              <Field label="Způsob úhrady">
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bankovní převod</SelectItem>
                    <SelectItem value="cash">Hotově</SelectItem>
                    <SelectItem value="card">Kartou</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Položky</h2>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4" /> Přidat položku
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Popis položky"
                    value={it.description}
                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                    className="mt-2"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Field label="Množství">
                      <Input type="number" step="0.01" value={it.quantity}
                        onChange={(e) => updateItem(it.id, { quantity: Number(e.target.value) || 0 })} />
                    </Field>
                    <Field label="MJ">
                      <Input value={it.unit} onChange={(e) => updateItem(it.id, { unit: e.target.value })} />
                    </Field>
                    <Field label="Cena/MJ">
                      <Input type="number" step="0.01" value={it.unit_price}
                        onChange={(e) => updateItem(it.id, { unit_price: Number(e.target.value) || 0 })} />
                    </Field>
                    {profile?.vat_mode === "payer" && (
                      <Field label="DPH %">
                        <Select value={String(it.vat_rate)} onValueChange={(v) => updateItem(it.id, { vat_rate: Number(v) as VatRate })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0 %</SelectItem>
                            <SelectItem value="12">12 %</SelectItem>
                            <SelectItem value="21">21 %</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Poznámka</h2>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Děkujeme za spolupráci…" rows={3} />
          </section>

          <div className="mt-8 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Celkem k úhradě</span>
              <span className="text-2xl font-bold text-primary">{formatCZK(totals.total)}</span>
            </div>
          </div>
          </fieldset>
        </div>

        {/* Live preview */}
        {showPreview && (
          <div className="hidden flex-1 overflow-auto bg-muted/30 p-6 lg:block" ref={previewRef}>
            <div className="origin-top scale-[0.78]">
              <InvoiceDocument
                supplier={supplierSnapshot}
                client={clientSnapshot}
                items={items}
                invoiceNumber={invoiceNumber}
                issueDate={issueDate}
                dueDate={dueDate}
                taxableDate={taxableDate}
                variableSymbol={variableSymbol}
                notes={notes}
                paymentMethod={paymentMethod}
                cancelled={loadedStatus === "cancelled"}
                documentType={documentType}
                originalInvoiceNumber={originalInvoiceNumber}
                showFooter={pdfShowFooter}
                showVatBreakdown={pdfShowVatBreakdown}
                creditNoteDisplay={pdfCreditNoteDisplay}
              />
            </div>
          </div>
        )}
      </div>

      {/* Hidden render of full-size invoice for PDF capture (when preview hidden on mobile) */}
      {!showPreview && (
        <div style={{ position: "fixed", left: "-10000px", top: 0 }} aria-hidden>
          <InvoiceDocument
            supplier={supplierSnapshot}
            client={clientSnapshot}
            items={items}
            invoiceNumber={invoiceNumber}
            issueDate={issueDate}
            dueDate={dueDate}
            taxableDate={taxableDate}
            variableSymbol={variableSymbol}
            notes={notes}
            paymentMethod={paymentMethod}
            cancelled={loadedStatus === "cancelled"}
            documentType={documentType}
            originalInvoiceNumber={originalInvoiceNumber}
            showFooter={pdfShowFooter}
            showVatBreakdown={pdfShowVatBreakdown}
            creditNoteDisplay={pdfCreditNoteDisplay}
          />
        </div>
      )}

      <InvoiceAssistant
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        storageKey={editingId ?? "new"}
        context={{
          invoice_number: invoiceNumber,
          client_name: selectedClient?.name || "",
          vat_payer: profile?.vat_mode === "payer",
          issue_date: issueDate,
          taxable_date: taxableDate,
          due_date: dueDate,
          payment_method: paymentMethod,
          variable_symbol: variableSymbol,
          notes,
          template_color: profile?.invoice_color || "#0F62FE",
          available_clients: clients.map((c) => c.name),
          items: items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            unit_price: it.unit_price,
            vat_rate: it.vat_rate,
          })),
        }}
        onApplyPatch={(patch: InvoicePatch) => {
          if (patch.items) setItems((prev) => applyPatchToItems(prev, patch));
          if (patch.invoice_number) setInvoiceNumber(patch.invoice_number);
          if (patch.issue_date) setIssueDate(patch.issue_date);
          if (patch.taxable_date) setTaxableDate(patch.taxable_date);
          if (patch.due_date) setDueDate(patch.due_date);
          if (patch.notes !== undefined) setNotes(patch.notes);
          if (patch.variable_symbol !== undefined) setVariableSymbol(patch.variable_symbol);
          if (patch.payment_method) setPaymentMethod(patch.payment_method);
          if (patch.client_name) {
            const match = clients.find(
              (c) => c.name.toLowerCase() === patch.client_name!.toLowerCase(),
            );
            if (match) setSelectedClientId(match.id);
            else toast.error(`Klient „${patch.client_name}" nebyl nalezen.`);
          }
          if (patch.template_color && profile && user) {
            const color = patch.template_color.startsWith("#")
              ? patch.template_color
              : `#${patch.template_color}`;
            setProfile({ ...profile, invoice_color: color });
            supabase
              .from("profiles")
              .update({ invoice_color: color })
              .eq("id", user.id)
              .then(({ error }) => {
                if (error) toast.error("Barvu se nepodařilo uložit do profilu.");
              });
          }
        }}
      />
      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        reason="Bezplatná zkušební doba skončila. Pro vystavení faktury aktivujte tarif Fakturio Pro. Koncept můžete uložit i bez předplatného."
      />
      <SendInvoiceDialog
        open={sendOpen}
        onOpenChange={(o) => {
          setSendOpen(o);
          if (!o) setSendCtx(null);
        }}
        context={sendCtx}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
