import { Check, Clock, Sparkles } from "lucide-react";

type Status = "done" | "soon" | "planned";

const items: { title: string; desc: string; status: Status; when?: string }[] = [
  {
    title: "AI asistent v češtině",
    desc: "Sestaví, opraví a doplní fakturu na povel.",
    status: "done",
  },
  {
    title: "Opakované faktury a upomínky",
    desc: "Automaticky vystavené i odeslané — bez tvého zásahu.",
    status: "done",
  },
  {
    title: "Načítání z ARESu",
    desc: "Stačí zadat IČO a údaje firmy se doplní samy.",
    status: "done",
  },
  {
    title: "QR platby a export do účetnictví",
    desc: "Každá faktura má QR kód. Export do ISDOC a XML pro účetní.",
    status: "done",
  },
  {
    title: "Instalace na mobil (PWA)",
    desc: "Přidej Vystaveno na plochu telefonu — funguje jako appka.",
    status: "done",
  },
  {
    title: "Cenové nabídky",
    desc: "Vystav nabídku, klient ji potvrdí, jedním klikem se promění ve fakturu.",
    status: "soon",
    when: "Q2 2026",
  },
  {
    title: "Skladové položky a katalog",
    desc: "Ulož si produkty a služby — stačí pak vybrat ze seznamu.",
    status: "soon",
    when: "Q2 2026",
  },
  {
    title: "Veřejné API a webhooky",
    desc: "Napojení na e-shopy, CRM a vlastní automatizace.",
    status: "planned",
    when: "Q3 2026",
  },
  {
    title: "Ruční párování plateb",
    desc: "Nahraj výpis z banky (CSV) a přiřaď platby k fakturám.",
    status: "planned",
    when: "Q3 2026",
  },
];

const statusMap: Record<Status, { label: string; className: string; icon: typeof Check }> = {
  done: {
    label: "Hotovo",
    className: "bg-success/15 text-success",
    icon: Check,
  },
  soon: {
    label: "Brzy",
    className: "bg-coral/15 text-coral",
    icon: Sparkles,
  },
  planned: {
    label: "V plánu",
    className: "bg-muted text-muted-foreground",
    icon: Clock,
  },
};

export function Roadmap() {
  return (
    <section className="bg-surface-soft py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Roadmapa
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Co už umíme a co chystáme
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Vystaveno se vyvíjí každý týden podle zpětné vazby od skutečných
            uživatelů. Tady je, na čem pracujeme.
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const s = statusMap[item.status];
            const Icon = s.icon;
            return (
              <li
                key={item.title}
                className="flex flex-col rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}
                  >
                    <Icon className="h-3 w-3" />
                    {s.label}
                  </span>
                  {item.when && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.when}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted-foreground">
          Chybí ti něco konkrétního? Napiš nám na{" "}
          <a href="mailto:zukys.events@gmail.com" className="font-medium text-foreground underline">
            zukys.events@gmail.com
          </a>{" "}
          — funkce přidáváme podle poptávky.
        </p>
      </div>
    </section>
  );
}