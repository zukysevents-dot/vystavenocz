import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/app/nastaveni")({
  head: () => ({ meta: [{ title: "Nastavení — Fakturio" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold tracking-tight">Nastavení</h1>
      <p className="mt-1 text-muted-foreground">Upravte údaje o vaší firmě, logo a fakturaci.</p>
      <div className="mt-6">
        <Button variant="coral" onClick={() => navigate({ to: "/app/onboarding" })}>
          Upravit firemní údaje
        </Button>
      </div>
    </div>
  );
}
