import type { AppModuleId } from '@/lib/modules'

// Entitlement snapshot ze serveru (GET /me → `entitlement`, nebo GET /entitlements).
// Server je JEDINÝ zdroj pravdy — tohle je jen UX vrstva pro navigaci a upsell.
// Nikdy sem nedávej vlastní odvozování nároku (např. „trial platí ještě 14 dní" spočítané v prohlížeči).

export type AccessMode = 'full' | 'read_only' | 'locked'

export type PlanStatus = 'trial' | 'active' | 'grace_period' | 'suspended' | 'expired' | 'cancelled'

export interface EntitlementPlan {
  id: string
  name: string
  status: PlanStatus
  renewsAt: string | null
  graceEndsAt: string | null
  canManageSubscription: boolean
}

export interface EntitlementSnapshot {
  companyId: string
  plan: EntitlementPlan
  modules: string[]
  features: string[]
  limits: Record<string, number>
  accessMode: AccessMode
  lockedModules: string[]
}

/** Strojové důvody z 403 ProblemDetails (`reason`). Uživateli je NIKDY nezobrazuj. */
export const ENTITLEMENT_REASONS = {
  moduleNotInPlan: 'module_not_in_plan',
  readOnly: 'subscription_read_only',
  locked: 'subscription_locked',
} as const

/**
 * Snapshot pro režim bez API (mock/e2e seed) a jako fail-open fallback, dokud `/me` nedorazí:
 * neblokujeme UI kvůli chybějící odpovědi — skutečné vynucení je vždy na serveru.
 */
export function permissiveSnapshot(modules: string[]): EntitlementSnapshot {
  return {
    companyId: '',
    plan: {
      id: 'growth',
      name: 'Růst',
      status: 'active',
      renewsAt: null,
      graceEndsAt: null,
      canManageSubscription: true,
    },
    modules,
    features: [],
    limits: {},
    accessMode: 'full',
    lockedModules: [],
  }
}

/**
 * Upsell copy pro zamčený modul. Mluví o VÝSLEDKU pro provoz, ne o feature flagu ani názvu API.
 * `plan` je obchodní název tarifu/doplňku, který modul obsahuje — musí odpovídat backend katalogu
 * (`SubscriptionPlans`), jinak bychom zákazníkovi nabízeli něco, co mu nárok nepřinese.
 */
export interface ModuleUpsell {
  title: string
  benefit: string
  plan: string
  points: readonly string[]
}

const GROWTH = 'Růst'
const OPERATIONS = 'Provoz'
const ADDON_SIGNING = 'doplněk Podpisy'

export const MODULE_UPSELL: Record<AppModuleId, ModuleUpsell> = {
  core: {
    title: 'Základ',
    benefit: 'Nastavení firmy, tým a předplatné máte vždy k dispozici.',
    plan: 'Základ',
    points: ['Údaje firmy a fakturační identita', 'Členové a jejich role', 'Správa předplatného'],
  },
  invoicing: {
    title: 'Fakturace a klienti',
    benefit: 'Vystavíte fakturu za minutu, pohlídáte platby a klienty máte na jednom místě.',
    plan: 'Základ',
    points: [
      'Faktury, nabídky a QR platba',
      'Přehled neuhrazených dokladů',
      'Podklady pro účetní bez ručního přepisování',
    ],
  },
  pos: {
    title: 'Pokladna',
    benefit: 'Rychlý prodej bez front a bez přepisování tržeb do tabulek.',
    plan: OPERATIONS,
    points: [
      'Dotyková prodejní obrazovka',
      'Hotovost, karta i účtenky',
      'Denní uzávěrka za pár kliknutí',
    ],
  },
  gastro: {
    title: 'Stoly a kuchyně',
    benefit: 'Objednávky, stoly i kuchyň držíte pod jedním provozním pohledem.',
    plan: GROWTH,
    points: ['Mapa stolů a rozdělení útraty', 'Bony pro kuchyň a bar', 'Méně chyb během špičky'],
  },
  stock: {
    title: 'Sklad a zásoby',
    benefit: 'Máte přehled o zásobách, příjmech a výdejích — bez ručního počítání a výpadků zboží.',
    plan: OPERATIONS,
    points: [
      'Příjemky, výdeje a inventura',
      'Hlídání nízkých zásob',
      'Historie pohybů na jednom místě',
    ],
  },
  attendance: {
    title: 'Docházka a směny',
    benefit: 'Odpracované hodiny sedí a podklady pro mzdy máte na pár kliknutí.',
    plan: OPERATIONS,
    points: ['Píchačka a přehled hodin', 'Plán směn na pobočku', 'Export pro mzdy'],
  },
  booking: {
    title: 'Rezervace',
    benefit: 'Zaplněný kalendář bez kolizí a bez přepisování termínů.',
    plan: GROWTH,
    points: ['Kalendář služeb a zdrojů', 'Online rezervace pro zákazníky', 'Hlídání kapacit'],
  },
  jobs: {
    title: 'Zakázky',
    benefit: 'Práce, materiál a fakturace jedné zakázky drží pohromadě.',
    plan: GROWTH,
    points: [
      'Pracovní list s prací a materiálem',
      'Předání práce zákazníkovi',
      'Faktura přímo ze zakázky',
    ],
  },
  reporting: {
    title: 'Výsledky provozu',
    benefit: 'Víte, kde se vydělává a kde utíkají peníze.',
    plan: OPERATIONS,
    points: ['Tržby, marže a náklady', 'Porovnání poboček', 'Ztráty a ležáky'],
  },
  loyalty: {
    title: 'Věrnost, akce a ceny',
    benefit: 'Zákazníci se vracejí a akce se počítají samy — bez slev „z hlavy".',
    plan: GROWTH,
    points: ['Věrnostní body', 'Akční ceny podle dne a času', 'Cenové hladiny pro stálé zákazníky'],
  },
  ai: {
    title: 'Nápověda a doporučení',
    benefit: 'Aplikace vám sama napoví, co dnes potřebuje pozornost.',
    plan: GROWTH,
    points: ['Doporučení k provozu', 'Nápověda v kontextu obrazovky'],
  },
  integrations: {
    title: 'Napojení a exporty',
    benefit: 'Vystaveno mluví s vaším účetnictvím, terminálem, tiskárnou i e-shopem.',
    plan: GROWTH,
    points: [
      'Export do účetnictví (Pohoda, ISDOC)',
      'Platební terminál a tiskárny',
      'Vlastní API a webhooky',
    ],
  },
  verified_signing: {
    title: 'Podpisy dokumentů',
    benefit: 'Smlouvy a předávací protokoly podepíšete ověřeně a s dohledatelnou evidencí.',
    plan: ADDON_SIGNING,
    points: ['Odeslání dokumentu k podpisu', 'Evidence podpisu', 'Přehled stavů obálek'],
  },
  crm: {
    title: 'CRM',
    benefit: 'Historie komunikace a úkoly u klienta na jednom místě, ne v e-mailech.',
    plan: GROWTH,
    points: ['Poznámky a aktivity u klienta', 'Fronta úkolů', 'Timeline dokladů'],
  },
}

export function upsellFor(module: string): ModuleUpsell {
  return (
    MODULE_UPSELL[module as AppModuleId] ?? {
      title: 'Další možnosti Vystaveno',
      benefit: 'Tato část aplikace není ve vašem tarifu.',
      plan: GROWTH,
      points: [],
    }
  )
}

/** Kolik dní zbývá do data ze serveru. null = server žádné datum neposlal (tarif bez konce). */
export function daysUntil(iso: string | null, now: number = Date.now()): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - now
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.ceil(ms / 86_400_000))
}
