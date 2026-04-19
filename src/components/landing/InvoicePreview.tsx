import { Logo } from "./Logo";
import { QrCode } from "lucide-react";

/**
 * Stylizovaná ukázka faktury — světlý "papírový" vzhled na tmavém pozadí.
 * Záměrně používá explicitní světlé barvy, aby vypadala jako reálná faktura.
 */
export function InvoicePreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* dekorativní glow za fakturou */}
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/40 via-mint/25 to-coral/30 blur-3xl" />

      <div className="rotate-1 transition-transform duration-500 hover:rotate-0">
        <div className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-glow ring-1 ring-white/20">
          {/* Hlavička */}
          <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex items-center gap-2">
              <Logo variant="mark" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Dodavatel
                </p>
                <p className="text-sm font-semibold text-slate-900">Fakturio.cz s.r.o.</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Faktura
              </p>
              <p className="text-base font-bold text-slate-900">2025-0042</p>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-2 border-b border-slate-200 px-6 py-4 text-[11px]">
            <div>
              <p className="text-slate-500">Vystaveno</p>
              <p className="font-semibold text-slate-900">19. 4. 2026</p>
            </div>
            <div>
              <p className="text-slate-500">Splatnost</p>
              <p className="font-semibold text-slate-900">3. 5. 2026</p>
            </div>
            <div>
              <p className="text-slate-500">DUZP</p>
              <p className="font-semibold text-slate-900">19. 4. 2026</p>
            </div>
          </div>

          {/* Položky */}
          <div className="px-6 py-4">
            <div className="mb-2 grid grid-cols-12 gap-2 border-b border-slate-200 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span className="col-span-7">Položka</span>
              <span className="col-span-2 text-right">Ks</span>
              <span className="col-span-3 text-right">Cena</span>
            </div>

            {[
              { name: "Konzultace UX", q: "4 h", price: "8 000" },
              { name: "Návrh designu", q: "1 ks", price: "12 000" },
              { name: "Implementace", q: "10 h", price: "15 000" },
            ].map((row) => (
              <div
                key={row.name}
                className="grid grid-cols-12 gap-2 py-1.5 text-xs text-slate-900"
              >
                <span className="col-span-7">{row.name}</span>
                <span className="col-span-2 text-right text-slate-500">{row.q}</span>
                <span className="col-span-3 text-right font-medium">{row.price} Kč</span>
              </div>
            ))}
          </div>

          {/* Součty */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Základ DPH 21 %</span>
              <span>35 000 Kč</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>DPH 21 %</span>
              <span>7 350 Kč</span>
            </div>
            <div className="mt-2 flex items-end justify-between border-t border-slate-200 pt-2">
              <span className="text-sm font-semibold text-slate-900">K úhradě</span>
              <span className="text-xl font-bold text-teal-600">42 350 Kč</span>
            </div>
          </div>

          {/* QR platba */}
          <div className="flex items-center gap-3 border-t border-slate-200 px-6 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-900 text-white">
              <QrCode className="h-9 w-9" />
            </div>
            <div className="text-[11px] leading-tight">
              <p className="font-semibold text-slate-900">QR platba</p>
              <p className="text-slate-500">
                Naskenujte v bance — zaplaceno za 5 sekund
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plovoucí badge */}
      <div className="absolute -bottom-4 -right-2 rotate-3 rounded-full bg-coral px-4 py-2 text-xs font-bold text-coral-foreground shadow-glow sm:-right-6">
        ✨ Vystaveno za 30 s
      </div>
      <div className="absolute -left-2 top-1/3 -rotate-6 rounded-full bg-mint px-3 py-1.5 text-[11px] font-bold text-background shadow-soft sm:-left-6">
        DPH automaticky
      </div>
    </div>
  );
}
