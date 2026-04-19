import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";
import { Comparison } from "@/components/landing/Comparison";
import { Cta } from "@/components/landing/Cta";

export const Route = createFileRoute("/srovnani")({
  head: () => ({
    meta: [
      { title: "Srovnání s konkurencí — Fakturio.cz vs Fakturoid, iDoklad, Vyfakturuj" },
      {
        name: "description",
        content:
          "Porovnání Fakturio.cz s českou konkurencí. Více funkcí, lepší cena, AI asistent v češtině. Detailní srovnání tarifů a funkcí.",
      },
      { property: "og:title", content: "Fakturio vs Fakturoid, iDoklad, Vyfakturuj" },
      {
        property: "og:description",
        content:
          "Více funkcí. Lepší cena. AI v češtině. Podívejte se, čím se Fakturio liší od konkurence.",
      },
    ],
  }),
  component: SrovnaniPage,
});

function SrovnaniPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Srovnání"
        title="Více funkcí. Lepší cena. Česky."
        subtitle="Porovnali jsme Fakturio s nejznámějšími českými fakturačními službami."
      />
      <Comparison />
      <Cta />
    </PageShell>
  );
}
