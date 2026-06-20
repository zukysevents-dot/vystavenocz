export type RouteSeo = {
  title: string
  description: string
  ogTitle?: string
  ogDescription?: string
}

export const siteName = 'Vystaveno.cz'

export const defaultSeo: RouteSeo = {
  title: 'Vystaveno.cz — Fakturace pro OSVČ a živnostníky',
  description:
    'Česká fakturace pro OSVČ, freelancery a řemeslníky. AI asistent v češtině, QR platby, ARES, automatické DPH a upomínky. 14 dní zdarma bez karty.',
}

// SEO meta po jednotlivých routách (klíč = name routy v routeru).
// Texty převzaty 1:1 z původních TanStack `head` konfigurací staré React appky.
export const seoByRouteName: Record<string, RouteSeo> = {
  home: {
    title: 'Vystaveno.cz — Vystav fakturu za 30 sekund. Pro OSVČ a živnostníky',
    description:
      'Česká fakturace pro OSVČ, freelancery a řemeslníky. AI asistent v češtině, QR platby, ARES, automatické DPH a upomínky. 14 dní zdarma bez karty, od 100 Kč/měsíc.',
    ogTitle: 'Vystaveno.cz — Vystav fakturu za 30 sekund',
    ogDescription:
      'Bez papírů, bez chyb, bez stresu. Česká fakturace pro OSVČ, freelancery a řemeslníky. AI asistent, QR platby, ARES.',
  },
  funkce: {
    title: 'Funkce — Vystaveno.cz',
    description:
      'AI asistent v češtině, QR platby na každé faktuře, opakované faktury, cizí měny i automatické DPH. Vše v jedné ceně.',
    ogTitle: 'Funkce — Vystaveno.cz',
    ogDescription: 'Všechno, co k fakturaci potřebujete — bez účetnického jazyka a bez příplatků.',
  },
  cenik: {
    title: 'Ceník — Vystaveno.cz od 100 Kč měsíčně',
    description:
      'Stovka měsíčně a máte všechno: neomezeně faktur, AI asistent, QR platby, cizí měny. Bez skrytých limitů.',
    ogTitle: 'Ceník Vystaveno.cz — od 100 Kč měsíčně',
    ogDescription: 'Jedna cena, žádné triky. 14 dní na vyzkoušení bez platební karty.',
  },
  faq: {
    title: 'Časté otázky — Vystaveno.cz',
    description:
      'Co se vás nejčastěji ptáme — DPH, QR platby, AI asistent, neplátci DPH i zkušebka.',
    ogTitle: 'Časté otázky — Vystaveno.cz',
    ogDescription: 'Odpovědi na to, na co se podnikatelé ptají nejčastěji.',
  },
  srovnani: {
    title: 'Srovnání: Vystaveno.cz, Fakturoid, iDoklad a Vyfakturuj',
    description:
      'Co umí Vystaveno navíc oproti Fakturoidu, iDokladu a Vyfakturuj? Srovnání cen i funkcí přehledně na jedné stránce.',
    ogTitle: 'Vystaveno vs Fakturoid, iDoklad, Vyfakturuj',
    ogDescription:
      'Stejné funkce, polovina ceny — a navíc AI asistent v češtině. Podívejte se sami.',
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
