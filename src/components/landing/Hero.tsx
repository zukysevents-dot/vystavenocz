import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ShieldCheck, MapPin, Zap } from "lucide-react";
import { DashboardPreview } from "./DashboardPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-mesh opacity-25" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-36 lg:pt-28">
        <div className="flex flex-col justify-center">
          <div className="mb-7 inline-flex w-fit items-center rounded-full border border-border bg-card/70 px-3.5 py-1.5 text-xs font-medium text-foreground/85 backdrop-blur-sm">
            Vše co Fakturoid Plus za polovinu
          </div>

          <h1 className="text-[2.5rem] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[3.25rem] lg:text-[4rem]">
            Vystav fakturu{" "}
            <span className="text-coral">za 30 sekund.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-[1.65] text-muted-foreground">
            Vše co umí Fakturoid nebo iDoklad — AI asistent, QR platby, ARES,
            opakované faktury i upomínky. Jen za <span className="font-semibold text-foreground">100 Kč/měsíc</span> místo 200+.
          </p>

          <ul className="mt-9 space-y-4 text-[15px] text-foreground/90">
            {[
              "AI asistent v češtině — sestaví fakturu na povel (nikdo jiný nemá)",
              "Opakované faktury a upomínky v základu — u konkurence jen v Premium",
              "Neomezené faktury i klienti — bez skrytých limitů a příplatků",
              "Mobile-first — funguje stejně dobře v terénu jako na PC",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <Check
                  className="mt-[5px] h-4 w-4 shrink-0 text-coral"
                  strokeWidth={1.5}
                />
                <span className="leading-[1.55]">{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" variant="coral" className="group w-full sm:w-auto" asChild>
              <a href="/registrace">
                Začít zdarma
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="/funkce">Podívat se na funkce</a>
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground/90">
            14 dní zdarma bez karty. Po zkušební době od 100 Kč/měsíc.
          </p>

          {/* Mikro social proof — důvěryhodné signály bez vymyšlených čísel */}
          <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-border/60 pt-6 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.75} />
              Plně dle českého zákona
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.75} />
              Vyrobeno v Česku
            </li>
            <li className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.75} />
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
