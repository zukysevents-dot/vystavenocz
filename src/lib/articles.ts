/**
 * Statická databáze článků (knowledge base / rady pro OSVČ).
 * Inspirováno strukturou Fakturoid Akademie / iDoklad Učím se.
 * Obsah ručně psaný, žádný scraping. SEO friendly nadpisy a slugy.
 *
 * Pro přidání článku jen rozšiř pole `articles`. Nic víc není potřeba —
 * listing i detail route se renderují automaticky.
 */

export type Article = {
  slug: string;
  title: string;
  /** Krátký perex pro listing a meta description (max ~160 znaků). */
  excerpt: string;
  /** Kategorie pro filtraci a tag v listingu. */
  category: "Začátek podnikání" | "Fakturace" | "DPH a daně" | "Tipy pro OSVČ";
  /** Odhadovaný čas čtení v minutách. */
  readingMinutes: number;
  /** Datum publikace ISO (YYYY-MM-DD). */
  publishedAt: string;
  /** Strukturovaný obsah — sekce s nadpisem h2 a odstavci/seznamy. */
  sections: ArticleSection[];
};

export type ArticleSection = {
  heading: string;
  blocks: ArticleBlock[];
};

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; variant: "tip" | "warn"; text: string };

export const articles: Article[] = [
  {
    slug: "jak-zalozit-zivnost-online",
    title: "Jak založit živnost online v roce 2026 — kompletní návod",
    excerpt:
      "Krok za krokem: kde a jak si vyřídit živnostenský list online přes Portál občana, kolik to stojí a co všechno budeš potřebovat.",
    category: "Začátek podnikání",
    readingMinutes: 7,
    publishedAt: "2026-04-10",
    sections: [
      {
        heading: "Kdo si může založit živnost online",
        blocks: [
          {
            type: "p",
            text: "Živnost online může založit každá fyzická osoba s aktivovanou elektronickou identitou — bankID, mobilní klíč eGovernmentu, datová schránka nebo NIA ID. Stačí být plnoletý, svéprávný a bezúhonný.",
          },
          {
            type: "p",
            text: "Volnou živnost (např. „Výroba, obchod a služby neuvedené v přílohách 1 až 3 živnostenského zákona“) získáš hned. Vázanou nebo řemeslnou musíš doložit vzděláním nebo praxí.",
          },
        ],
      },
      {
        heading: "Co budeš potřebovat",
        blocks: [
          {
            type: "ul",
            items: [
              "Elektronickou identitu (bankID je nejjednodušší — máš ji v internetovém bankovnictví).",
              "Adresu sídla podnikání (může být i tvoje bydliště, pokud ti to majitel dovolí).",
              "1 000 Kč na správní poplatek.",
              "Rozhodnutí, jaké obory chceš provozovat — vyber z volného seznamu 80 oborů.",
            ],
          },
        ],
      },
      {
        heading: "Postup krok za krokem",
        blocks: [
          {
            type: "ol",
            items: [
              "Přihlas se na Portál občana přes bankID nebo NIA.",
              "Najdi formulář „Jednotný registrační formulář pro fyzickou osobu (JRF)“.",
              "Vyplň identifikaci, sídlo a vybrané obory volné živnosti.",
              "Zaškrtni přihlášku k dani z příjmů, sociální správě a zdravotní pojišťovně rovnou — ušetříš tři návštěvy.",
              "Zaplať 1 000 Kč přes platební bránu.",
              "Do 5 pracovních dnů ti přijde výpis ze živnostenského rejstříku a IČO.",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            text: "Tip: hned po přidělení IČO si zařiď datovou schránku a samostatný podnikatelský účet. Ušetří ti to měsíce administrativy.",
          },
        ],
      },
      {
        heading: "Co dělat hned po založení",
        blocks: [
          {
            type: "ol",
            items: [
              "Otevři si podnikatelský bankovní účet (oddělíš si peníze a šetříš čas v daňovém přiznání).",
              "Aktivuj datovou schránku — od roku 2023 ji všichni OSVČ mají automaticky.",
              "Vystav první fakturu. Ve Vystaveno.cz to zvládneš za 30 sekund.",
              "Sleduj termíny: zálohy na sociální (do 8. dne v měsíci) a zdravotní (do 8. dne) pojištění.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "podnikatelsky-ucet-proc-a-jak",
    title: "Podnikatelský účet: proč ho mít a jak vybrat ten správný",
    excerpt:
      "Zákon ti ho neukládá, ale ušetří ti hodiny v účetnictví a problémy s finančákem. Srovnání nejvýhodnějších bank pro OSVČ.",
    category: "Začátek podnikání",
    readingMinutes: 5,
    publishedAt: "2026-04-08",
    sections: [
      {
        heading: "Musí OSVČ mít podnikatelský účet?",
        blocks: [
          {
            type: "p",
            text: "Zákon to nevyžaduje — můžeš fakturovat na osobní účet. Ale existují tři dobré důvody, proč si ho zřídit hned: oddělené účetnictví, profesionální vystupování a žádné problémy při kontrole z finančáku.",
          },
          {
            type: "callout",
            variant: "warn",
            text: "Pozor: pokud jsi plátce DPH, musíš mít účet zaregistrovaný v registru plátců DPH. Jinak ti odběratel může strhnout DPH ručením.",
          },
        ],
      },
      {
        heading: "Co hledat při výběru",
        blocks: [
          {
            type: "ul",
            items: [
              "Bezplatné vedení účtu (dnes standard u Fio, Air Bank, Revolut Business).",
              "Zdarma české i SEPA platby.",
              "Otevřené API nebo export do CSV — pro budoucí napojení účetnictví.",
              "Mobilní aplikace s QR skenerem pro placení dodavatelských faktur.",
              "Možnost vystavit virtuální platební kartu k online nákupům.",
            ],
          },
        ],
      },
      {
        heading: "Nejčastější tipy z praxe",
        blocks: [
          {
            type: "p",
            text: "Vyber si banku, která ti pošle notifikaci o příchozí platbě v reálném čase. Ušetříš si volání klientům typu „přišlo to už?“. Vystaveno.cz pak může ke každé faktuře připojit QR kód, takže klient zaplatí jedním kliknutím v aplikaci.",
          },
        ],
      },
    ],
  },
  {
    slug: "co-musi-obsahovat-faktura",
    title: "Co musí obsahovat faktura v roce 2026 (a co je jen mýtus)",
    excerpt:
      "Povinné náležitosti faktury podle českého zákona, rozdíl mezi neplátcem a plátcem DPH a nejčastější chyby, které dělají začínající OSVČ.",
    category: "Fakturace",
    readingMinutes: 6,
    publishedAt: "2026-04-05",
    sections: [
      {
        heading: "Povinné údaje na faktuře (neplátce DPH)",
        blocks: [
          {
            type: "p",
            text: "Pokud nejsi plátce DPH, vystavuješ tzv. „účetní doklad“ podle zákona o účetnictví a živnostenského zákona. Musí obsahovat:",
          },
          {
            type: "ul",
            items: [
              "Označení dokladu (obvykle „Faktura č. …“ s pořadovým číslem).",
              "Identifikaci dodavatele: jméno, adresu sídla, IČO.",
              "Identifikaci odběratele: jméno/název, adresu, IČO (a DIČ, pokud má).",
              "Datum vystavení.",
              "Předmět plnění a peněžní částku.",
              "Podpis nebo elektronický ekvivalent (u online faktur stačí jméno).",
            ],
          },
        ],
      },
      {
        heading: "Pokud jsi plátce DPH, navíc",
        blocks: [
          {
            type: "ul",
            items: [
              "DIČ tvoje i odběratele.",
              "Datum uskutečnění zdanitelného plnění (DUZP).",
              "Sazbu DPH a základ daně zvlášť pro každou sazbu (21 %, 12 %, 0 %).",
              "Výši daně v Kč (i u faktur v cizí měně).",
              "Označení režimu („přenesená daňová povinnost“, „osvobozeno od daně“ atd. dle situace).",
            ],
          },
        ],
      },
      {
        heading: "Co naopak NENÍ povinné (časté mýty)",
        blocks: [
          {
            type: "ul",
            items: [
              "Razítko — od roku 1989 nemá v ČR právní význam.",
              "Vlastnoruční podpis — u elektronické faktury stačí jméno vystavitele.",
              "Bankovní účet — i když je to rozumné mít.",
              "QR kód — ale výrazně urychlí platbu, takže ho používej.",
            ],
          },
          {
            type: "callout",
            variant: "tip",
            text: "Ve Vystaveno.cz se všechny povinné údaje hlídají automaticky. Pokud ti chybí DIČ nebo datum, faktura tě nenechá vystavit a vysvětlí, co je špatně.",
          },
        ],
      },
    ],
  },
  {
    slug: "qr-platby-na-fakture",
    title: "QR kód na faktuře: jak funguje a proč ti zvýší cashflow",
    excerpt:
      "Co je QR Platba podle standardu SPAYD, jak ji přidat na fakturu a o kolik dřív ti díky ní klienti zaplatí.",
    category: "Fakturace",
    readingMinutes: 4,
    publishedAt: "2026-04-02",
    sections: [
      {
        heading: "Co je QR Platba",
        blocks: [
          {
            type: "p",
            text: "QR Platba je český standard (SPAYD) zavedený Českou bankovní asociací v roce 2012. Kódový formát obsahuje číslo účtu, částku, variabilní symbol a zprávu pro příjemce. Klient ji načte mobilním bankovnictvím a stačí mu potvrdit — žádné přepisování čísel.",
          },
        ],
      },
      {
        heading: "Jaký vliv to má na placení",
        blocks: [
          {
            type: "p",
            text: "Z dat fakturačních platforem vychází, že faktury s QR kódem se v průměru platí o 3–5 dní dříve než bez něj. U OSVČ s 5+ klienty to znamená výrazně lepší cashflow a méně upomínek.",
          },
          {
            type: "callout",
            variant: "tip",
            text: "Vystaveno.cz ti QR kód vygeneruje automaticky pro každou fakturu — bez nastavování. Stačí, že máš v profilu uložený bankovní účet.",
          },
        ],
      },
    ],
  },
  {
    slug: "dph-pro-zacatecniky",
    title: "DPH pro začátečníky: kdy se stát plátcem a co to obnáší",
    excerpt:
      "Limit obratu, povinná a dobrovolná registrace, kontrolní hlášení a nejčastější chyby při přechodu z neplátce na plátce DPH.",
    category: "DPH a daně",
    readingMinutes: 8,
    publishedAt: "2026-03-28",
    sections: [
      {
        heading: "Kdy se musíš stát plátcem DPH",
        blocks: [
          {
            type: "p",
            text: "Plátcem DPH se musíš povinně stát, pokud tvůj obrat za 12 po sobě jdoucích kalendářních měsíců přesáhne 2 000 000 Kč. Přihlášku musíš podat do 15. dne měsíce následujícího po měsíci, kdy jsi limit překročil.",
          },
          {
            type: "callout",
            variant: "warn",
            text: "Pozor: počítá se klouzavé období 12 měsíců, ne kalendářní rok. Sleduj obrat každý měsíc.",
          },
        ],
      },
      {
        heading: "Kdy se vyplatí stát se plátcem dobrovolně",
        blocks: [
          {
            type: "ul",
            items: [
              "Pracuješ převážně pro plátce DPH (B2B) — DPH si od státu odečtou a tobě nic nevadí.",
              "Nakupuješ drahé vybavení (auto, technika) a chceš si nárokovat odpočet DPH na vstupu.",
              "Chceš působit profesionálněji vůči větším klientům.",
            ],
          },
          {
            type: "p",
            text: "Naopak pro freelancery pracující pro koncové zákazníky (B2C) je dobrovolné plátcovství obvykle nevýhodné — musíš zdražit o 21 %, ale klient si DPH neodečte.",
          },
        ],
      },
      {
        heading: "Co tě čeká jako plátce",
        blocks: [
          {
            type: "ol",
            items: [
              "Měsíčně (nebo kvartálně) podávat přiznání k DPH.",
              "Měsíčně podávat kontrolní hlášení (i když nemáš žádné plnění).",
              "Vést evidenci pro účely DPH — kdo ti co fakturoval a v jakém režimu.",
              "Vystavovat daňové doklady do 15 dnů od uskutečnění plnění.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "danove-priznani-osvc-paušál-vs-vydaje",
    title: "Paušální daň vs. skutečné výdaje: co se OSVČ vyplatí v roce 2026",
    excerpt:
      "Srovnání paušální daně, výdajových paušálů (40, 60, 80 %) a skutečných výdajů. Konkrétní příklady a kalkulačka rozhodování.",
    category: "DPH a daně",
    readingMinutes: 9,
    publishedAt: "2026-03-20",
    sections: [
      {
        heading: "Tři režimy, ze kterých si OSVČ vybírá",
        blocks: [
          {
            type: "ul",
            items: [
              "Paušální daň (jedna platba měsíčně, žádné přiznání).",
              "Výdajové paušály (40 %, 60 %, 80 % příjmů jako fiktivní výdaje).",
              "Skutečné výdaje (prokazuješ doklady, vede tě účetní nebo daňová evidence).",
            ],
          },
        ],
      },
      {
        heading: "1. Paušální daň",
        blocks: [
          {
            type: "p",
            text: "Pro rok 2026 je paušální daň rozdělena do tří pásem podle výše příjmů. Platíš jednu měsíční částku, která zahrnuje daň z příjmů, sociální a zdravotní pojištění. Nepodáváš daňové přiznání ani přehledy — největší úspora administrativy.",
          },
          {
            type: "p",
            text: "Hodí se ti, pokud máš stabilní příjmy do 2 mil. Kč ročně, neuplatňuješ slevy (na manželku, děti, hypotéku) a chceš mít klid.",
          },
        ],
      },
      {
        heading: "2. Výdajové paušály",
        blocks: [
          {
            type: "p",
            text: "Stát ti uzná určité procento příjmů jako výdaje, aniž bys to musel dokládat. Sazby: 80 % (řemeslné živnosti), 60 % (volné živnosti), 40 % (svobodná povolání). Maximální základ pro paušál je 2 mil. Kč.",
          },
          {
            type: "p",
            text: "Vyplatí se, pokud máš nízké reálné výdaje — typicky programátoři, konzultanti, copywriteři. 60% paušál na 1 000 000 Kč příjmů ti uzná 600 000 Kč „výdajů“, i když jsi reálně utratil jen 50 000 Kč.",
          },
        ],
      },
      {
        heading: "3. Skutečné výdaje",
        blocks: [
          {
            type: "p",
            text: "Vede tě daňová evidence (jednoduchá) nebo účetnictví (podvojné). Uplatňuješ reálné výdaje — nákup zboží, materiál, nájem kanceláře, auta, marketing. Vyplatí se, pokud reálné výdaje přesahují to, co ti uzná paušál.",
          },
          {
            type: "callout",
            variant: "tip",
            text: "Praktická rada: spočítej si výdaje za poslední rok. Pokud jsou pod 60 % příjmů, jdi do paušálu. Nad 60 % se ti vyplatí skutečné výdaje a daňová evidence.",
          },
        ],
      },
    ],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getArticlesSortedByDate(): Article[] {
  return [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}