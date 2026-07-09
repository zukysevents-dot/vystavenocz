export type RouteSeo = {
  title: string
  description: string
  ogTitle?: string
  ogDescription?: string
}

export const siteName = 'Vystaveno.cz'

export const defaultSeo: RouteSeo = {
  title: 'Vystaveno.cz — Modulární provozní systém. Pokladna, sklad, rezervace i fakturace',
  description:
    'Jeden systém místo papírů, Excelů a pěti aplikací: pokladna (POS), restaurace a kuchyně, sklad s recepturami, docházka, rezervace i fakturace. Zapnete jen moduly, které potřebujete. Nyní v early accessu — napište si o demo.',
}

// SEO meta po jednotlivých routách (klíč = name routy v routeru).
export const seoByRouteName: Record<string, RouteSeo> = {
  home: {
    title: 'Vystaveno.cz — Jeden systém místo pěti aplikací',
    description:
      'Modulární provozní systém pro gastro, služby, řemeslo i obchod — pokladna, restaurace a kuchyně, sklad s recepturami a zrcadlem, docházka, rezervace i fakturace. Platíte jen za to, co používáte. Napište si o demo.',
    ogTitle: 'Vystaveno.cz — Jeden systém pro celý provoz',
    ogDescription:
      'Pokladna, kuchyně, sklad, rezervace i fakturace v jednom modulárním systému. Nyní v early accessu — domluvte si ukázku.',
  },
  funkce: {
    title: 'Moduly a funkce — Vystaveno.cz',
    description:
      'Pokladna (POS), restaurace a kuchyně (mapa stolů, bony), sklad s recepturami, food costem a zrcadlem, uzávěrky, docházka, rezervace a fakturace. Vše propojené v jednom systému, zapnete jen co potřebujete.',
    ogTitle: 'Moduly a funkce — Vystaveno.cz',
    ogDescription:
      'Pokladna, restaurace, sklad, receptury, uzávěrky, docházka, rezervace i fakturace — v jednom systému.',
  },
  cenik: {
    title: 'Ceník — Vystaveno.cz | Platíte jen za moduly, které využijete',
    description:
      'Modulární ceník: zapnete jen moduly, které potřebujete, a platíte jen za ně. Roční platba = 2 měsíce zdarma. Ceny orientační do veřejného spuštění — první zákazníci dostanou zaváděcí podmínky.',
    ogTitle: 'Ceník Vystaveno.cz — modulární, platíte jen za své moduly',
    ogDescription:
      'Poskládejte si systém z modulů. Bez závazku, zaváděcí podmínky v early accessu.',
  },
  faq: {
    title: 'Časté otázky — Vystaveno.cz',
    description:
      'Co se nejčastěji ptáte — moduly a ceny, early access, pokladna a EET, receptury a sklad, DPH, rezervace i uzávěrky.',
    ogTitle: 'Časté otázky — Vystaveno.cz',
    ogDescription: 'Odpovědi na to, na co se provozy ptají nejčastěji.',
  },
  srovnani: {
    title: 'Srovnání: Vystaveno.cz vs Dotykačka, Storyous a Fakturoid',
    description:
      'Proč platit zvlášť za pokladnu, fakturaci, sklad a rezervace? Vystaveno spojuje pokladnu, gastro s recepturami, sklad, docházku, rezervace i fakturaci do jednoho modulárního systému.',
    ogTitle: 'Vystaveno vs Dotykačka, Storyous, Fakturoid',
    ogDescription: 'Jeden systém místo pěti nástrojů — modulárně. Podívejte se sami.',
  },
  akce: {
    title: 'Early access — Vystaveno.cz pro první zákazníky',
    description:
      'Vystaveno spouštíme pro první provozy: osobní nasazení, pomoc s daty, zvýhodněné zaváděcí podmínky a přímý vliv na roadmapu. Napište si o přístup.',
    ogTitle: 'Early access — Vystaveno.cz pro první zákazníky',
    ogDescription:
      'Osobní nasazení, zaváděcí podmínky a přímá linka na zakladatele. Přidejte se mezi první provozy.',
  },
  clanky: {
    title: 'Články a rady pro OSVČ — Vystaveno.cz',
    description:
      'Praktické návody pro živnostníky a freelancery: jak založit živnost, vystavit fakturu, kdy se stát plátcem DPH, paušální daň a další.',
    ogTitle: 'Články a rady pro OSVČ — Vystaveno.cz',
    ogDescription: 'Praktické návody pro živnostníky a freelancery: živnost, faktury, DPH, daně.',
  },
  'nase-sliby': {
    title: 'Naše sliby — Vystaveno.cz',
    description:
      'Co vám slibujeme: modulární ceny bez skrytých poplatků, poctivou roadmapu bez falešných slibů, data k exportu kdykoliv a zrušení jedním kliknutím.',
    ogTitle: 'Naše sliby — Vystaveno.cz',
    ogDescription: 'Férové ceny, poctivá roadmapa a žádná překvapení.',
  },
  gdpr: {
    title: 'Ochrana osobních údajů (GDPR) — Vystaveno',
    description:
      'Jak Vystaveno.cz zpracovává osobní údaje uživatelů a jejich klientů v souladu s GDPR. Účely, doba uchování, práva subjektu údajů.',
    ogTitle: 'Ochrana osobních údajů — Vystaveno',
    ogDescription: 'Jak Vystaveno.cz zpracovává osobní údaje v souladu s GDPR.',
  },
  podminky: {
    title: 'Obchodní podmínky — Vystaveno',
    description:
      'Obchodní podmínky služby Vystaveno.cz. Práva, povinnosti, předplatné a reklamace.',
    ogTitle: 'Obchodní podmínky — Vystaveno',
    ogDescription: 'Obchodní podmínky služby Vystaveno.cz.',
  },
}
