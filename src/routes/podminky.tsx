import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";

export const Route = createFileRoute("/podminky")({
  head: () => ({
    meta: [
      { title: "Obchodní podmínky — Vystaveno" },
      {
        name: "description",
        content:
          "Obchodní podmínky služby Vystaveno.cz pro vystavování faktur online. Práva, povinnosti, předplatné a reklamace.",
      },
      { property: "og:title", content: "Obchodní podmínky — Vystaveno" },
      {
        property: "og:description",
        content: "Obchodní podmínky služby Vystaveno.cz pro vystavování faktur online.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Právní"
        title="Obchodní podmínky"
        subtitle="Účinné od 1. 1. 2026. Verze 1.0."
      />

      <article className="prose-fakturio mx-auto mt-12 max-w-3xl space-y-8 px-4 pb-24 text-foreground sm:px-6 lg:px-8">
        <section>
          <h2 className="text-2xl font-bold">1. Úvodní ustanovení</h2>
          <p className="mt-3 text-muted-foreground">
            Tyto obchodní podmínky (dále jen <strong>„Podmínky"</strong>) upravují vzájemná
            práva a povinnosti mezi provozovatelem služby Vystaveno.cz,{" "}
            <strong>[Jméno a příjmení]</strong>, IČO: 24991686, se sídlem [adresa],
            Česká republika, podnikající fyzickou osobou zapsanou v živnostenském rejstříku
            (dále jen <strong>„Provozovatel"</strong>), a osobou, která využívá službu
            Vystaveno (dále jen <strong>„Uživatel"</strong>). Provozovatel není plátcem DPH.
          </p>
          <p className="mt-3 text-muted-foreground">
            Registrací a aktivním používáním služby Uživatel potvrzuje, že se s těmito
            Podmínkami seznámil a souhlasí s nimi.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">2. Předmět služby</h2>
          <p className="mt-3 text-muted-foreground">
            Vystaveno je webová aplikace pro vystavování, evidenci a správu faktur,
            zálohových faktur a dalších účetních dokladů určená především pro OSVČ,
            živnostníky a malé firmy v České republice. Služba zahrnuje:
          </p>
          <ul className="ml-6 mt-3 list-disc space-y-1 text-muted-foreground">
            <li>vystavování faktur s automatickou QR platbou (SPAYD),</li>
            <li>správu klientů včetně načítání údajů z registru ARES,</li>
            <li>export faktur do PDF,</li>
            <li>volitelný AI asistent pro tvorbu položek faktury,</li>
            <li>odesílání faktur e-mailem.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold">3. Registrace a uživatelský účet</h2>
          <p className="mt-3 text-muted-foreground">
            Pro využívání služby je nutná bezplatná registrace s platnou e-mailovou
            adresou. Uživatel je povinen uvádět pravdivé a aktuální údaje a chránit své
            přihlašovací heslo. Provozovatel neodpovídá za škody způsobené neoprávněným
            přístupem k účtu z důvodu prozrazení hesla Uživatelem.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">4. Bezplatná zkušební doba</h2>
          <p className="mt-3 text-muted-foreground">
            Po registraci získává Uživatel bezplatnou 14denní zkušební dobu s plným
            přístupem ke všem funkcím. Po jejím uplynutí je pro pokračování ve
            vystavování faktur nutné aktivní placené předplatné.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">5. Předplatné a platební podmínky</h2>
          <p className="mt-3 text-muted-foreground">
            Tarif <strong>Vystaveno Pro</strong> je dostupný v měsíční (159 Kč/měs)
            nebo roční variantě (1 200 Kč/rok, tj. 100 Kč/měs). Provozovatel není plátcem DPH,
            uvedené ceny jsou konečné. Doklady o platbě jsou vystavovány elektronicky.
          </p>
          <p className="mt-3 text-muted-foreground">
            Platby jsou zpracovávány platebním poskytovatelem <strong>Stripe Payments
            Europe Ltd.</strong> Předplatné se automaticky obnovuje, dokud jej Uživatel
            nezruší prostřednictvím zákaznického portálu v aplikaci. Zrušením končí
            přístup k placeným funkcím na konci aktuálního období.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">6. Odstoupení od smlouvy</h2>
          <p className="mt-3 text-muted-foreground">
            Uživatel-spotřebitel má v souladu s § 1829 občanského zákoníku právo odstoupit
            od smlouvy do 14 dnů od její uzavření. Aktivní využíváním placených funkcí
            (vystavení faktury, odeslání) Uživatel souhlasí s počátkem plnění před uplynutím
            této lhůty a bere na vědomí, že tím právo odstoupit zaniká dle § 1837 písm. l).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">7. Práva a povinnosti Uživatele</h2>
          <p className="mt-3 text-muted-foreground">
            Uživatel se zavazuje službu nepoužívat k protiprávním účelům, zejména nikoli
            k vystavování fiktivních faktur, daňovým únikům či podvodům. Provozovatel je
            oprávněn účet Uživatele bez náhrady zablokovat při důvodném podezření na
            zneužití služby.
          </p>
          <p className="mt-3 text-muted-foreground">
            Za správnost údajů na vystavených fakturách (zejména DUZP, sazby DPH a
            náležitosti dle zákona č. 235/2004 Sb. o DPH) odpovídá výhradně Uživatel.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">8. Dostupnost služby a omezení odpovědnosti</h2>
          <p className="mt-3 text-muted-foreground">
            Provozovatel usiluje o dostupnost služby 99,5 % měsíčně, negarantuje však
            nepřetržitý provoz. Provozovatel neodpovídá za škodu způsobenou ztrátou dat,
            výpadkem služby ani za následné škody Uživatele plynoucí z nemožnosti
            vystavit fakturu. Maximální výše náhrady škody je omezena na výši
            předplatného uhrazeného Uživatelem za posledních 12 měsíců.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">9. Ochrana osobních údajů</h2>
          <p className="mt-3 text-muted-foreground">
            Zpracování osobních údajů se řídí samostatným dokumentem{" "}
            <a href="/gdpr" className="text-primary underline">
              Zásady ochrany osobních údajů (GDPR)
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">10. Závěrečná ustanovení</h2>
          <p className="mt-3 text-muted-foreground">
            Vztahy neupravené těmito Podmínkami se řídí právním řádem České republiky,
            zejména zákonem č. 89/2012 Sb., občanským zákoníkem, a zákonem č. 634/1992 Sb.
            o ochraně spotřebitele. Případné spory bude rozhodovat věcně příslušný soud
            v České republice.
          </p>
          <p className="mt-3 text-muted-foreground">
            K mimosoudnímu řešení spotřebitelských sporů je příslušná{" "}
            <a
              href="https://www.coi.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Česká obchodní inspekce
            </a>{" "}
            (www.coi.cz).
          </p>
          <p className="mt-3 text-muted-foreground">
            Provozovatel je oprávněn Podmínky kdykoliv změnit. O podstatných změnách
            informuje Uživatele e-mailem nejméně 14 dnů předem.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface-soft p-6 text-sm text-muted-foreground">
          <p>
            <strong>Kontakt:</strong> [Jméno a příjmení], IČO 24991686, e-mail{" "}
            <a href="mailto:podpora@vystaveno.cz" className="text-primary underline">
              podpora@vystaveno.cz
            </a>
          </p>
        </section>
      </article>
    </PageShell>
  );
}