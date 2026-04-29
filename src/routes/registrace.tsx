import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/landing/Logo";
import { toast } from "sonner";
import { Loader2, Search, Check } from "lucide-react";
import { trackEvent, getAttribution } from "@/lib/analytics";

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
      { title: "Registrace — Vystaveno.cz" },
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
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && session) navigate({ to: "/app" });
  }, [session, authLoading, navigate]);

  const onGoogle = async () => {
    if (!agreed) {
      toast.error("Pro registraci musíte souhlasit s obchodními podmínkami a GDPR.");
      return;
    }
    setGoogleLoading(true);
    trackEvent("sign_up_started", { method: "google" });
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app/onboarding",
    });
    if (result.error) {
      setGoogleLoading(false);
      toast.error("Registrace přes Google selhala: " + result.error.message);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app/onboarding" });
  };

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
    trackEvent("sign_up", { method: "email", ...(getAttribution() ?? {}) });
    toast.success("Účet vytvořen! Vítejte ve Vystaveno.");
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
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted-foreground">nebo</span></div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={onGoogle}
              disabled={googleLoading || submitting}
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5c-2 1.4-4.4 2.1-7 2.1-5.3 0-9.7-3-11.3-7.4l-6.5 5C9.6 39.2 16.2 43.5 24 43.5z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6 5C40.9 35 43.5 30 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                </svg>
              )}
              Registrovat přes Google
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
