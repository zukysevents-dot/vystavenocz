export type RouteSeo = {
  title: string
  description: string
  ogTitle?: string
  ogDescription?: string
}

export const siteName = 'Vystaveno.cz'

export const defaultSeo: RouteSeo = {
  title: 'Vystaveno.cz — Pokladna, fakturace a rezervace. Jeden systém pro celý provoz',
  description:
    'Modulární provozní systém pro kavárny, restaurace, salony i řemeslo: pokladna (POS), restaurace a kuchyně, sklad, docházka, rezervace i fakturace. Zapneš jen moduly, které potřebuješ. 14 dní zdarma bez karty.',
}

// SEO meta po jednotlivých routách (klíč = name routy v routeru).
export const seoByRouteName: Record<string, RouteSeo> = {
  home: {
    title: 'Vystaveno.cz — Prodej, faktura, rezervace na jeden ťuk',
    description:
      'Jeden systém pro celý provoz — pokladna, restaurace a kuchyně, sklad, docházka, rezervace i fakturace. Modulární: platíš jen za to, co používáš. 14 dní zdarma bez karty.',
    ogTitle: 'Vystaveno.cz — Jeden systém pro celý provoz',
    ogDescription:
      'Prodej, faktura, rezervace — na jeden ťuk. Modulární provozní systém pro kavárny, restaurace, salony i řemeslo.',
  },
  funkce: {
    title: 'Moduly a funkce — Vystaveno.cz',
    description:
      'Pokladna (POS), restaurace a kuchyně (mapa stolů, bony), sklad a zásoby, docházka, rezervace a fakturace. Vše propojené v jednom systému, zapneš jen co potřebuješ.',
    ogTitle: 'Moduly a funkce — Vystaveno.cz',
    ogDescription:
      'Pokladna, restaurace, sklad, docházka, rezervace i fakturace — v jednom systému.',
  },
  cenik: {
    title: 'Ceník — Vystaveno.cz | Plať jen za moduly, které používáš',
    description:
      'Modulární ceník: zapneš jen moduly, které potřebuješ, a platíš jen za ně. Roční platba = 2 měsíce zdarma. 14 dní na vyzkoušení bez platební karty.',
    ogTitle: 'Ceník Vystaveno.cz — modulární, platíš jen za své moduly',
    ogDescription: 'Postav si svůj systém z modulů. Bez závazku, 14 dní zdarma bez karty.',
  },
  faq: {
    title: 'Časté otázky — Vystaveno.cz',
    description:
      'Co se nejčastěji ptáte — moduly a ceny, pokladna a EET, DPH, rezervace, sklad i zkušebka bez karty.',
    ogTitle: 'Časté otázky — Vystaveno.cz',
    ogDescription: 'Odpovědi na to, na co se provozy ptají nejčastěji.',
  },
  srovnani: {
    title: 'Srovnání: Vystaveno.cz vs Dotykačka, Storyous a Fakturoid',
    description:
      'Proč platit zvlášť za pokladnu, fakturaci a rezervace? Vystaveno spojuje pokladnu, gastro, sklad, docházku, rezervace i fakturaci do jednoho modulárního systému.',
    ogTitle: 'Vystaveno vs Dotykačka, Storyous, Fakturoid',
    ogDescription: 'Jeden systém místo tří nástrojů — modulárně a levněji. Podívejte se sami.',
  },
  akce: {
    title: 'Akce do 1. 6. — Vystaveno.cz za 100 Kč měsíčně',
    description:
      'Zaregistrujte se do 1. 6. a získejte cenu 100 Kč/měsíc (1 200 Kč ročně) zamčenou na 12 měsíců. Po 1. 6. nový ceník 269 Kč/měs, 2 000 Kč/rok.',
    ogTitle: 'Akce do 1. 6. — Vystaveno.cz za 100 Kč měsíčně',
    ogDescription: 'Zamkněte si současnou cenu na 12 měsíců. Po 1. 6. ceník stoupá na 269 Kč/měs.',
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
      'Akční cena do 1. 6. Po registraci máte 12 měsíců garantovanou cenu. Žádné skryté poplatky, zrušení jedním kliknutím.',
    ogTitle: 'Naše sliby — Vystaveno.cz',
    ogDescription: 'Co vám slibujeme: férové ceny, garance 12 měsíců a žádná překvapení.',
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
      'Obchodní podmínky služby Vystaveno.cz pro vystavování faktur online. Práva, povinnosti, předplatné a reklamace.',
    ogTitle: 'Obchodní podmínky — Vystaveno',
    ogDescription: 'Obchodní podmínky služby Vystaveno.cz pro vystavování faktur online.',
  },
}
