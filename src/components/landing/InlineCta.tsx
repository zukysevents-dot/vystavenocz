import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type Props = {
  /** Krátký nadpis (1 věta). */
  title: string;
  /** Volitelný řádek pod nadpisem. */
  hint?: string;
};

/**
 * Kompaktní mid-page CTA — proužek mezi sekcemi, který opakuje hlavní akci
 * „Začít zdarma" bez vizuální váhy plné CTA sekce. Záměrně bez gradientu
 * a bez velkých marginů, aby narušil tok co nejméně.
 */
export function InlineCta({ title, hint = "14 dní zdarma · bez karty" }: Props) {
  return (
    <section className="bg-background py-10 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 text-center sm:flex-row sm:text-left">
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground sm:text-lg">
              {title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          </div>
          <Button variant="coral" size="lg" className="group shrink-0" asChild>
            <a href="/registrace">
              Začít zdarma
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}