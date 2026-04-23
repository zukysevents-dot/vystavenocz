import { Logo } from "./Logo";
import { Check, QrCode, Sparkles, FileText, ShieldCheck } from "lucide-react";

/**
 * Stylizovaná ukázka vystavené faktury v reálné aplikaci.
 * Cíl: ihned uživateli ukázat, jak bude vypadat jeho výsledná faktura.
 */
export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* dekorativní glow za panelem */}
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-coral/30 via-coral/15 to-transparent blur-3xl" />

      <div className="rotate-1 transition-transform duration-500 hover:rotate-0">
        <div className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-glow ring-1 ring-white/20">
          {/* Hlavička appky */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Logo variant="mark" />
              <div className="leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Faktura
                </p>
                <p className="text-xs font-semibold text-slate-900">2026-0042</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <Check className="h-3 w-3" /> Vystaveno
            </span>
          </div>

          {/* Dodavatel & odběratel */}
          <div className="grid grid-cols-2 gap-3 px-5 pt-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                Dodavatel
              </p>
              <p className="mt-1 text-xs font-bold text-slate-900">Alza.cz a.s.</p>
              <p className="text-[10px] text-slate-500">IČO: 27082440</p>
              <p className="text-[10px] text-slate-500">Praha 7 — Holešovice</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                Odběratel
              </p>
              <p className="mt-1 text-xs font-bold text-slate-900">Kofola ČeskoSlovensko a.s.</p>
              <p className="text-[10px] text-slate-500">IČO: 24261980</p>
              <p className="text-[10px] text-slate-500">Ostrava</p>
            </div>
          </div>

          {/* Datumy */}
          <div className="mx-5 mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px]">
            <div>
              <p className="text-slate-500">Vystaveno</p>
              <p className="font-semibold text-slate-900">15. 4. 2026</p>
            </div>
            <div>
              <p className="text-slate-500">DUZP</p>
              <p className="font-semibold text-slate-900">15. 4. 2026</p>
            </div>
            <div>
              <p className="text-slate-500">Splatnost</p>
              <p className="font-semibold text-coral">29. 4. 2026</p>
            </div>
          </div>

          {/* Položky */}
          <div className="mx-5 mt-3 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-12 gap-1 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <span className="col-span-7">Položka</span>
              <span className="col-span-2 text-right">Množ.</span>
              <span className="col-span-3 text-right">Cena</span>
            </div>
            {[
              { name: "Návrh loga a vizuální identity", qty: "1 ks", price: "18 000 Kč" },
              { name: "Webová prezentace (5 stran)", qty: "1 ks", price: "32 000 Kč" },
              { name: "Konzultace · květen", qty: "4 hod", price: "6 000 Kč" },
            ].map((it) => (
              <div
                key={it.name}
                className="grid grid-cols-12 gap-1 border-b border-slate-100 px-3 py-1.5 text-[10px] last:border-0"
              >
                <span className="col-span-7 truncate text-slate-700">{it.name}</span>
                <span className="col-span-2 text-right text-slate-500">{it.qty}</span>
                <span className="col-span-3 text-right font-semibold text-slate-900">
                  {it.price}
                </span>
              </div>
            ))}
          </div>

          {/* Součet + QR */}
          <div className="mx-5 mt-3 flex items-stretch gap-3">
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Mezisoučet</span>
                <span className="font-semibold text-slate-700">56 000 Kč</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                <span>DPH (neplátce)</span>
                <span className="font-semibold text-slate-700">—</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  K úhradě
                </span>
                <span className="text-base font-extrabold text-slate-900">56 000 Kč</span>
              </div>
            </div>
            <div className="flex w-24 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-900">
                <QrCode className="h-10 w-10 text-white" />
              </div>
              <p className="mt-1 text-center text-[8px] font-semibold uppercase tracking-wider text-slate-500">
                QR Platba
              </p>
            </div>
          </div>

          {/* Footer info */}
          <div className="mx-5 mb-4 mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> Plně dle českého zákona
            </span>
            <span className="inline-flex items-center gap-1 text-[9px]">
              <FileText className="h-3 w-3" /> PDF · ISDOC · XML
            </span>
          </div>
        </div>
      </div>

      {/* Plovoucí badge */}
      <div className="absolute -bottom-4 -right-2 rotate-3 rounded-full bg-coral px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-coral-foreground shadow-glow sm:-right-6">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Hotovo za 30 sekund
        </span>
      </div>
      <div className="absolute -left-2 -top-3 -rotate-6 rounded-full border border-coral/30 bg-background/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-coral shadow-soft backdrop-blur sm:-left-6">
        QR · ARES · ISDOC
      </div>
    </div>
  );
}
