import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, Plus, TrendingUp, Clock, Users } from "lucide-react";

export const Route = createFileRoute("/_app/app/")({
  head: () => ({ meta: [{ title: "Přehled — Fakturio" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ company_name: string | null; trial_ends_at: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, unpaid: 0, paid: 0, clients: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("company_name, trial_ends_at")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      const { count: invCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      const { count: unpaidCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["issued", "overdue"]);
      const { count: paidCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "paid");
      const { count: clientCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setStats({
        total: invCount ?? 0,
        unpaid: unpaidCount ?? 0,
        paid: paidCount ?? 0,
        clients: clientCount ?? 0,
      });
    })();
  }, [user]);

  const trialDaysLeft = profile
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Vítejte{profile?.company_name ? `, ${profile.company_name}` : ""}!
          </h1>
          <p className="mt-1 text-muted-foreground">Přehled vaší fakturace</p>
        </div>
        <Button variant="coral" size="lg" disabled>
          <Plus className="h-4 w-4" /> Nová faktura
        </Button>
      </div>

      {trialDaysLeft > 0 && (
        <div className="mt-6 rounded-xl border border-coral/30 bg-coral/10 p-4">
          <div className="flex items-center gap-2 font-semibold text-coral">
            <Clock className="h-4 w-4" /> Trial: zbývá {trialDaysLeft} {trialDaysLeft === 1 ? "den" : trialDaysLeft < 5 ? "dny" : "dnů"} zdarma
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Po skončení můžete pokračovat za 100 Kč měsíčně. Bez závazků.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Faktur celkem" value={stats.total} />
        <StatCard icon={Clock} label="Nezaplacené" value={stats.unpaid} accent="coral" />
        <StatCard icon={TrendingUp} label="Zaplacené" value={stats.paid} accent="success" />
        <StatCard icon={Users} label="Klienti" value={stats.clients} />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Editor faktur a AI asistent přijdou v další vlně</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aktuálně dokončujeme tvorbu faktur, PDF s QR platbou a chat asistenta.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/nastaveni">Nastavení firmy</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent?: "coral" | "success";
}) {
  const accentColor =
    accent === "coral" ? "text-coral" : accent === "success" ? "text-success" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accentColor}`} />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
