import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";

export const Route = createFileRoute("/gdpr")({
  head: () => ({
    meta: [
      { title: "Ochrana osobních údajů (GDPR) — Vystaveno" },
      {
        name: "description",
        content:
          "Jak Vystaveno.cz zpracovává osobní údaje uživatelů a jejich klientů v souladu s GDPR. Účely, doba uchování, práva subjektu údajů.",
      },
      { property: "og:title", content: "Ochrana osobních údajů — Vystaveno" },
      {
        property: "og:description",
        content: "Jak Vystaveno.cz zpracovává osobní údaje v souladu s GDPR.",
      },
    ],
  }),
  component: GdprPage,
});

function GdprPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Právní"
        title="Ochrana osobních údajů (GDPR)"
        subtitle="Účinné od 1. 1. 2026. V souladu s nařízením EU 2016/679."
      />

      <article className="prose-fakturio mx-auto mt-12 max-w-3xl space-y-8 px-4 pb-24 text-foreground sm:px-6 lg:px-8">
        <section>
          <h2 className="text-2xl font-bold">1. Správce osobních údajů</h2>
          <p className="mt-3 text-muted-foreground">
            Správcem osobních údajů je <strong>Patrik Zukal</strong>, IČO
            24991686, se sídlem Brodská 1914/40, 591 01 Žďár nad Sázavou, Česká republika,
            podnikající fyzická osoba zapsaná v živnostenském rejstříku. Kontaktní e-mail:{" "}
            <a href="mailto:patrik@vystaveno.cz" className="text-primary underline">
              patrik@vystaveno.cz
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">2. Jaké údaje zpracováváme</h2>
          <h3 className="mt-4 text-lg font-semibold">Údaje o Uživateli (registrovaný účet)</h3>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>e-mailová adresa, jméno a příjmení,</li>
            <li>fakturační údaje (název firmy, IČO, DIČ, adresa, bankovní spojení),</li>
            <li>logo firmy a vizuální nastavení faktur,</li>
            <li>údaje o předplatném a platební historii (zpracovává Stripe),</li>
            <li>technické údaje: IP adresa, typ prohlížeče, log o přihlášení.</li>
          </ul>

          <h3 className="mt-4 text-lg font-semibold">Údaje o klientech Uživatele</h3>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>identifikační a fakturační údaje klientů (název, IČO, DIČ, adresa),</li>
            <li>e-mail a telefon (pokud je Uživatel zadá),</li>
            <li>obsah faktur, položek a interních poznámek.</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            Ve vztahu k údajům klientů Uživatele vystupuje Vystaveno v roli{" "}
            <strong>zpracovatele</strong>; správcem je Uživatel sám.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">3. Účely a právní základ zpracování</h2>
          <ul className="ml-6 mt-3 list-disc space-y-2 text-muted-foreground">
            <li>
              <strong>Plnění smlouvy</strong> (čl. 6 odst. 1 písm. b GDPR) — provoz
              služby, vystavování faktur, správa předplatného.
            </li>
            <li>
              <strong>Plnění zákonných povinností</strong> (čl. 6 odst. 1 písm. c) —
              vedení účetnictví dle zákona č. 563/1991 Sb., archivace daňových dokladů.
            </li>
            <li>
              <strong>Oprávněný zájem</strong> (čl. 6 odst. 1 písm. f) — zabezpečení
              služby, prevence podvodů, e-mailová komunikace o službě.
            </li>
            <li>
              <strong>Souhlas</strong> (čl. 6 odst. 1 písm. a) — analytika a marketingové
              cookies (lze kdykoliv odvolat).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold">4. Doba uchování</h2>
          <ul className="ml-6 mt-3 list-disc space-y-1 text-muted-foreground">
            <li>Údaje účtu — po dobu trvání registrace + 1 rok po jejím zrušení.</li>
            <li>Vystavené faktury a daňové doklady — 10 let dle zákona o DPH.</li>
            <li>Logy přístupu — 90 dnů.</li>
            <li>Marketingové údaje — do odvolání souhlasu.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold">5. Příjemci údajů (zpracovatelé)</h2>
          <p className="mt-3 text-muted-foreground">
            Pro provoz služby využíváme prověřené dodavatele, se kterými máme uzavřené
            zpracovatelské smlouvy:
          </p>
          <ul className="ml-6 mt-3 list-disc space-y-1 text-muted-foreground">
            <li>
              <strong>Supabase Inc.</strong> (USA) — databáze a autentizace, data uložena
              v EU regionu (Frankfurt).
            </li>
            <li>
              <strong>Cloudflare, Inc.</strong> (USA) — hosting a CDN, EU edge.
            </li>
            <li>
              <strong>Stripe Payments Europe Ltd.</strong> (Irsko) — zpracování plateb.
            </li>
            <li>
              <strong>Resend, Inc.</strong> (USA) — odesílání transakčních e-mailů.
            </li>
            <li>
              <strong>Google Ireland Ltd.</strong> — AI funkce (volitelné, pouze obsah,
              který Uživatel aktivně zadá do AI asistenta).
            </li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            Předání mimo EU probíhá na základě Standardních smluvních doložek (SCC) dle
            rozhodnutí Evropské komise.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">6. Vaše práva</h2>
          <p className="mt-3 text-muted-foreground">
            V souladu s GDPR máte právo:
          </p>
          <ul className="ml-6 mt-3 list-disc space-y-1 text-muted-foreground">
            <li>na přístup k vašim údajům a jejich kopii,</li>
            <li>na opravu nepřesných údajů,</li>
            <li>na výmaz („právo být zapomenut"), pokud nebrání zákonné povinnosti,</li>
            <li>na omezení zpracování,</li>
            <li>na přenositelnost údajů ve strukturovaném formátu,</li>
            <li>vznést námitku proti zpracování z titulu oprávněného zájmu,</li>
            <li>odvolat udělený souhlas (např. cookies),</li>
            <li>
              podat stížnost u Úřadu pro ochranu osobních údajů (
              <a
                href="https://www.uoou.cz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                www.uoou.cz
              </a>
              ).
            </li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            Žádosti vyřizujeme do 30 dnů. Kontakt:{" "}
            <a href="mailto:patrik@vystaveno.cz" className="text-primary underline">
              patrik@vystaveno.cz
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">7. Cookies</h2>
          <p className="mt-3 text-muted-foreground">
            Používáme pouze technicky nezbytné cookies (přihlášení, předvolby) a — po
            udělení souhlasu — analytické cookies pro měření návštěvnosti. Souhlas s
            cookies můžete kdykoliv změnit kliknutím na odkaz v patičce stránky nebo
            vymazáním cookies ve vašem prohlížeči.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">8. Zabezpečení</h2>
          <p className="mt-3 text-muted-foreground">
            Veškerá komunikace probíhá šifrovaně (TLS 1.3). Hesla jsou uložena pouze v
            podobě bezpečného hashe. Přístup k databázi je řízen Row-Level Security
            politikami — Uživatel vidí pouze svá data. Pravidelně provádíme bezpečnostní
            audity.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface-soft p-6 text-sm text-muted-foreground">
          <p>
            <strong>Pověřenec pro ochranu osobních údajů:</strong> aktuálně není ustanoven
            (nepovinné dle čl. 37 GDPR). Pro dotazy ke zpracování pište na{" "}
            <a href="mailto:patrik@vystaveno.cz" className="text-primary underline">
              patrik@vystaveno.cz
            </a>
            .
          </p>
        </section>
      </article>
    </PageShell>
  );
}