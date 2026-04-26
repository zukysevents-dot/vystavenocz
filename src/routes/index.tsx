import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { Hero } from "@/components/landing/Hero";
import { ForWhom } from "@/components/landing/ForWhom";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { HighlightFeatures } from "@/components/landing/HighlightFeatures";
import { PricingTeaser } from "@/components/landing/PricingTeaser";
import { Testimonials } from "@/components/landing/Testimonials";
import { FaqHome } from "@/components/landing/FaqHome";
import { Cta } from "@/components/landing/Cta";

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
      <ForWhom />
      <HowItWorks />
      <HighlightFeatures />
      <PricingTeaser />
      <Testimonials />
      <FaqHome />
      <Cta />
    </PageShell>
  );
}
