import { ShieldCheck, HeadphonesIcon, Wallet, Globe } from "lucide-react";

const items = [
  { icon: ShieldCheck, label: "14 dní zdarma bez karty" },
  { icon: HeadphonesIcon, label: "Česká podpora" },
  { icon: Wallet, label: "Od 100 Kč měsíčně" },
  { icon: Globe, label: "Plně online, bez instalace" },
];

/**
 * Tenký trust bar mezi Hero a první obsahovou sekcí.
 * Záměrně bez velkých marginů — funguje jako důvěryhodný proužek,
 * ne jako další full-blown sekce.
 */
export function TrustBar() {
  return (
    <section className="border-y border-border/60 bg-surface py-5 sm:py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-muted-foreground sm:gap-x-12 sm:text-sm">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground/70 ring-1 ring-inset ring-border">
                <it.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <span className="text-foreground/85">{it.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}