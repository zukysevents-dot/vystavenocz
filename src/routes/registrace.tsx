import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/landing/Logo";
import { toast } from "sonner";
import { Loader2, Search, Check } from "lucide-react";

type AresResult = {
  ico: string;
  dic: string | null;
  company_name: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
};

export const Route = createFileRoute("/registrace")({
  head: () => ({
    meta: [
      { title: "Registrace — Fakturio.cz" },
      { name: "description", content: "Vytvořte si účet zdarma. 14 dní bez karty, plné funkce." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ico, setIco] = useState("");
  const [aresData, setAresData] = useState<AresResult | null>(null);
  const [aresLoading, setAresLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/app" });
  }, [session, authLoading, navigate]);

  const lookupAres = async () => {
    const cleaned = ico.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(cleaned)) {
      toast.error("Zadejte platné IČO (6–8 číslic).");
      return;
    }
    setAresLoading(true);
    setAresData(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ares-lookup?ico=${cleaned}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Nepodařilo se načíst data z ARES.");
        return;
      }
      setAresData(data);
      toast.success(`Načteno: ${data.company_name}`);
    } catch (err) {
      console.error(err);
      toast.error("Chyba sítě při dotazu na ARES.");
    } finally {
      setAresLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ico || !aresData) {
      toast.error("Nejprve načtěte firmu z ARES podle IČO.");
      return;
    }
    if (password.length < 8) {
      toast.error("Heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (!agreed) {
      toast.error("Pro registraci musíte souhlasit s obchodními podmínkami a zpracováním osobních údajů.");
      return;
    }

    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/app`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message.includes("already") ? "Účet s tímto e-mailem už existuje." : error.message);
      return;
    }

    // Update profile with ARES data
    if (data.user) {
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          company_name: aresData.company_name,
          ico: aresData.ico,
          dic: aresData.dic,
          street: aresData.street,
          city: aresData.city,
          zip: aresData.zip,
          country: aresData.country,
        })
        .eq("id", data.user.id);
      if (profErr) console.error("Profile update error:", profErr);
    }

    setSubmitting(false);
    toast.success("Účet vytvořen! Vítejte ve Fakturio.");
    navigate({ to: "/app/onboarding" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold tracking-tight">Začněte zdarma</h1>
          <p className="mt-1 text-sm text-muted-foreground">14 dní bez karty. Plné funkce.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ico">IČO firmy</Label>
              <div className="flex gap-2">
                <Input
                  id="ico"
                  inputMode="numeric"
                  placeholder="12345678"
                  value={ico}
                  onChange={(e) => { setIco(e.target.value); setAresData(null); }}
                  required
                />
                <Button type="button" variant="outline" onClick={lookupAres} disabled={aresLoading || !ico}>
                  {aresLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Načíst
                </Button>
              </div>
              {aresData && (
                <div className="mt-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-success">
                    <Check className="h-4 w-4" /> {aresData.company_name}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {aresData.street}, {aresData.zip} {aresData.city}
                    {aresData.dic && <span className="ml-2">• DIČ: {aresData.dic}</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Jméno a příjmení</Label>
              <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jan Novák" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jan@firma.cz" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo (min. 8 znaků)</Label>
              <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm font-normal leading-relaxed text-muted-foreground">
                Souhlasím s{" "}
                <Link to="/podminky" target="_blank" className="font-medium text-primary hover:underline">
                  obchodními podmínkami
                </Link>{" "}
                a{" "}
                <Link to="/gdpr" target="_blank" className="font-medium text-primary hover:underline">
                  zpracováním osobních údajů
                </Link>
                .
              </Label>
            </div>

            <Button type="submit" variant="coral" size="lg" className="w-full" disabled={submitting || !agreed}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Vytvořit účet zdarma
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Registrací souhlasíte s podmínkami služby.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Už máte účet?{" "}
            <Link to="/prihlaseni" className="font-semibold text-primary hover:underline">Přihlaste se</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
