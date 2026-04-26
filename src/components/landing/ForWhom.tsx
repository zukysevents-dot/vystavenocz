import { Briefcase, Wrench, Scissors } from "lucide-react";

const groups = [
  {
    icon: Briefcase,
    title: "Freelanceři a konzultanti",
    desc: "IT, marketing, grafika, lektoři, poradci.",
  },
  {
    icon: Scissors,
    title: "OSVČ a malé služby",
    desc: "Kadeřnice, trenéři, servisy, terapeuti.",
  },
  {
    icon: Wrench,
    title: "Řemeslníci",
    desc: "Elektrikáři, instalatéři, truhláři, malíři, opraváři.",
  },
];

export function ForWhom() {
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Děláš práci, ne účetnictví
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Vystaveno.cz je pro všechny, kdo si vydělávají vlastníma rukama nebo
            hlavou a chtějí mít fakturu hotovou rychle a bez zbytečností.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.title}
              className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-coral/30 hover:shadow-card"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-coral/20 bg-coral/10 text-coral">
                <g.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{g.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {g.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}