import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-soft to-primary-soft px-8 py-16 text-center shadow-glow sm:px-16">
          <div className="absolute inset-0 opacity-60 bg-mesh" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Začněte fakturovat za 60 sekund
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Bez kreditní karty. Bez instalace. Bez nutnosti volat účetní. Vystavte první
              fakturu hned po registraci.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="coral" size="xl" className="group">
                Vyzkoušet zdarma
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button variant="outline" size="xl">
                Domluvit ukázku
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
