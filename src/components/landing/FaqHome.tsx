import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

const homeFaqs = [
  {
    q: "Potřebuju účetního?",
    a: "Ne. Vystaveno.cz není účetní software, ale jednoduchý nástroj na faktury. Podklady pro účetní ale připraví.",
  },
  {
    q: "Co je AI asistent?",
    a: "Napiš česky, co chceš změnit – třeba přidat slevu nebo upravit splatnost – a faktura se upraví sama.",
  },
  {
    q: "Funguje to pro neplátce i plátce DPH?",
    a: "Ano. Vystaveno.cz podporuje neplátce i plátce DPH a hlídá základní náležitosti faktur.",
  },
];

export function FaqHome() {
  return (
    <section className="bg-surface-soft py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Časté otázky
          </h2>
        </div>

        <Accordion
          type="single"
          collapsible
          className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          {homeFaqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="border-b border-border last:border-b-0"
            >
              <AccordionTrigger className="px-6 py-4 text-left text-base font-semibold text-foreground hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-8 flex justify-center">
          <Button variant="outline" size="lg" asChild className="group">
            <Link to="/faq">
              Všechny otázky
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}