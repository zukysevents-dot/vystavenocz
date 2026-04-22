import { Button } from "@/components/ui/button";
import { ArrowRight, Check, FileText, QrCode, Wallet, Sparkles } from "lucide-react";
import { DashboardPreview } from "./DashboardPreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-mesh opacity-70" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral/15 text-coral">
              <FileText className="h-3 w-3" />
            </span>
            <span className="text-foreground">Česká fakturace pro OSVČ a firmy</span>
            <span className="hidden h-3 w-px bg-border sm:inline-block" />
            <span className="hidden items-center gap-1 text-coral sm:inline-flex">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                + AI asistent
              </span>
            </span>
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.75rem]">
            Faktury, které{" "}
            <span className="text-gradient-primary">vystavíte za 30 sekund.</span>
            <br className="hidden sm:block" />
            A přehled, který se sám stará.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Vystavujte, posílejte a sledujte faktury na jednom místě. Automatické DPH 21 %, QR
            platba, IČO/DIČ z ARESu, přehled stavů a připomínky splatnosti. Pro OSVČ, plátce
            i neplátce DPH.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="coral" className="group" asChild>
              <a href="/registrace">
                Vyzkoušet 14 dní zdarma
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/prihlaseni">Mám již účet</a>
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Bez platební karty", "Zrušení kdykoliv", "Česká podpora"].map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-coral" />
              Faktury, dobropisy, zálohy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5 text-coral" />
              QR platby
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-coral" />
              Sledování stavů & splatnosti
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
