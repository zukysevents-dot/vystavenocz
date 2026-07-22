/**
 * Statická databáze článků (knowledge base / rady pro OSVČ).
 * Inspirováno strukturou Fakturoid Akademie / iDoklad Učím se.
 * Obsah ručně psaný, žádný scraping. SEO friendly nadpisy a slugy.
 *
 * Pro přidání článku jen rozšiř pole `articles`. Nic víc není potřeba —
 * listing i detail route se renderují automaticky.
 */

export type Article = {
  slug: string
  title: string
  /** Krátký perex pro listing a meta description (max ~160 znaků). */
  excerpt: string
  /** Kategorie pro filtraci a tag v listingu. */
  category:
    | 'Začátek podnikání'
    | 'Fakturace'
    | 'DPH a daně'
    | 'Tipy pro OSVČ'
    | 'Smlouvy a právo'
    | 'Marketing a klienti'
    | 'Finance a banking'
  /** Odhadovaný čas čtení v minutách. */
  readingMinutes: number
  /** Datum publikace ISO (YYYY-MM-DD). */
  publishedAt: string
  /** Strukturovaný obsah — sekce s nadpisem h2 a odstavci/seznamy. */
  sections: ArticleSection[]
  /** Volitelné FAQ na konci článku — generuje i FAQPage JSON-LD pro SEO. */
  faq?: { q: string; a: string }[]
}

export type ArticleSection = {
  heading: string
  blocks: ArticleBlock[]
}

export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; variant: 'tip' | 'warn'; text: string }

export const articles: Article[] = [
  {
    slug: 'jak-zalozit-zivnost-online',
    title: 'Jak založit živnost online v roce 2026 — kompletní návod',
    excerpt:
      'Krok za krokem: kde a jak si vyřídit živnostenský list online přes Portál občana, kolik to stojí a co všechno budeš potřebovat.',
    category: 'Začátek podnikání',
    readingMinutes: 7,
    publishedAt: '2026-04-10',
    sections: [
      {
        heading: 'Kdo si může založit živnost online',
        blocks: [
          {
            type: 'p',
            text: 'Živnost online může založit každá fyzická osoba s aktivovanou elektronickou identitou — bankID, mobilní klíč eGovernmentu, datová schránka nebo NIA ID. Stačí být plnoletý, svéprávný a bezúhonný.',
          },
          {
            type: 'p',
            text: 'Volnou živnost (např. „Výroba, obchod a služby neuvedené v přílohách 1 až 3 živnostenského zákona“) získáš hned. Vázanou nebo řemeslnou musíš doložit vzděláním nebo praxí.',
          },
        ],
      },
      {
        heading: 'Co budeš potřebovat',
        blocks: [
          {
            type: 'ul',
            items: [
              'Elektronickou identitu (bankID je nejjednodušší — máš ji v internetovém bankovnictví).',
              'Adresu sídla podnikání (může být i tvoje bydliště, pokud ti to majitel dovolí).',
              '1 000 Kč na správní poplatek.',
              'Rozhodnutí, jaké obory chceš provozovat — vyber z volného seznamu 80 oborů.',
            ],
          },
        ],
      },
      {
        heading: 'Postup krok za krokem',
        blocks: [
          {
            type: 'ol',
            items: [
              'Přihlas se na Portál občana přes bankID nebo NIA.',
              'Najdi formulář „Jednotný registrační formulář pro fyzickou osobu (JRF)“.',
              'Vyplň identifikaci, sídlo a vybrané obory volné živnosti.',
              'Zaškrtni přihlášku k dani z příjmů, sociální správě a zdravotní pojišťovně rovnou — ušetříš tři návštěvy.',
              'Zaplať 1 000 Kč přes platební bránu.',
              'Do 5 pracovních dnů ti přijde výpis ze živnostenského rejstříku a IČO.',
            ],
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Tip: hned po přidělení IČO si zařiď datovou schránku a samostatný podnikatelský účet. Ušetří ti to měsíce administrativy.',
          },
        ],
      },
      {
        heading: 'Co dělat hned po založení',
        blocks: [
          {
            type: 'ol',
            items: [
              'Otevři si podnikatelský bankovní účet (oddělíš si peníze a šetříš čas v daňovém přiznání).',
              'Aktivuj datovou schránku — od roku 2023 ji všichni OSVČ mají automaticky.',
              'Vystav první fakturu. Ve Vystaveno.cz to zvládneš za 30 sekund.',
              'Sleduj termíny: zálohy na sociální (do 8. dne v měsíci) a zdravotní (do 8. dne) pojištění.',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'podnikatelsky-ucet-proc-a-jak',
    title: 'Podnikatelský účet: proč ho mít a jak vybrat ten správný',
    excerpt:
      'Zákon ti ho neukládá, ale ušetří ti hodiny v účetnictví a problémy s finančákem. Srovnání nejvýhodnějších bank pro OSVČ.',
    category: 'Začátek podnikání',
    readingMinutes: 5,
    publishedAt: '2026-04-08',
    sections: [
      {
        heading: 'Musí OSVČ mít podnikatelský účet?',
        blocks: [
          {
            type: 'p',
            text: 'Zákon to nevyžaduje — můžeš fakturovat na osobní účet. Ale existují tři dobré důvody, proč si ho zřídit hned: oddělené účetnictví, profesionální vystupování a žádné problémy při kontrole z finančáku.',
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Pozor: pokud jsi plátce DPH, musíš mít účet zaregistrovaný v registru plátců DPH. Jinak ti odběratel může strhnout DPH ručením.',
          },
        ],
      },
      {
        heading: 'Co hledat při výběru',
        blocks: [
          {
            type: 'ul',
            items: [
              'Bezplatné vedení účtu (dnes standard u Fio, Air Bank, Revolut Business).',
              'Zdarma české i SEPA platby.',
              'Otevřené API nebo export do CSV — pro budoucí napojení účetnictví.',
              'Mobilní aplikace s QR skenerem pro placení dodavatelských faktur.',
              'Možnost vystavit virtuální platební kartu k online nákupům.',
            ],
          },
        ],
      },
      {
        heading: 'Nejčastější tipy z praxe',
        blocks: [
          {
            type: 'p',
            text: 'Vyber si banku, která ti pošle notifikaci o příchozí platbě v reálném čase. Ušetříš si volání klientům typu „přišlo to už?“. Vystaveno.cz pak může ke každé faktuře připojit QR kód, takže klient zaplatí jedním kliknutím v aplikaci.',
          },
        ],
      },
    ],
  },
  {
    slug: 'co-musi-obsahovat-faktura',
    title: 'Co musí obsahovat faktura v roce 2026 (a co je jen mýtus)',
    excerpt:
      'Povinné náležitosti faktury podle českého zákona, rozdíl mezi neplátcem a plátcem DPH a nejčastější chyby, které dělají začínající OSVČ.',
    category: 'Fakturace',
    readingMinutes: 6,
    publishedAt: '2026-04-05',
    sections: [
      {
        heading: 'Povinné údaje na faktuře (neplátce DPH)',
        blocks: [
          {
            type: 'p',
            text: 'Pokud nejsi plátce DPH, vystavuješ tzv. „účetní doklad“ podle zákona o účetnictví a živnostenského zákona. Musí obsahovat:',
          },
          {
            type: 'ul',
            items: [
              'Označení dokladu (obvykle „Faktura č. …“ s pořadovým číslem).',
              'Identifikaci dodavatele: jméno, adresu sídla, IČO.',
              'Identifikaci odběratele: jméno/název, adresu, IČO (a DIČ, pokud má).',
              'Datum vystavení.',
              'Předmět plnění a peněžní částku.',
              'Podpis nebo elektronický ekvivalent (u online faktur stačí jméno).',
            ],
          },
        ],
      },
      {
        heading: 'Pokud jsi plátce DPH, navíc',
        blocks: [
          {
            type: 'ul',
            items: [
              'DIČ tvoje i odběratele.',
              'Datum uskutečnění zdanitelného plnění (DUZP).',
              'Sazbu DPH a základ daně zvlášť pro každou sazbu (21 %, 12 %, 0 %).',
              'Výši daně v Kč (i u faktur v cizí měně).',
              'Označení režimu („přenesená daňová povinnost“, „osvobozeno od daně“ atd. dle situace).',
            ],
          },
        ],
      },
      {
        heading: 'Co naopak NENÍ povinné (časté mýty)',
        blocks: [
          {
            type: 'ul',
            items: [
              'Razítko — od roku 1989 nemá v ČR právní význam.',
              'Vlastnoruční podpis — u elektronické faktury stačí jméno vystavitele.',
              'Bankovní účet — i když je to rozumné mít.',
              'QR kód — ale výrazně urychlí platbu, takže ho používej.',
            ],
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Ve Vystaveno.cz se všechny povinné údaje hlídají automaticky. Pokud ti chybí DIČ nebo datum, faktura tě nenechá vystavit a vysvětlí, co je špatně.',
          },
        ],
      },
    ],
  },
  {
    slug: 'qr-platby-na-fakture',
    title: 'QR kód na faktuře: jak funguje a proč ti zvýší cashflow',
    excerpt:
      'Co je QR Platba podle standardu SPAYD, jak ji přidat na fakturu a o kolik dřív ti díky ní klienti zaplatí.',
    category: 'Fakturace',
    readingMinutes: 4,
    publishedAt: '2026-04-02',
    sections: [
      {
        heading: 'Co je QR Platba',
        blocks: [
          {
            type: 'p',
            text: 'QR Platba je český standard (SPAYD) zavedený Českou bankovní asociací v roce 2012. Kódový formát obsahuje číslo účtu, částku, variabilní symbol a zprávu pro příjemce. Klient ji načte mobilním bankovnictvím a stačí mu potvrdit — žádné přepisování čísel.',
          },
        ],
      },
      {
        heading: 'Jaký vliv to má na placení',
        blocks: [
          {
            type: 'p',
            text: 'Z dat fakturačních platforem vychází, že faktury s QR kódem se v průměru platí o 3–5 dní dříve než bez něj. U OSVČ s 5+ klienty to znamená výrazně lepší cashflow a méně upomínek.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Vystaveno.cz ti QR kód vygeneruje automaticky pro každou fakturu — bez nastavování. Stačí, že máš v profilu uložený bankovní účet.',
          },
        ],
      },
    ],
  },
  {
    slug: 'dph-pro-zacatecniky',
    title: 'DPH pro začátečníky: kdy se stát plátcem a co to obnáší',
    excerpt:
      'Limit obratu, povinná a dobrovolná registrace, kontrolní hlášení a nejčastější chyby při přechodu z neplátce na plátce DPH.',
    category: 'DPH a daně',
    readingMinutes: 8,
    publishedAt: '2026-03-28',
    sections: [
      {
        heading: 'Kdy se musíš stát plátcem DPH',
        blocks: [
          {
            type: 'p',
            text: 'Plátcem DPH se musíš povinně stát, pokud tvůj obrat za 12 po sobě jdoucích kalendářních měsíců přesáhne 2 000 000 Kč. Přihlášku musíš podat do 15. dne měsíce následujícího po měsíci, kdy jsi limit překročil.',
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Pozor: počítá se klouzavé období 12 měsíců, ne kalendářní rok. Sleduj obrat každý měsíc.',
          },
        ],
      },
      {
        heading: 'Kdy se vyplatí stát se plátcem dobrovolně',
        blocks: [
          {
            type: 'ul',
            items: [
              'Pracuješ převážně pro plátce DPH (B2B) — DPH si od státu odečtou a tobě nic nevadí.',
              'Nakupuješ drahé vybavení (auto, technika) a chceš si nárokovat odpočet DPH na vstupu.',
              'Chceš působit profesionálněji vůči větším klientům.',
            ],
          },
          {
            type: 'p',
            text: 'Naopak pro freelancery pracující pro koncové zákazníky (B2C) je dobrovolné plátcovství obvykle nevýhodné — musíš zdražit o 21 %, ale klient si DPH neodečte.',
          },
        ],
      },
      {
        heading: 'Co tě čeká jako plátce',
        blocks: [
          {
            type: 'ol',
            items: [
              'Měsíčně (nebo kvartálně) podávat přiznání k DPH.',
              'Měsíčně podávat kontrolní hlášení (i když nemáš žádné plnění).',
              'Vést evidenci pro účely DPH — kdo ti co fakturoval a v jakém režimu.',
              'Vystavovat daňové doklady do 15 dnů od uskutečnění plnění.',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'danove-priznani-osvc-paušál-vs-vydaje',
    title: 'Paušální daň vs. skutečné výdaje: co se OSVČ vyplatí v roce 2026',
    excerpt:
      'Srovnání paušální daně, výdajových paušálů (40, 60, 80 %) a skutečných výdajů. Konkrétní příklady a kalkulačka rozhodování.',
    category: 'DPH a daně',
    readingMinutes: 9,
    publishedAt: '2026-03-20',
    sections: [
      {
        heading: 'Tři režimy, ze kterých si OSVČ vybírá',
        blocks: [
          {
            type: 'ul',
            items: [
              'Paušální daň (jedna platba měsíčně, žádné přiznání).',
              'Výdajové paušály (40 %, 60 %, 80 % příjmů jako fiktivní výdaje).',
              'Skutečné výdaje (prokazuješ doklady, vede tě účetní nebo daňová evidence).',
            ],
          },
        ],
      },
      {
        heading: '1. Paušální daň',
        blocks: [
          {
            type: 'p',
            text: 'Pro rok 2026 je paušální daň rozdělena do tří pásem podle výše příjmů. Platíš jednu měsíční částku, která zahrnuje daň z příjmů, sociální a zdravotní pojištění. Nepodáváš daňové přiznání ani přehledy — největší úspora administrativy.',
          },
          {
            type: 'p',
            text: 'Hodí se ti, pokud máš stabilní příjmy do 2 mil. Kč ročně, neuplatňuješ slevy (na manželku, děti, hypotéku) a chceš mít klid.',
          },
        ],
      },
      {
        heading: '2. Výdajové paušály',
        blocks: [
          {
            type: 'p',
            text: 'Stát ti uzná určité procento příjmů jako výdaje, aniž bys to musel dokládat. Sazby: 80 % (řemeslné živnosti), 60 % (volné živnosti), 40 % (svobodná povolání). Maximální základ pro paušál je 2 mil. Kč.',
          },
          {
            type: 'p',
            text: 'Vyplatí se, pokud máš nízké reálné výdaje — typicky programátoři, konzultanti, copywriteři. 60% paušál na 1 000 000 Kč příjmů ti uzná 600 000 Kč „výdajů“, i když jsi reálně utratil jen 50 000 Kč.',
          },
        ],
      },
      {
        heading: '3. Skutečné výdaje',
        blocks: [
          {
            type: 'p',
            text: 'Vede tě daňová evidence (jednoduchá) nebo účetnictví (podvojné). Uplatňuješ reálné výdaje — nákup zboží, materiál, nájem kanceláře, auta, marketing. Vyplatí se, pokud reálné výdaje přesahují to, co ti uzná paušál.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Praktická rada: spočítej si výdaje za poslední rok. Pokud jsou pod 60 % příjmů, jdi do paušálu. Nad 60 % se ti vyplatí skutečné výdaje a daňová evidence.',
          },
        ],
      },
    ],
  },
  // ===== PILLAR ČLÁNKY (dlouhé, 10–15 min) =====
  {
    slug: 'osvc-vs-sro-co-se-vyplati',
    title: 'OSVČ vs. s.r.o. v roce 2026: co se vyplatí a kdy přejít',
    excerpt:
      'Detailní srovnání živnosti a s.r.o. — daně, odvody, ručení, administrativa a kdy se vyplatí transformace. Konkrétní výpočty pro 500 tis., 1 mil. a 2 mil. Kč ročně.',
    category: 'Začátek podnikání',
    readingMinutes: 14,
    publishedAt: '2026-04-15',
    sections: [
      {
        heading: 'Hlavní rozdíly v kostce',
        blocks: [
          {
            type: 'p',
            text: 'OSVČ (živnost) je nejjednodušší forma podnikání — fyzická osoba pod vlastním IČO. S.r.o. je samostatná právnická osoba, kterou vlastníš jako společník. Rozdíl není jen v daních, ale i v ručení, image vůči klientům a flexibilitě peněz.',
          },
          {
            type: 'ul',
            items: [
              'Ručení: OSVČ ručí celým osobním majetkem. Společník s.r.o. jen do výše svého vkladu (typicky 1 Kč až pár desítek tisíc).',
              'Daně: OSVČ daní z příjmů 15 % (nad 1 582 812 Kč 23 %), s.r.o. daní zisk 21 % + dividendy 15 %.',
              'Odvody: OSVČ platí sociální + zdravotní z 50 % zisku. Společník s.r.o. nemusí, pokud si nevyplácí mzdu.',
              'Účetnictví: OSVČ stačí daňová evidence (jednoduchá). S.r.o. musí vést podvojné účetnictví.',
              'Image: s.r.o. působí profesionálněji u větších klientů, banky a tendrů.',
            ],
          },
        ],
      },
      {
        heading: 'Konkrétní výpočet: 1 000 000 Kč ročně',
        blocks: [
          {
            type: 'p',
            text: 'Modelujme freelance konzultanta s 1 mil. Kč ročních příjmů a 100 tis. Kč skutečných výdajů. Porovnáme tři scénáře.',
          },
          {
            type: 'p',
            text: 'OSVČ paušál 60 %: základ daně = 400 000 Kč. Daň 15 % = 60 000 Kč. Sociální + zdravotní cca 75 000 Kč. Zbývá ti čistého ~865 000 Kč.',
          },
          {
            type: 'p',
            text: 'OSVČ paušální daň (2. pásmo): cca 19 200 Kč/měsíc = 230 400 Kč/rok. Zbývá ~770 000 Kč. Bez papírování.',
          },
          {
            type: 'p',
            text: 'S.r.o. bez mzdy, vše jako dividenda: zisk 900 000 Kč → daň z příjmů PO 21 % = 189 000 Kč. Zbylých 711 000 Kč jako dividenda srážková daň 15 % = 106 650 Kč. Čistého ~604 000 Kč. Plus účetní 2 000 Kč/měsíc.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Při příjmech do 2 mil. Kč je OSVČ téměř vždy výhodnější. S.r.o. začne dávat smysl od 2,5–3 mil. Kč ročně, kdy se dají optimalizovat výplaty kombinací mzdy a dividend.',
          },
        ],
      },
      {
        heading: 'Kdy se vyplatí přejít na s.r.o.',
        blocks: [
          {
            type: 'ul',
            items: [
              'Příjmy stabilně nad 2,5 mil. Kč ročně.',
              'Podnikáš v rizikové oblasti (stavebnictví, IT projekty s vysokou pojistkou) a chceš omezit ručení.',
              'Plánuješ přijmout zaměstnance nebo společníky.',
              'Chceš firmu časem prodat (živnost prodat nelze).',
              'Pracuješ s velkými korporacemi, které vyžadují s.r.o. partnery.',
            ],
          },
        ],
      },
      {
        heading: 'Jak přejít z OSVČ na s.r.o.',
        blocks: [
          {
            type: 'ol',
            items: [
              'Založ s.r.o. (notářský zápis cca 6 000 Kč, zápis do OR 2 700 Kč).',
              'Převeď klienty — vystav poslední faktury jako OSVČ, nové už pod s.r.o.',
              'Doplať odvody za poslední rok jako OSVČ (přehled OSSZ a ZP).',
              'Případně přeruš nebo zruš živnost (živnost můžeš nechat aktivní jako rezervu).',
              'Otevři účet pro s.r.o., založ účetnictví, registruj k DPH pokud potřebuješ.',
            ],
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Nezapomeň: jako jednatel s.r.o. potřebuješ buď smlouvu o výkonu funkce (s odměnou nebo bez), nebo pracovní smlouvu. Bez toho riskuješ pokutu od inspekce práce.',
          },
        ],
      },
    ],
  },
  {
    slug: 'jak-shanet-prvni-klienty-osvc',
    title: 'Jak sehnat první klienty jako OSVČ: 12 ověřených kanálů',
    excerpt:
      'Praktický průvodce akvizicí klientů pro freelancery a živnostníky — od osobních kontaktů přes LinkedIn po obsahový marketing. Co funguje v Česku v roce 2026.',
    category: 'Marketing a klienti',
    readingMinutes: 13,
    publishedAt: '2026-04-14',
    sections: [
      {
        heading: 'Začni s tím, co máš',
        blocks: [
          {
            type: 'p',
            text: 'Většina freelancerů dělá tu samou chybu: spustí web, profil na sociálkách a čekají, až se klienti začnou hlásit. To se nestane. První klienti vždy přicházejí z osobní sítě — bývalí kolegové, spolužáci, klienti z předchozí práce.',
          },
          {
            type: 'ol',
            items: [
              'Sepiš si seznam 50 lidí, kteří vědí, co umíš.',
              'Pošli každému osobní zprávu (ne hromadný mail) — krátce, co teď děláš, koho hledáš.',
              'Požádej o doporučení, ne o zakázku. Lidé rádi pomůžou, ale neradi kupují pod tlakem.',
              'Zopakuj za 3 měsíce. Většina prvních zakázek přijde z druhé nebo třetí vlny.',
            ],
          },
        ],
      },
      {
        heading: '12 kanálů akvizice srovnáno',
        blocks: [
          {
            type: 'ul',
            items: [
              'Doporučení od stávajících klientů — nejlevnější, nejvyšší konverze. Vždy se na konci zakázky zeptej.',
              'LinkedIn — pro B2B služby (IT, konzultace, marketing) zlatý důl. Posílej osobní zprávy, ne spam.',
              'Facebook skupiny — „OSVČ pomoc“, oborové skupiny. Pomáhej zdarma, klienti přijdou.',
              'Instagram a TikTok — pro vizuální obory (fotograf, designer, řemeslník). Ukazuj proces, ne hotové dílo.',
              'Vlastní web s SEO — dlouhodobě nejstabilnější. Potřebuješ trpělivost 6–12 měsíců.',
              'Google Ads — rychlý start, ale drahé. Funguje pro řemeslníky a místní služby.',
              'Marketplace platformy — Topdesigner, Junior.guru, Malt, Upwork. Nízké marže, ale pravidelný flow.',
              'Networking akce — meetupy, konference. 1 dobrý kontakt > 100 vizitek.',
              'Cold email — funguje, pokud personalizuješ. 50 osobních mailů > 1000 hromadných.',
              'Obsahový marketing (blog, YouTube) — buduje autoritu. Dlouhý horizont.',
              'Partnerství — najdi 3 freelancery v doplňkových oborech (designer + copy + dev) a doporučujte si.',
              'Bývalý zaměstnavatel — pokud jsi odešel v dobrém, často se vrátí jako první klient.',
            ],
          },
        ],
      },
      {
        heading: 'Jak nastavit cenu, aby tě klient bral vážně',
        blocks: [
          {
            type: 'p',
            text: 'Nejčastější chyba začátečníků: nízká cena = signál nízké kvality. Klienti, kteří hledají nejlevnější, jsou typicky ti nejproblematičtější. Stanov cenu, kterou unesete oba — ty s úsměvem, klient bez vrásek.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Pravidlo trojnásobku: vezmi svou bývalou hrubou hodinovou mzdu a vynásob 3×. Pokrývá to nezaplacený čas (akvizice, administrativa), výpadky a daně.',
          },
        ],
      },
      {
        heading: 'První rok: čeho se vyvarovat',
        blocks: [
          {
            type: 'ul',
            items: [
              'Nedělej zadarmo. „Reference“ ti účet nezaplatí.',
              'Neslibuj termíny, které nezvládáš. Lepší dlouhý termín dodržený než krátký zmeškaný.',
              'Vždy posílej smlouvu nebo aspoň objednávku mailem. Slovní dohoda = problém.',
              'Faktura do 7 dní od dokončení. Čím déle čekáš, tím déle ti zaplatí.',
              'Sleduj cashflow týdně, ne měsíčně. Freelance má sezónnost.',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'fakturace-do-zahranici',
    title: 'Fakturace do zahraničí: EU, mimo EU a reverse charge prakticky',
    excerpt:
      'Jak vystavit fakturu klientovi v Německu, USA nebo na Slovensku. Reverse charge, OSS režim, kurzy, jazyk faktury a co hlídat u DPH.',
    category: 'Fakturace',
    readingMinutes: 11,
    publishedAt: '2026-04-12',
    sections: [
      {
        heading: 'Tři situace podle země klienta',
        blocks: [
          {
            type: 'ul',
            items: [
              'Klient v EU s platným DIČ (B2B): režim přenesené daňové povinnosti (reverse charge). Fakturuješ bez DPH, klient si DPH dodaní u sebe.',
              'Klient v EU bez DIČ (B2C, fyzická osoba): účtuješ českou DPH, případně využiješ OSS režim při překročení limitu 10 000 EUR.',
              'Klient mimo EU (USA, UK po Brexitu, Švýcarsko): služba se obvykle nedaní v ČR, fakturuješ bez DPH s poznámkou „mimo předmět české DPH“.',
            ],
          },
        ],
      },
      {
        heading: 'Reverse charge krok za krokem',
        blocks: [
          {
            type: 'ol',
            items: [
              'Ověř DIČ klienta v systému VIES (ec.europa.eu/taxation_customs/vies).',
              'Vystav fakturu bez DPH s poznámkou „daň odvede zákazník“ nebo „reverse charge“.',
              'Uveď své CZ DIČ i klientovo zahraniční DIČ.',
              'V přiznání k DPH uveď v řádku 21 (poskytnutí služby do EU s místem plnění v jiném ČS).',
              'Podej souhrnné hlášení do 25. dne následujícího měsíce.',
            ],
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Pokud klient nemá platné DIČ ve VIES, není to B2B! Musíš účtovat českou DPH jako koncovému spotřebiteli.',
          },
        ],
      },
      {
        heading: 'Jazyk a měna faktury',
        blocks: [
          {
            type: 'p',
            text: 'Český zákon povoluje fakturu v cizím jazyce a měně. Pro účetnictví ji ale musíš přepočíst na CZK kurzem ČNB ke dni vystavení (nebo jednotným měsíčním kurzem). DPH vždy uváděj v Kč.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Vystaveno.cz vystaví dvojjazyčnou fakturu (česky/anglicky/německy) v cizí měně a automaticky doplní přepočet na CZK kurzem ČNB.',
          },
        ],
      },
      {
        heading: 'OSS režim pro digitální služby a e-shopy',
        blocks: [
          {
            type: 'p',
            text: 'Pokud prodáváš digitální produkty (kurzy, software, e-knihy) nebo zboží koncovým zákazníkům v EU a překročíš limit 10 000 EUR ročně, musíš se registrovat v OSS (One Stop Shop). Pak účtuješ DPH podle země zákazníka, ale odvádíš ji jednou platbou českému finančáku.',
          },
        ],
      },
    ],
  },
  // ===== STŘEDNÍ ČLÁNKY (5–8 min) =====
  {
    slug: 'ico-zdarma-jak-zjistit',
    title: 'Jak zjistit IČO firmy zdarma online (ARES, justice.cz)',
    excerpt:
      'Tři ověřené způsoby, jak najít IČO, DIČ a další údaje o firmě zdarma. Plus rozdíl mezi ARES a obchodním rejstříkem.',
    category: 'Tipy pro OSVČ',
    readingMinutes: 5,
    publishedAt: '2026-04-11',
    sections: [
      {
        heading: 'ARES — nejrychlejší cesta',
        blocks: [
          {
            type: 'p',
            text: 'ARES (Administrativní registr ekonomických subjektů) na wwwinfo.mfcr.cz/ares je veřejný, zdarma a obsahuje všechny právnické i fyzické osoby s IČO. Stačí zadat název, IČO nebo část adresy.',
          },
          {
            type: 'ul',
            items: [
              'IČO a DIČ',
              'Sídlo a datum vzniku',
              'Předmět podnikání (CZ-NACE)',
              'Status plátce DPH',
              'Vazby na obchodní rejstřík a živnostenský rejstřík',
            ],
          },
        ],
      },
      {
        heading: 'Obchodní rejstřík (justice.cz)',
        blocks: [
          {
            type: 'p',
            text: 'Pro s.r.o., a.s. a další právnické osoby najdeš v justice.cz detailní výpis: jednatele, společníky, základní kapitál, účetní závěrky. Užitečné při ověření, s kým podnikáš.',
          },
        ],
      },
      {
        heading: 'Automatické doplnění ve fakturačním softwaru',
        blocks: [
          {
            type: 'callout',
            variant: 'tip',
            text: 'Ve Vystaveno.cz stačí napsat IČO klienta a všechno (název, adresa, DIČ, plátcovství DPH) se doplní automaticky z ARES. Šetří 2 minuty u každé faktury.',
          },
        ],
      },
    ],
  },
  {
    slug: 'zalohova-faktura-jak-na-to',
    title: 'Zálohová faktura: jak ji vystavit, zaúčtovat a co dělat s DPH',
    excerpt:
      'Co je zálohová faktura, kdy ji použít, jak na proforma a daňový doklad k záloze. Kompletní postup pro neplátce i plátce DPH.',
    category: 'Fakturace',
    readingMinutes: 7,
    publishedAt: '2026-04-09',
    sections: [
      {
        heading: 'Zálohová vs. proforma vs. daňový doklad',
        blocks: [
          {
            type: 'p',
            text: 'Zálohová faktura (proforma) NENÍ daňový doklad — je to jen výzva k platbě zálohy předem. Klient ti zaplatí, ty vystavíš daňový doklad k přijaté záloze (jen pokud jsi plátce DPH) a po dokončení konečnou (vyúčtovací) fakturu.',
          },
        ],
      },
      {
        heading: 'Postup pro neplátce DPH',
        blocks: [
          {
            type: 'ol',
            items: [
              'Vystav proforma fakturu s textem „Toto není daňový doklad“.',
              'Klient zaplatí, ty potvrdíš příjem.',
              'Po dokončení vystav konečnou fakturu na celou částku s odečtem zálohy.',
            ],
          },
        ],
      },
      {
        heading: 'Postup pro plátce DPH',
        blocks: [
          {
            type: 'ol',
            items: [
              'Vystav proforma fakturu (bez DPH).',
              'Klient zaplatí zálohu.',
              'Do 15 dnů od přijetí platby vystav daňový doklad k přijaté záloze (s DPH).',
              'Při dokončení vystav konečnou fakturu, kde odečteš zálohu i DPH ze zálohy.',
            ],
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Daňový doklad k záloze MUSÍŠ vystavit i v případě, že klient zaplatí o měsíc dříve než dokončíš zakázku. Jinak hrozí pokuta.',
          },
        ],
      },
    ],
  },
  {
    slug: 'dobropis-jak-vystavit',
    title: 'Dobropis (opravný daňový doklad): kdy a jak ho vystavit',
    excerpt:
      'Reklamace, sleva, vrácení zboží nebo chybná faktura — to vše řeší dobropis. Praktický návod včetně náležitostí a zaúčtování.',
    category: 'Fakturace',
    readingMinutes: 6,
    publishedAt: '2026-04-07',
    sections: [
      {
        heading: 'Co je dobropis',
        blocks: [
          {
            type: 'p',
            text: 'Dobropis (formálně „opravný daňový doklad“) je faktura se zápornou částkou, kterou opravuješ původně vystavený doklad. Používá se při: vrácení zboží, reklamaci, dodatečné slevě, chybě v ceně nebo množství.',
          },
        ],
      },
      {
        heading: 'Náležitosti dobropisu',
        blocks: [
          {
            type: 'ul',
            items: [
              'Číslo dobropisu (vlastní řada nebo navazující na faktury).',
              'Odkaz na původní fakturu (číslo a datum).',
              'Důvod opravy (reklamace, sleva, vrácení).',
              'Záporná částka (nebo plus, ale označená jako oprava).',
              'Pokud jsi plátce DPH: opravená výše DPH a odpovídající základ.',
            ],
          },
        ],
      },
      {
        heading: 'Lhůty a zaúčtování',
        blocks: [
          {
            type: 'p',
            text: 'Plátce DPH má 15 dnů od skutečnosti, která vede k opravě (např. od reklamace), na vystavení dobropisu. Klient ho musí potvrdit (podpis, e-mail) — bez toho si nemůžeš snížit DPH.',
          },
        ],
      },
    ],
  },
  {
    slug: 'paragon-vs-faktura',
    title: 'Paragon vs. faktura: kdy stačí účtenka a kdy musíš vystavit fakturu',
    excerpt:
      'Rozdíl mezi paragonem (zjednodušený daňový doklad) a fakturou. Kdy stačí každá z nich a co je u plateb v hotovosti.',
    category: 'Fakturace',
    readingMinutes: 5,
    publishedAt: '2026-04-06',
    sections: [
      {
        heading: 'Hlavní rozdíl',
        blocks: [
          {
            type: 'p',
            text: 'Paragon (zjednodušený daňový doklad) můžeš vystavit do limitu 10 000 Kč včetně DPH. Nemusí obsahovat údaje o odběrateli — jen tvoje IČO/DIČ, datum, popis, cenu a DPH. Faktura se vystavuje vždy nad 10 000 Kč nebo když si ji odběratel vyžádá.',
          },
        ],
      },
      {
        heading: 'Kdy MUSÍŠ vystavit plnou fakturu',
        blocks: [
          {
            type: 'ul',
            items: [
              'Částka přesahuje 10 000 Kč včetně DPH.',
              'Odběratel je plátce DPH a vyžaduje si plný doklad.',
              'Plnění do EU v reverse charge režimu.',
              'Prodej do zahraničí.',
              'Bezhotovostní platba na fakturu.',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'smlouva-o-dilo-vzor',
    title: 'Smlouva o dílo pro freelancery: co v ní musí být a vzor',
    excerpt:
      'Smlouva o dílo chrání tebe i klienta. Jaké náležitosti, autorská práva, platební podmínky a jak se vyhnout nejčastějším problémům.',
    category: 'Smlouvy a právo',
    readingMinutes: 8,
    publishedAt: '2026-04-04',
    sections: [
      {
        heading: 'Proč mít smlouvu, i když je klient kamarád',
        blocks: [
          {
            type: 'p',
            text: '90 % sporů mezi freelancerem a klientem vzniká z nejasností: kdy je dílo „hotové“, kolik změn je v ceně, kdo vlastní zdrojáky/grafiku. Smlouva to řeší předem za 30 minut psaní.',
          },
        ],
      },
      {
        heading: 'Povinné náležitosti',
        blocks: [
          {
            type: 'ul',
            items: [
              'Smluvní strany (jméno, IČO, adresa).',
              'Předmět díla — co konkrétně dodáš (specifikace, rozsah).',
              'Termín dokončení a způsob předání.',
              'Cena a platební podmínky (záloha, splátky, splatnost).',
              'Autorská práva — komu náleží zdrojáky, šablony, fotky.',
              'Postup při změnách (change requests, hodinová sazba).',
              'Sankce za prodlení obou stran.',
            ],
          },
        ],
      },
      {
        heading: 'Autorská práva — nejdůležitější bod',
        blocks: [
          {
            type: 'p',
            text: 'Default v ČR: autorská práva zůstávají autorovi (tobě), klient získává jen licenci k užití. Pokud chce klient výhradní práva nebo prodej dál, musí to být ve smlouvě jasně napsané — typicky za vyšší cenu.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Vzory smluv najdeš zdarma na Frank Bold (frankbold.org), Pravniprostor.cz nebo Dostupný advokát. Vždy si je nech zkontrolovat skutečným právníkem před prvním použitím.',
          },
        ],
      },
    ],
  },
  {
    slug: 'preruseni-zivnosti',
    title: 'Přerušení živnosti: kdy, jak a co s odvody',
    excerpt:
      'Jak přerušit živnost online, na jak dlouho a co se děje s odvody na sociální a zdravotní pojištění během přerušení.',
    category: 'Začátek podnikání',
    readingMinutes: 6,
    publishedAt: '2026-04-03',
    sections: [
      {
        heading: 'Kdy se přerušení vyplatí',
        blocks: [
          {
            type: 'ul',
            items: [
              'Mateřská/rodičovská dovolená (ušetříš odvody).',
              'Dlouhodobá nemoc nebo studium.',
              'Zaměstnání na hlavní pracovní poměr a živnost neděláš.',
              'Sezónní podnikání (např. jen v létě).',
            ],
          },
        ],
      },
      {
        heading: 'Jak přerušit',
        blocks: [
          {
            type: 'ol',
            items: [
              'Přihlas se na Portál občana přes bankID.',
              'Najdi formulář „Oznámení o přerušení provozování živnosti“.',
              'Vyplň datum přerušení (může být i zpětně do 30 dnů).',
              'Oznam přerušení OSSZ a zdravotní pojišťovně.',
            ],
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Pozor: zdravotní pojištění musíš platit dál (pokud nejsi zaměstnán nebo státní pojištěnec). Sociální se přeruší, ale ztrácíš nárok na nemocenskou.',
          },
        ],
      },
    ],
  },
  {
    slug: 'cestovni-nahrady-osvc',
    title: 'Cestovní náhrady OSVČ: stravné, kilometrovné a jak je uplatnit',
    excerpt:
      'Co si OSVČ může uplatnit jako cestovní výdaje — stravné, ubytování, kilometrovné u soukromého auta. Sazby pro rok 2026.',
    category: 'DPH a daně',
    readingMinutes: 7,
    publishedAt: '2026-04-01',
    sections: [
      {
        heading: 'Co si můžeš uplatnit',
        blocks: [
          {
            type: 'ul',
            items: [
              'Stravné při pracovních cestách mimo místo bydliště (časová pásma 5–12 h, 12–18 h, nad 18 h).',
              'Kilometrovné u soukromého auta — sazba pro rok 2026 cca 5,80 Kč/km + náhrada za PHM.',
              'Ubytování (faktura nebo doklad).',
              'Jízdenky MHD, vlak, letenky.',
              'Parkovné, dálniční známky.',
            ],
          },
        ],
      },
      {
        heading: 'Důležité podmínky',
        blocks: [
          {
            type: 'p',
            text: 'Cesta musí mít prokazatelný podnikatelský účel — schůzka s klientem, dodávka, školení. Veď si knihu jízd se třemi údaji: datum, trasa, účel cesty. Bez ní ti finančák kilometrovné neuzná.',
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Pokud používáš paušál na výdaje (60 % nebo 80 %), cestovní náhrady už jsou v něm zahrnuté — nemůžeš si je uplatnit zvlášť.',
          },
        ],
      },
    ],
  },
  {
    slug: 'auto-v-podnikani',
    title: 'Auto v podnikání OSVČ: koupě, leasing, paušál nebo kilometrovné',
    excerpt:
      'Čtyři způsoby, jak řešit auto pro podnikání. Plusy, minusy a kdy se který vyplatí. Včetně paušálních výdajů na auto 5 000 Kč/měsíc.',
    category: 'DPH a daně',
    readingMinutes: 8,
    publishedAt: '2026-03-30',
    sections: [
      {
        heading: 'Čtyři varianty srovnané',
        blocks: [
          {
            type: 'ul',
            items: [
              'Auto v obchodním majetku — odpisuješ 5 let, uplatníš PHM, opravy, pojistku, dálniční známku.',
              'Operativní leasing — splátka jako výdaj, žádné odpisy. Po skončení vrátíš.',
              'Finanční leasing — postupně přechází do tvého majetku, splátky jako výdaj.',
              'Soukromé auto + kilometrovné — jednoduché, ale stropované knihou jízd.',
              'Paušální výdaje na dopravu (5 000 Kč/měsíc) — bez prokazování, ale max. 3 auta.',
            ],
          },
        ],
      },
      {
        heading: 'Paušál 5 000 Kč/měsíc — kdy se vyplatí',
        blocks: [
          {
            type: 'p',
            text: 'Paušál na dopravu znamená 5 000 Kč/měsíc jako výdaj bez dokladů. Vyplatí se, pokud auto využíváš převážně k podnikání ale málo cestuješ — třeba do 1 000 km/měsíc. Výhoda: žádná evidence, žádné účtenky za PHM.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Pravidlo: spočítej si reálné měsíční výdaje (PHM + opravy / 12 + pojistka / 12). Pokud jsou pod 5 000 Kč, jdi do paušálu.',
          },
        ],
      },
    ],
  },
  {
    slug: 'home-office-odpocty',
    title: 'Home office a odpočty: co si OSVČ může uplatnit z domácí kanceláře',
    excerpt:
      'Pokud pracuješ z domu, můžeš si uplatnit část nájmu, energií a internetu jako výdaj. Jak na to a co hlídat.',
    category: 'DPH a daně',
    readingMinutes: 6,
    publishedAt: '2026-03-26',
    sections: [
      {
        heading: 'Princip poměrného uplatnění',
        blocks: [
          {
            type: 'p',
            text: 'Pokud máš v bytě vyhrazenou místnost na práci (nebo její část), můžeš si uplatnit poměrnou část nákladů. Standardně podle podlahové plochy: kancelář 12 m² v bytě 60 m² = 20 % nákladů.',
          },
          {
            type: 'ul',
            items: [
              'Část nájmu nebo úroku z hypotéky.',
              'Energie (elektřina, plyn, voda).',
              'Internet a mobilní paušál (často 100 %, ne jen poměr).',
              'Vybavení kanceláře — stůl, židle, monitor (jako majetek nebo přímý výdaj do 80 000 Kč).',
            ],
          },
        ],
      },
      {
        heading: 'Pozor na daň z nemovitosti při prodeji',
        blocks: [
          {
            type: 'callout',
            variant: 'warn',
            text: 'Pokud uplatňuješ část bytu jako podnikatelský majetek, při prodeji bytu z této části zaplatíš daň z příjmů. U vlastního bytu se proto často vyplatí jen uplatnit „bezplatné užití“ a poměr energií, ne vlastní hypotéku.',
          },
        ],
      },
    ],
  },
  {
    slug: 'nemocenska-osvc',
    title: 'Nemocenská pro OSVČ: jak si ji platit a kolik dostaneš',
    excerpt:
      'OSVČ nemá nemocenskou automaticky — musí si ji platit dobrovolně. Kolik to stojí, jak vysoká dávka a kdy se to vyplatí.',
    category: 'Finance a banking',
    readingMinutes: 5,
    publishedAt: '2026-03-24',
    sections: [
      {
        heading: 'Dobrovolné nemocenské',
        blocks: [
          {
            type: 'p',
            text: 'Jako OSVČ se musíš sám přihlásit k nemocenskému pojištění na OSSZ. Minimální měsíční záloha pro rok 2026 je cca 168 Kč (z minimálního vyměřovacího základu). Můžeš platit i víc, pak máš vyšší dávku.',
          },
        ],
      },
      {
        heading: 'Kolik dostaneš, když onemocníš',
        blocks: [
          {
            type: 'p',
            text: 'Nemocenská se vyplácí od 15. dne nemoci (prvních 14 dnů jsi bez příjmu). Výše: 60 % redukovaného denního vyměřovacího základu. Při minimálních zálohách to vychází cca 200 Kč/den.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Pro většinu OSVČ je výhodnější soukromé pojištění pracovní neschopnosti od pojišťovny než státní nemocenská — vyplácí se od 1. dne a dávky jsou výrazně vyšší.',
          },
        ],
      },
    ],
  },
  {
    slug: 'vedlejsi-cinnost-osvc',
    title: 'Vedlejší činnost OSVČ: jak kombinovat zaměstnání a živnost',
    excerpt:
      'Pracuješ na HPP a chceš si přivydělat na živnost? Pravidla, snížené odvody a kdy se hlásit jako vedlejší činnost.',
    category: 'Začátek podnikání',
    readingMinutes: 6,
    publishedAt: '2026-03-22',
    sections: [
      {
        heading: 'Kdy je živnost vedlejší činnost',
        blocks: [
          {
            type: 'ul',
            items: [
              'Máš zaměstnání na HPP (z pohledu sociálky).',
              'Pobíráš starobní nebo invalidní důchod.',
              'Jsi na rodičovské.',
              'Jsi student do 26 let.',
            ],
          },
        ],
      },
      {
        heading: 'Výhoda: nižší odvody',
        blocks: [
          {
            type: 'p',
            text: 'Při vedlejší činnosti neplatíš minimální zálohy na sociální pojištění — jen z reálného zisku. Pokud roční zisk z vedlejší činnosti nepřesáhne rozhodný limit (pro rok 2026 cca 105 000 Kč), neplatíš sociální vůbec. Zdravotní platí zaměstnavatel.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Pravidlo: do 100 000 Kč ročního zisku z vedlejší činnosti neplatíš sociální. Ideální pro „zkušební“ rok podnikání vedle zaměstnání.',
          },
        ],
      },
    ],
  },
  {
    slug: 'duchodove-pojisteni-osvc',
    title: 'Důchodové pojištění OSVČ: kolik platit a jaký důchod čekat',
    excerpt:
      'Co je minimální záloha, jak ovlivňuje budoucí důchod a proč se vyplatí platit víc než minimum (nebo si spořit jinde).',
    category: 'Finance a banking',
    readingMinutes: 7,
    publishedAt: '2026-03-18',
    sections: [
      {
        heading: 'Jak se počítá záloha',
        blocks: [
          {
            type: 'p',
            text: 'Záloha na důchodové pojištění se počítá z 50 % daňového základu předchozího roku × 29,2 %. V prvním roce platíš minimum (pro rok 2026 cca 4 700 Kč/měsíc).',
          },
        ],
      },
      {
        heading: 'Důchod při minimálních zálohách',
        blocks: [
          {
            type: 'callout',
            variant: 'warn',
            text: 'OSVČ s minimálními zálohami po 40 letech podnikání dostane důchod cca 12 000–14 000 Kč/měsíc. Reálné životní minimum to nepokryje.',
          },
          {
            type: 'p',
            text: 'Řešení: buď platit vyšší zálohy (zvyšuje vyměřovací základ pro důchod), nebo si paralelně spořit do důchodového spoření / DIP / akcií. Většina finančních poradců doporučuje druhou variantu — vyšší výnos, větší flexibilita.',
          },
        ],
      },
    ],
  },
  {
    slug: 'danove-priznani-osvc-postup',
    title: 'Daňové přiznání OSVČ krok za krokem: termíny, formuláře a slevy',
    excerpt:
      'Kompletní průvodce daňovým přiznáním pro OSVČ — termíny, jaké formuláře, jak uplatnit slevy na poplatníka, manželku, děti a další.',
    category: 'DPH a daně',
    readingMinutes: 10,
    publishedAt: '2026-03-16',
    sections: [
      {
        heading: 'Termíny pro rok 2026',
        blocks: [
          {
            type: 'ul',
            items: [
              '1. dubna — papírové přiznání nebo přes datovou schránku osobně.',
              '1. května — elektronické podání (přes Portál občana, datovku).',
              '1. července — pokud máš daňového poradce a podáš plnou moc do 1. dubna.',
            ],
          },
        ],
      },
      {
        heading: 'Co všechno potřebuješ',
        blocks: [
          {
            type: 'ul',
            items: [
              'Formulář Daňové přiznání k dani z příjmů fyzických osob (typ A nebo B).',
              'Přehled o příjmech a výdajích (z účetnictví nebo paušál).',
              'Přehledy pro OSSZ a zdravotní pojišťovnu (samostatné formuláře).',
              'Doklady ke slevám a odpočtům (potvrzení o studiu dětí, hypotéka, dary, životní pojištění).',
            ],
          },
        ],
      },
      {
        heading: 'Slevy a odpočty, na které máš nárok',
        blocks: [
          {
            type: 'ul',
            items: [
              'Sleva na poplatníka — 30 840 Kč ročně, automaticky všichni.',
              'Sleva na manžela/manželku bez příjmů — 24 840 Kč.',
              'Daňové zvýhodnění na děti — 15 204 Kč na první, 22 320 Kč na druhé, 27 840 Kč na třetí.',
              'Sleva na studenta do 26 let — 4 020 Kč.',
              'Odpočet úroků z hypotéky (max. 150 000 Kč).',
              'Odpočet darů (min. 1 000 Kč nebo 2 % základu).',
              'Odpočet penzijka a životního pojištění (max. 48 000 Kč součet obou).',
            ],
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Slevy se uplatňují AŽ po výpočtu daně. Často se stane, že ti vyjde záporná daň → přeplatek vrací finančák do 30 dnů na účet.',
          },
        ],
      },
    ],
  },
  {
    slug: 'kontrolni-hlaseni-dph',
    title: 'Kontrolní hlášení DPH: kdy, jak a co hrozí při zpoždění',
    excerpt:
      'Plátce DPH musí podávat kontrolní hlášení každý měsíc. Co v něm je, jak se vyhnout pokutám 1 000 Kč až 50 000 Kč a jak na výzvy.',
    category: 'DPH a daně',
    readingMinutes: 7,
    publishedAt: '2026-03-14',
    sections: [
      {
        heading: 'Kdy a jak podat',
        blocks: [
          {
            type: 'p',
            text: 'Měsíční plátce DPH podává kontrolní hlášení do 25. dne následujícího měsíce. Čtvrtletní plátce (jen fyzická osoba) také měsíčně. Podává se výhradně elektronicky — přes datovku, daňový portál nebo aplikaci typu Pohoda/Vystaveno.',
          },
        ],
      },
      {
        heading: 'Co v něm je',
        blocks: [
          {
            type: 'ul',
            items: [
              'Sekce A — vystavené faktury nad 10 000 Kč včetně DPH (pojednotlivě).',
              'Sekce B — přijaté faktury nad 10 000 Kč (jednotlivě).',
              'Sekce A.4, B.2 — souhrn malých faktur do 10 000 Kč.',
              'Sekce C — opravy a reverse charge.',
            ],
          },
        ],
      },
      {
        heading: 'Pokuty',
        blocks: [
          {
            type: 'callout',
            variant: 'warn',
            text: 'Nepodáno = 1 000 Kč. Po výzvě finančáku do 5 dnů = 10 000 Kč. Při neplnění opakovaně = až 50 000 Kč. Po druhé výzvě může finančák zrušit registraci k DPH.',
          },
        ],
      },
    ],
  },
  {
    slug: 'stripe-paypal-pro-osvc',
    title: 'Stripe, PayPal a další platební brány pro OSVČ: srovnání 2026',
    excerpt:
      'Jak přijímat platby kartou online — Stripe, GoPay, ComGate, PayPal. Poplatky, nasazení a co se hodí pro freelancera vs. e-shop.',
    category: 'Finance a banking',
    readingMinutes: 8,
    publishedAt: '2026-03-12',
    sections: [
      {
        heading: 'Hlavní hráči v Česku',
        blocks: [
          {
            type: 'ul',
            items: [
              'Stripe — globální, nejjednodušší integrace, poplatek ~1,4 % + 6 Kč (CZ karty), 2,9 % + 8 Kč (zahraniční).',
              'GoPay — česká, široká podpora plateb (kartou, převodem, Apple Pay), poplatek ~1,2–1,8 %.',
              'ComGate — česká, dobré ceny pro e-shopy, mnoho platebních metod.',
              'PayPal — drahý (3,4 % + 10 Kč), ale klienti v zahraničí ho znají.',
              'Revolut Business — terminál v mobilu, 0,8 % EU karty, dobré pro řemeslníky.',
            ],
          },
        ],
      },
      {
        heading: 'Pro freelance fakturaci',
        blocks: [
          {
            type: 'p',
            text: 'Pro běžnou fakturaci OSVČ obvykle stačí QR kód na faktuře — bez poplatků, klient zaplatí bankou. Platební brány se vyplatí, když prodáváš digitální produkty nebo máš e-shop.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Vystaveno.cz přidá na každou fakturu QR kód pro platbu bankou zdarma. Online platba kartou bude dostupná po napojení platebního poskytovatele.',
          },
        ],
      },
    ],
  },
  {
    slug: 'ochrana-znacky-trademark',
    title: 'Ochrana značky pro OSVČ: kdy si registrovat ochrannou známku',
    excerpt:
      'Jak si chránit jméno firmy, logo nebo název produktu. Postup u Úřadu průmyslového vlastnictví, ceny a co dělat při napadení značky.',
    category: 'Smlouvy a právo',
    readingMinutes: 7,
    publishedAt: '2026-03-10',
    sections: [
      {
        heading: 'Proč si značku registrovat',
        blocks: [
          {
            type: 'p',
            text: 'Bez registrace nemáš na jméno svého produktu/firmy žádné výlučné právo. Konkurence si může zaregistrovat tvoje jméno a zakázat ti ho používat. U úspěšné značky je to časovaná bomba.',
          },
        ],
      },
      {
        heading: 'Postup a ceny',
        blocks: [
          {
            type: 'ol',
            items: [
              'Ověř, jestli značka už není registrovaná (rešerše na upv.gov.cz nebo TMview).',
              'Vyplň přihlášku ochranné známky — slovní, obrazová nebo kombinovaná.',
              'Vyber třídy zboží a služeb (Niceské třídění, např. třída 35 marketing, 42 software).',
              'Zaplať poplatek: 5 000 Kč za 1 třídu + 500 Kč za každou další (online).',
              'Čekáš 3–6 měsíců na zveřejnění a registraci.',
            ],
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Pokud plánuješ expanzi do EU, zvaž rovnou ochrannou známku EU (EUIPO) — pokrývá všech 27 zemí najednou za 850–1 050 EUR.',
          },
        ],
      },
    ],
  },
  {
    slug: 'ucetni-vs-danovy-poradce',
    title: 'Účetní vs. daňový poradce: koho potřebuješ a kolik to stojí',
    excerpt:
      'Rozdíl mezi účetní a daňovým poradcem, kdy stačí jeden a kdy potřebuješ oba. Cenové orientace pro OSVČ v roce 2026.',
    category: 'Finance a banking',
    readingMinutes: 6,
    publishedAt: '2026-03-08',
    sections: [
      {
        heading: 'Hlavní rozdíl',
        blocks: [
          {
            type: 'p',
            text: 'Účetní vede tvoji daňovou evidenci nebo účetnictví — zpracovává faktury, výdaje, mzdy. Daňový poradce má státní zkoušku, může tě zastupovat na finančáku, podává přiznání s prodlouženou lhůtou (do 1. července) a ručí za chyby.',
          },
        ],
      },
      {
        heading: 'Co potřebuje běžná OSVČ',
        blocks: [
          {
            type: 'ul',
            items: [
              'Paušální daň: nikoho — žádné papírování.',
              'Výdajové paušály: účetní stačí 1× ročně na přiznání (1 500–4 000 Kč).',
              'Skutečné výdaje neplátce: účetní měsíčně 1 000–3 000 Kč.',
              'Plátce DPH: účetní měsíčně 2 000–6 000 Kč (kontrolní hlášení).',
              'Daňový poradce: + 3 000–10 000 Kč ročně za přiznání s prodlouženou lhůtou.',
            ],
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Při ročních příjmech do 1 mil. Kč a paušálu si většina OSVČ zvládne přiznání sama — formulář na MOJE daně je intuitivní a má kontrolu chyb.',
          },
        ],
      },
    ],
  },
  // ===== CORNERSTONE ČLÁNEK =====
  {
    slug: 'kompletni-pruvodce-vystavenim-faktury-2026',
    title: 'Kompletní průvodce vystavením faktury v ČR 2026',
    excerpt:
      'Vše, co potřebuješ vědět o fakturaci v Česku v roce 2026: povinné náležitosti, neplátce vs. plátce DPH, QR platby, elektronické faktury, zálohy, dobropisy a nejčastější chyby.',
    category: 'Fakturace',
    readingMinutes: 15,
    publishedAt: '2026-05-05',
    sections: [
      {
        heading: 'Co je faktura a kdo ji musí vystavit',
        blocks: [
          {
            type: 'p',
            text: 'Faktura je účetní (a u plátců DPH daňový) doklad, kterým podnikatel potvrzuje dodávku zboží nebo služby a vyzývá odběratele k zaplacení. V Česku ji vystavuje každá OSVČ a každá firma — ať už je plátce DPH, nebo ne.',
          },
          {
            type: 'p',
            text: 'Právní rámec tvoří hlavně zákon o účetnictví (563/1991 Sb.), zákon o DPH (235/2004 Sb.) a živnostenský zákon. Pro koncové spotřebitele (B2C) navíc občanský zákoník a EET v omezené míře (od 2023 zrušeno pro většinu OSVČ).',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Tento průvodce je psaný pro rok 2026 — limity DPH, sazby i lhůty odpovídají aktuální legislativě k 1. 1. 2026.',
          },
        ],
      },
      {
        heading: 'Povinné náležitosti faktury (neplátce DPH)',
        blocks: [
          {
            type: 'p',
            text: 'Pokud nejsi plátce DPH, vystavuješ účetní doklad. Musí obsahovat:',
          },
          {
            type: 'ul',
            items: [
              'Označení dokladu (např. „Faktura č. 2026-0001“) — pořadové číslo musí být jednoznačné a v souvislé řadě.',
              'Identifikaci dodavatele: jméno/název, adresu sídla, IČO.',
              'Identifikaci odběratele: jméno/název, adresu, IČO (a DIČ, pokud je má).',
              'Datum vystavení dokladu.',
              'Předmět plnění — co konkrétně fakturuješ (služba, zboží, množství, cena).',
              'Celkovou peněžní částku k úhradě.',
              'Označení vystavitele (jméno) — vlastnoruční podpis ani razítko nejsou povinné.',
            ],
          },
        ],
      },
      {
        heading: 'Náležitosti navíc pro plátce DPH',
        blocks: [
          {
            type: 'p',
            text: 'Pokud jsi plátce DPH (nebo identifikovaná osoba), vystavuješ daňový doklad podle §29 zákona o DPH. Kromě výše uvedeného musí obsahovat:',
          },
          {
            type: 'ul',
            items: [
              'DIČ dodavatele i odběratele (pokud má).',
              'Datum uskutečnění zdanitelného plnění (DUZP).',
              'Jednotkovou cenu bez DPH a případnou slevu.',
              'Základ daně zvlášť pro každou sazbu DPH (21 %, 12 %, 0 %).',
              'Sazbu daně a výši DPH v Kč (i u faktur v cizí měně).',
              'Označení zvláštního režimu, pokud se uplatňuje („přenesená daňová povinnost“, „osvobozeno od daně“, „zvláštní režim — cestovní služba“ apod.).',
            ],
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Faktura plátce DPH musí být vystavena nejpozději do 15 dnů od dne uskutečnění plnění (nebo přijetí zálohy). U pravidelných plnění se lhůta počítá od konce kalendářního měsíce.',
          },
        ],
      },
      {
        heading: 'Číslování faktur — co povoluje zákon',
        blocks: [
          {
            type: 'p',
            text: 'Číselná řada musí být souvislá a jednoznačná. To znamená, že nesmíš vynechávat čísla a každá faktura musí mít unikátní označení. Můžeš ale používat libovolný formát, který má smysl pro tvoje účetnictví:',
          },
          {
            type: 'ul',
            items: [
              'Roční řada s prefixem: 2026-0001, 2026-0002 (nejčastější).',
              'Plynulá řada bez resetu: 1234, 1235, 1236.',
              'Oddělené řady pro různé typy dokladů: F-2026-001 (faktury), OD-2026-001 (dobropisy), Z-2026-001 (zálohové).',
            ],
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Doporučení: dobropisy a zálohové faktury měj v oddělené řadě s vlastním prefixem. Účetní to ocení a v rejstříku to vypadá profesionálněji. Vystaveno.cz to dělá automaticky.',
          },
        ],
      },
      {
        heading: 'Splatnost faktury — co je standard',
        blocks: [
          {
            type: 'p',
            text: 'Mezi podnikateli je zákonná maximální splatnost 60 dnů od doručení faktury (§1963 občanského zákoníku), u veřejných zadavatelů 30 dnů. V praxi se používá 7, 14 nebo 30 dnů — domluvíš se s klientem ve smlouvě nebo ji uvedeš přímo na faktuře.',
          },
          {
            type: 'p',
            text: 'Pokud klient nezaplatí včas, máš ze zákona nárok na úrok z prodlení (repo sazba ČNB + 8 procentních bodů ročně) a na náklady spojené s vymáháním (1 200 Kč paušál podle nařízení vlády 351/2013 Sb.).',
          },
        ],
      },
      {
        heading: 'Zálohové faktury, proforma a daňový doklad',
        blocks: [
          {
            type: 'p',
            text: 'Pojmy se často pletou. Tady je rozdíl:',
          },
          {
            type: 'ul',
            items: [
              'Proforma faktura (zálohová) — výzva k platbě před dodáním. Není to účetní doklad, jen výzva. Klient ji zaplatí.',
              'Daňový doklad k přijaté platbě (DDPP) — vystaví plátce DPH do 15 dnů od přijetí zálohy. Slouží odběrateli k odpočtu DPH.',
              'Konečná faktura — vystaví se po dodání plnění. Odečte se v ní již zaplacená záloha, doplatí se zbytek.',
            ],
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Pokud nejsi plátce DPH, daňový doklad k záloze nevystavuješ — stačí proforma a po dodání konečná faktura.',
          },
        ],
      },
      {
        heading: 'Dobropis (opravný daňový doklad)',
        blocks: [
          {
            type: 'p',
            text: 'Dobropis vystavíš, když potřebuješ snížit nebo stornovat dříve vystavenou fakturu — typicky reklamace, sleva po vystavení, vrácení zboží nebo chyba v částce. Položky a DPH jsou se záporným znaménkem a doklad odkazuje na původní fakturu.',
          },
          {
            type: 'p',
            text: 'U plátců DPH se nazývá „opravný daňový doklad“ (§42 zákona o DPH) a musí být vystaven do 15 dnů ode dne, kdy nastaly důvody pro opravu. Odběratel ho musí potvrdit (písemně, datovou schránkou nebo prokazatelně e-mailem).',
          },
        ],
      },
      {
        heading: 'QR platba — proč ji vždy přidávat',
        blocks: [
          {
            type: 'p',
            text: 'QR Platba podle českého standardu SPAYD obsahuje číslo účtu, částku, variabilní symbol a zprávu pro příjemce. Klient ji načte mobilním bankovnictvím a stačí potvrdit — žádné přepisování čísel, žádné chyby ve VS.',
          },
          {
            type: 'p',
            text: 'Z dat fakturačních platforem vychází, že faktury s QR kódem se v průměru platí o 3–5 dní dříve. U OSVČ s desítkami klientů to znamená výrazně lepší cashflow a méně času stráveného urgováním.',
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Vystaveno.cz generuje QR kód automaticky pro každou fakturu, jakmile máš v profilu uložený bankovní účet. Funguje se všemi českými bankami.',
          },
        ],
      },
      {
        heading: 'Elektronická faktura, ISDOC a archivace',
        blocks: [
          {
            type: 'p',
            text: 'Elektronická faktura (PDF nebo strukturovaný formát ISDOC) je v Česku plně rovnocenná papírové. Stačí, aby zajistila tři věci: věrohodnost původu, neporušenost obsahu a čitelnost po celou dobu archivace.',
          },
          {
            type: 'p',
            text: 'Archivační lhůty v ČR:',
          },
          {
            type: 'ul',
            items: [
              'Účetní doklady: 5 let od konce účetního období (zákon o účetnictví).',
              'Daňové doklady (plátci DPH): 10 let od konce roku, ve kterém došlo k plnění.',
              'Mzdové doklady a doklady k důchodovému pojištění: 30 let.',
            ],
          },
          {
            type: 'p',
            text: 'ISDOC je český standard strukturované faktury (XML), který umí načíst většina českých účetních programů — Pohoda, Money S3, Helios, iDoklad i Fakturoid. Vystaveno.cz exportuje ISDOC i CSV jedním kliknutím.',
          },
        ],
      },
      {
        heading: 'Faktura do zahraničí — EU a třetí země',
        blocks: [
          {
            type: 'p',
            text: 'Pravidla závisí na tom, zda jsi plátce DPH a kdo je odběratel:',
          },
          {
            type: 'ul',
            items: [
              'Plátce DPH → plátce v EU (B2B): režim přenesení daňové povinnosti („reverse charge“). Faktura bez DPH, na faktuře musíš uvést DIČ obou stran a poznámku „daň odvede zákazník“. Hlásí se v souhrnném hlášení.',
              'Plátce DPH → koncový zákazník v EU (B2C): u digitálních služeb a zboží přes 10 000 EUR ročně používáš OSS (One Stop Shop) a daníš sazbou země zákazníka.',
              'Plátce DPH → třetí země (mimo EU): vývoz osvobozen od DPH, na faktuře poznámka „osvobozeno od daně podle §66 zákona o DPH“.',
              'Neplátce DPH → kdokoli v zahraničí: vystavíš normální fakturu bez DPH s poznámkou „neplátce DPH“. Pozor: pokud přijmeš službu z EU od plátce, automaticky se stáváš identifikovanou osobou.',
            ],
          },
          {
            type: 'callout',
            variant: 'warn',
            text: 'Identifikovaná osoba je častý zádrhel. Stačí, že si jako neplátce DPH koupíš službu Google Ads, Meta nebo Apple App Store — automaticky vzniká povinnost registrace do 15 dnů. Hlídej si to.',
          },
        ],
      },
      {
        heading: 'Nejčastější chyby a jak se jim vyhnout',
        blocks: [
          {
            type: 'ol',
            items: [
              'Chybějící DUZP u plátce DPH — bez něj faktura není platný daňový doklad a klient ti DPH nemůže nárokovat.',
              'Špatný variabilní symbol nebo chybějící QR kód — platba dorazí, ale nezná se její identifikace, takže ji budeš párovat ručně.',
              'Vynechané číslo v řadě — finanční úřad to při kontrole označí jako vážnou chybu v účetnictví.',
              'Faktura bez data splatnosti — klient si může počkat až do zákonných 30 dnů od doručení.',
              'Sloučené sazby DPH na jednom řádku — každá sazba musí mít svůj řádek a vlastní výpočet daně.',
              'Chybějící poznámka u reverse charge nebo osvobozeného plnění — bez ní hrozí dodatečné doměření DPH.',
              'Posílání PDF faktury bez QR kódu a bez podpisu v e-mailu — působí amatérsky a klient platí později.',
            ],
          },
        ],
      },
      {
        heading: 'Jak vystavit fakturu za 30 sekund',
        blocks: [
          {
            type: 'p',
            text: 'Ruční psaní faktur ve Wordu nebo Excelu je v roce 2026 zbytečnost — riskuješ chyby v číslování, špatný výpočet DPH a klient nedostane QR kód. Moderní fakturační nástroj jako Vystaveno.cz ti vystaví fakturu za pár vteřin:',
          },
          {
            type: 'ol',
            items: [
              'Vyber klienta z adresáře (nebo ho přidáš přes IČO — údaje se načtou z ARES).',
              'Napiš položky (např. „konzultace 5 hodin po 1500 Kč“) — ceny a DPH se spočítají samy.',
              'Vystaveno.cz automaticky doplní DUZP, splatnost, QR kód, DPH a kontroluje zákonné náležitosti.',
              'Klikneš na „Vystavit“ — faktura se uloží, stáhneš ji jako PDF a máš ji v exportu pro účetní.',
            ],
          },
          {
            type: 'callout',
            variant: 'tip',
            text: 'Prvních 14 dní zdarma bez karty. Žádný limit na počet faktur, QR platby v ceně.',
          },
        ],
      },
    ],
    faq: [
      {
        q: 'Musí mít faktura razítko a podpis?',
        a: 'Ne. Razítko nemá v ČR od roku 1989 žádný právní význam a u elektronické faktury stačí jméno vystavitele. Vlastnoruční podpis není povinný ani u papírové faktury vystavené OSVČ.',
      },
      {
        q: 'Do kdy musím fakturu vystavit?',
        a: 'Plátce DPH musí daňový doklad vystavit do 15 dnů od dne uskutečnění zdanitelného plnění nebo přijetí zálohy. Neplátce DPH zákonnou lhůtu nemá, ale je rozumné fakturovat průběžně po dodání plnění.',
      },
      {
        q: 'Mohu vystavit fakturu zpětně?',
        a: 'Ano, ale s opatrností. Datum vystavení se musí shodovat s realitou (kdy doklad reálně vznikl). Datum uskutečnění plnění (DUZP) může být v minulosti, ale lhůta pro vystavení 15 dnů u plátců DPH platí.',
      },
      {
        q: 'Jak dlouho musím faktury archivovat?',
        a: 'Účetní doklady 5 let, daňové doklady (plátci DPH) 10 let od konce roku, ve kterém došlo k plnění. Mzdové doklady 30 let. Elektronická archivace v PDF/ISDOC je plně rovnocenná papírové.',
      },
      {
        q: 'Co dělat, když klient nezaplatí?',
        a: 'Po splatnosti pošli upomínku (Vystaveno.cz to umí automaticky). Máš zákonný nárok na úrok z prodlení (repo sazba ČNB + 8 p.b.) a paušální náhradu nákladů 1 200 Kč. Pokud nereaguje, následuje předžalobní výzva a případně soudní vymáhání nebo prodej pohledávky.',
      },
      {
        q: 'Jak fakturovat klientovi v EU bez DPH?',
        a: 'Pokud jsi plátce DPH a fakturuješ jinému plátci v EU (B2B), použiješ režim reverse charge — faktura bez DPH s uvedením DIČ obou stran a poznámkou „daň odvede zákazník“. Plnění hlásíš v souhrnném hlášení.',
      },
      {
        q: 'Můžu si na fakturu napsat libovolnou splatnost?',
        a: 'Mezi podnikateli platí zákonná maximální splatnost 60 dnů od doručení faktury (§1963 občanského zákoníku). U státních zakázek 30 dnů. Kratší splatnost (7, 14, 30 dnů) je standard a doporučuje se sjednat ve smlouvě.',
      },
    ],
  },
]

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug)
}

export function getArticlesSortedByDate(): Article[] {
  return [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

/**
 * Stop slova — krátká česká + obecná, aby tokenizace dávala smysluplné klíčové výrazy.
 */
const STOP_WORDS = new Set([
  'a',
  'i',
  'o',
  'u',
  'v',
  'z',
  'k',
  's',
  'na',
  'do',
  'od',
  'po',
  'pro',
  'při',
  'za',
  'ze',
  'se',
  'si',
  'je',
  'jsi',
  'js',
  'jsem',
  'jsme',
  'jste',
  'jsou',
  'být',
  'byl',
  'byla',
  'bylo',
  'byli',
  'to',
  'ten',
  'ta',
  'tu',
  'ty',
  'ti',
  'te',
  'těch',
  'tom',
  'této',
  'tato',
  'tato',
  'tomto',
  'co',
  'jak',
  'kde',
  'kdy',
  'kdo',
  'proč',
  'který',
  'která',
  'které',
  'jaký',
  'jaká',
  'jaké',
  'ale',
  'nebo',
  'než',
  'aby',
  'když',
  'pokud',
  'jestli',
  'také',
  'též',
  'ještě',
  'už',
  'jen',
  'moc',
  'velmi',
  'více',
  'méně',
  'nejvíc',
  'nejvíce',
  'jako',
  'tak',
  'takže',
  'tedy',
  'můj',
  'tvůj',
  'jeho',
  'její',
  'náš',
  'váš',
  'jejich',
  'sebe',
  'mne',
  'mě',
  'ti',
  'mu',
  'ji',
  'jim',
  'ne',
  'ano',
  'bez',
  'přes',
  'mezi',
  'podle',
  'kvůli',
  'proti',
  'mimo',
  'krom',
  'kromě',
  'rok',
  'roce',
  'roku',
  'letech',
  'měsíc',
  'měsíci',
  'den',
  'dní',
  'kč',
  'kompletní',
  'návod',
  'průvodce',
  '—',
  '–',
  '-',
  '2025',
  '2026',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics for matching
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
}

function articleKeywords(a: Article): Set<string> {
  // titulek a excerpt mají největší signál; kategorie přidává tematický kontext
  const text = `${a.title} ${a.title} ${a.excerpt} ${a.category}`
  return new Set(tokenize(text))
}

/**
 * Vrátí nejrelevantnější související články pro daný slug.
 * Skóre = překryv klíčových slov (Jaccard-like) + bonus za stejnou kategorii
 *        + drobný bonus za blízké datum publikace (čerstvost).
 * Fallback: pokud nic neskóruje, doplní se nejnovějšími články.
 */
export function getRelatedArticles(slug: string, limit = 3): Article[] {
  const current = getArticleBySlug(slug)
  if (!current) return []
  const currentKeywords = articleKeywords(current)
  const currentTime = new Date(current.publishedAt).getTime()

  const scored = articles
    .filter((a) => a.slug !== slug)
    .map((a) => {
      const kws = articleKeywords(a)
      let overlap = 0
      for (const k of kws) if (currentKeywords.has(k)) overlap++
      const union = new Set([...kws, ...currentKeywords]).size || 1
      const jaccard = overlap / union
      const categoryBonus = a.category === current.category ? 0.15 : 0
      // freshness bonus 0–0.05 podle blízkosti data (max ~365 dnů)
      const dayDiff = Math.abs(currentTime - new Date(a.publishedAt).getTime()) / 86400000
      const freshness = Math.max(0, 0.05 * (1 - Math.min(dayDiff, 365) / 365))
      return { article: a, score: jaccard + categoryBonus + freshness, overlap }
    })
    .sort((a, b) => b.score - a.score)

  const top = scored.filter((s) => s.overlap > 0 || s.article.category === current.category)
  const result = top.slice(0, limit).map((s) => s.article)

  if (result.length < limit) {
    const fillers = getArticlesSortedByDate().filter((a) => a.slug !== slug && !result.includes(a))
    while (result.length < limit && fillers.length) {
      result.push(fillers.shift()!)
    }
  }
  return result
}
