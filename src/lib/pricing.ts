/**
 * Jediný zdroj cen a vlastností tarifu Vystaveno Pro.
 * Používá veřejný ceník (PricingSection), app předplatné (PredplatnePage) i paywall (PaywallDialog),
 * aby se ceny a výčet funkcí nemohly mezi místy rozejít.
 */

export const PRO_FEATURES = [
  'Neomezený počet faktur',
  'Neomezený počet klientů',
  'QR platba na každé faktuře',
  'AI asistent v češtině',
  'Opakované faktury',
  'Vlastní logo a šablony',
  'Cizí měny + kurz ČNB',
  'Automatické upomínky',
  'Export do účetnictví (ISDOC, XML)',
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
export type ModuleKey = 'invoicing' | 'pos' | 'restaurant' | 'inventory' | 'booking' | 'attendance'

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
  /** Kč/měsíc při měsíční platbě. */
  monthly: number
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
    relevanceLabel: 'Základ pro každý provoz',
    monthly: 149,
  },
  {
    key: 'pos',
    name: 'Pokladna (POS)',
    desc: 'Dotyková prodejní obrazovka, platby, účtenky.',
    outcome: 'Rychlý prodej bez front a bez přepisování tržeb do tabulek.',
    points: [
      'Dotyková prodejní obrazovka',
      'Hotovost, karta i účtenky',
      'Tržby okamžitě v přehledu',
    ],
    relevanceLabel: 'Pro obchody a prodej',
    monthly: 249,
  },
  {
    key: 'restaurant',
    name: 'Restaurace & kuchyně',
    desc: 'Mapa stolů, účty, bony do kuchyně i na bar.',
    outcome: 'Objednávky, stoly i kuchyň pod jedním provozním pohledem.',
    points: [
      'Mapa stolů, účty a rozdělení útraty',
      'Bony pro kuchyň a bar',
      'Méně chyb během špičky',
    ],
    relevanceLabel: 'Pro restaurace',
    monthly: 349,
  },
  {
    key: 'inventory',
    name: 'Sklad & zásoby',
    desc: 'Příjem, výdej, inventura, nízké zásoby.',
    outcome: 'Víte, co máte skladem — bez ručního počítání a výpadků zboží.',
    points: ['Příjem, výdej a inventura', 'Hlídání nízkých zásob', 'Pohyby skladu na jednom místě'],
    relevanceLabel: 'Pro obchody a gastro',
    monthly: 149,
  },
  {
    key: 'booking',
    name: 'Rezervace',
    desc: 'Kalendář, služby a zdroje, hlídání kolizí.',
    outcome: 'Zaplněný kalendář bez kolizí a zbytečného přepisování termínů.',
    points: ['Kalendář služeb a zdrojů', 'Hlídání kolizí a kapacit', 'Přehled vytížení dne'],
    relevanceLabel: 'Pro služby',
    monthly: 199,
  },
  {
    key: 'attendance',
    name: 'Docházka',
    desc: 'Píchačka, přehled hodin, export pro mzdy.',
    outcome: 'Odpracované hodiny sedí — a podklady pro mzdy máte na pár kliknutí.',
    points: ['Píchačka a přehled hodin', 'Měsíční souhrn za tým', 'Export pro mzdy'],
    relevanceLabel: 'Pro firmy s týmem',
    monthly: 149,
  },
] as const

export const MODULAR_PRICING = {
  /** Roční platba = 2 měsíce zdarma (platí se 10 z 12). */
  yearlyFreeMonths: 2,
  /** Kč/měsíc za kompletní balík (všechny moduly) při měsíční platbě. */
  bundleAllMonthly: 990,
  /** Délka zkušební verze ve dnech. */
  trialDays: 14,
} as const

/** Roční cena za měsíc = (měsíční × (12 − volné měsíce)) / 12, zaokrouhleno na celé Kč. */
export function yearlyPerMonth(monthly: number): number {
  return Math.round((monthly * (12 - MODULAR_PRICING.yearlyFreeMonths)) / 12)
}

/**
 * Cena vybrané sestavy za měsíc (měsíční platba). Při kompletní sestavě (všech 6) platí
 * zvýhodněná cena balíku; jinak součet vybraných modulů. Jediné místo s touto logikou.
 */
export function modulesMonthly(keys: readonly ModuleKey[]): number {
  if (keys.length >= PRICING_MODULES.length) return MODULAR_PRICING.bundleAllMonthly
  return PRICING_MODULES.filter((m) => keys.includes(m.key)).reduce((acc, m) => acc + m.monthly, 0)
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
    recommended: ['invoicing'],
    addons: ['jobs', 'cashflow'],
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
 * pro landing ceník. Vše zatím na roadmapě (`soon`) — UI je zobrazuje jako „Připravujeme".
 * Strategie a priority viz ~/.claude/plans (10 placených modulů).
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
    desc: 'Zaplněný kalendář bez zpráv na Instagramu a bez zbytečných no-show.',
    segment: 'Salony, barber, kosmetika, fyzio, trenéři',
    category: 'services',
    monthly: 199,
    unit: 'provozovna',
    buildsOn: 'booking',
    soon: true,
  },
  {
    key: 'loyalty',
    name: 'Věrnost & návraty',
    desc: 'Vracející se zákazníci místo jednorázových návštěv — automaticky.',
    segment: 'Služby a retail s opakovaným zákazníkem',
    category: 'services',
    monthly: 199,
    unit: 'provozovna',
    soon: true,
  },
  {
    key: 'jobs',
    name: 'Zakázky & výjezdy',
    desc: 'Od první nabídky přes výjezd techniků až po hotovou zakázku a fakturu.',
    segment: 'Řemeslo, servis, autoservisy',
    category: 'field',
    monthly: 299,
    unit: 'firma',
    perExtra: { monthly: 99, label: 'za technika' },
    soon: true,
  },
  {
    key: 'delivery',
    name: 'Rozvoz & výdej',
    desc: 'Vlastní rozvoz a výdej bez provizí doručovacích platforem.',
    segment: 'Restaurace, bistra, pizzerie',
    category: 'gastro',
    monthly: 349,
    unit: 'provozovna',
    buildsOn: 'restaurant',
    soon: true,
  },
  {
    key: 'shifts',
    name: 'Směny & provize',
    desc: 'Jasné směny, spravedlivé provize a spropitné a podklady pro mzdy bez tabulek.',
    segment: 'Provozy se směnami',
    category: 'team',
    monthly: 149,
    unit: 'provozovna',
    perExtra: { monthly: 49, label: 'za zaměstnance' },
    buildsOn: 'attendance',
    soon: true,
  },
  {
    key: 'cashflow',
    name: 'Cashflow & upomínky',
    desc: 'Peníze pod kontrolou dřív, než začnou chybět.',
    segment: 'OSVČ, řemeslo, B2B na splatnost',
    category: 'field',
    monthly: 199,
    unit: 'firma',
    buildsOn: 'invoicing',
    soon: true,
  },
  {
    key: 'branches',
    name: 'Pobočky & vedení',
    desc: 'Srovnání poboček a vedení celé firmy z jednoho přehledu.',
    segment: 'Firmy s 2+ provozovnami',
    category: 'team',
    monthly: 349,
    unit: 'pobočka',
    soon: true,
  },
  {
    key: 'client-portal',
    name: 'Klientská zóna',
    desc: 'Klienti si sami stáhnou fakturu, zaplatí online a schválí nabídku.',
    segment: 'Agentury, účetní, B2B dodavatelé',
    category: 'management',
    monthly: 199,
    unit: 'firma',
    buildsOn: 'invoicing',
    soon: true,
  },
  {
    key: 'accounting',
    name: 'Účtárna',
    desc: 'Účetní má podklady připravené — vy už je nehoníte e-mailem.',
    segment: 'Firmy s účetní + účetní kanceláře',
    category: 'management',
    monthly: 199,
    unit: 'firma',
    perExtra: { monthly: 99, label: 'za klienta (pro účetní)' },
    buildsOn: 'invoicing',
    soon: true,
  },
  {
    key: 'stock-scan',
    name: 'Naskladnění & čárové kódy',
    desc: 'Naskladnění a inventura mobilem za zlomek času.',
    segment: 'Obchody, e-shopy, retail',
    category: 'retail',
    monthly: 149,
    unit: 'provozovna',
    buildsOn: 'inventory',
    soon: true,
  },
] as const
