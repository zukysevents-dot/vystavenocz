import {
  FilePlus2,
  Send,
  LayoutList,
  QrCode,
  Building2,
  FileDown,
  Mail,
  Bell,
  Check,
  CircleDot,
  AlertCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function InvoiceFlow() {
  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            Tvorba a správa faktur
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Celý život faktury na jednom místě
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Od vystavení přes odeslání až po zaplacení. Bez exportů, bez tabulek, bez papírování.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {/* 1. Vystavte */}
          <FlowCard
            step="01"
            icon={FilePlus2}
            title="Vystavte za 30 sekund"
            desc="Otevřete editor, klikněte „Nová faktura". Pole jsou předvyplněná podle posledních dokladů."
          >
            <div className="space-y-2 rounded-xl border border-border bg-background p-3 text-xs">
              <FlowRow icon={Building2} label="Odběratel" value="Načteno z ARESu podle IČO" />
              <FlowRow icon={LayoutList} label="Položky" value="2× Konzultace · 1 200 Kč" />
              <FlowRow icon={Check} label="DPH 21 %" value="Spočítáno automaticky" />
              <FlowRow icon={QrCode} label="QR platba" value="Vygenerována pro každou fakturu" />
            </div>
          </FlowCard>

          {/* 2. Pošlete */}
          <FlowCard
            step="02"
            icon={Send}
            title="Pošlete klientovi"
            desc="PDF s vaším logem a barvou rovnou e-mailem. Nebo si stáhněte a pošlete sami."
          >
            <div className="space-y-2 rounded-xl border border-border bg-background p-3 text-xs">
              <FlowRow icon={FileDown} label="PDF" value="Stáhnout · ISDOC · tisk" />
              <FlowRow icon={Mail} label="E-mail" value="Předmět + zpráva v češtině" />
              <FlowRow icon={QrCode} label="Platba" value="QR kód přímo v PDF i e-mailu" />
              <FlowRow icon={Bell} label="Připomínka" value="3 dny po splatnosti automaticky" />
            </div>
          </FlowCard>

          {/* 3. Spravujte */}
          <FlowCard
            step="03"
            icon={LayoutList}
            title="Spravujte v přehledu"
            desc="Filtrujte podle stavu, klienta, období. Stav „zaplaceno" jedním klikem nebo automaticky podle připsání."
          >
            <div className="space-y-2 rounded-xl border border-border bg-background p-3 text-xs">
              <StatusRow label="2025-014 · Alza" amount="34 848 Kč" status="paid" />
              <StatusRow label="2025-013 · Heureka" amount="12 100 Kč" status="sent" />
              <StatusRow label="2025-012 · Mall" amount="8 470 Kč" status="overdue" />
              <StatusRow label="2025-011 · Rohlík" amount="5 200 Kč" status="draft" />
            </div>
          </FlowCard>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <Button variant="coral" size="lg" asChild>
            <a href="/registrace">Vyzkoušet 14 dní zdarma</a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Bez platební karty ·{" "}
            <Link to="/funkce" className="underline-offset-4 hover:underline">
              všechny funkce →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function FlowCard({
  step,
  icon: Icon,
  title,
  desc,
  children,
}: {
  step: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-coral/30 hover:shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-coral/20 bg-coral/10 text-coral">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground/60">{step}</span>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function FlowRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-3.5 w-3.5 flex-none text-muted-foreground" />
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="ml-auto truncate text-foreground/90">{value}</span>
    </div>
  );
}

function StatusRow({
  label,
  amount,
  status,
}: {
  label: string;
  amount: string;
  status: "paid" | "sent" | "overdue" | "draft";
}) {
  const map = {
    paid: { text: "Zaplaceno", icon: Check, cls: "text-coral border-coral/30 bg-coral/10" },
    sent: { text: "Odesláno", icon: Send, cls: "text-foreground border-border bg-surface-soft" },
    overdue: {
      text: "Po splatnosti",
      icon: AlertCircle,
      cls: "text-destructive border-destructive/30 bg-destructive/10",
    },
    draft: {
      text: "Koncept",
      icon: CircleDot,
      cls: "text-muted-foreground border-border bg-background",
    },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-2.5">
      <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${s.cls}`}>
        <Icon className="h-2.5 w-2.5" />
        {s.text}
      </span>
      <span className="truncate text-foreground/90">{label}</span>
      <span className="ml-auto font-semibold text-foreground">{amount}</span>
    </div>
  );
}