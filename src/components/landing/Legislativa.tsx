import { ShieldCheck, Calculator, FileCheck2, Scale } from "lucide-react";

const points = [
  {
    icon: Calculator,
    title: "Automatický výpočet DPH",
    desc: "Sazby 21 %, 12 % i 0 % počítáme za vás. Stačí vybrat režim plátce, identifikované osoby nebo neplátce a Vystaveno doplní rozpis daňového základu i sumu DPH.",
  },
  {
    icon: FileCheck2,
    title: "Český formát faktury",
    desc: "Daňový doklad obsahuje všechny náležitosti dle zákona o DPH (§ 29) — IČO, DIČ, DUZP, datum vystavení, splatnost, variabilní symbol i způsob úhrady.",
  },
  {
    icon: ShieldCheck,
    title: "ARES napojení",
    desc: "IČO načte název firmy, adresu i DIČ přímo z obchodního rejstříku. Žádné překlepy, žádné dohledávání — jeden klik a údaje jsou ověřené.",
  },
  {
    icon: Scale,
    title: "Dobropisy a opravné doklady",
    desc: "Opravné daňové doklady (dobropisy) s vlastní řadou OD- a vazbou na původní fakturu — přesně jak vyžaduje účetní praxe i finanční úřad.",
  },
];

export function Legislativa() {
  return (
    <section className="bg-surface-soft py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            Legislativa a DPH
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Postaráme se o náležitosti, vy o byznys
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Vystaveno drží český standard — od správně počítaného DPH 21 % až po IČO, DIČ a všechny
            povinné údaje na daňovém dokladu.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {points.map((p) => (
            <div
              key={p.title}
              className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-coral/30 hover:shadow-soft"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-coral/20 bg-coral/10 text-coral">
                <p.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
          Vystaveno není účetní ani daňový poradce. Pomáháme s formou a výpočty — odpovědnost za
          obsah faktury vždy zůstává na vystaviteli.
        </p>
      </div>
    </section>
  );
}