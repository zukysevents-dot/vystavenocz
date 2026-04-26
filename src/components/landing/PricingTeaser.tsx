import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";

const includes = [
  "Neomezené faktury i klienti",
  "AI asistent v češtině",
  "QR platby a načítání z ARESu",
  "Automatické DPH a upomínky",
];

export function PricingTeaser() {
  return (
    <section className="bg-surface-soft py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Začni zdarma. Plať, až ti to vydělává.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            14 dní zdarma bez karty. Potom plný přístup od{" "}
            <span className="font-semibold text-foreground">100 Kč/měsíc</span>{" "}
            při roční platbě. Neomezené faktury, klienti, AI asistent a všechny
            hlavní funkce v ceně.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
                100
              </span>
              <div className="pb-2 text-left">
                <p className="text-base font-semibold text-foreground">Kč/měs</p>
                <p className="text-xs text-muted-foreground">při ročním placení</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Měsíční tarif 159 Kč/měs. Cena je konečná — neplátce DPH.
            </p>
          </div>

          <ul className="mx-auto mt-6 grid max-w-md gap-2.5 sm:grid-cols-2">
            {includes.map((it) => (
              <li key={it} className="flex items-start gap-2 text-sm text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-coral/15 text-coral">
                  <Check className="h-3 w-3" />
                </span>
                {it}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button variant="coral" size="lg" asChild className="w-full sm:w-auto">
              <a href="/registrace">Začít zdarma</a>
            </Button>
            <Button variant="outline" size="lg" asChild className="group w-full sm:w-auto">
              <Link to="/cenik">
                Zobrazit ceník
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Žádné závazky. Kdykoli můžeš skončit.
          </p>
        </div>
      </div>
    </section>
  );
}