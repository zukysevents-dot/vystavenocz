import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center shadow-card sm:px-16 sm:py-20">
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Přestaň ztrácet čas v Excelu.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground sm:text-xl">
              Začni fakturovat jednoduše — dnes, zdarma, bez karty.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="coral" size="xl" className="group h-14 px-10 text-base" asChild>
                <a href="/registrace">
                  Začít zdarma za 30 sekund
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              14 dní zdarma bez karty · Zrušení jedním kliknutím
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
