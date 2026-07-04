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
] as const

export type AppModuleId = (typeof APP_MODULES)[number]

export const DEFAULT_ENABLED_MODULES: AppModuleId[] = [...APP_MODULES]

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
  { to: '/app/dochazka', label: 'Docházka', module: 'attendance' },
  { to: '/app/smeny', label: 'Směny', module: 'attendance' },
  { to: '/app/pobocky', label: 'Pobočky', module: 'core', hiddenForRoles: ['Employee'] },
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
  { to: '/app/zakazky', label: 'Zakázky', module: 'jobs' },
  { to: '/app/predplatne', label: 'Předplatné', module: 'core' },
  { to: '/app/nastaveni', label: 'Nastavení', module: 'core' },
]

export function normalizeModules(input: readonly string[] | null | undefined): AppModuleId[] {
  if (!input?.length) return DEFAULT_ENABLED_MODULES
  const allowed = new Set<string>(APP_MODULES)
  return input.filter((module): module is AppModuleId => allowed.has(module))
}

export function isModuleEnabled(
  module: AppModuleId,
  enabledModules: readonly AppModuleId[],
): boolean {
  return enabledModules.includes(module)
}
