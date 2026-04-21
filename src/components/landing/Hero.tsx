import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles, Mic } from "lucide-react";
import { InvoicePreview } from "./InvoicePreview";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero">
      <div className="absolute inset-0 bg-mesh opacity-70" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
            <Mic className="h-3.5 w-3.5 text-coral" />
            <span>Novinka: Vystav fakturu hlasem — i za jízdy</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Řekni a máš{" "}
            <span className="text-gradient-primary">fakturu hotovou</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">„Vystav fakturu pro Alzu na 2 hodiny konzultace po 1 500 Kč."</span> Hands-free režim pro auto, foto účtenek, AI asistent v češtině. Bez instalace, bez účetnických termínů.
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
            {["🎙️ Hlasem i za jízdy", "📸 Foto účtenky → položky", "Bez platební karty"].map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex -space-x-2">
              {["bg-primary", "bg-coral", "bg-mint", "bg-sun"].map((c, i) => (
                <div
                  key={i}
                  className={`h-7 w-7 rounded-full border-2 border-background ${c}`}
                />
              ))}
            </div>
            <p>
              <span className="font-semibold text-foreground">2 400+ podnikatelů</span> už
              fakturuje s Fakturio.cz
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <InvoicePreview />
        </div>
      </div>
    </section>
  );
}
