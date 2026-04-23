import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAres } from "@/hooks/use-ares";
import { toast } from "sonner";
import { Loader2, Search, Upload, Image as ImageIcon, Trash2, Mail } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/app/nastaveni")({
  head: () => ({ meta: [{ title: "Nastavení — Vystaveno" }] }),
  component: SettingsPage,
});

type VatMode = "payer" | "identified" | "non_payer";

type Form = {
  full_name: string;
  company_name: string;
  ico: string;
  dic: string;
  vat_mode: VatMode;
  street: string;
  city: string;
  zip: string;
  country: string;
  bank_account: string;
  iban: string;
  swift: string;
  invoice_number_prefix: string;
  invoice_color: string;
  logo_url: string | null;
  next_invoice_seq: number;
  credit_note_prefix: string;
  next_credit_note_seq: number;
  auto_send_invoice_email: boolean;
  invoice_sender_local_part: string;
};

const defaults: Form = {
  full_name: "",
  company_name: "",
  ico: "",
  dic: "",
  vat_mode: "non_payer",
  street: "",
  city: "",
  zip: "",
  country: "CZ",
  bank_account: "",
  iban: "",
  swift: "",
  invoice_number_prefix: "FA",
  invoice_color: "#0fbfb6",
  logo_url: null,
  next_invoice_seq: 1,
  credit_note_prefix: "OD",
  next_credit_note_seq: 1,
  auto_send_invoice_email: false,
  invoice_sender_local_part: "faktury",
};

const SENDER_DOMAIN = "vystaveno.cz";
const LOCAL_PART_REGEX = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(defaults);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ares = useAres();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setForm({
          full_name: data.full_name ?? "",
          company_name: data.company_name ?? "",
          ico: data.ico ?? "",
          dic: data.dic ?? "",
          vat_mode: (data.vat_mode as VatMode) ?? "non_payer",
          street: data.street ?? "",
          city: data.city ?? "",
          zip: data.zip ?? "",
          country: data.country ?? "CZ",
          bank_account: data.bank_account ?? "",
          iban: data.iban ?? "",
          swift: data.swift ?? "",
          invoice_number_prefix: data.invoice_number_prefix ?? "FA",
          invoice_color: data.invoice_color ?? "#0fbfb6",
          logo_url: data.logo_url ?? null,
          next_invoice_seq: data.next_invoice_seq ?? 1,
          credit_note_prefix: data.credit_note_prefix ?? "OD",
          next_credit_note_seq: data.next_credit_note_seq ?? 1,
          auto_send_invoice_email: (data as { auto_send_invoice_email?: boolean }).auto_send_invoice_email ?? false,
          invoice_sender_local_part:
            (data as { invoice_sender_local_part?: string | null }).invoice_sender_local_part ?? "faktury",
        });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const fillFromAres = async () => {
    const result = await ares.lookup(form.ico);
    if (result) {
      setForm((f) => ({
        ...f,
        company_name: result.company_name ?? f.company_name,
        ico: result.ico,
        dic: result.dic ?? f.dic,
        street: result.street ?? f.street,
        city: result.city ?? f.city,
        zip: result.zip ?? f.zip,
        country: result.country ?? f.country,
      }));
    }
  };

  const onUploadLogo = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Maximální velikost loga je 2 MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    setForm((f) => ({ ...f, logo_url: pub.publicUrl }));
    setUploading(false);
    toast.success("Logo nahráno. Nezapomeňte uložit nastavení.");
  };

  const onRemoveLogo = () => {
    setForm((f) => ({ ...f, logo_url: null }));
    toast.message("Logo odebráno. Uložte nastavení pro potvrzení.");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const localPart = form.invoice_sender_local_part.trim().toLowerCase();
    if (!LOCAL_PART_REGEX.test(localPart)) {
      toast.error(
        "Odesílatel může obsahovat jen malá písmena, číslice, tečku, pomlčku nebo podtržítko (např. faktury, info, no-reply).",
      );
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        ...form,
        invoice_sender_local_part: localPart,
        ico: form.ico || null,
        dic: form.dic || null,
        street: form.street || null,
        city: form.city || null,
        zip: form.zip || null,
        bank_account: form.bank_account || null,
        iban: form.iban || null,
        swift: form.swift || null,
      })
      .eq("id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Nastavení uloženo.");
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold tracking-tight">Nastavení firmy</h1>
      <p className="mt-1 text-muted-foreground">
        Tyto údaje a branding se objeví na všech vašich fakturách.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <Section title="Identifikace firmy">
          <div className="space-y-2">
            <Label htmlFor="ico">IČO</Label>
            <div className="flex gap-2">
              <Input
                id="ico"
                inputMode="numeric"
                value={form.ico}
                onChange={(e) => setForm({ ...form, ico: e.target.value })}
                placeholder="12345678"
              />
              <Button type="button" variant="outline" onClick={fillFromAres} disabled={ares.loading || !form.ico}>
                {ares.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Načíst z ARES
              </Button>
            </div>
          </div>

          <Field label="Jméno a příjmení (kontakt)" id="full_name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Název firmy" id="company_name" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} required />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="DIČ" id="dic" value={form.dic} onChange={(v) => setForm({ ...form, dic: v })} placeholder="CZ12345678" />
            <div className="space-y-2">
              <Label htmlFor="vat_mode">Režim DPH</Label>
              <Select value={form.vat_mode} onValueChange={(v) => setForm({ ...form, vat_mode: v as VatMode })}>
                <SelectTrigger id="vat_mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_payer">Neplátce DPH</SelectItem>
                  <SelectItem value="identified">Identifikovaná osoba</SelectItem>
                  <SelectItem value="payer">Plátce DPH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        <Section title="Sídlo">
          <Field label="Ulice a č.p." id="street" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
          <div className="grid gap-4 sm:grid-cols-[1fr_140px_120px]">
            <Field label="Město" id="city" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="PSČ" id="zip" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
            <Field label="Země" id="country" value={form.country} onChange={(v) => setForm({ ...form, country: v.toUpperCase() })} />
          </div>
        </Section>

        <Section title="Bankovní spojení">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Číslo účtu" id="bank_account" value={form.bank_account} onChange={(v) => setForm({ ...form, bank_account: v })} placeholder="123456789/0100" />
            <Field label="IBAN" id="iban" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} placeholder="CZ65 0800 …" />
          </div>
          <Field label="SWIFT / BIC (volitelné)" id="swift" value={form.swift} onChange={(v) => setForm({ ...form, swift: v })} placeholder="GIBACZPX" />
          <p className="text-xs text-muted-foreground">
            Číslo účtu nebo IBAN použijeme pro generování QR platby na fakturách.
          </p>
        </Section>

        <Section title="Branding faktur">
          <div className="space-y-2">
            <Label>Logo firmy</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadLogo(f);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {form.logo_url ? "Vyměnit logo" : "Nahrát logo"}
                </Button>
                {form.logo_url && (
                  <Button type="button" variant="ghost" onClick={onRemoveLogo}>
                    <Trash2 className="h-4 w-4 text-destructive" /> Odebrat
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, SVG nebo WebP, max. 2 MB.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice_color">Barva faktury</Label>
              <div className="flex items-center gap-2">
                <input
                  id="invoice_color"
                  type="color"
                  value={form.invoice_color}
                  onChange={(e) => setForm({ ...form, invoice_color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent"
                />
                <Input
                  value={form.invoice_color}
                  onChange={(e) => setForm({ ...form, invoice_color: e.target.value })}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Číslování faktur">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Prefix"
              id="invoice_number_prefix"
              value={form.invoice_number_prefix}
              onChange={(v) => setForm({ ...form, invoice_number_prefix: v })}
              placeholder="FA"
            />
            <div className="space-y-2">
              <Label htmlFor="next_invoice_seq">Další číslo</Label>
              <Input
                id="next_invoice_seq"
                type="number"
                min={1}
                value={form.next_invoice_seq}
                onChange={(e) =>
                  setForm({ ...form, next_invoice_seq: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Další faktura bude mít číslo{" "}
            <span className="font-mono">
              {form.invoice_number_prefix || "FA"}-{new Date().getFullYear()}-
              {String(form.next_invoice_seq).padStart(3, "0")}
            </span>
            .
          </p>
        </Section>

        <Section title="Automatické odesílání e-mailem">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-1">
                <Label htmlFor="auto_send" className="text-sm font-medium">
                  Po vystavení automaticky odeslat klientovi
                </Label>
                <p className="text-xs text-muted-foreground">
                  Když fakturu vystavíte, systém ji rovnou pošle e-mailem klientovi (pokud má vyplněný e-mail).
                  PDF se přiloží do zprávy. Odpovědi přijdou na váš e-mail.
                </p>
              </div>
            </div>
            <Switch
              id="auto_send"
              checked={form.auto_send_invoice_email}
              onCheckedChange={(v) => setForm({ ...form, auto_send_invoice_email: v })}
            />
          </div>
        </Section>

        <Section title="Číslování dobropisů">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Prefix"
              id="credit_note_prefix"
              value={form.credit_note_prefix}
              onChange={(v) => setForm({ ...form, credit_note_prefix: v })}
              placeholder="OD"
            />
            <div className="space-y-2">
              <Label htmlFor="next_credit_note_seq">Další číslo</Label>
              <Input
                id="next_credit_note_seq"
                type="number"
                min={1}
                value={form.next_credit_note_seq}
                onChange={(e) =>
                  setForm({
                    ...form,
                    next_credit_note_seq: Math.max(1, Number(e.target.value) || 1),
                  })
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Další dobropis (opravný daňový doklad) bude mít číslo{" "}
            <span className="font-mono">
              {form.credit_note_prefix || "OD"}-{new Date().getFullYear()}-
              {String(form.next_credit_note_seq).padStart(3, "0")}
            </span>
            . Dobropisy mají vlastní číselnou řadu, aby je účetní snadno odlišila od běžných faktur.
          </p>
        </Section>

        <div className="flex justify-end">
          <Button type="submit" variant="coral" size="lg" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Uložit nastavení
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}
