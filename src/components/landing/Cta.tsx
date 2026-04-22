import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-coral/20 bg-surface px-8 py-16 text-center shadow-glow sm:px-16">
          <div className="absolute inset-0 opacity-50 bg-mesh" aria-hidden />
          <div
            className="absolute -inset-px rounded-3xl"
            aria-hidden
            style={{
              background:
                "radial-gradient(60% 80% at 50% 0%, color-mix(in oklab, var(--coral) 18%, transparent), transparent 70%)",
            }}
          />
          <div className="relative">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-coral">
              Začněte ještě dnes
            </p>
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Začněte fakturovat za 60 sekund
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Bez kreditní karty. Bez instalace. Bez nutnosti volat účetní. Vystavte první
              fakturu hned po registraci.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="coral" size="xl" className="group" asChild>
                <a href="/registrace">
                  Vyzkoušet 14 dní zdarma
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <a href="/prihlaseni">Přihlásit se</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
