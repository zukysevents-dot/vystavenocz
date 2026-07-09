export const APP_MODULES = [
  'core',
  'invoicing',
  'pos',
  'gastro',
  'stock',
  'attendance',
  'booking',
  'jobs',
  'reporting',
  'loyalty',
  'ai',
  'integrations',
  // Samostatný placený add-on: ověřené podpisy dokumentů přes připojeného poskytovatele (BankID = jeden kanál).
  // Není součást gastro/pokladny — zapíná se zvlášť; backend provider kontrakt se dodělává paralelně.
  'verified_signing',
] as const

export type AppModuleId = (typeof APP_MODULES)[number]

export const DEFAULT_ENABLED_MODULES: AppModuleId[] = [...APP_MODULES]

export type BusinessProfileId = 'gastro' | 'services' | 'crafts' | 'shop'

export interface BusinessProfile {
  id: BusinessProfileId
  label: string
  description: string
  modules: AppModuleId[]
  setupSteps: BusinessProfileSetupStep[]
}

export interface BusinessProfileSetupStep {
  label: string
  description: string
  to: string
}

export const BUSINESS_PROFILES: BusinessProfile[] = [
  {
    id: 'gastro',
    label: 'Gastro',
    description: 'Pokladna, stoly, kuchyně, sklad, uzávěrky, docházka a rezervace.',
    modules: [
      'core',
      'invoicing',
      'pos',
      'gastro',
      'stock',
      'attendance',
      'booking',
      'reporting',
      'loyalty',
      'ai',
      'integrations',
    ],
    setupSteps: [
      {
        label: 'Založit provozovny',
        description: 'Pobočky určují sklad, uzávěrku, reporting a oprávnění obsluhy.',
        to: '/app/pobocky',
      },
      {
        label: 'Připravit stoly a QR',
        description: 'Mapa stolů vytvoří rozložení sálu a odkazy pro objednání ke stolu.',
        to: '/app/mapa-stolu',
      },
      {
        label: 'Nahrát menu a sklad',
        description: 'Produkty, kategorie, receptury a příjemky jsou základ paperless provozu.',
        to: '/app/sklad',
      },
      {
        label: 'Nastavit modifikátory',
        description: 'Volby jako přílohy, propečení nebo mléko se pak nabídnou obsluze i hostům.',
        to: '/app/modifikatory',
      },
      {
        label: 'Ověřit denní provoz',
        description: 'Pokladna, restaurace, kuchyně, zásoby a uzávěrka drží jeden zdroj pravdy.',
        to: '/app/uzaverka',
      },
    ],
  },
  {
    id: 'services',
    label: 'Služby',
    description: 'Rezervace, klienti, služby, fakturace, docházka a reporty.',
    modules: ['core', 'invoicing', 'booking', 'attendance', 'reporting', 'ai', 'integrations'],
    setupSteps: [
      {
        label: 'Nastavit služby',
        description: 'Služby a rezervace určují, co si zákazník může objednat.',
        to: '/app/nastaveni',
      },
      {
        label: 'Založit klienty',
        description: 'Klientská historie pomůže s fakturací i opakovanými návštěvami.',
        to: '/app/klienti',
      },
      {
        label: 'Připravit rezervace',
        description: 'Kalendář, zdroje a veřejné rezervace udrží provoz bez ruční tabulky.',
        to: '/app/rezervace',
      },
    ],
  },
  {
    id: 'crafts',
    label: 'Řemesla a zakázky',
    description: 'Zakázky, materiál, výjezdy, sklad, předání práce a fakturace.',
    modules: ['core', 'invoicing', 'jobs', 'stock', 'reporting', 'ai', 'integrations'],
    setupSteps: [
      {
        label: 'Založit zakázky',
        description: 'Zakázka drží práci, materiál, poznámky a návaznou fakturaci pohromadě.',
        to: '/app/zakazky',
      },
      {
        label: 'Připravit materiál',
        description: 'Skladové položky pomohou sledovat spotřebu a náklady.',
        to: '/app/sklad',
      },
      {
        label: 'Nastavit fakturaci',
        description: 'Číslování, údaje firmy a účtárna uzavírají práci do dokladů.',
        to: '/app/nastaveni',
      },
    ],
  },
  {
    id: 'shop',
    label: 'Obchod',
    description: 'Produkty, pokladna, EAN, sklad, vratky, věrnost a reporty.',
    modules: ['core', 'invoicing', 'pos', 'stock', 'reporting', 'loyalty', 'ai', 'integrations'],
    setupSteps: [
      {
        label: 'Nahrát produkty',
        description: 'Katalog, EAN a ceny připraví prodej na pokladně i sklad.',
        to: '/app/sklad',
      },
      {
        label: 'Naskladnit zboží',
        description: 'Příjemky vytvoří auditní stopu a skutečný stav skladu.',
        to: '/app/naskladneni',
      },
      {
        label: 'Ověřit prodej',
        description: 'Pokladna, zásoby, reporty a věrnost pak běží nad stejnými daty.',
        to: '/app/pokladna',
      },
    ],
  },
]

export interface AppNavDefinition {
  to: string
  label: string
  module: AppModuleId
  exact?: boolean
  hiddenForRoles?: string[]
}

export const APP_NAV_DEFINITIONS: AppNavDefinition[] = [
  { to: '/app', label: 'Přehled', module: 'core', exact: true, hiddenForRoles: ['Employee'] },
  { to: '/app/pokladna', label: 'Pokladna', module: 'pos' },
  { to: '/app/restaurace', label: 'Restaurace', module: 'gastro' },
  { to: '/app/kuchyne', label: 'Kuchyně', module: 'gastro' },
  { to: '/app/mapa-stolu', label: 'Mapa stolů', module: 'gastro' },
  { to: '/app/sklad', label: 'Sklad', module: 'stock' },
  { to: '/app/zasoby', label: 'Zásoby', module: 'stock' },
  { to: '/app/naskladneni', label: 'Naskladnění', module: 'stock' },
  { to: '/app/modifikatory', label: 'Modifikátory', module: 'stock' },
  { to: '/app/dochazka', label: 'Docházka', module: 'attendance' },
  { to: '/app/smeny', label: 'Směny', module: 'attendance' },
  { to: '/app/pobocky', label: 'Pobočky', module: 'core', hiddenForRoles: ['Employee'] },
  {
    to: '/app/audit',
    label: 'Audit',
    module: 'core',
    hiddenForRoles: ['Employee', 'Manager'],
  },
  {
    to: '/app/schvalovani',
    label: 'Schvalování',
    module: 'core',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/provozni-prehled',
    label: 'Provozní přehled',
    module: 'reporting',
    hiddenForRoles: ['Employee'],
  },
  {
    to: '/app/konsolidace',
    label: 'Konsolidace',
    module: 'reporting',
    hiddenForRoles: ['Employee'],
  },
  { to: '/app/uzaverka', label: 'Uzávěrka', module: 'pos', hiddenForRoles: ['Employee'] },
  { to: '/app/rezervace', label: 'Rezervace', module: 'booking' },
  { to: '/app/kategorie', label: 'Kategorie', module: 'core' },
  { to: '/app/nabidky', label: 'Nabídky', module: 'invoicing' },
  { to: '/app/faktury', label: 'Faktury', module: 'invoicing', hiddenForRoles: ['Employee'] },
  { to: '/app/cashflow', label: 'Cashflow', module: 'invoicing' },
  { to: '/app/uctarna', label: 'Účtárna', module: 'invoicing' },
  { to: '/app/dph', label: 'Přehled DPH', module: 'invoicing' },
  { to: '/app/klienti', label: 'Klienti', module: 'core', hiddenForRoles: ['Employee'] },
  { to: '/app/import', label: 'Import dat', module: 'integrations', hiddenForRoles: ['Employee'] },
  { to: '/app/vernost', label: 'Věrnost', module: 'loyalty' },
  { to: '/app/akce-ceny', label: 'Akce a ceny', module: 'loyalty', hiddenForRoles: ['Employee'] },
  { to: '/app/zakazky', label: 'Zakázky', module: 'jobs' },
  { to: '/app/podpisy', label: 'Podpisy', module: 'verified_signing' },
  { to: '/app/predplatne', label: 'Předplatné', module: 'core' },
  { to: '/app/nastaveni', label: 'Nastavení', module: 'core' },
]

export function normalizeModules(input: readonly string[] | null | undefined): AppModuleId[] {
  if (!input?.length) return DEFAULT_ENABLED_MODULES
  const allowed = new Set<string>(APP_MODULES)
  const modules = input.filter((module): module is AppModuleId => allowed.has(module))
  return modules.includes('core') ? modules : ['core', ...modules]
}

export function isModuleEnabled(
  module: AppModuleId,
  enabledModules: readonly AppModuleId[],
): boolean {
  return enabledModules.includes(module)
}
