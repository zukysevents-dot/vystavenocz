import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-14 text-center sm:px-16">
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Přestaň ztrácet čas v Excelu.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Začni fakturovat jednoduše — dnes, zdarma, bez karty.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="coral" size="xl" className="group" asChild>
                <a href="/registrace">
                  Začít zdarma
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              14 dní zdarma bez karty · Zrušení jedním kliknutím
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
