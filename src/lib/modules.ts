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
        description: 'Produkty, kategorie, receptury a příjem zboží připraví každodenní provoz.',
        to: '/app/sklad',
      },
      {
        label: 'Nastavit volby k produktům',
        description: 'Volby jako přílohy, propečení nebo mléko se pak nabídnou obsluze i hostům.',
        to: '/app/modifikatory',
      },
      {
        label: 'Ověřit denní provoz',
        description: 'Pokladna, restaurace, kuchyně, zásoby a uzávěrka pracují se stejnými údaji.',
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
    description: 'Produkty, pokladna, čárové kódy, sklad, vratky, věrnost a přehledy.',
    modules: ['core', 'invoicing', 'pos', 'stock', 'reporting', 'loyalty', 'ai', 'integrations'],
    setupSteps: [
      {
        label: 'Nahrát produkty',
        description: 'Katalog, čárové kódy a ceny připraví prodej na pokladně i sklad.',
        to: '/app/sklad',
      },
      {
        label: 'Naskladnit zboží',
        description: 'Příjem zboží zaznamená historii pohybu a skutečný stav skladu.',
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
  { to: '/app', label: 'Dnes ve firmě', module: 'core', exact: true, hiddenForRoles: ['Employee'] },
  { to: '/app/pokladna', label: 'Pokladna', module: 'pos' },
  { to: '/app/restaurace', label: 'Stoly a objednávky', module: 'gastro' },
  { to: '/app/kuchyne', label: 'Kuchyňské objednávky', module: 'gastro' },
  {
    to: '/app/mapa-stolu',
    label: 'Nastavení stolů',
    module: 'gastro',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/sklad',
    label: 'Produkty a menu',
    module: 'stock',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/zasoby',
    label: 'Stav skladu',
    module: 'stock',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/naskladneni',
    label: 'Příjem zboží',
    module: 'stock',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/modifikatory',
    label: 'Volby k produktům',
    module: 'stock',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  { to: '/app/dochazka', label: 'Docházka', module: 'attendance' },
  {
    to: '/app/smeny',
    label: 'Směny',
    module: 'attendance',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/pobocky',
    label: 'Pobočky',
    module: 'core',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/audit',
    label: 'Historie změn',
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
    label: 'Výsledky provozu',
    module: 'reporting',
    hiddenForRoles: ['Employee'],
  },
  {
    to: '/app/konsolidace',
    label: 'Porovnání poboček',
    module: 'reporting',
    hiddenForRoles: ['Employee'],
  },
  {
    to: '/app/uzaverka',
    label: 'Denní uzávěrka',
    module: 'pos',
    hiddenForRoles: ['Employee'],
  },
  { to: '/app/rezervace', label: 'Rezervace', module: 'booking' },
  {
    to: '/app/kategorie',
    label: 'Kategorie menu',
    module: 'core',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/nabidky',
    label: 'Nabídky',
    module: 'invoicing',
    hiddenForRoles: ['Employee'],
  },
  { to: '/app/faktury', label: 'Faktury', module: 'invoicing', hiddenForRoles: ['Employee'] },
  {
    to: '/app/opakovane-faktury',
    label: 'Opakované faktury',
    module: 'invoicing',
    hiddenForRoles: ['Employee'],
  },
  {
    to: '/app/cashflow',
    label: 'Pohledávky a peníze',
    module: 'invoicing',
    hiddenForRoles: ['Employee'],
  },
  {
    to: '/app/uctarna',
    label: 'Export pro účetní',
    module: 'invoicing',
    hiddenForRoles: ['Employee'],
  },
  {
    to: '/app/dph',
    label: 'Přehled DPH',
    module: 'invoicing',
    hiddenForRoles: ['Employee'],
  },
  { to: '/app/klienti', label: 'Klienti', module: 'invoicing', hiddenForRoles: ['Employee'] },
  { to: '/app/import', label: 'Nahrát data', module: 'integrations', hiddenForRoles: ['Employee'] },
  { to: '/app/vernost', label: 'Věrnost', module: 'loyalty', hiddenForRoles: ['Employee'] },
  { to: '/app/akce-ceny', label: 'Akce a ceny', module: 'loyalty', hiddenForRoles: ['Employee'] },
  { to: '/app/zakazky', label: 'Zakázky', module: 'jobs' },
  {
    to: '/app/cenik-sluzeb',
    label: 'Ceník služeb',
    module: 'jobs',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/podpisy',
    label: 'Podpisy',
    module: 'verified_signing',
    hiddenForRoles: ['Employee'],
  },
  { to: '/app/predplatne', label: 'Předplatné', module: 'core', hiddenForRoles: ['Employee'] },
  { to: '/app/nastaveni', label: 'Nastavení', module: 'core', hiddenForRoles: ['Employee'] },
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
