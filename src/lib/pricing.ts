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
