import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";
import { Faq } from "@/components/landing/Faq";
import { Cta } from "@/components/landing/Cta";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Časté otázky — Fakturio.cz" },
      {
        name: "description",
        content:
          "Odpovědi na časté otázky o fakturaci, DPH, QR platbách, AI asistentovi a tarifech Fakturio.cz.",
      },
      { property: "og:title", content: "Časté otázky — Fakturio.cz" },
      {
        property: "og:description",
        content:
          "Vše o legislativě, AI asistentovi, QR platbách, neplátcích DPH i zkušebním období.",
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="FAQ"
        title="Možná vás napadlo"
        subtitle="Zodpověděli jsme nejčastější dotazy o fakturaci, DPH, AI asistentovi a QR platbách."
      />
      <Faq />
      <Cta />
    </PageShell>
  );
}
