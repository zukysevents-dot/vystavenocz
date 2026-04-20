import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Jsou faktury z Fakturio.cz plnohodnotné podle českého práva?",
    a: "Ano. Každá faktura obsahuje všechny zákonné náležitosti dle §29 zákona o DPH a §11 zákona o účetnictví — IČO, DIČ, číslo faktury, DUZP, datum vystavení a splatnosti, sazbu a výši DPH, identifikaci dodavatele i odběratele.",
  },
  {
    q: "Jak funguje AI asistent?",
    a: "Stačí napsat česky, co chcete změnit: „změň splatnost na 30 dní“, „přidej slevu 10 %“, „přepiš první položku na konzultaci 5 hodin“. AI rozumí přirozenému jazyku a faktura se okamžitě upraví. Můžete také generovat celé faktury z popisu zakázky.",
  },
  {
    q: "Funguje QR platba se všemi českými bankami?",
    a: "Ano. Používáme oficiální standard QR Platba podle České bankovní asociace. Funguje s Air Bank, ČSOB, Komerční bankou, Raiffeisenbank, Fio, Moneta, mBank, Equa bank, Revolutem a všemi dalšími.",
  },
  {
    q: "Mohu vystavovat faktury jako neplátce DPH?",
    a: "Samozřejmě. Při registraci si zvolíte režim — neplátce DPH, plátce DPH, identifikovaná osoba. Šablona faktury se přizpůsobí. Přechod mezi režimy je kdykoliv jedním kliknutím.",
  },
  {
    q: "Umí Fakturio dobropisy (opravné daňové doklady)?",
    a: "Ano. U každé vystavené faktury najdete v menu akci „Vytvořit dobropis" — otevře se editor s předvyplněným klientem, odkazem na původní fakturu a položkami se zápornými množstvími. Dobropisy mají vlastní číselnou řadu s prefixem OD- (např. OD-2026-0001), takže v účetnictví je odlišíte na první pohled. V seznamu faktur jsou označené badgem „Dobropis".",
  },
  {
    q: "Co se stane, když zavřu tab uprostřed vystavování faktury?",
    a: "Nic se neztratí. Každých 30 sekund automaticky ukládáme rozpracovaný koncept na pozadí — i bez kliknutí na „Uložit". Když se vrátíte, najdete fakturu v seznamu jako Koncept přesně tam, kde jste přestali. Funguje to i při výpadku internetu nebo havárii prohlížeče.",
  },
  {
    q: "Můžu uložit rozpracovaný koncept bez vyplněného klienta?",
    a: "Ano. Pro uložení konceptu stačí jediné — číslo faktury (které vyplníme za vás). Klient, popis položek i částky můžete doplnit kdykoliv později. Přísnou kontrolu (povinný odběratel, popis položky atd.) spustíme až ve chvíli, kdy kliknete na „Vystavit". Pro koncepty necháváme volnost.",
  },
  {
    q: "Kolik faktur mohu vystavit?",
    a: "Neomezeně. Žádné skryté limity podle počtu faktur, klientů ani uživatelů. Tarif Pro zahrnuje vše bez omezení.",
  },
  {
    q: "Mohu data exportovat pro účetní?",
    a: "Ano — ISDOC, XML, CSV i PDF. Vaše účetní si data jednoduše stáhne nebo jí udělíte přístup do dashboardu (zdarma, bez dalšího uživatelského poplatku).",
  },
  {
    q: "Jak funguje 14denní zkušební doba?",
    a: "Bez platební karty. Zaregistrujete se jen pomocí e-mailu a IČO, 14 dní používáte plnou verzi včetně AI asistenta a QR plateb. Po skončení můžete tarif aktivovat, nebo účet jen archivovat — data nikam nezmizí.",
  },
  {
    q: "Mohu kdykoliv zrušit?",
    a: "Ano, jedním kliknutím v nastavení. Žádné výpovědní lhůty, žádné storno poplatky. Při ročním tarifu vrátíme alikvotní část částky.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-surface-soft py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Accordion
          type="single"
          collapsible
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        >
          {faqs.map((f, i) => (
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
      </div>
    </section>
  );
}
