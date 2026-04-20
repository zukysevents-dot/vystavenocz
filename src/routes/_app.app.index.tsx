import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, Plus, TrendingUp, Clock, Users, AlertTriangle, Coins } from "lucide-react";
import { formatCZK } from "@/lib/invoice";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/app/")({
  head: () => ({ meta: [{ title: "Přehled — Fakturio" }] }),
  component: DashboardPage,
});

type InvoiceStatRow = {
  id: string;
  status: "draft" | "issued" | "paid" | "overdue" | "cancelled";
  total: number;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  client_snapshot: { name?: string } | null;
  invoice_number: string;
};

const CZ_MONTHS = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čer", "Čec", "Srp", "Zář", "Říj", "Lis", "Pro"];

function lastSixMonths(): { key: string; label: string; year: number; month: number }[] {
  const now = new Date();
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: CZ_MONTHS[d.getMonth()],
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return out;
}

function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ company_name: string | null; trial_ends_at: string } | null>(null);
  const [invoices, setInvoices] = useState<InvoiceStatRow[]>([]);
  const [clientsCount, setClientsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1);

      const [profRes, invRes, clientRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("company_name, trial_ends_at")
          .eq("id", user.id)
          .single(),
        supabase
          .from("invoices")
          .select("id, status, total, issue_date, due_date, paid_at, client_snapshot, invoice_number")
          .eq("user_id", user.id)
          .order("issue_date", { ascending: false })
          .limit(500),
        supabase
          .from("clients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      if (profRes.data) setProfile(profRes.data);
      if (invRes.data) setInvoices(invRes.data as InvoiceStatRow[]);
      setClientsCount(clientRes.count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let totalInvoiced = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;
    for (const inv of invoices) {
      const amount = Number(inv.total) || 0;
      if (inv.status !== "draft" && inv.status !== "cancelled") {
        totalInvoiced += amount;
      }
      const isOverdue = inv.status === "overdue" || (inv.status === "issued" && inv.due_date < today);
      if (inv.status === "paid") paidCount++;
      else if (isOverdue) {
        overdueCount++;
        overdueAmount += amount;
      } else if (inv.status === "issued") {
        pendingCount++;
        pendingAmount += amount;
      }
    }
    return {
      totalInvoiced,
      pendingAmount,
      pendingCount,
      overdueAmount,
      overdueCount,
      paidCount,
      totalCount: invoices.length,
    };
  }, [invoices]);

  const chartData = useMemo(() => {
    const months = lastSixMonths();
    const buckets = new Map(months.map((m) => [m.key, { month: m.label, vystaveno: 0, zaplaceno: 0 }]));
    for (const inv of invoices) {
      if (inv.status === "draft" || inv.status === "cancelled") continue;
      const issued = new Date(inv.issue_date);
      const key = `${issued.getFullYear()}-${issued.getMonth()}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.vystaveno += Number(inv.total) || 0;
      if (inv.paid_at) {
        const paid = new Date(inv.paid_at);
        const pkey = `${paid.getFullYear()}-${paid.getMonth()}`;
        const pbucket = buckets.get(pkey);
        if (pbucket) pbucket.zaplaceno += Number(inv.total) || 0;
      }
    }
    return Array.from(buckets.values());
  }, [invoices]);

  const recentOverdue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return invoices
      .filter((inv) => inv.status === "overdue" || (inv.status === "issued" && inv.due_date < today))
      .slice(0, 5);
  }, [invoices]);

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
        <Button variant="coral" size="lg" asChild>
          <Link to="/app/faktury/editor"><Plus className="h-4 w-4" /> Nová faktura</Link>
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
        <StatCard
          icon={Coins}
          label="Celkem fakturováno"
          value={formatCZK(stats.totalInvoiced)}
          subtitle={`${stats.totalCount} ${stats.totalCount === 1 ? "faktura" : stats.totalCount < 5 ? "faktury" : "faktur"}`}
        />
        <StatCard
          icon={Clock}
          label="Čekající platby"
          value={formatCZK(stats.pendingAmount)}
          subtitle={`${stats.pendingCount} faktur`}
          accent="primary"
        />
        <StatCard
          icon={AlertTriangle}
          label="Po splatnosti"
          value={formatCZK(stats.overdueAmount)}
          subtitle={`${stats.overdueCount} faktur`}
          accent="coral"
        />
        <StatCard
          icon={Users}
          label="Klienti"
          value={String(clientsCount)}
          subtitle={`${stats.paidCount} zaplacených faktur`}
          accent="success"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Posledních 6 měsíců</h2>
              <p className="text-xs text-muted-foreground">Vystavené vs. zaplacené (Kč)</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <ChartContainer
            className="mt-4 h-[260px] w-full"
            config={{
              vystaveno: { label: "Vystaveno", color: "hsl(var(--primary))" },
              zaplaceno: { label: "Zaplaceno", color: "hsl(var(--success, 142 71% 45%))" },
            }}
          >
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCZK(Number(value))}
                  />
                }
              />
              <Bar dataKey="vystaveno" fill="var(--color-vystaveno)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="zaplaceno" fill="var(--color-zaplaceno)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Overdue list */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Po splatnosti</h2>
            <AlertTriangle className="h-4 w-4 text-coral" />
          </div>
          {recentOverdue.length === 0 ? (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {loading ? "Načítání…" : "Žádné po splatnosti 🎉"}
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentOverdue.map((inv) => (
                <li key={inv.id}>
                  <Link
                    to="/app/faktury/editor"
                    search={{ id: inv.id }}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:border-coral hover:bg-coral/5"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{inv.invoice_number}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {inv.client_snapshot?.name ?? "—"} · do {new Date(inv.due_date).toLocaleDateString("cs-CZ")}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-sm font-semibold text-coral">
                      {formatCZK(Number(inv.total))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
            <Link to="/app/faktury">Všechny faktury</Link>
          </Button>
        </div>
      </div>

      {invoices.length === 0 && !loading && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">Začněte fakturovat</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vystavte fakturu s živým náhledem, QR platbou a stáhněte si PDF.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="coral" asChild>
              <Link to="/app/faktury/editor"><Plus className="h-4 w-4" /> Nová faktura</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
  accent?: "coral" | "success" | "primary";
}) {
  const accentColor =
    accent === "coral"
      ? "text-coral"
      : accent === "success"
        ? "text-success"
        : accent === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accentColor}`} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  );
}
