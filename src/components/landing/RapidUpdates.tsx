import {
  Lightbulb,
  Zap,
  Rocket,
  Mail,
  Clock,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Hourglass,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Lightbulb,
    step: "01",
    title: "Pošlete nápad",
    desc: "Napište nám e-mailem, co vám ve fakturaci chybí nebo co by šlo udělat lépe. Stačí pár vět.",
  },
  {
    icon: Zap,
    step: "02",
    title: "Zapracujeme do dnů",
    desc: 'Většinu úprav nasazujeme do 48 hodin. Žádné roadmapy na čtvrtletí, žádné „uvidíme příští rok".',
  },
  {
    icon: Rocket,
    step: "03",
    title: "Nasadíme všem",
    desc: "Vylepšení dostanete automaticky — bez aktualizací, bez příplatků, bez čekání na novou verzi.",
  },
];

export function RapidUpdates() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-background py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-coral/40 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-coral/30 bg-coral/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            <Clock className="h-3.5 w-3.5" />
            Změny děláme okamžitě
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Vaše nápady jsou naše roadmapa
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Nejsme korporát s ročním plánem. Když vám něco chybí, napíšete — a my to zpravidla
            <span className="font-semibold text-foreground"> nasadíme do 48 hodin</span>.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Hrajeme fér: některé věci uděláme do hodiny, jiné potřebují víc času. Tady je, co
            můžete čekat.
          </p>
        </div>

        <div className="relative mt-14 grid gap-6 sm:grid-cols-3">
          <div
            className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-coral/30 to-transparent sm:block"
            aria-hidden="true"
          />
          {steps.map((s) => (
            <div
              key={s.step}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-coral/30 hover:shadow-soft"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-coral/20 bg-coral/10 text-coral">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground/60">
                  {s.step}
                </span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-coral/30 bg-coral/5 p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-coral/30 bg-coral/10 text-coral">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
                  Slib · do 48 hodin
                </p>
                <h3 className="text-base font-semibold text-foreground">Děláme okamžitě</h3>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm text-foreground/90">
              <PromiseItem>Drobné UI úpravy (texty, ikony, pořadí polí)</PromiseItem>
              <PromiseItem>Doplnění polí na faktuře (KS, SS, poznámky)</PromiseItem>
              <PromiseItem>Opravy chyb a překlepů</PromiseItem>
              <PromiseItem>Vylepšení AI promptů a chování asistenta</PromiseItem>
              <PromiseItem>Nové možnosti exportu PDF</PromiseItem>
            </ul>
            <p className="mt-4 border-t border-coral/20 pt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Když to nestihneme za 48 h</span>,
              dáme vědět konkrétní termín do druhého dne.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-soft text-muted-foreground">
                <Hourglass className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Očekávání · 1–6 týdnů
                </p>
                <h3 className="text-base font-semibold text-foreground">Vyžaduje víc času</h3>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm text-foreground/90">
              <ExpectItem>Integrace s bankami (Fio, ČSOB, Raiffeisen…)</ExpectItem>
              <ExpectItem>Napojení na účetní systémy (Pohoda, Money S3)</ExpectItem>
              <ExpectItem>Větší změny v datovém modelu</ExpectItem>
              <ExpectItem>Funkce vyžadující právní konzultaci (EET, B2B EU)</ExpectItem>
              <ExpectItem>Mobilní aplikace pro iOS / Android</ExpectItem>
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-foreground/70" />
              Vždy řekneme rovnou, co je v plánu, co odkládáme — a proč.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-coral/30 bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-coral">
              <Sparkles className="h-3 w-3" />
              Příklad ze slibu
            </span>
            <span className="text-sm font-semibold text-foreground">
              Změna splatnosti přes AI chat
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
            {/* User message */}
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Napíšete v chatu
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                „Změň splatnost na 30 dní."
              </p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center text-coral sm:px-1">
              <span className="hidden text-lg font-bold sm:inline">→</span>
              <span className="inline text-lg font-bold sm:hidden">↓</span>
            </div>

            {/* Immediate result */}
            <div className="rounded-xl border border-coral/30 bg-coral/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-coral">
                Uvidíte hned (do 1 s)
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-coral" />
                  Pole „Splatnost" se přepíše na <span className="font-semibold">30 dní</span>.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-coral" />
                  Datum splatnosti se přepočítá podle data vystavení.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-coral" />
                  AI potvrdí: „Hotovo — splatnost 30 dní, datum 21. 5. 2025."
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-coral" />
                  Změna se uloží do konceptu — žádné tlačítko „Uložit".
                </li>
              </ul>
            </div>
          </div>

          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-foreground/70" />
            Stejně rychle reagují i další požadavky: sleva, změna množství, přidání položky nebo
            přepnutí měny. Větší zásahy (nová pole, integrace) si vyžádají čas podle tabulky výše.
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <Button variant="coral" size="lg" asChild>
            <a href="mailto:napady@fakturio.cz?subject=N%C3%A1vrh%20na%20vylep%C5%A1en%C3%AD%20Fakturio">
              <Mail className="h-4 w-4" />
              Navrhnout vylepšení
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Píšeme zpět osobně — žádné automatické odpovědi.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Jak to vypadá v praxi
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border bg-surface-soft px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-coral/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Reálný požadavek · březen 2025
              </span>
            </div>

            <ol className="divide-y divide-border">
              <li className="flex gap-4 p-5 sm:p-6">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-foreground">Pondělí 9:14</span>
                    <span className="text-xs text-muted-foreground">— Tomáš, OSVČ</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                    „Šlo by na fakturu přidat <span className="font-medium">konstantní a specifický symbol</span>?
                    Banka mi je vyžaduje a teď je dopisuju ručně."
                  </p>
                </div>
              </li>

              <li className="flex gap-4 p-5 sm:p-6">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-coral/30 bg-coral/10 text-coral">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-foreground">Pondělí 11:42</span>
                    <span className="text-xs text-muted-foreground">— odpověď z Fakturia</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                    „Dává smysl, dáváme to do práce. Ozveme se, až bude nasazeno."
                  </p>
                </div>
              </li>

              <li className="flex gap-4 p-5 sm:p-6">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-coral/40 bg-coral/15 text-coral">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-foreground">Středa 16:08</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-coral/30 bg-coral/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-coral">
                      <Sparkles className="h-3 w-3" />
                      Nasazeno
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                    KS a SS jsou v editoru i v PDF — pro všechny uživatele.
                    <span className="text-muted-foreground"> Od nápadu k nasazení: </span>
                    <span className="font-semibold text-foreground">~55 hodin.</span>
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function PromiseItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-coral" />
      <span>{children}</span>
    </li>
  );
}

function ExpectItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Hourglass className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" />
      <span>{children}</span>
    </li>
  );
}