import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/prihlaseni")({
  head: () => ({
    meta: [
      { title: "Přihlášení — Fakturio.cz" },
      { name: "description", content: "Přihlaste se do svého účtu Fakturio." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      navigate({ to: "/app" });
    }
  }, [session, authLoading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Špatný e-mail nebo heslo." : error.message);
      return;
    }
    toast.success("Vítejte zpět!");
    navigate({ to: "/app" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold tracking-tight">Přihlášení</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vítejte zpět ve Fakturio.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vy@firma.cz" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Heslo</Label>
                <Link to="/zapomenute-heslo" className="text-xs text-primary hover:underline">Zapomněli jste?</Link>
              </div>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" variant="coral" size="lg" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Přihlásit se
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={submitting}
              onClick={() => {
                setEmail("demo@fakturio.cz");
                setPassword("FakturioDemo-2026-Pwd!");
                toast.info("Demo údaje vyplněny — klikněte na Přihlásit se.");
              }}
            >
              Vyzkoušet demo
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Nemáte účet?{" "}
            <Link to="/registrace" className="font-semibold text-primary hover:underline">Zaregistrujte se zdarma</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
