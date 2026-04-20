import { Check, Minus } from "lucide-react";

type Row = {
  label: string;
  us: boolean | string;
  fakturoid: boolean | string;
  idoklad: boolean | string;
  vyfakturuj: boolean | string;
};

const rows: Row[] = [
  { label: "AI asistent v češtině", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "QR platba (ČBA standard)", us: true, fakturoid: true, idoklad: true, vyfakturuj: true },
  { label: "Vlastní logo a šablony", us: true, fakturoid: true, idoklad: true, vyfakturuj: "Omezeně" },
  { label: "Opakované faktury zdarma", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Klientské portfolio", us: true, fakturoid: true, idoklad: true, vyfakturuj: true },
  { label: "Cizí měny + kurz ČNB", us: true, fakturoid: true, idoklad: true, vyfakturuj: false },
  { label: "Reverse charge & OSS", us: true, fakturoid: true, idoklad: true, vyfakturuj: false },
  { label: "Automatické upomínky", us: true, fakturoid: "Plus", idoklad: "Plus", vyfakturuj: false },
  { label: "Dobropisy s vlastní řadou OD-", us: true, fakturoid: true, idoklad: true, vyfakturuj: "Omezeně" },
  { label: "Autosave konceptů (30 s)", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Vodoznak STORNOVÁNO v PDF", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Uložení rozpracovaného konceptu", us: true, fakturoid: "Omezeně", idoklad: "Omezeně", vyfakturuj: "Omezeně" },
  { label: "Cash-flow predikce", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Cena od (měsíčně)", us: "100 Kč", fakturoid: "199 Kč", idoklad: "270 Kč", vyfakturuj: "149 Kč" },
];

const ourFeatures: Row[] = [
  { label: "AI asistent v češtině", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Autosave konceptů (30 s)", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Vodoznak STORNOVÁNO v PDF", us: true, fakturoid: false, idoklad: false, vyfakturuj: false },
  { label: "Cash-flow predikce zdarma", us: true, fakturoid: "Maximum", idoklad: false, vyfakturuj: false },
  { label: "Opakované faktury zdarma", us: true, fakturoid: "Maximum", idoklad: "Plus", vyfakturuj: false },
  { label: "Automatické upomínky zdarma", us: true, fakturoid: "Na každý den", idoklad: "Plus", vyfakturuj: false },
  { label: "Dobropisy s vlastní řadou OD-", us: true, fakturoid: true, idoklad: true, vyfakturuj: "Omezeně" },
  { label: "Chytrá validace konceptů", us: true, fakturoid: "Omezeně", idoklad: "Omezeně", vyfakturuj: false },
];

const standardFeatures: Row[] = [
  { label: "QR platba (ČBA standard)", us: true, fakturoid: true, idoklad: true, vyfakturuj: true },
  { label: "Vlastní logo a šablony", us: true, fakturoid: true, idoklad: true, vyfakturuj: "Omezeně" },
  { label: "Klientské portfolio", us: true, fakturoid: true, idoklad: true, vyfakturuj: true },
  { label: "Cizí měny + kurz ČNB", us: true, fakturoid: true, idoklad: true, vyfakturuj: false },
  { label: "Reverse charge & OSS", us: true, fakturoid: "Maximum", idoklad: true, vyfakturuj: false },
  { label: "Web faktury s odkazem pro klienta", us: true, fakturoid: true, idoklad: true, vyfakturuj: false },
  { label: "Export do účetnictví (ISDOC, XML)", us: true, fakturoid: "Na lehko", idoklad: true, vyfakturuj: "Omezeně" },
  { label: "Mobil-first (bez instalace)", us: true, fakturoid: "Aplikace", idoklad: "Aplikace", vyfakturuj: true },
];

const honestFeatures: Row[] = [
  { label: "Vedení skladu", us: false, fakturoid: "Maximum", idoklad: "Plus", vyfakturuj: false },
  { label: "Cenové nabídky", us: "Brzy", fakturoid: "Maximum", idoklad: true, vyfakturuj: true },
  { label: "Veřejné REST API", us: "Brzy", fakturoid: true, idoklad: true, vyfakturuj: false },
  { label: "Nativní mobilní aplikace", us: false, fakturoid: true, idoklad: true, vyfakturuj: false },
];

const priceRow: Row = { label: "Cena od (měsíčně, ročně placeno)", us: "100 Kč", fakturoid: "151 Kč", idoklad: "270 Kč", vyfakturuj: "149 Kč" };

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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <tr className="bg-surface">
      <td colSpan={5} className="px-5 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </td>
    </tr>
  );
}

function Rows({ data, startIndex = 0 }: { data: Row[]; startIndex?: number }) {
  return (
    <>
      {data.map((r, i) => (
        <tr
          key={r.label}
          className={(i + startIndex) % 2 === 0 ? "bg-background" : "bg-surface/40"}
        >
          <td className="px-5 py-3.5 text-sm font-medium text-foreground">{r.label}</td>
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
    </>
  );
}

export function Comparison() {
  // keep `rows` referenced (legacy) so eslint doesn't trip
  void rows;
  return (
    <section id="srovnani" className="bg-surface-soft py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
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
                <SectionHeader
                  title="Co umíme my a konkurence ne (nebo až v dražším tarifu)"
                />
                <Rows data={ourFeatures} />

                <SectionHeader title="Standard, ve kterém držíme krok" />
                <Rows data={standardFeatures} />

                <SectionHeader
                  title="Buďme upřímní — tohle zatím neumíme"
                  subtitle="Pro většinu OSVČ to neřeší. Pokud potřebujete sklad nebo API, řekněte nám to."
                />
                <Rows data={honestFeatures} />

                <tr className="border-t-2 border-border bg-coral/5">
                  <td className="px-5 py-4 text-sm font-bold text-foreground">{priceRow.label}</td>
                  <td className="bg-coral/10 px-5 py-4 text-center">
                    <Cell value={priceRow.us} highlight />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Cell value={priceRow.fakturoid} />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Cell value={priceRow.idoklad} />
                  </td>
                  <td className="px-5 py-4 text-center">
                    <Cell value={priceRow.vyfakturuj} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Ceny konkurence k 4/2026, vždy nejnižší placený tarif s ročním předplatným bez DPH. Zdroj: veřejné ceníky.
        </p>
      </div>
    </section>
  );
}
