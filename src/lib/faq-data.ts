export type FaqEntry = { q: string; a: string }

export const faqs: FaqEntry[] = [
  {
    q: 'Co je Vystaveno a pro koho je?',
    a: 'Modulární provozní systém pro malé firmy, živnostníky a provozovny — restaurace, kavárny, bary, salony, řemeslo, servisy i obchody. Jeden systém místo papírů, Excelů a několika různých aplikací: pokladna, restaurace a kuchyně, sklad, rezervace, docházka i fakturace. Každý si zapne jen moduly, které potřebuje.',
  },
  {
    q: 'Jaké moduly Vystaveno nabízí?',
    a: 'Šest základních modulů, které spolu mluví: Pokladna (POS), Restaurace & kuchyně (mapa stolů, účty na stůl, bony do kuchyně a na bar), Sklad & zásoby (příjemky, výdeje, receptury, inventury, skladové zrcadlo), Docházka, Rezervace a Fakturace & klienti. K tomu oborové nástavby — zakázky a výjezdy, věrnost, pobočky, rozvoz, směny, klientská zóna a další.',
  },
  {
    q: 'Kdy si můžu Vystaveno vyzkoušet?',
    a: 'Aplikaci teď spouštíme pro první zákazníky v režimu early access — s osobním nasazením, pomocí s daty a přímou linkou na nás. Napište na patrik@vystaveno.cz, domluvíme ukázku na vašem provozu a přístup. Veřejnou online registraci připravujeme.',
  },
  {
    q: 'Co umí Vystaveno pro restaurace a kavárny?',
    a: 'Mapa stolů a otevřené účty, rozdělení účtu mezi hosty, spropitné, bony do kuchyně a na bar (KDS), objednávky přes QR kód ke stolu, mobilní číšník s tabletem. K tomu sklad se surovinami: receptury odečítají suroviny při prodeji, vidíte food cost a marži každého jídla, děláte inventury a skladové zrcadlo ukáže rozdíl mezi tím, co má být, a realitou. Den zavřete uzávěrkou s kontrolou hotovosti.',
  },
  {
    q: 'Jak mi pohlídáte sklad a marže?',
    a: 'Zboží naskladňujete přes nákupní příjemky, prodej odečítá zásoby automaticky — u jídel podle receptury včetně odpadu. Skladové zrcadlo porovná očekávaný stav (otevření + příjem − prodej − výdej) s realitou a rozdíl ukáže v kusech i korunách. Provozní přehled pak srovná tržby, marže, ztráty a ležáky, takže víte, kde vám utíkají peníze.',
  },
  {
    q: 'Jak funguje modulární ceník?',
    a: 'Zapnete a platíte jen moduly, které opravdu potřebujete. Stačí samotná fakturace, nebo si přidáte pokladnu, sklad, rezervace a další — kdykoliv modul přidáte nebo odeberete. Kompletní balík vyjde levněji než součet samostatných modulů. Ceny v ceníku jsou orientační do veřejného spuštění; pro první zákazníky platí zvýhodněné podmínky early accessu.',
  },
  {
    q: 'Platím za každou provozovnu?',
    a: 'Šest základních modulů platíte za jeden účet bez ohledu na počet zařízení. Některé oborové nástavby se počítají za provozovnu, pobočku, technika nebo zaměstnance — u každé z nich v ceníku přesně vidíte, za co se platí.',
  },
  {
    q: 'Co umí rezervace?',
    a: 'Kalendář rezervací se službami a zdroji (např. křeslo, místnost, technik). Systém hlídá kolize, takže se vám dva termíny nikdy nepřekryjí. Hodí se pro salony, kadeřnictví, kosmetiku i restaurace.',
  },
  {
    q: 'Jsou faktury plnohodnotné podle českého práva a umí DPH?',
    a: 'Ano. Každá faktura obsahuje zákonné náležitosti — IČO, DIČ, číslo faktury, DUZP, datum vystavení a splatnosti, sazbu a výši DPH i identifikaci dodavatele a odběratele. Zvolíte si režim (neplátce DPH, plátce DPH, identifikovaná osoba) a šablona se přizpůsobí. Na každé faktuře je QR platba podle standardu České bankovní asociace.',
  },
  {
    q: 'Řešíte EET?',
    a: 'EET bylo v Česku k 1. 1. 2023 zrušeno, takže ho dnes žádná pokladna povinně řešit nemusí. Pokud se evidence tržeb v nějaké podobě vrátí (EET 2.0), přidáme ji, jakmile bude legislativně aktuální — jako součást modulu pokladny.',
  },
  {
    q: 'Mohu pozvat účetní?',
    a: 'Modul Účtárna připraví podklady pro účetní: vystavené doklady po měsících s exportem do účetnictví (ISDOC, CSV) a k tomu účetní CSV export denních uzávěrek. Samostatný přístup přímo pro vaši účetní připravujeme.',
  },
  {
    q: 'Co když mi něco chybí nebo budu chtít skončit?',
    a: 'Předplatné i jednotlivé moduly půjde kdykoliv zrušit — bez výpovědních lhůt a storno poplatků. A když vám v provozu něco chybí, napište nám: drobná vylepšení obvykle nasazujeme do pár dní a roadmapu stavíme podle zpětné vazby prvních zákazníků.',
  },
]
