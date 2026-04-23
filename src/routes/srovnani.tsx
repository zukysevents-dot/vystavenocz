import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";
import { Comparison } from "@/components/landing/Comparison";
import { Cta } from "@/components/landing/Cta";

export const Route = createFileRoute("/srovnani")({
  head: () => ({
    meta: [
      { title: "Srovnání: Vystaveno.cz, Fakturoid, iDoklad a Vyfakturuj" },
      {
        name: "description",
        content:
          "Co umí Vystaveno navíc oproti Fakturoidu, iDokladu a Vyfakturuj? Srovnání cen i funkcí přehledně na jedné stránce.",
      },
      { property: "og:title", content: "Vystaveno vs Fakturoid, iDoklad, Vyfakturuj" },
      {
        property: "og:description",
        content:
          "Stejné funkce, polovina ceny — a navíc AI asistent v češtině. Podívejte se sami.",
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
        title="Stejné funkce, polovina ceny."
        subtitle="Postavili jsme Vystaveno vedle Fakturoidu, iDokladu a Vyfakturuj. Posuďte sami."
      />
      <Comparison />
      <Cta />
    </PageShell>
  );
}
