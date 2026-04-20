import {
  Sparkles,
  QrCode,
  FileText,
  Languages,
  Repeat,
  Briefcase,
  Receipt,
  Shield,
  Globe,
  PieChart,
  Bell,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI asistent v češtině",
    desc: 'Napište „změň splatnost na 30 dní" nebo „přidej slevu 10 %" a faktura se aktualizuje sama.',
    color: "text-coral",
    bg: "bg-coral/10",
  },
  {
    icon: QrCode,
    title: "QR platba na každé faktuře",
    desc: "Standardní QR kód podle ČBA. Klient zaplatí naskenováním v bance za 5 sekund.",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    icon: FileText,
    title: "Plně český formát",
    desc: "IČO, DIČ, DPH 21/15/10/0 %, DUZP, datum vystavení a splatnosti, číselné řady.",
    color: "text-foreground",
    bg: "bg-mint/30",
  },
  {
    icon: Repeat,
    title: "Opakované faktury",
    desc: "Měsíční předplatné nebo paušály se vystaví a odešlou samy. Připomínky platby v ceně.",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    icon: Receipt,
    title: "Všechny měrné jednotky",
    desc: "Ks, hodina, den, kg, m, m², m³, balení, paušál — i vlastní jednotky bez omezení.",
    color: "text-foreground",
    bg: "bg-mint/30",
  },
  {
    icon: Briefcase,
    title: "Logo a vlastní vzhled",
    desc: "Nahrajte logo, vyberte barvu a šablonu. Faktura, která vypadá jako vy.",
    color: "text-coral",
    bg: "bg-coral/10",
  },
  {
    icon: Shield,
    title: "Legislativa pod kontrolou",
    desc: "Reverse charge, OSS, neplátce DPH, zaokrouhlení, zákonné náležitosti — vše hlídá systém.",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    icon: Languages,
    title: "Faktury v cizí měně",
    desc: "EUR, USD, GBP a další. Kurz ČNB stahujeme automaticky každý den.",
    color: "text-foreground",
    bg: "bg-mint/30",
  },
  {
    icon: Globe,
    title: "Klientské portfolio",
    desc: "Adresář klientů s historií, dluhy, průměrnou splatností a poznámkami.",
    color: "text-coral",
    bg: "bg-coral/10",
  },
  {
    icon: PieChart,
    title: "Přehledný dashboard",
    desc: "Příjmy, neuhrazené, po splatnosti, predikce cash-flow. Jednou na první pohled.",
    color: "text-primary",
    bg: "bg-primary-soft",
  },
  {
    icon: Bell,
    title: "Automatické upomínky",
    desc: "Slušné připomínky platby s gradací 3, 7, 14 dní po splatnosti — česky a včas.",
    color: "text-foreground",
    bg: "bg-mint/30",
  },
  {
    icon: Smartphone,
    title: "Mobil-first",
    desc: "Vystavte fakturu z tramvaje. Plnohodnotná aplikace v prohlížeči, bez instalace.",
    color: "text-coral",
    bg: "bg-coral/10",
  },
];

export function Features() {
  return (
    <section id="funkce" className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${f.bg} ${f.color}`}
              >
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
