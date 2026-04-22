import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles, Mic } from "lucide-react";
import { InvoicePreview } from "./InvoicePreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-mesh opacity-70" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="flex flex-col justify-center">
          <a
            href="/registrace"
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-coral shadow-sm backdrop-blur transition-colors hover:bg-coral/15"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral text-coral-foreground">
              <Mic className="h-3 w-3" />
            </span>
            <span className="normal-case tracking-normal text-foreground">
              Novinka: Diktujte fakturu — funguje i v autě
            </span>
            <Sparkles className="h-3.5 w-3.5" />
          </a>

          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.75rem]">
            Fakturujte{" "}
            <span className="text-gradient-primary">hlasem.</span>
            <br className="hidden sm:block" />
            Hotovo za 30 sekund.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Řekněte „Vystav fakturu firmě Alza na 2 hodiny konzultace" a AI asistent v češtině doplní odběratele, položky i DPH. Funguje i hands‑free v autě. Pro OSVČ, plátce i neplátce DPH.
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
        </div>

        <div className="flex items-center justify-center">
          <InvoicePreview />
        </div>
      </div>
    </section>
  );
}
