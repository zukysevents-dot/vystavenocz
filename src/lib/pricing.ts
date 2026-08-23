/**
 * Jediný zdroj cen a vlastností tarifu Vystaveno Pro.
 * Používá veřejný ceník (PricingSection), app předplatné (PredplatnePage) i paywall (PaywallDialog),
 * aby se ceny a výčet funkcí nemohly mezi místy rozejít.
 */

export const PRO_FEATURES = [
  'Neomezený počet faktur',
  'Neomezený počet klientů',
  'QR platba na každé faktuře',
  'Zálohové faktury a dobropisy',
  'Opakované faktury',
  'Vlastní logo a šablony',
  'Přehled pohledávek s připravenou upomínkou',
  'Export do účetnictví (ISDOC, Pohoda XML)',
  'Česká podpora e-mailem (odpověď do 24 h)',
] as const

export const PRO_PRICING = {
  /** Kč/měsíc při měsíční platbě. */
  monthlyPrice: 159,
  /** Kč/měsíc při roční platbě. */
  yearlyPricePerMonth: 100,
  /** Kč za rok (roční platba). */
  yearlyTotal: 1200,
  /** Kč ušetřené ročně oproti měsíčnímu tarifu. */
  yearlySavings: 708,
  /** Sleva ročního tarifu v procentech. */
  discountPercent: 37,
} as const

/**
 * Modulární ceník (rebrand v0.4) — zákazník platí jen za zapnuté moduly.
 * Ceny jsou ORIENTAČNÍ (k potvrzení majitelem); jediný zdroj pravdy pro landing ceník.
 * POZN.: app předplatné (PredplatnePage/PaywallDialog) zatím jede na PRO_* výše — modulární
 * billing v aplikaci je navazující task (váže na modularitu CompanyModules).
 */
export type ModuleKey =
  | 'invoicing'
  | 'plus'
  | 'pos'
  | 'restaurant'
  | 'inventory'
  | 'booking'
  | 'attendance'
  | 'jobs'

export interface PricingModule {
  key: ModuleKey
  name: string
  /** Krátký technický popis (fallback / teaser). */
  desc: string
  /** Jednovětý business výsledek — hlavní prodejní řádek na kartě modulu. */
  outcome: string
  /** 2–3 konkrétní proof pointy (co je uvnitř). */
  points: readonly string[]
  /** Štítek relevance, např. „Základ pro každý provoz". */
  relevanceLabel?: string
  /** Kč/měsíc bez DPH při měsíční platbě. */
  monthly: number
  /** Kč/rok bez DPH při roční platbě (vždy 10× měsíční = 2 měsíce zdarma). */
  yearly: number
  /** Modul je trvale zdarma — neúčtuje se ani v balíku. */
  free?: boolean
}

export const PRICING_MODULES: readonly PricingModule[] = [
  {
    key: 'invoicing',
    name: 'Fakturace & klienti',
    desc: 'Faktury, DPH, QR platby, evidence klientů.',
    outcome: 'Vystavíte fakturu za minutu, pohlídáte platby a klienty máte na jednom místě.',
    points: [
      'Faktury, nabídky a QR platby',
      'Přehled neuhrazených dokladů',
      'Historie klienta bez hledání v e-mailech',
    ],
    relevanceLabel: 'Zdarma navždy',
    monthly: 0,
    yearly: 0,
    free: true,
  },
  {
    key: 'plus',
    name: 'Plus',
    desc: 'Provozní přehled, věrnost, CRM, integrace a ověřené podpisy.',
    outcome: 'Nadstavby, díky kterým z provozu uvidíte čísla, zákazníky i papíry.',
    points: [
      'Provozní přehled: marže, food cost, výkon obsluhy',
      'Věrnostní program a CRM u klienta',
      'Integrace, účetní exporty a ověřené podpisy',
    ],
    relevanceLabel: 'Nadstavba ke všemu',
    monthly: 99,
    yearly: 990,
  },
  {
    key: 'pos',
    name: 'Pokladna',
    desc: 'Dotyková prodejní obrazovka, platby, účtenky — na neomezeně zařízeních.',
    outcome: 'Rychlý prodej bez front a bez přepisování tržeb do tabulek.',
    points: [
      'Neomezený počet pokladen a zařízení',
      'Hotovost, karta i účtenky',
      'Tržby a uzávěrka okamžitě v přehledu',
    ],
    relevanceLabel: 'Pro obchody a prodej',
    monthly: 199,
    yearly: 1990,
  },
  {
    key: 'restaurant',
    name: 'Restaurace',
    desc: 'Mapa stolů, účty, bony do kuchyně i na bar.',
    outcome: 'Objednávky, stoly i kuchyň pod jedním provozním pohledem.',
    points: [
      'Mapa stolů, účty a rozdělení útraty',
      'Bony pro kuchyň a bar',
      'Méně chyb během špičky',
    ],
    relevanceLabel: 'Pro restaurace a kavárny',
    monthly: 249,
    yearly: 2490,
  },
  {
    key: 'inventory',
    name: 'Sklad',
    desc: 'Příjem, výdej, inventura, nízké zásoby.',
    outcome: 'Víte, co máte skladem — bez ručního počítání a výpadků zboží.',
    points: ['Příjem, výdej a inventura', 'Hlídání nízkých zásob', 'Pohyby skladu na jednom místě'],
    relevanceLabel: 'Pro obchody a gastro',
    monthly: 149,
    yearly: 1490,
  },
  {
    key: 'booking',
    name: 'Rezervace',
    desc: 'Kalendář, služby a zdroje, hlídání kolizí.',
    outcome: 'Zaplněný kalendář bez kolizí a zbytečného přepisování termínů.',
    points: ['Kalendář služeb a zdrojů', 'Hlídání kolizí a kapacit', 'Online rezervace pro hosty'],
    relevanceLabel: 'Pro služby a salony',
    monthly: 99,
    yearly: 990,
  },
  {
    key: 'attendance',
    name: 'Docházka',
    desc: 'Píchačka, přehled hodin, směny a export pro mzdy.',
    outcome: 'Odpracované hodiny sedí — a podklady pro mzdy máte na pár kliknutí.',
    points: ['Píchačka a přehled hodin', 'Plán směn a měsíční souhrn', 'Export pro mzdy'],
    relevanceLabel: 'Pro firmy s týmem',
    monthly: 99,
    yearly: 990,
  },
  {
    key: 'jobs',
    name: 'Zakázky',
    desc: 'Nabídky, výjezdy, pracovní listy a předání.',
    outcome: 'Od nabídky přes výjezd až po fakturu — bez papírů v autě.',
    points: [
      'Nabídky, zakázky a pracovní listy',
      'Materiál rovnou ze skladu',
      'Předání a faktura na pár kliknutí',
    ],
    relevanceLabel: 'Pro řemeslo a výjezdy',
    monthly: 149,
    yearly: 1490,
  },
] as const

/** Zvýhodněný balík modulů. Cenu určuje ceník, NEdopočítává se ze součtu. */
export interface PricingBundle {
  key: 'gastro' | 'all'
  name: string
  /** Moduly, které balík obsahuje (mimo trvale bezplatné). */
  modules: readonly ModuleKey[]
  monthly: number
  yearly: number
}

export const PRICING_BUNDLES: readonly PricingBundle[] = [
  {
    key: 'gastro',
    name: 'Balík GASTRO',
    modules: ['pos', 'restaurant', 'inventory', 'attendance'],
    monthly: 399,
    yearly: 3990,
  },
  {
    key: 'all',
    name: 'Balík VŠECHNO',
    modules: ['plus', 'pos', 'restaurant', 'inventory', 'booking', 'attendance', 'jobs'],
    monthly: 499,
    yearly: 4990,
  },
] as const

export const MODULAR_PRICING = {
  /** Roční platba = 2 měsíce zdarma (platí se 10 z 12). */
  yearlyFreeMonths: 2,
  /** Kč/měsíc bez DPH za kompletní balík (všechny moduly). */
  bundleAllMonthly: 499,
  /** Kč/rok bez DPH za kompletní balík. */
  bundleAllYearly: 4990,
  /** Délka zkušební verze ve dnech. */
  trialDays: 14,
  /** Sazba DPH, kterou se ceny bez DPH navyšují (ceník je uváděný bez DPH). */
  vatPercent: 21,
} as const

/**
 * Zaváděcí cena: prvních 500 firem má kompletní balík natrvalo levněji.
 * Kolik míst je obsazeno, server zatím neeviduje — proto se počet ZBÝVAJÍCÍCH míst nikde
 * neuvádí; tvrdit číslo, které nemáme z čeho spočítat, by byla lež.
 */
export const FOUNDING_OFFER = {
  companies: 500,
  monthly: 399,
} as const

/** Roční cena za měsíc = (měsíční × (12 − volné měsíce)) / 12, zaokrouhleno na celé Kč. */
export function yearlyPerMonth(monthly: number): number {
  return Math.round((monthly * (12 - MODULAR_PRICING.yearlyFreeMonths)) / 12)
}

/** Roční cena celkem = měsíční × 10 (2 měsíce zdarma). Odpovídá ročním cenám v ceníku. */
export function yearlyTotal(monthly: number): number {
  return monthly * (12 - MODULAR_PRICING.yearlyFreeMonths)
}

/** Cena s DPH pro orientaci koncového zákazníka (ceník je bez DPH). */
export function withVat(amount: number): number {
  return Math.round(amount * (1 + MODULAR_PRICING.vatPercent / 100))
}

function covers(selected: readonly ModuleKey[], required: readonly ModuleKey[]): boolean {
  return required.every((k) => selected.includes(k))
}

/**
 * Cena vybrané sestavy za měsíc (měsíční platba, bez DPH). Když výběr pokrývá balík, počítá se
 * cena balíku plus moduly navíc — zákazníkovi se vždy nabídne ta levnější varianta.
 * Bezplatné moduly cenu nezvyšují. Jediné místo s touto logikou.
 */
export function modulesMonthly(keys: readonly ModuleKey[]): number {
  const paid = PRICING_MODULES.filter((m) => !m.free && keys.includes(m.key))
  let best = paid.reduce((acc, m) => acc + m.monthly, 0)

  for (const bundle of PRICING_BUNDLES) {
    if (!covers(keys, bundle.modules)) continue
    const navic = paid
      .filter((m) => !bundle.modules.includes(m.key))
      .reduce((acc, m) => acc + m.monthly, 0)
    best = Math.min(best, bundle.monthly + navic)
  }
  return best
}

/** Roční cena vybrané sestavy (Kč/rok bez DPH) — stejná logika balíků jako u měsíční. */
export function modulesYearly(keys: readonly ModuleKey[]): number {
  return yearlyTotal(modulesMonthly(keys))
}

/**
 * Úspora kompletního balíku oproti součtu všech samostatných modulů (Kč/měs).
 * Respektuje režim platby — při roční platbě počítá z roční ceny za měsíc.
 */
export function bundleSavingMonthly(yearly = false): number {
  const sumAll = PRICING_MODULES.reduce((acc, m) => acc + m.monthly, 0)
  const reference = yearly ? yearlyPerMonth(sumAll) : sumAll
  const bundle = yearly
    ? yearlyPerMonth(MODULAR_PRICING.bundleAllMonthly)
    : MODULAR_PRICING.bundleAllMonthly
  return reference - bundle
}

/**
 * Typy provozu pro segmentový výběr — předvyplní doporučenou sestavu core modulů a zvýrazní
 * relevantní oborové nástavby. Pomáhá návštěvníkovi poznat sám sebe místo počítání z hlavy.
 */
export type SegmentId = 'services' | 'gastro' | 'retail' | 'field' | 'team' | 'invoicing-only'

export interface PricingSegment {
  id: SegmentId
  label: string
  /** Předvybrané core moduly po výběru segmentu. */
  recommended: readonly ModuleKey[]
  /** Zvýrazněné oborové add-ony (jejich `key`). */
  addons: readonly string[]
}

export const PRICING_SEGMENTS: readonly PricingSegment[] = [
  {
    id: 'services',
    label: 'Služby & rezervace',
    recommended: ['invoicing', 'booking', 'attendance'],
    addons: ['online-booking', 'loyalty', 'shifts'],
  },
  {
    id: 'gastro',
    label: 'Restaurace & gastro',
    recommended: ['restaurant', 'pos', 'inventory'],
    addons: ['delivery', 'shifts'],
  },
  {
    id: 'retail',
    label: 'Obchod & sklad',
    recommended: ['pos', 'inventory', 'invoicing'],
    addons: ['stock-scan', 'loyalty'],
  },
  {
    id: 'field',
    label: 'Řemeslo & výjezdy',
    recommended: ['invoicing', 'jobs'],
    addons: ['cashflow'],
  },
  {
    id: 'team',
    label: 'Firma se zaměstnanci',
    recommended: ['attendance', 'invoicing'],
    addons: ['shifts', 'branches'],
  },
  {
    id: 'invoicing-only',
    label: 'Jen faktury & klienti',
    recommended: ['invoicing'],
    addons: ['cashflow', 'client-portal', 'accounting'],
  },
] as const

/**
 * Rozšiřující moduly / oborové balíčky (v0.5) — staví na 6 core modulech výše a prodávají se
 * jako add-on ve vyšších tarifech. Ceny ORIENTAČNÍ (k potvrzení majitelem); jediný zdroj pravdy
 * pro landing ceník. `soon: true` = zobrazit nálepku „Připravujeme" (jinak modul vystupuje jako
 * dostupný). Strategie a priority viz ~/.claude/plans (10 placených modulů).
 */
export type AddonUnit = 'provozovna' | 'pobočka' | 'firma' | 'zaměstnanec' | 'klient'

export type AddonCategory = 'services' | 'gastro' | 'retail' | 'field' | 'team' | 'management'

export interface AddonCategoryDef {
  id: AddonCategory
  label: string
}

export const ADDON_CATEGORIES: readonly AddonCategoryDef[] = [
  { id: 'services', label: 'Pro služby' },
  { id: 'gastro', label: 'Pro gastro' },
  { id: 'retail', label: 'Pro obchod' },
  { id: 'field', label: 'Pro terénní firmy' },
  { id: 'team', label: 'Pro firmy s týmem' },
  { id: 'management', label: 'Pro vedení & účetní' },
] as const

export interface PricingAddon {
  key: string
  name: string
  /** Krátký prodejní popis (1 věta, výsledek). */
  desc: string
  /** Cílový segment (pro landing). */
  segment: string
  /** Kategorie pro seskupení na ceníku. */
  category: AddonCategory
  /** Kč/měsíc — základní cena v dané jednotce. */
  monthly: number
  unit: AddonUnit
  /** Volitelná cena za další jednotku (např. za technika / zaměstnance / klienta navíc). */
  perExtra?: { monthly: number; label: string }
  /** Na který core modul navazuje (pokud jde o nástavbu). */
  buildsOn?: ModuleKey
  /** true = zatím na roadmapě (zobrazit „Připravujeme"). */
  soon: boolean
}

export const PRICING_ADDONS: readonly PricingAddon[] = [
  {
    key: 'online-booking',
    name: 'Online rezervace',
    desc: 'Veřejný rezervační odkaz, kalendář služeb a kapacit bez kolizí a ručního přepisování.',
    segment: 'Salony, barber, kosmetika, fyzio, trenéři',
    category: 'services',
    monthly: 199,
    unit: 'provozovna',
    buildsOn: 'booking',
    soon: false,
  },
  {
    key: 'loyalty',
    name: 'Věrnost & návraty',
    desc: 'Zákaznické účty, body, cenové hladiny a akce přímo v pokladně i restauraci.',
    segment: 'Služby a retail s opakovaným zákazníkem',
    category: 'services',
    monthly: 199,
    unit: 'provozovna',
    soon: false,
  },
  {
    key: 'jobs',
    name: 'Zakázky & výjezdy',
    desc: 'Ceník služeb, nabídka, výjezd, pracovní list, předání a faktura v jednom toku.',
    segment: 'Řemeslo, servis, autoservisy',
    category: 'field',
    monthly: 299,
    unit: 'firma',
    perExtra: { monthly: 99, label: 'za technika' },
    soon: false,
  },
  {
    key: 'delivery',
    name: 'Rozvoz & výdej',
    desc: 'Veřejné menu, QR objednávka ke stolu, výdej i rozvoz rovnou do kuchyňské fronty.',
    segment: 'Restaurace, bistra, pizzerie',
    category: 'gastro',
    monthly: 349,
    unit: 'provozovna',
    buildsOn: 'restaurant',
    soon: false,
  },
  {
    key: 'shifts',
    name: 'Směny & provize',
    desc: 'Týdenní plán, publikace směn, docházka, opravy s auditem a export pro mzdy.',
    segment: 'Provozy se směnami',
    category: 'team',
    monthly: 149,
    unit: 'provozovna',
    perExtra: { monthly: 49, label: 'za zaměstnance' },
    buildsOn: 'attendance',
    soon: false,
  },
  {
    key: 'cashflow',
    name: 'Cashflow & upomínky',
    desc: 'Pohledávky, stáří dluhů, export dlužníků a připravená e-mailová upomínka.',
    segment: 'OSVČ, řemeslo, B2B na splatnost',
    category: 'field',
    monthly: 199,
    unit: 'firma',
    buildsOn: 'invoicing',
    soon: false,
  },
  {
    key: 'branches',
    name: 'Pobočky & vedení',
    desc: 'Tržby, marže, food cost, ztráty skladu a srovnání poboček v jednom přehledu.',
    segment: 'Firmy s 2+ provozovnami',
    category: 'team',
    monthly: 349,
    unit: 'pobočka',
    soon: false,
  },
  {
    key: 'client-portal',
    name: 'Klientská zóna',
    desc: 'Klient na jednom odkazu vidí faktury a nabídky, které může rovnou přijmout nebo odmítnout.',
    segment: 'Agentury, účetní, B2B dodavatelé',
    category: 'management',
    monthly: 199,
    unit: 'firma',
    buildsOn: 'invoicing',
    soon: false,
  },
  {
    key: 'accounting',
    name: 'Účtárna',
    desc: 'Pohoda XML, účetní CSV a Z-reporty připravené ke stažení bez ručního přepisování.',
    segment: 'Firmy s účetní + účetní kanceláře',
    category: 'management',
    monthly: 199,
    unit: 'firma',
    perExtra: { monthly: 99, label: 'za klienta (pro účetní)' },
    buildsOn: 'invoicing',
    soon: false,
  },
  {
    key: 'stock-scan',
    name: 'Naskladnění & čárové kódy',
    desc: 'Naskladnění, inventura a sken EAN přes čtečku i kameru mobilu.',
    segment: 'Obchody, e-shopy, retail',
    category: 'retail',
    monthly: 149,
    unit: 'provozovna',
    buildsOn: 'inventory',
    soon: false,
  },
] as const
