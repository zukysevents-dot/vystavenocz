import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { Hero } from "@/components/landing/Hero";
import { InvoiceFlow } from "@/components/landing/InvoiceFlow";
import { WhatsNew } from "@/components/landing/WhatsNew";
import { AiDemo } from "@/components/landing/AiDemo";
import { RapidUpdates } from "@/components/landing/RapidUpdates";
import { Legislativa } from "@/components/landing/Legislativa";
import { Cta } from "@/components/landing/Cta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vystaveno.cz — Tvorba a správa faktur pro OSVČ a firmy" },
      {
        name: "description",
        content:
          "Vystavujte, posílejte a spravujte faktury na jednom místě. Automatické DPH 21 %, QR platby, IČO/DIČ z ARESu, přehled stavů. AI asistent jako bonus. Od 100 Kč měsíčně.",
      },
      { property: "og:title", content: "Vystaveno.cz — Česká fakturace s QR platbami a přehledem" },
      {
        property: "og:description",
        content:
          "Tvorba a správa faktur za 30 sekund. QR platby, automatické DPH, ARES, sledování stavů. AI asistent jako bonus.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <Hero />
      <AiDemo />
      <InvoiceFlow />
      <WhatsNew />
      <RapidUpdates />
      <Legislativa />
      <Cta />
    </PageShell>
  );
}
