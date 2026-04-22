import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";
import { Button } from "@/components/ui/button";
import { Check, Clock, ShieldCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/akce")({
  head: () => ({
    meta: [
      { title: "Akce do 1. 6. — Fakturio.cz za 100 Kč měsíčně" },
      {
        name: "description",
        content:
          "Zaregistrujte se do 1. 6. a získejte cenu 100 Kč/měsíc (1 200 Kč ročně) zamčenou na 12 měsíců. Po 1. 6. nový ceník 269 Kč/měs, 2 000 Kč/rok.",
      },
      { property: "og:title", content: "Akce do 1. 6. — Fakturio.cz za 100 Kč měsíčně" },
      {
        property: "og:description",
        content:
          "Zamkněte si současnou cenu na 12 měsíců. Po 1. 6. ceník stoupá na 269 Kč/měs.",
      },
    ],
  }),
  component: AkcePage,
});

const benefits = [
  "Cena 100 Kč/měs (1 200 Kč ročně) nebo 159 Kč při měsíčním placení",
  "Garance ceny po dobu 12 měsíců od registrace",
  "Plný přístup ke všem funkcím Fakturio Pro",
  "14 dní na vyzkoušení zdarma, bez platební karty",
  "Zrušení jedním kliknutím v nastavení",
];

function AkcePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Akční nabídka"
        title="Současná cena platí jen do 1. 6."
        subtitle="Po 1. 6. se ceník mění na 269 Kč/měs a 2 000 Kč/rok. Zaregistrujte se teď a cenu si zamknete na celých 12 měsíců."
      />

      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Price comparison */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl border-2 border-coral bg-card p-8 shadow-glow">
              <div className="inline-flex items-center gap-2 rounded-full bg-coral/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-coral">
                <Clock className="h-3 w-3" />
                Do 1. 6.
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">
                  100
                </span>
                <div className="pb-2">
                  <p className="text-base font-semibold text-foreground">Kč/měs</p>
                  <p className="text-xs text-muted-foreground">při ročním placení</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Účtováno ročně <strong className="text-foreground">1 200 Kč</strong>.
                Měsíční tarif 159 Kč.
              </p>
              <Button variant="coral" size="lg" className="mt-6 w-full" asChild>
                <a href="/registrace">Využít akční cenu</a>
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Bez platební karty · Garance 12 měsíců
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-surface-soft p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Od 1. 6.
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-muted-foreground">
                  167
                </span>
                <div className="pb-2">
                  <p className="text-base font-semibold text-muted-foreground">Kč/měs</p>
                  <p className="text-xs text-muted-foreground">při ročním placení</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Účtováno ročně <strong className="text-foreground">2 000 Kč</strong>.
                Měsíční tarif 269 Kč.
              </p>
              <div className="mt-6 rounded-lg border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
                Tato cena se bude vztahovat na všechny nové registrace po 1. 6.
                Stávající zákazníci si svou cenu drží dál podle pravidel garance.
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-12 rounded-3xl border border-border bg-card p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Co získáte registrací do 1. 6.</h2>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15">
                    <Check className="h-3 w-3 text-success" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <Button variant="coral" size="lg" asChild>
              <a href="/registrace">Zaregistrovat se za 100 Kč/měs</a>
            </Button>
            <Link
              to="/cenik"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Zobrazit kompletní ceník →
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}