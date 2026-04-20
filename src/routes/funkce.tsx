import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";
import { Features } from "@/components/landing/Features";
import { Cta } from "@/components/landing/Cta";

export const Route = createFileRoute("/funkce")({
  head: () => ({
    meta: [
      { title: "Funkce — Fakturio.cz" },
      {
        name: "description",
        content:
          "AI asistent v češtině, QR platby na každé faktuře, opakované faktury, cizí měny i automatické DPH. Vše v jedné ceně.",
      },
      { property: "og:title", content: "Funkce — Fakturio.cz" },
      {
        property: "og:description",
        content:
          "Všechno, co k fakturaci potřebujete — bez účetnického jazyka a bez příplatků.",
      },
    ],
  }),
  component: FunkcePage,
});

function FunkcePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Funkce"
        title="Všechno potřebné. Nic navíc."
        subtitle="Pro živnostníky a malé firmy, kterým se nechce řešit účetnictví — chtějí prostě vystavit fakturu a jít dál."
      />
      <Features />
      <Cta />
    </PageShell>
  );
}
