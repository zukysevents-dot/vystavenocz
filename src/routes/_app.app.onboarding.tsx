import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/app/onboarding")({
  head: () => ({ meta: [{ title: "Nastavení firmy — Vystaveno" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    ico: "",
    dic: "",
    street: "",
    city: "",
    zip: "",
    bank_account: "",
    iban: "",
    invoice_number_prefix: "FA",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setForm((f) => ({
          ...f,
          company_name: data.company_name ?? "",
          ico: data.ico ?? "",
          dic: data.dic ?? "",
          street: data.street ?? "",
          city: data.city ?? "",
          zip: data.zip ?? "",
          bank_account: data.bank_account ?? "",
          iban: data.iban ?? "",
          invoice_number_prefix: data.invoice_number_prefix ?? "FA",
        }));
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Nastavení uloženo.");
    navigate({ to: "/app" });
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold tracking-tight">Doplňte údaje o firmě</h1>
      <p className="mt-1 text-muted-foreground">Tyto údaje se objeví na všech vašich fakturách.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <Section title="Firma">
          <Field label="Název firmy" id="company_name" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="IČO" id="ico" value={form.ico} onChange={(v) => setForm({ ...form, ico: v })} required />
            <Field label="DIČ" id="dic" value={form.dic} onChange={(v) => setForm({ ...form, dic: v })} placeholder="CZ12345678" />
          </div>
        </Section>

        <Section title="Sídlo">
          <Field label="Ulice a č.p." id="street" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="Město" id="city" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="PSČ" id="zip" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} />
          </div>
        </Section>

        <Section title="Bankovní spojení">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Číslo účtu" id="bank_account" value={form.bank_account} onChange={(v) => setForm({ ...form, bank_account: v })} placeholder="123456789/0100" />
            <Field label="IBAN" id="iban" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} placeholder="CZ65 0800 …" />
          </div>
        </Section>

        <Section title="Číslování faktur">
          <Field label="Prefix faktur" id="invoice_number_prefix" value={form.invoice_number_prefix} onChange={(v) => setForm({ ...form, invoice_number_prefix: v })} placeholder="FA" />
          <p className="text-xs text-muted-foreground">Příklad: FA-2026-001</p>
        </Section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/app" })}>Přeskočit</Button>
          <Button type="submit" variant="coral" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Uložit a pokračovat
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

function Field({ label, id, value, onChange, required, placeholder }: { label: string; id: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string; }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}
