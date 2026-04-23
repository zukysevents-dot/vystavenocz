import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";

export const Route = createFileRoute("/cenik")({
  head: () => ({
    meta: [
      { title: "Ceník — Vystaveno.cz od 100 Kč měsíčně" },
      {
        name: "description",
        content:
          "Stovka měsíčně a máte všechno: neomezeně faktur, AI asistent, QR platby, cizí měny. Bez skrytých limitů.",
      },
      { property: "og:title", content: "Ceník Vystaveno.cz — od 100 Kč měsíčně" },
      {
        property: "og:description",
        content:
          "Jedna cena, žádné triky. 14 dní na vyzkoušení bez platební karty.",
      },
    ],
  }),
  component: CenikPage,
});

function CenikPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Ceník"
        title="Stovka měsíčně. Hotovo."
        subtitle="Bez limitů na počet faktur, klientů ani uživatelů. Co je v ceně, je opravdu v ceně."
      />
      <Pricing />
      <Faq />
    </PageShell>
  );
}
