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
          "AI asistent v češtině, QR platby, opakované faktury, cizí měny, automatické DPH a další funkce. Vše v ceně tarifu Fakturio Pro.",
      },
      { property: "og:title", content: "Funkce — Fakturio.cz" },
      {
        property: "og:description",
        content:
          "Vše, co české podnikání potřebuje: AI v češtině, QR platby, opakované faktury, cizí měny i automatické DPH.",
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
        title="Vše, co potřebujete. Nic, co nepotřebujete."
        subtitle="Postaveno pro české podnikatele, kteří chtějí trávit čas obchodem, ne papírováním."
      />
      <Features />
      <Cta />
    </PageShell>
  );
}
