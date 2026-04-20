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
          "Co se vás nejčastěji ptáme — DPH, QR platby, AI asistent, neplátci DPH i zkušebka.",
      },
      { property: "og:title", content: "Časté otázky — Fakturio.cz" },
      {
        property: "og:description",
        content:
          "Odpovědi na to, na co se podnikatelé ptají nejčastěji.",
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Časté otázky"
        title="Co se vás nejčastěji ptáme"
        subtitle="Pokud tu odpověď nenajdete, napište nám — během chvilky vám odepíšeme."
      />
      <Faq />
      <Cta />
    </PageShell>
  );
}
