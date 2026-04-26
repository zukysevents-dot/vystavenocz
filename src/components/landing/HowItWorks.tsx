import { Building2, Sparkles, Send } from "lucide-react";

const steps = [
  {
    icon: Building2,
    n: "1",
    title: "Vyplň klienta",
    desc: "Zadej IČO, zbytek doplníme z ARESu automaticky.",
  },
  {
    icon: Sparkles,
    n: "2",
    title: "Napiš, za co ti platí",
    desc: "Nebo napiš AI asistentovi, co chceš, a on fakturu sestaví nebo upraví.",
  },
  {
    icon: Send,
    n: "3",
    title: "Pošli fakturu klientovi",
    desc: "Mailem, jako PDF nebo s QR kódem k okamžité platbě.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-surface-soft py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Faktura hotová ve třech krocích
          </h2>
        </div>

        <div className="relative mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-coral/20 bg-coral/10 text-coral">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold tracking-[0.2em] text-muted-foreground/50">
                  0{s.n}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          Hotovo. V přehledu vidíš, co je zaplacené a co je po splatnosti.
        </p>
      </div>
    </section>
  );
}