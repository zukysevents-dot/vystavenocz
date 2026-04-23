import { useEffect, useState } from "react";
import { Sparkles, Send, User, Check } from "lucide-react";

type InvoiceState = {
  client: string;
  clientMeta?: string;
  itemLabel: string;
  qty: string;
  qtyLabel: string;
  unitPrice: string;
  unitPriceLabel: string;
  discountLabel?: string;
  discountValue?: string;
  dueDays: number;
  subtotal: string;
  vat: string;
  total: string;
  invoiceNumber: string;
};

type Step = {
  /** What the user types in the chat */
  prompt: string;
  /** Short confirmation from the assistant */
  reply: string;
  /** Invoice fields after the change is applied */
  invoice: InvoiceState;
  /** Which invoice field flashes on update */
  highlight: "client" | "qty" | "discount" | "due" | "total";
  /** Optional badge shown when this step is "applied" */
  appliedBadge?: string;
};

type Scenario = {
  id: string;
  title: string;
  /** State shown before the first prompt of the scenario lands */
  initial: InvoiceState;
  steps: Step[];
};

const SCENARIOS: Scenario[] = [
  {
    id: "create",
    title: "Vystavení nové faktury",
    initial: {
      client: "Vyberte klienta…",
      itemLabel: "Položka",
      qty: "—",
      qtyLabel: "Množství",
      unitPrice: "—",
      unitPriceLabel: "Cena",
      dueDays: 14,
      subtotal: "0 Kč",
      vat: "0 Kč",
      total: "0 Kč",
      invoiceNumber: "2025-015",
    },
    steps: [
      {
        prompt: "Vystav fakturu Alze na 10 000 za IT služby.",
        reply: "Hotovo — Alza, IT služby, 10 000 Kč. Načetl jsem IČO z ARESu.",
        invoice: {
          client: "Alza.cz a.s.",
          clientMeta: "IČO 27082440 · Praha 7",
          itemLabel: "Popis",
          qty: "1",
          qtyLabel: "Množství",
          unitPrice: "10 000 Kč",
          unitPriceLabel: "Cena bez DPH",
          dueDays: 14,
          subtotal: "10 000 Kč",
          vat: "2 100 Kč",
          total: "12 100 Kč",
          invoiceNumber: "2025-015",
        },
        highlight: "client",
        appliedBadge: "Vytvořeno",
      },
    ],
  },
  {
    id: "edit",
    title: "Úprava existující faktury",
    initial: {
      client: "Marek Dvořák s.r.o.",
      clientMeta: "IČO 04857321 · Brno",
      itemLabel: "Položka",
      qty: "16",
      qtyLabel: "Počet hodin",
      unitPrice: "1 200 Kč",
      unitPriceLabel: "Sazba / hod",
      dueDays: 7,
      subtotal: "19 200 Kč",
      vat: "4 032 Kč",
      total: "23 232 Kč",
      invoiceNumber: "2025-014",
    },
    steps: [
      {
        prompt: "Změň počet hodin na 24 a splatnost na 14 dní.",
        reply: "Hotovo — počet hodin 24, splatnost 14 dní.",
        invoice: {
          client: "Marek Dvořák s.r.o.",
          clientMeta: "IČO 04857321 · Brno",
          itemLabel: "Položka",
          qty: "24",
          qtyLabel: "Počet hodin",
          unitPrice: "1 200 Kč",
          unitPriceLabel: "Sazba / hod",
          dueDays: 14,
          subtotal: "28 800 Kč",
          vat: "6 048 Kč",
          total: "34 848 Kč",
          invoiceNumber: "2025-014",
        },
        highlight: "qty",
        appliedBadge: "Upraveno",
      },
      {
        prompt: "Přidej slevu 10 % na celou fakturu.",
        reply: "Sleva 10 % aplikována, přepočítal jsem DPH.",
        invoice: {
          client: "Marek Dvořák s.r.o.",
          clientMeta: "IČO 04857321 · Brno",
          itemLabel: "Položka",
          qty: "24",
          qtyLabel: "Počet hodin",
          unitPrice: "1 200 Kč",
          unitPriceLabel: "Sazba / hod",
          discountLabel: "Sleva 10 %",
          discountValue: "− 2 880 Kč",
          dueDays: 14,
          subtotal: "25 920 Kč",
          vat: "5 443 Kč",
          total: "31 363 Kč",
          invoiceNumber: "2025-014",
        },
        highlight: "discount",
        appliedBadge: "Upraveno",
      },
    ],
  },
];

const TYPING_SPEED = 28; // ms per char
const PAUSE_AFTER_TYPING = 600;
const PAUSE_AFTER_APPLY = 2600;
const PAUSE_BETWEEN_SCENARIOS = 800;

export function AiDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "sent" | "applied">("typing");
  const [flashKey, setFlashKey] = useState(0);

  const scenario = SCENARIOS[scenarioIndex];
  const step = scenario.steps[stepIndex];
  // Show the previous invoice state until "applied" so the change feels reactive
  const shownInvoice: InvoiceState =
    phase === "applied"
      ? step.invoice
      : stepIndex === 0
        ? scenario.initial
        : scenario.steps[stepIndex - 1].invoice;

  useEffect(() => {
    setTyped("");
    setPhase("typing");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(step.prompt.slice(0, i));
      if (i >= step.prompt.length) {
        window.clearInterval(id);
        window.setTimeout(() => {
          setPhase("sent");
          window.setTimeout(() => {
            setPhase("applied");
            setFlashKey((k) => k + 1);
            window.setTimeout(() => {
              const isLastStep = stepIndex >= scenario.steps.length - 1;
              if (isLastStep) {
                // Move to next scenario
                window.setTimeout(() => {
                  setScenarioIndex((s) => (s + 1) % SCENARIOS.length);
                  setStepIndex(0);
                }, PAUSE_BETWEEN_SCENARIOS);
              } else {
                setStepIndex((s) => s + 1);
              }
            }, PAUSE_AFTER_APPLY);
          }, 700);
        }, PAUSE_AFTER_TYPING);
      }
    }, TYPING_SPEED);
    return () => window.clearInterval(id);
  }, [scenarioIndex, stepIndex, step.prompt, scenario.steps.length]);

  return (
    <section className="relative overflow-hidden bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            <Sparkles className="h-3.5 w-3.5" />
            AI asistent · živá ukázka
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Napište, co chcete — faktura se vystaví sama
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            „Vystav fakturu Alze na 10 000 za IT služby." AI dotáhne IČO z ARESu, spočítá DPH a
            vyplní celý formulář. Klikat můžete pořád ručně — AI je bonus, když spěcháte.
          </p>

          {/* Scenario indicator */}
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-1 py-1 text-xs font-medium">
            {SCENARIOS.map((s, idx) => (
              <span
                key={s.id}
                className={`rounded-full px-3 py-1 transition-colors ${
                  idx === scenarioIndex
                    ? "bg-coral text-coral-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {s.title}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Chat panel */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border bg-surface-soft px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-coral/30 bg-coral/10 text-coral">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold text-foreground">AI asistent</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                Online · česky
              </span>
            </div>

            <div className="flex min-h-[280px] flex-col gap-4 p-5 sm:p-6">
              {/* Previous assistant reply for context */}
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-background px-3.5 py-2 text-sm text-foreground/90">
                  {scenario.id === "create"
                    ? "Co potřebujete vystavit? Stačí říct česky."
                    : "Tady je vaše faktura. Co mám upravit?"}
                </div>
              </div>

              {/* User typing */}
              <div className="flex items-start justify-end gap-2.5">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-coral px-3.5 py-2 text-sm text-coral-foreground shadow-soft">
                  {typed || "\u00A0"}
                  {phase === "typing" && (
                    <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-coral-foreground/80 align-middle" />
                  )}
                </div>
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Assistant reply (after sent) */}
              {phase !== "typing" && (
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-border bg-background px-3.5 py-2 text-sm text-foreground/90">
                    {phase === "sent" ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-coral" />
                        {step.reply}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border bg-surface-soft px-5 py-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                <span className="flex-1 truncate">Napište, co potřebujete…</span>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral text-coral-foreground"
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Invoice preview */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border bg-surface-soft px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-coral/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="ml-2 text-xs font-semibold text-muted-foreground">
                  Faktura {shownInvoice.invoiceNumber}
                </span>
              </div>
              {phase === "applied" && step.appliedBadge && (
                <span
                  key={`badge-${flashKey}`}
                  className="inline-flex animate-in fade-in zoom-in-95 items-center gap-1 rounded-full border border-coral/30 bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-coral"
                >
                  <Sparkles className="h-3 w-3" />
                  {step.appliedBadge}
                </span>
              )}
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {/* Client */}
              <div
                key={`client-${flashKey}-${shownInvoice.client}`}
                className={`rounded-xl border p-4 ${
                  step.highlight === "client" && phase === "applied"
                    ? "animate-in fade-in slide-in-from-left-2 border-coral/40 bg-coral/5"
                    : "border-border bg-background"
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Klient
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {shownInvoice.client}
                </div>
                {shownInvoice.clientMeta && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {shownInvoice.clientMeta}
                  </div>
                )}
              </div>

              {/* Line item */}
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {shownInvoice.itemLabel}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {scenario.id === "create"
                    ? "IT služby"
                    : "Konzultace · webový vývoj"}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <Field
                    label={shownInvoice.qtyLabel}
                    value={shownInvoice.qty}
                    flash={step.highlight === "qty" && phase === "applied"}
                    flashKey={flashKey}
                  />
                  <Field label={shownInvoice.unitPriceLabel} value={shownInvoice.unitPrice} />
                  <Field
                    label="Splatnost"
                    value={`${shownInvoice.dueDays} dní`}
                    flash={step.highlight === "due" && phase === "applied"}
                    flashKey={flashKey}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 rounded-xl border border-border bg-background p-4 text-sm">
                <Row label="Mezisoučet" value={shownInvoice.subtotal} />
                {shownInvoice.discountLabel && (
                  <Row
                    label={shownInvoice.discountLabel}
                    value={shownInvoice.discountValue ?? ""}
                    flash={step.highlight === "discount" && phase === "applied"}
                    flashKey={flashKey}
                    accent
                  />
                )}
                <Row label="DPH 21 %" value={shownInvoice.vat} />
                <div className="my-2 h-px bg-border" />
                <div
                  key={`total-${flashKey}`}
                  className={`flex items-baseline justify-between ${
                    phase === "applied" ? "animate-in fade-in slide-in-from-bottom-1" : ""
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">Celkem k úhradě</span>
                  <span className="text-xl font-extrabold tracking-tight text-foreground">
                    {shownInvoice.total}
                  </span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                ⏱ Od zprávy k hotové faktuře — méně než vteřina.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  flash,
  flashKey,
}: {
  label: string;
  value: string;
  flash?: boolean;
  flashKey?: number;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div
        key={flash ? `f-${flashKey}` : undefined}
        className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-sm font-semibold text-foreground ${
          flash ? "animate-in fade-in zoom-in-95 bg-coral/15 text-coral" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  flash,
  flashKey,
  accent,
}: {
  label: string;
  value: string;
  flash?: boolean;
  flashKey?: number;
  accent?: boolean;
}) {
  return (
    <div
      key={flash ? `r-${flashKey}` : undefined}
      className={`flex items-center justify-between ${
        flash ? "animate-in fade-in slide-in-from-right-2" : ""
      }`}
    >
      <span className={accent ? "text-coral" : "text-muted-foreground"}>{label}</span>
      <span className={`font-semibold ${accent ? "text-coral" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
