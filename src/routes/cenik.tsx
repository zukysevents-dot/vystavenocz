import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";

export const Route = createFileRoute("/cenik")({
  head: () => ({
    meta: [
      { title: "Ceník — Fakturio.cz od 100 Kč měsíčně" },
      {
        name: "description",
        content:
          "Jeden tarif Fakturio Pro za 100 Kč měsíčně při ročním placení nebo 159 Kč měsíčně. Neomezeně faktur, klientů a všech funkcí.",
      },
      { property: "og:title", content: "Ceník Fakturio.cz — od 100 Kč měsíčně" },
      {
        property: "og:description",
        content:
          "Jeden tarif, vše v ceně. Neomezeně faktur, AI, QR platby, cizí měny. 30 dní zdarma bez karty.",
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
        title="Jeden tarif. Všechno v ceně."
        subtitle="Žádné triky, žádná omezení podle počtu faktur. Plaťte jen za to, že vám fakturace funguje."
      />
      <Pricing />
      <Faq />
    </PageShell>
  );
}
