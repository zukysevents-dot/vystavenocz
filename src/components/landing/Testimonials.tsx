import { Quote } from "lucide-react";

const items = [
  {
    quote: "Konečně faktura hotová, než dojdu k autu.",
    name: "Petr",
    role: "elektrikář",
  },
  {
    quote: "Nemusím volat účetní, prostě jí pošlu export.",
    name: "Jana",
    role: "grafička na volné noze",
  },
  {
    quote: "AI asistent mi ušetřil spoustu času.",
    name: "Marek",
    role: "konzultant",
  },
];

export function Testimonials() {
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pár vět od lidí jako ty
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6"
            >
              <Quote className="h-5 w-5 text-muted-foreground/50" aria-hidden />
              <blockquote className="mt-3 text-base leading-relaxed text-foreground">
                „{t.quote}"
              </blockquote>
              <figcaption className="mt-5 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{t.name}</span> ·{" "}
                {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}