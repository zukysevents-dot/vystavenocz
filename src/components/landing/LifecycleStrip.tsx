import { FilePlus2, Send, CheckCircle2, Archive } from "lucide-react";

const stages = [
  {
    icon: FilePlus2,
    title: "Vystavíš",
    desc: "AI nebo formulář — za 30 sekund.",
  },
  {
    icon: Send,
    title: "Pošleš",
    desc: "Mail s PDF a QR kódem na jeden klik.",
  },
  {
    icon: CheckCircle2,
    title: "Pohlídá splatnost",
    desc: "Automatické upomínky bez tvého zásahu.",
  },
  {
    icon: Archive,
    title: "Najdeš kdykoli",
    desc: "Všechny faktury, klienti i historie na jednom místě.",
  },
];

/**
 * Krátká „lifecycle“ sekce — ukazuje, že Vystaveno pokrývá celý život
 * faktury, ne jen vystavení. Záměrně kompaktní, žádné dlouhé texty.
 */
export function LifecycleStrip() {
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Celý život faktury na jednom místě
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Od vystavení po archiv. Bez Excelu, bez papírů, bez ztracených PDF v mailu.
          </p>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((s, i) => (
            <li
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-coral/20 bg-coral/10 text-coral">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold tracking-[0.18em] text-muted-foreground/50">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}