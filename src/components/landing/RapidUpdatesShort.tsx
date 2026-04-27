import { Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Velmi krátká verze „Stavíme to s vámi" — jen důkaz, že produkt rychle
 * vylepšujeme podle zpětné vazby od reálných uživatelů. Detailní roadmap,
 * tabulky a příklady byly schválně odstraněny, aby se nesnižovala konverze.
 */
export function RapidUpdatesShort() {
  return (
    <section className="bg-surface-soft py-14 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Stavíme to s vámi
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Co napíšete, to brzo uvidíte
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          Drobná vylepšení obvykle nasadíme do pár dní. Když vám něco chybí, napište — odpovídáme osobně.
        </p>

        <div className="mt-6 flex justify-center">
          <Button variant="outline" size="lg" asChild>
            <a href="mailto:zukys.events@gmail.com?subject=N%C3%A1vrh%20na%20vylep%C5%A1en%C3%AD%20Vystaveno">
              <Mail className="h-4 w-4" />
              Navrhnout vylepšení
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}