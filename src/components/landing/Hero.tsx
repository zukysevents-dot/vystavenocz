import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles, ShieldCheck, MapPin, Zap } from "lucide-react";
import { DashboardPreview } from "./DashboardPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-mesh opacity-70" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral/15 text-coral">
              <Sparkles className="h-3 w-3" />
            </span>
            <span className="text-foreground">Vše co Fakturoid Plus · za polovinu</span>
            <span className="hidden h-3 w-px bg-border sm:inline-block" />
            <span className="hidden items-center gap-1 text-coral sm:inline-flex">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                14 dní zdarma
              </span>
            </span>
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.75rem]">
            Vystav fakturu{" "}
            <span className="text-coral">za 30 sekund.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Vše co umí Fakturoid nebo iDoklad — AI asistent, QR platby, ARES,
            opakované faktury i upomínky. Jen za <span className="font-semibold text-foreground">100 Kč/měsíc</span> místo 200+.
          </p>

          <ul className="mt-7 space-y-2.5 text-[15px] text-foreground/90">
            {[
              "AI asistent v češtině — sestaví fakturu na povel (nikdo jiný nemá)",
              "Opakované faktury a upomínky v základu — u konkurence jen v Premium",
              "Neomezené faktury i klienti — bez skrytých limitů a příplatků",
              "Mobile-first — funguje stejně dobře v terénu jako na PC",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral/15 text-coral">
                  <Check className="h-3 w-3" />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="coral" className="group" asChild>
              <a href="/registrace">
                Začít zdarma
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/funkce">Podívat se na funkce</a>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            14 dní zdarma bez karty. Po zkušební době od 100 Kč/měsíc.
          </p>

          {/* Mikro social proof — důvěryhodné signály bez vymyšlených čísel */}
          <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-coral" />
              Plně dle českého zákona
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-coral" />
              Vyrobeno v Česku
            </li>
            <li className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-coral" />
              Spuštění za 60 sekund
            </li>
          </ul>
        </div>

        <div className="flex items-center justify-center">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
