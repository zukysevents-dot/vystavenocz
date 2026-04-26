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
    <section className="border-y border-border/60 bg-surface-soft py-4 sm:py-5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs font-medium text-muted-foreground sm:gap-x-10 sm:text-sm">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-coral/20 bg-coral/10 text-coral">
                <it.icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-foreground/80">{it.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}