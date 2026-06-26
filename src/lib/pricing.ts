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
