import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

const features = [
  "Neomezený počet faktur",
  "Neomezený počet klientů",
  "QR platba na každé faktuře",
  "AI asistent v češtině",
  "Opakované faktury",
  "Vlastní logo a šablony",
  "Cizí měny + kurz ČNB",
  "Automatické upomínky",
  "Export do účetnictví (ISDOC, XML)",
  "Česká podpora e-mailem i telefonem",
];

export function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="cenik" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            Ceník
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Jeden tarif. Všechno v ceně.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Žádné triky, žádná omezení podle počtu faktur. Plaťte jen za to, že vám fakturace
            funguje.
          </p>
        </div>

        {/* Toggle */}
        <div className="mt-10 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                !yearly ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              Měsíčně
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                yearly ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              Ročně
              <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-coral-foreground">
                −37 %
              </span>
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="relative mx-auto mt-10 max-w-xl">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-mint/15 to-coral/15 blur-2xl" />

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-glow">
            <div className="border-b border-border bg-surface-soft px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Fakturio Pro</h3>
                  <p className="text-sm text-muted-foreground">
                    Pro OSVČ i firmy. Vše bez omezení.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="px-8 py-8">
              <div className="flex items-end gap-2">
                <span className="text-6xl font-extrabold tracking-tight text-foreground">
                  {yearly ? "100" : "159"}
                </span>
                <div className="pb-2">
                  <p className="text-lg font-semibold text-foreground">Kč</p>
                  <p className="text-xs text-muted-foreground">měsíčně bez DPH</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {yearly
                  ? "Účtováno ročně 1 200 Kč. Ušetříte 708 Kč."
                  : "Účtováno měsíčně. Přechod na roční tarif kdykoliv."}
              </p>

              <Button variant="coral" size="lg" className="mt-6 w-full" asChild>
                <a href="/registrace">Vyzkoušet 14 dní zdarma</a>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Bez platební karty. Zrušení jedním kliknutím.
              </p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15">
                      <Check className="h-3 w-3 text-success" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Fakturujete méně než 5× měsíčně? Napište nám, máme i tarif Start zdarma.
        </p>
      </div>
    </section>
  );
}
