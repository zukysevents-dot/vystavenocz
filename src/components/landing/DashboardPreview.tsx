import { Logo } from "./Logo";
import {
  TrendingUp,
  Coins,
  Clock,
  AlertTriangle,
  Users,
  Check,
  Send,
  CircleDot,
  AlertCircle,
  Sparkles,
} from "lucide-react";

/**
 * Stylizovaná ukázka přehledu (dashboardu) pro uživatele s předplatným —
 * světlý "appkový" vzhled na tmavém pozadí. Ukazuje statistiky, graf
 * vystaveno vs. zaplaceno a poslední faktury.
 */
export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* dekorativní glow za panelem */}
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-coral/30 via-coral/15 to-transparent blur-3xl" />

      <div className="rotate-1 transition-transform duration-500 hover:rotate-0">
        <div className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-glow ring-1 ring-white/20">
          {/* Hlavička appky */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Logo variant="mark" />
              <div className="leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Přehled
                </p>
                <p className="text-xs font-semibold text-slate-900">Duben 2026</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <Check className="h-3 w-3" /> Předplatné aktivní
            </span>
          </div>

          {/* Statistiky */}
          <div className="grid grid-cols-2 gap-2 px-5 pt-4">
            <StatTile
              icon={Coins}
              label="Fakturováno"
              value="184 250 Kč"
              tone="slate"
            />
            <StatTile
              icon={Check}
              label="Zaplaceno"
              value="142 900 Kč"
              tone="emerald"
            />
            <StatTile
              icon={Clock}
              label="Čeká na úhradu"
              value="34 100 Kč"
              tone="sky"
            />
            <StatTile
              icon={AlertTriangle}
              label="Po splatnosti"
              value="7 250 Kč"
              tone="coral"
            />
          </div>

          {/* Graf */}
          <div className="mx-5 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Vystaveno vs. zaplaceno
                </p>
                <p className="text-xs font-semibold text-slate-900">posledních 6 měsíců</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <TrendingUp className="h-3 w-3" /> +24 %
              </span>
            </div>
            <div className="flex h-20 items-end gap-1.5">
              {[
                { i: 38, p: 30 },
                { i: 55, p: 48 },
                { i: 42, p: 40 },
                { i: 70, p: 55 },
                { i: 62, p: 58 },
                { i: 88, p: 72 },
              ].map((b, idx) => (
                <div key={idx} className="flex flex-1 items-end gap-0.5">
                  <div
                    className="flex-1 rounded-sm bg-coral/80"
                    style={{ height: `${b.i}%` }}
                  />
                  <div
                    className="flex-1 rounded-sm bg-emerald-500/80"
                    style={{ height: `${b.p}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-coral/80" /> Vystaveno
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-emerald-500/80" /> Zaplaceno
              </span>
            </div>
          </div>

          {/* Poslední faktury */}
          <div className="px-5 pb-4 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Poslední faktury
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <Users className="h-3 w-3" /> 28 klientů
              </span>
            </div>
            <div className="space-y-1.5">
              <InvoiceRow num="2025-014" client="Alza" amount="34 848 Kč" status="paid" />
              <InvoiceRow num="2025-013" client="Heureka" amount="12 100 Kč" status="sent" />
              <InvoiceRow num="2025-012" client="Mall" amount="8 470 Kč" status="overdue" />
              <InvoiceRow num="2025-011" client="Rohlík" amount="5 200 Kč" status="draft" />
            </div>
          </div>
        </div>
      </div>

      {/* Plovoucí badge */}
      <div className="absolute -bottom-4 -right-2 rotate-3 rounded-full bg-coral px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-coral-foreground shadow-glow sm:-right-6">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Vše na jednom místě
        </span>
      </div>
      <div className="absolute -left-2 top-1/4 -rotate-6 rounded-full border border-coral/30 bg-background/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-coral shadow-soft backdrop-blur sm:-left-6">
        Přehled v reálném čase
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "slate" | "emerald" | "sky" | "coral";
}) {
  const toneMap = {
    slate: "text-slate-700 bg-slate-100",
    emerald: "text-emerald-700 bg-emerald-100",
    sky: "text-sky-700 bg-sky-100",
    coral: "text-coral bg-coral/10",
  } as const;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${toneMap[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function InvoiceRow({
  num,
  client,
  amount,
  status,
}: {
  num: string;
  client: string;
  amount: string;
  status: "paid" | "sent" | "overdue" | "draft";
}) {
  const map = {
    paid: { text: "Zaplaceno", icon: Check, cls: "text-emerald-700 border-emerald-200 bg-emerald-50" },
    sent: { text: "Odesláno", icon: Send, cls: "text-sky-700 border-sky-200 bg-sky-50" },
    overdue: {
      text: "Po splatnosti",
      icon: AlertCircle,
      cls: "text-coral border-coral/30 bg-coral/10",
    },
    draft: {
      text: "Koncept",
      icon: CircleDot,
      cls: "text-slate-500 border-slate-200 bg-slate-50",
    },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px]">
      <span className="font-semibold text-slate-900">{num}</span>
      <span className="truncate text-slate-500">· {client}</span>
      <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${s.cls}`}>
        <Icon className="h-2.5 w-2.5" />
        {s.text}
      </span>
      <span className="ml-1 font-bold text-slate-900">{amount}</span>
    </div>
  );
}