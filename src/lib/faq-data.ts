export type FaqEntry = { q: string; a: string }

export const faqs: FaqEntry[] = [
  {
    q: 'Jaké moduly Vystaveno nabízí?',
    a: 'Šest modulů, které spolu mluví: Pokladna (POS) pro dotykový prodej, Restaurace & kuchyně (mapa stolů, účty na stůl, bony do kuchyně a na bar), Sklad & zásoby (příjem, výdej, inventura, nízké zásoby), Docházka (píchačka, hodiny, export do CSV), Rezervace (kalendář, služby a zdroje, hlídání kolizí) a Fakturace & klienti (faktury, DPH, QR platby). Hodí se pro kavárny, restaurace, bary, salony, řemeslo, služby i OSVČ.',
  },
  {
    q: 'Jak funguje modulární ceník?',
    a: 'Zapnete a platíte jen moduly, které opravdu potřebujete. Stačí samotná fakturace, nebo si přidáte pokladnu, sklad, rezervace a další — kdykoliv modul přidáte nebo odeberete. Když zapnete kompletní balík, vyjde levněji než součet samostatných modulů. Ceny vidíte v ceníku, kde si rovnou poskládáte svůj systém.',
  },
  {
    q: 'Jak funguje pokladna a účty na stůl?',
    a: 'Pokladna je dotyková prodejní obrazovka s dlaždicemi produktů, platbou hotově i kartou a účtenkou na jeden ťuk. V restauraci si otevřete účty na stůl podle mapy stolů, přidáváte na ně položky a účet uzavřete při platbě — včetně rozdělení mezi více hostů. Objednané položky se rovnou pošlou jako bon do kuchyně a na bar.',
  },
  {
    q: 'Co umí rezervace?',
    a: 'Kalendář rezervací se službami a zdroji (např. křeslo, místnost, technik). Systém hlídá kolize, takže se vám dva termíny nikdy nepřekryjí. Hodí se pro salony, kadeřnictví, kosmetiku i restaurace.',
  },
  {
    q: 'Jak funguje sklad?',
    a: 'Evidujete příjem, výdej i korekce zásob a kdykoliv uděláte inventuru. Stav skladu se odečítá automaticky při prodeji na pokladně. U položek nastavíte minimální množství a systém vás včas upozorní na nízké zásoby, abyste věděli, co doobjednat.',
  },
  {
    q: 'Jsou faktury plnohodnotné podle českého práva a umí DPH?',
    a: 'Ano. Každá faktura obsahuje zákonné náležitosti — IČO, DIČ, číslo faktury, DUZP, datum vystavení a splatnosti, sazbu a výši DPH i identifikaci dodavatele a odběratele. Při registraci si zvolíte režim (neplátce DPH, plátce DPH, identifikovaná osoba) a šablona se přizpůsobí. Na každé faktuře je QR platba podle standardu České bankovní asociace.',
  },
  {
    q: 'Funguje zkušební verze bez platební karty?',
    a: 'Ano. 14 dní zdarma a bez zadávání karty. Zaregistrujete se e-mailem, vyzkoušíte si všechny zapnuté moduly naostro a teprve když se rozhodnete pokračovat, zadáte platbu. Žádné automatické stržení po skončení zkušebky.',
  },
  {
    q: 'Mohu kdykoliv zrušit?',
    a: 'Ano, jedním kliknutím v nastavení. Žádné výpovědní lhůty ani storno poplatky. Stejně tak kdykoliv jednotlivý modul vypnete, když ho přestanete potřebovat.',
  },
]
