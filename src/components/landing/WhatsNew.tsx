import { Sparkles, FileMinus, Save, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const items = [
  {
    icon: Sparkles,
    badge: "AI",
    title: "AI asistent v češtině",
    desc: 'Napište „přidej slevu 10 %" nebo „změň splatnost na 30 dní" a faktura se aktualizuje sama.',
  },
  {
    icon: FileMinus,
    badge: "Novinka",
    title: "Dobropisy jedním klikem",
    desc: "Z vystavené faktury vytvoříte opravný daňový doklad s vlastní řadou OD- a vazbou na původní fakturu.",
  },
  {
    icon: Save,
    badge: "Novinka",
    title: "Autosave konceptů",
    desc: "Každých 30 sekund automaticky ukládáme rozpracovanou fakturu. O práci nepřijdete, ani když zavřete tab.",
  },
];

export function WhatsNew() {
  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            Co je nového
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Nedávno přidané funkce
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pořád stavíme. Tady jsou tři věci, které vám ušetří nejvíc času.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-coral/30 hover:shadow-soft"
            >
              <span className="absolute right-4 top-4 rounded-full border border-coral/30 bg-coral/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-coral">
                {it.badge}
              </span>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-coral/20 bg-coral/10 text-coral">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{it.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.desc}</p>
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
