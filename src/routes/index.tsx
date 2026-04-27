import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { AiDemo } from "@/components/landing/AiDemo";
import { LifecycleStrip } from "@/components/landing/LifecycleStrip";
import { HighlightFeatures } from "@/components/landing/HighlightFeatures";
import { Testimonials } from "@/components/landing/Testimonials";
import { RapidUpdatesShort } from "@/components/landing/RapidUpdatesShort";
import { Roadmap } from "@/components/landing/Roadmap";
import { Cta } from "@/components/landing/Cta";
import { InlineCta } from "@/components/landing/InlineCta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vystaveno.cz — Vystav fakturu za 30 sekund. Pro OSVČ a živnostníky" },
      {
        name: "description",
        content:
          "Česká fakturace pro OSVČ, freelancery a řemeslníky. AI asistent v češtině, QR platby, ARES, automatické DPH a upomínky. 14 dní zdarma bez karty, od 100 Kč/měsíc.",
      },
      { property: "og:title", content: "Vystaveno.cz — Vystav fakturu za 30 sekund" },
      {
        property: "og:description",
        content:
          "Bez papírů, bez chyb, bez stresu. Česká fakturace pro OSVČ, freelancery a řemeslníky. AI asistent, QR platby, ARES.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <Hero />
      {/* Trust bar hned pod Hero — důvěryhodné mikrosignály ještě před scrollováním. */}
      <TrustBar />
      {/* AI sekce jako hlavní wow moment — živá ukázka schopností. */}
      <AiDemo />
      {/* CTA po AI sekci — uživatel právě viděl value, pojď ho registrovat. */}
      <InlineCta title="Zní to jednoduše? Zkus to na vlastní faktuře." />
      {/* Lifecycle — krátké připomenutí, že pokrýváme celý život faktury. */}
      <LifecycleStrip />
      {/* Hlavní funkce v krátké podobě (3 karty). */}
      <HighlightFeatures />
      {/* CTA po funkcích — klasické rozhodovací místo. */}
      <InlineCta
        title="Máš všechno, co potřebuješ. Otestuj to zdarma."
        hint="Žádná karta · plný přístup 14 dní"
      />
      {/* Social proof před závěrečným CTA. */}
      <Testimonials />
      {/* Krátký důkaz, že produkt rychle vylepšujeme — bez dlouhého vysvětlování. */}
      <RapidUpdatesShort />
      {/* Roadmapa — řeší námitku "chybí mi feature X" a buduje důvěru, že produkt poroste. */}
      <Roadmap />
      <Cta />
    </PageShell>
  );
}
