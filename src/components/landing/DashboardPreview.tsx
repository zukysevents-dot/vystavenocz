import { Logo } from "./Logo";
import { Check, QrCode, FileText, ShieldCheck } from "lucide-react";

/**
 * Stylizovaná ukázka vystavené faktury v reálné aplikaci.
 * Cíl: ihned uživateli ukázat, jak bude vypadat jeho výsledná faktura.
 */
export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* Jemný stín místo barevného glow — působí čistěji a profesionálněji. */}
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-foreground/[0.03] blur-2xl" />

      <div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-card">
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
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
              <Check className="h-3 w-3" strokeWidth={2.25} /> Vystaveno
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
              <p className="font-semibold text-slate-900">29. 4. 2026</p>
            </div>
          </div>

          {/* Platební symboly */}
          <div className="mx-5 mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px]">
            <div>
              <p className="text-slate-500">Var. symbol</p>
              <p className="font-semibold text-slate-900">20260042</p>
            </div>
            <div>
              <p className="text-slate-500">Konst. symbol</p>
              <p className="font-semibold text-slate-900">0308</p>
            </div>
            <div>
              <p className="text-slate-500">Spec. symbol</p>
              <p className="font-semibold text-slate-900">—</p>
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
          <div className="mx-5 mb-4 mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} /> Plně dle českého zákona
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500">
              <FileText className="h-3 w-3" strokeWidth={1.75} /> PDF · ISDOC · XML
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
