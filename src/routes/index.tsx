import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { Hero } from "@/components/landing/Hero";
import { WhatsNew } from "@/components/landing/WhatsNew";
import { Cta } from "@/components/landing/Cta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fakturio.cz — Fakturace, která vám ušetří hodiny týdně" },
      {
        name: "description",
        content:
          "Moderní česká fakturace pro OSVČ a firmy. Faktury s IČO, DIČ, DPH 21 %, QR platbou a AI asistentem v češtině. Od 100 Kč měsíčně.",
      },
      { property: "og:title", content: "Fakturio.cz — Fakturace s AI a QR platbami" },
      {
        property: "og:description",
        content:
          "Vystavujte faktury česky během 30 sekund. AI asistent, QR platby, automatické DPH, krásný design.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <Hero />
      <WhatsNew />
      <Cta />
    </PageShell>
  );
}
