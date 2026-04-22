import { useEffect, useState } from "react";
import { Sparkles, Send, User, Check } from "lucide-react";

type Step = {
  /** What the user types in the chat */
  prompt: string;
  /** Short confirmation from the assistant */
  reply: string;
  /** Invoice fields after the change is applied */
  invoice: {
    qty: string;
    unitPrice: string;
    discountLabel?: string;
    discountValue?: string;
    dueDays: number;
    subtotal: string;
    vat: string;
    total: string;
  };
  /** Which invoice field flashes on update */
  highlight: "qty" | "discount" | "due" | "total";
};

const STEPS: Step[] = [
  {
    prompt: "Změň počet hodin na 24 a splatnost na 14 dní.",
    reply: "Hotovo — počet hodin 24, splatnost 14 dní.",
    invoice: {
      qty: "24",
      unitPrice: "1 200 Kč",
      dueDays: 14,
      subtotal: "28 800 Kč",
      vat: "6 048 Kč",
      total: "34 848 Kč",
    },
    highlight: "qty",
  },
  {
    prompt: "Přidej slevu 10 % na celou fakturu.",
    reply: "Sleva 10 % aplikována, přepočítal jsem DPH.",
    invoice: {
      qty: "24",
      unitPrice: "1 200 Kč",
      discountLabel: "Sleva 10 %",
      discountValue: "− 2 880 Kč",
      dueDays: 14,
      subtotal: "25 920 Kč",
      vat: "5 443 Kč",
      total: "31 363 Kč",
    },
    highlight: "discount",
  },
  {
    prompt: "Splatnost prodluž na 30 dní.",
    reply: "Splatnost nastavena na 30 dní.",
    invoice: {
      qty: "24",
      unitPrice: "1 200 Kč",
      discountLabel: "Sleva 10 %",
      discountValue: "− 2 880 Kč",
      dueDays: 30,
      subtotal: "25 920 Kč",
      vat: "5 443 Kč",
      total: "31 363 Kč",
    },
    highlight: "due",
  },
];

const TYPING_SPEED = 28; // ms per char
const PAUSE_AFTER_TYPING = 600;
const PAUSE_AFTER_APPLY = 2400;

export function AiDemo() {
  const [stepIndex, setStepIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "sent" | "applied">("typing");
  const [flashKey, setFlashKey] = useState(0);

  const step = STEPS[stepIndex];
  // Show the previous invoice state until "applied" so the change feels reactive
  const shownStep = phase === "applied" ? step : STEPS[(stepIndex - 1 + STEPS.length) % STEPS.length];

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
              setStepIndex((s) => (s + 1) % STEPS.length);
            }, PAUSE_AFTER_APPLY);
          }, 700);
        }, PAUSE_AFTER_TYPING);
      }
    }, TYPING_SPEED);
    return () => window.clearInterval(id);
  }, [stepIndex, step.prompt]);

  return (
    <section className="relative overflow-hidden bg-surface py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            <Sparkles className="h-3.5 w-3.5" />
            Živá ukázka
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Napíšete, co chcete změnit. Faktura se přepíše hned.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Žádné klikání po formulářích. AI rozumí česky a sama přepočítá DPH, slevy i splatnost.
          </p>
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
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
                  Tady je faktura. Klidně mi řekněte, co upravit.
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
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        {step.reply}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border bg-surface-soft px-5 py-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                <span className="flex-1 truncate">Napište, co upravit…</span>
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
                  Faktura 2025-014
                </span>
              </div>
              {phase === "applied" && (
                <span
                  key={`badge-${flashKey}`}
                  className="inline-flex animate-in fade-in zoom-in-95 items-center gap-1 rounded-full border border-coral/30 bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-coral"
                >
                  <Sparkles className="h-3 w-3" />
                  Upraveno
                </span>
              )}
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {/* Line item */}
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Položka
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  Konzultace · webový vývoj
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <Field
                    label="Počet hodin"
                    value={shownStep.invoice.qty}
                    flash={shownStep.highlight === "qty" && phase === "applied"}
                    flashKey={flashKey}
                  />
                  <Field label="Sazba / hod" value={shownStep.invoice.unitPrice} />
                  <Field
                    label="Splatnost"
                    value={`${shownStep.invoice.dueDays} dní`}
                    flash={shownStep.highlight === "due" && phase === "applied"}
                    flashKey={flashKey}
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 rounded-xl border border-border bg-background p-4 text-sm">
                <Row label="Mezisoučet" value={shownStep.invoice.subtotal} />
                {shownStep.invoice.discountLabel && (
                  <Row
                    label={shownStep.invoice.discountLabel}
                    value={shownStep.invoice.discountValue ?? ""}
                    flash={shownStep.highlight === "discount" && phase === "applied"}
                    flashKey={flashKey}
                    accent
                  />
                )}
                <Row label="DPH 21 %" value={shownStep.invoice.vat} />
                <div className="my-2 h-px bg-border" />
                <div
                  key={`total-${flashKey}`}
                  className={`flex items-baseline justify-between ${
                    phase === "applied" ? "animate-in fade-in slide-in-from-bottom-1" : ""
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">Celkem k úhradě</span>
                  <span className="text-xl font-extrabold tracking-tight text-foreground">
                    {shownStep.invoice.total}
                  </span>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                ⏱ Od zprávy k přepočítané faktuře — méně než vteřina.
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