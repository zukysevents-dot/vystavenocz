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
  // „Růst" balíček: CRM (poznámky, úkoly, timeline dokladů nad klientem). Backend gatuje modulem `crm`.
  'crm',
] as const

export type AppModuleId = (typeof APP_MODULES)[number]

export const DEFAULT_ENABLED_MODULES: AppModuleId[] = [...APP_MODULES]

/** Katalog pro stránku „Přidat moduly" — název a lidský přínos, ne technický popis. */
export interface ModuleCatalogEntry {
  id: AppModuleId
  label: string
  description: string
  /** Modul je povinný základ — nejde vypnout. */
  required?: boolean
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    id: 'core',
    label: 'Jádro',
    description: 'Firma, pobočky, uživatelé, klienti a nastavení.',
    required: true,
  },
  {
    id: 'invoicing',
    label: 'Fakturace',
    description: 'Faktury, nabídky, DPH, cashflow a účetní výstupy.',
  },
  { id: 'pos', label: 'Pokladna', description: 'Prodej, platby, účtenky, uzávěrky a Z-reporty.' },
  { id: 'gastro', label: 'Gastro', description: 'Restaurace, stoly, kuchyně a gastro provoz.' },
  {
    id: 'stock',
    label: 'Sklad',
    description: 'Zásoby, příjem, výdej, inventury a skladové pohyby.',
  },
  {
    id: 'attendance',
    label: 'Docházka',
    description: 'Zaměstnanci, směny, příchody, odchody a pauzy.',
  },
  { id: 'booking', label: 'Rezervace', description: 'Služby, zdroje a veřejné rezervace.' },
  { id: 'jobs', label: 'Zakázky', description: 'Výjezdy, práce v terénu a zakázkový provoz.' },
  {
    id: 'reporting',
    label: 'Reporty',
    description: 'Konsolidace, manažerské přehledy a porovnání provozoven.',
  },
  {
    id: 'loyalty',
    label: 'Věrnost',
    description: 'Věrnostní programy, návraty zákazníků a marketing.',
  },
  { id: 'crm', label: 'CRM', description: 'Poznámky, úkoly a historie komunikace u klienta.' },
  {
    id: 'verified_signing',
    label: 'Podpisy',
    description: 'Ověřené podepsání smluv a předávacích protokolů.',
  },
  { id: 'ai', label: 'AI asistent', description: 'Doporučení a nápověda k provozu.' },
  {
    id: 'integrations',
    label: 'Integrace',
    description: 'Nahrání a stažení dat, účetní výstupy a propojení dalších služeb.',
  },
]

// Moduly, které ještě nejsou ostré. NESMÍ se tvářit jako zapnuté ani nabídnout aktivaci —
// i kdyby je server v `modules` poslal, uživatel by čekal funkci, která v aplikaci není.
export const COMING_SOON_MODULES: readonly AppModuleId[] = ['ai']

export type ModuleState = 'active' | 'available' | 'locked' | 'coming_soon'

/**
 * Stav modulu pro stránku Moduly. `lockedModules` je nárok ze serveru (entitlement snapshot) —
 * modul mimo tarif si firma nezapne ani kliknutím, server takový požadavek odmítne.
 */
export function moduleState(
  module: AppModuleId,
  enabledModules: readonly AppModuleId[],
  lockedModules: readonly string[],
): ModuleState {
  if (COMING_SOON_MODULES.includes(module)) return 'coming_soon'
  if (lockedModules.includes(module)) return 'locked'
  return enabledModules.includes(module) ? 'active' : 'available'
}

export type BusinessProfileId =
  | 'solo'
  | 'beauty'
  | 'warehouse'
  | 'gastro'
  | 'services'
  | 'crafts'
  | 'shop'

// Obor si firma vybere v onboardingu; držíme ho lokálně, aby šlo později označit doporučené moduly.
// ponytail: localStorage stačí — je to jen nápověda v UI, ne nárok ani nastavení na serveru.
const PROFILE_STORAGE_KEY = 'vystaveno.business-profile.v1'

export function saveBusinessProfile(id: BusinessProfileId): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, id)
}

export function recommendedModules(): AppModuleId[] {
  const id = localStorage.getItem(PROFILE_STORAGE_KEY)
  return BUSINESS_PROFILES.find((profile) => profile.id === id)?.modules ?? []
}

/** Prošel už uživatel výběrem oboru? Onboarding je jednorázový — po přihlášení se neopakuje. */
export function hasBusinessProfile(): boolean {
  return localStorage.getItem(PROFILE_STORAGE_KEY) !== null
}

/** Obor zvolený v onboardingu i s doporučenými kroky; null = uživatel obor nevybral. */
export function savedBusinessProfile(): BusinessProfile | null {
  const id = localStorage.getItem(PROFILE_STORAGE_KEY)
  return BUSINESS_PROFILES.find((profile) => profile.id === id) ?? null
}

export function clearBusinessProfile(): void {
  localStorage.removeItem(PROFILE_STORAGE_KEY)
}

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

// Pořadí = pořadí v onboardingu. První je nejjednodušší start (jen faktury), zbytek přidává provoz.
export const BUSINESS_PROFILES: BusinessProfile[] = [
  {
    id: 'solo',
    label: 'Živnostník / OSVČ',
    description: 'Jen faktury a klienti. Nic navíc — další části si kdykoli přidáte.',
    modules: ['core', 'invoicing'],
    setupSteps: [
      {
        label: 'Vystavit první fakturu',
        description: 'Údaje firmy už máte vyplněné, stačí doplnit odběratele a položky.',
        to: '/app/faktury',
      },
      {
        label: 'Uložit si klienty',
        description: 'Klienta stačí zadat jednou, příště se předvyplní sám.',
        to: '/app/klienti',
      },
      {
        label: 'Připravit podklady pro účetní',
        description: 'Export dokladů za období si účetní stáhne v jednom souboru.',
        to: '/app/uctarna',
      },
    ],
  },
  {
    id: 'beauty',
    label: 'Kadeřnictví, salon, kosmetika',
    description: 'Objednávkový kalendář, klienti a faktury za služby.',
    modules: ['core', 'invoicing', 'booking'],
    setupSteps: [
      {
        label: 'Připravit rezervace',
        description: 'Kalendář a online objednání nahradí sešit i esemesky.',
        to: '/app/rezervace',
      },
      {
        label: 'Založit klienty',
        description: 'Historie návštěv pomůže s opakovanými termíny i fakturací.',
        to: '/app/klienti',
      },
      {
        label: 'Vystavit fakturu',
        description: 'Doklad za službu vystavíte za minutu, včetně QR platby.',
        to: '/app/faktury',
      },
    ],
  },
  {
    id: 'warehouse',
    label: 'Sklad a velkoobchod',
    description: 'Příjem, výdej, převody, inventury a minima zásob — bez pokladny a gastro.',
    modules: ['core', 'stock', 'reporting', 'ai', 'integrations'],
    setupSteps: [
      {
        label: 'Založit sklad nebo provozovnu',
        description:
          'Jedno místo stačí pro začátek. U více skladů pak systém hlídá, odkud a kam se zboží pohybuje.',
        to: '/app/pobocky',
      },
      {
        label: 'Nahrát katalog položek',
        description:
          'Zadejte název, skladový kód a případně čárový kód. Prodejní cenu ani pokladnu nepotřebujete.',
        to: '/app/sklad',
      },
      {
        label: 'Založit první příjemku',
        description: 'Příjemka zvýší zásobu a uchová dodavatele, datum i nákupní cenu.',
        to: '/app/naskladneni',
      },
      {
        label: 'Ověřit pohyby a minimum',
        description:
          'Ve stavu skladu uvidíte zásoby, historii, inventuru a upozornění na položky pod minimem.',
        to: '/app/zasoby',
      },
    ],
  },
  {
    id: 'gastro',
    label: 'Restaurace, kavárna, bar',
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
    label: 'Služby a poradenství',
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
    label: 'Obchod a prodejna',
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
  /** Položka dává smysl jen provozu, který používá kuchyňské bony (firemní volba, ne modul). */
  requiresKitchenTickets?: boolean
}

export const APP_NAV_DEFINITIONS: AppNavDefinition[] = [
  { to: '/app', label: 'Dnes ve firmě', module: 'core', exact: true, hiddenForRoles: ['Employee'] },
  { to: '/app/pokladna', label: 'Pokladna', module: 'pos' },
  { to: '/app/restaurace', label: 'Stoly a objednávky', module: 'gastro' },
  {
    to: '/app/kuchyne',
    label: 'Kuchyňské objednávky',
    module: 'gastro',
    requiresKitchenTickets: true,
  },
  {
    to: '/app/mapa-stolu',
    label: 'Nastavení stolů',
    module: 'gastro',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/sklad',
    label: 'Produkty',
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
    label: 'Příjemky',
    module: 'stock',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/skladove-doklady',
    label: 'Skladové doklady',
    module: 'stock',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/dodavatele',
    label: 'Dodavatelé',
    module: 'stock',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/nakupni-objednavky',
    label: 'Nákupní objednávky',
    module: 'stock',
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  {
    to: '/app/modifikatory',
    label: 'Volby k produktům',
    module: 'gastro',
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
    to: '/app/tym',
    label: 'Tým',
    module: 'core',
    hiddenForRoles: ['Employee', 'Accountant', 'Manager'],
  },
  {
    to: '/app/pobocky',
    label: 'Pobočky',
    module: 'core',
    hiddenForRoles: ['Employee', 'Accountant', 'Manager'],
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
    hiddenForRoles: ['Employee', 'Accountant'],
  },
  { to: '/app/rezervace', label: 'Rezervace', module: 'booking' },
  {
    to: '/app/kategorie',
    label: 'Kategorie produktů',
    module: 'stock',
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
  { to: '/app/crm', label: 'CRM', module: 'crm', hiddenForRoles: ['Employee'] },
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
  // Moduly firmy jsou vlastní položka menu (ne karta schovaná v nastavení). Mění je jen vedení —
  // stejné role jako Tým/Pobočky; route to navíc vynucuje `requiresRole`.
  {
    to: '/app/moduly',
    label: 'Přidat moduly',
    module: 'core',
    hiddenForRoles: ['Employee', 'Accountant', 'Manager'],
  },
  { to: '/app/predplatne', label: 'Předplatné', module: 'core', hiddenForRoles: ['Employee'] },
  { to: '/app/nastaveni', label: 'Nastavení', module: 'core', hiddenForRoles: ['Employee'] },
]

// Provozní profily Kuchyně/Skladník (zrcadlí backend RolePermissions): místo vyjmenovávání
// hiddenForRoles na každé položce mají ALLOWLIST — vidí jen obrazovky svého workflow + docházku.
// Ostatní role dál řeší hiddenForRoles. Server oprávnění vynucuje vždy; tohle je jen navigace.
export const OPERATIONAL_ROLE_NAV: Record<string, readonly string[]> = {
  Kitchen: ['/app/kuchyne', '/app/dochazka'],
  Stockkeeper: [
    '/app/sklad',
    '/app/zasoby',
    '/app/naskladneni',
    '/app/skladove-doklady',
    '/app/dodavatele',
    '/app/nakupni-objednavky',
    '/app/kategorie',
    '/app/dochazka',
  ],
}

export function isNavVisibleForRole(item: AppNavDefinition, role: string | null): boolean {
  if (!role) return true // fail-open jako hasRole — bez role (mock/náhled) se nic neskrývá
  const allowlist = OPERATIONAL_ROLE_NAV[role]
  if (allowlist) return allowlist.includes(item.to)
  return !item.hiddenForRoles?.includes(role)
}

// Kam poslat provozní roli z „/app" (dashboard je fakturační) — zrcadlí Employee redirect v routeru.
export function operationalLandingFor(
  role: string | null,
  enabledModules: readonly AppModuleId[],
): string | null {
  if (role === 'Kitchen')
    return enabledModules.includes('gastro') ? '/app/kuchyne' : '/app/dochazka'
  if (role === 'Stockkeeper')
    return enabledModules.includes('stock') ? '/app/zasoby' : '/app/dochazka'
  return null
}

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
