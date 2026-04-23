import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/zapomenute-heslo")({
  head: () => ({ meta: [{ title: "Zapomenuté heslo — Vystaveno.cz" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-hesla`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Odkaz pro obnovu hesla byl odeslán.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold tracking-tight">Zapomenuté heslo</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pošleme vám odkaz pro nastavení nového hesla.</p>

          {sent ? (
            <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
              Pokud existuje účet s tímto e-mailem, dorazí vám zpráva s odkazem.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" variant="coral" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Odeslat odkaz
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/prihlaseni" className="text-primary hover:underline">Zpět na přihlášení</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
