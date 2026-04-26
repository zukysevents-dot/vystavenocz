import { Sparkles, Bell, QrCode, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const items = [
  {
    icon: Sparkles,
    title: "AI asistent v češtině",
    desc: "Řekni mu, co chceš změnit, a faktura se aktualizuje sama.",
  },
  {
    icon: Bell,
    title: "Automatické upomínky",
    desc: "Systém sám připomene nezaplacené faktury.",
  },
  {
    icon: QrCode,
    title: "QR platby na každé faktuře",
    desc: "Klient zaplatí rychle naskenováním.",
  },
];

export function HighlightFeatures() {
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Vše, co potřebuje živnostník. Nic navíc.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-coral/30 hover:shadow-card"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-coral/20 bg-coral/10 text-coral">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {it.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button variant="outline" size="lg" asChild className="group">
            <Link to="/funkce">
              Všechny funkce
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}