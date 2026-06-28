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
  desc: string
  /** Kč/měsíc při měsíční platbě. */
  monthly: number
}

export const PRICING_MODULES: readonly PricingModule[] = [
  {
    key: 'invoicing',
    name: 'Fakturace & klienti',
    desc: 'Faktury, DPH, QR platby, evidence klientů.',
    monthly: 149,
  },
  {
    key: 'pos',
    name: 'Pokladna (POS)',
    desc: 'Dotyková prodejní obrazovka, platby, účtenky.',
    monthly: 249,
  },
  {
    key: 'restaurant',
    name: 'Restaurace & kuchyně',
    desc: 'Mapa stolů, účty, bony do kuchyně i na bar.',
    monthly: 349,
  },
  {
    key: 'inventory',
    name: 'Sklad & zásoby',
    desc: 'Příjem, výdej, inventura, nízké zásoby.',
    monthly: 149,
  },
  {
    key: 'booking',
    name: 'Rezervace',
    desc: 'Kalendář, služby a zdroje, hlídání kolizí.',
    monthly: 199,
  },
  {
    key: 'attendance',
    name: 'Docházka',
    desc: 'Píchačka, přehled hodin, export pro mzdy.',
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
 * Rozšiřující moduly / oborové balíčky (v0.5) — staví na 6 core modulech výše a prodávají se
 * jako add-on ve vyšších tarifech. Ceny ORIENTAČNÍ (k potvrzení majitelem); jediný zdroj pravdy
 * pro landing ceník. Vše zatím na roadmapě (`soon`) — UI je zobrazuje jako „Brzy".
 * Strategie a priority viz ~/.claude/plans (10 placených modulů).
 */
export type AddonUnit = 'provozovna' | 'pobočka' | 'firma' | 'zaměstnanec' | 'klient'

export interface PricingAddon {
  key: string
  name: string
  /** Krátký prodejní popis (1 věta). */
  desc: string
  /** Cílový segment (pro landing). */
  segment: string
  /** Kč/měsíc — základní cena v dané jednotce. */
  monthly: number
  unit: AddonUnit
  /** Volitelná cena za další jednotku (např. za technika / zaměstnance / klienta navíc). */
  perExtra?: { monthly: number; label: string }
  /** Na který core modul navazuje (pokud jde o nástavbu). */
  buildsOn?: ModuleKey
  /** true = zatím na roadmapě (zobrazit „Brzy"). */
  soon: boolean
}

export const PRICING_ADDONS: readonly PricingAddon[] = [
  {
    key: 'online-booking',
    name: 'Online rezervace',
    desc: 'Veřejný rezervační odkaz, připomínky a méně no-show.',
    segment: 'Salony, barber, kosmetika, fyzio, trenéři',
    monthly: 199,
    unit: 'provozovna',
    buildsOn: 'booking',
    soon: true,
  },
  {
    key: 'loyalty',
    name: 'Věrnost & návraty',
    desc: 'Segmentace zákazníků, win-back připomínky, věrnostní konto.',
    segment: 'Služby a retail s opakovaným zákazníkem',
    monthly: 199,
    unit: 'provozovna',
    soon: true,
  },
  {
    key: 'jobs',
    name: 'Zakázky & výjezdy',
    desc: 'Zakázky, nabídka → faktura, materiál a hodiny, ziskovost.',
    segment: 'Řemeslo, servis, autoservisy',
    monthly: 299,
    unit: 'firma',
    perExtra: { monthly: 99, label: 'za technika' },
    soon: true,
  },
  {
    key: 'delivery',
    name: 'Rozvoz & výdej',
    desc: 'Vlastní objednávkový kanál bez provize platforem, sloty, KDS.',
    segment: 'Restaurace, bistra, pizzerie',
    monthly: 349,
    unit: 'provozovna',
    buildsOn: 'restaurant',
    soon: true,
  },
  {
    key: 'shifts',
    name: 'Směny & provize',
    desc: 'Plánování směn, provize a spropitné, mzdové podklady.',
    segment: 'Provozy se směnami',
    monthly: 149,
    unit: 'provozovna',
    perExtra: { monthly: 49, label: 'za zaměstnance' },
    buildsOn: 'attendance',
    soon: true,
  },
  {
    key: 'cashflow',
    name: 'Cashflow & upomínky',
    desc: 'Automatické upomínky, aging report a výhled cashflow.',
    segment: 'OSVČ, řemeslo, B2B na splatnost',
    monthly: 199,
    unit: 'firma',
    buildsOn: 'invoicing',
    soon: true,
  },
  {
    key: 'branches',
    name: 'Pobočky & vedení',
    desc: 'Konsolidovaný přehled a srovnání poboček, role manažera.',
    segment: 'Firmy s 2+ provozovnami',
    monthly: 349,
    unit: 'pobočka',
    soon: true,
  },
  {
    key: 'client-portal',
    name: 'Klientská zóna',
    desc: 'Samoobsluha klienta: faktury, online platba, schválení nabídek.',
    segment: 'Agentury, účetní, B2B dodavatelé',
    monthly: 199,
    unit: 'firma',
    buildsOn: 'invoicing',
    soon: true,
  },
  {
    key: 'accounting',
    name: 'Účtárna',
    desc: 'Přístup pro účetní, měsíční balíček podkladů, ISDOC/XML export.',
    segment: 'Firmy s účetní + účetní kanceláře',
    monthly: 199,
    unit: 'firma',
    perExtra: { monthly: 99, label: 'za klienta (pro účetní)' },
    buildsOn: 'invoicing',
    soon: true,
  },
  {
    key: 'stock-scan',
    name: 'Naskladnění & čárové kódy',
    desc: 'Skenování přes mobil, rychlá inventura, návrhy objednávek.',
    segment: 'Obchody, e-shopy, retail',
    monthly: 149,
    unit: 'provozovna',
    buildsOn: 'inventory',
    soon: true,
  },
] as const
