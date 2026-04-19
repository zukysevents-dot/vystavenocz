import { Check, Minus } from "lucide-react";

const rows: { label: string; us: boolean | string; fakturoid: boolean | string; idoklad: boolean | string; vyfakturuj: boolean | string }[] = [
  { label: "AI asistent v češtině", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "QR platba (ČBA standard)", us: true, fakturoid: true, idoklad: true, vyfakturuj: true },
  { label: "Vlastní logo a šablony", us: true, fakturoid: true, idoklad: true, vyfakturuj: "Omezeně" },
  { label: "Opakované faktury zdarma", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Klientské portfolio", us: true, fakturoid: true, idoklad: true, vyfakturuj: true },
  { label: "Cizí měny + kurz ČNB", us: true, fakturoid: true, idoklad: true, vyfakturuj: false },
  { label: "Reverse charge & OSS", us: true, fakturoid: true, idoklad: true, vyfakturuj: false },
  { label: "Automatické upomínky", us: true, fakturoid: "Plus", idoklad: "Plus", vyfakturuj: false },
  { label: "Cash-flow predikce", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Cena od (měsíčně)", us: "100 Kč", fakturoid: "199 Kč", idoklad: "270 Kč", vyfakturuj: "149 Kč" },
];

function Cell({ value, highlight = false }: { value: boolean | string; highlight?: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className={`mx-auto h-5 w-5 ${highlight ? "text-coral" : "text-success"}`} />
    ) : (
      <Minus className="mx-auto h-5 w-5 text-muted-foreground/40" />
    );
  }
  return (
    <span
      className={`text-sm font-semibold ${highlight ? "text-coral" : "text-muted-foreground"}`}
    >
      {value}
    </span>
  );
}

export function Comparison() {
  return (
    <section id="srovnani" className="bg-surface-soft py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            Srovnání s konkurencí
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Více funkcí. Lepší cena. Česky.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Porovnali jsme Fakturio s nejznámějšími českými fakturačními službami.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Funkce
                  </th>
                  <th className="bg-coral/10 px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-coral">
                    Fakturio.cz
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fakturoid
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    iDoklad
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vyfakturuj
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.label}
                    className={i % 2 === 0 ? "bg-background" : "bg-surface/40"}
                  >
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                      {r.label}
                    </td>
                    <td className="bg-coral/5 px-5 py-3.5 text-center">
                      <Cell value={r.us} highlight />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Cell value={r.fakturoid} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Cell value={r.idoklad} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Cell value={r.vyfakturuj} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Ceny konkurence k 4/2026, vždy nejnižší placený tarif. Zdroj: veřejné ceníky.
        </p>
      </div>
    </section>
  );
}
