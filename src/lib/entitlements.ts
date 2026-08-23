import type { AppModuleId } from '@/lib/modules'
import { PRICING_MODULES, type ModuleKey } from '@/lib/pricing'

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
 *
 * `plan` je to, co si zákazník podle CENÍKU skutečně kupuje, a proto se NEPÍŠE ručně — odvozuje se
 * z `PRICING_MODULES` (viz `CENIK_MODULE` níže). Dřív tu byly natvrdo napsané názvy tarifů
 * „Základ / Provoz / Růst", jenže ceník je od schváleného sazebníku modulární: zákazník by si
 * v něm „Růst" marně hledal. Cena je ze stejného zdroje, takže se paywall nemůže rozejít s ceníkem.
 */
export interface ModuleUpsell {
  title: string
  benefit: string
  plan: string
  points: readonly string[]
  /** Kč/měsíc bez DPH za modul, který tuhle část obsahuje. 0 = je v základu zdarma. */
  priceMonthly: number
}

/** Interní tvar bez odvozených polí — `plan`/`priceMonthly` doplní `MODULE_UPSELL`. */
type UpsellCopy = Omit<ModuleUpsell, 'plan' | 'priceMonthly'>

/**
 * Který modul CENÍKU zákazník kupuje, aby dostal danou část aplikace.
 * `plus` je podle sazebníku jeden modul „Provozní přehled, věrnost, CRM, integrace a ověřené
 * podpisy" — proto na něj míří všech pět. `core` a `ai` tu nejsou: jádro je vždycky v ceně
 * a AI asistent se zatím neprodává.
 */
const CENIK_MODULE: Partial<Record<AppModuleId, ModuleKey>> = {
  invoicing: 'invoicing',
  pos: 'pos',
  gastro: 'restaurant',
  stock: 'inventory',
  booking: 'booking',
  attendance: 'attendance',
  jobs: 'jobs',
  reporting: 'plus',
  loyalty: 'plus',
  crm: 'plus',
  integrations: 'plus',
  verified_signing: 'plus',
}

const BASIC = { plan: 'Základ, který je v ceně', priceMonthly: 0 }

function pricingFor(module: AppModuleId): { plan: string; priceMonthly: number } {
  const key = CENIK_MODULE[module]
  const entry = key ? PRICING_MODULES.find((m) => m.key === key) : undefined
  if (!entry || entry.free) return BASIC
  return { plan: `modul ${entry.name}`, priceMonthly: entry.monthly }
}

const UPSELL_COPY: Record<AppModuleId, UpsellCopy> = {
  core: {
    title: 'Základ',
    benefit: 'Nastavení firmy, tým a předplatné máte vždy k dispozici.',
    points: ['Údaje firmy a fakturační identita', 'Členové a jejich role', 'Správa předplatného'],
  },
  invoicing: {
    title: 'Fakturace a klienti',
    benefit: 'Vystavíte fakturu za minutu, pohlídáte platby a klienty máte na jednom místě.',
    points: [
      'Faktury, nabídky a QR platba',
      'Přehled neuhrazených dokladů',
      'Podklady pro účetní bez ručního přepisování',
    ],
  },
  pos: {
    title: 'Pokladna',
    benefit: 'Rychlý prodej bez front a bez přepisování tržeb do tabulek.',
    points: [
      'Dotyková prodejní obrazovka',
      'Hotovost, karta i účtenky',
      'Denní uzávěrka za pár kliknutí',
    ],
  },
  gastro: {
    title: 'Stoly a kuchyně',
    benefit: 'Objednávky, stoly i kuchyň držíte pod jedním provozním pohledem.',
    points: ['Mapa stolů a rozdělení útraty', 'Bony pro kuchyň a bar', 'Méně chyb během špičky'],
  },
  stock: {
    title: 'Sklad a zásoby',
    benefit: 'Máte přehled o zásobách, příjmech a výdejích — bez ručního počítání a výpadků zboží.',
    points: [
      'Příjemky, výdeje a inventura',
      'Hlídání nízkých zásob',
      'Historie pohybů na jednom místě',
    ],
  },
  attendance: {
    title: 'Docházka a směny',
    benefit: 'Odpracované hodiny sedí a podklady pro mzdy máte na pár kliknutí.',
    points: ['Píchačka a přehled hodin', 'Plán směn na pobočku', 'Export pro mzdy'],
  },
  booking: {
    title: 'Rezervace',
    benefit: 'Zaplněný kalendář bez kolizí a bez přepisování termínů.',
    points: ['Kalendář služeb a zdrojů', 'Online rezervace pro zákazníky', 'Hlídání kapacit'],
  },
  jobs: {
    title: 'Zakázky',
    benefit: 'Práce, materiál a fakturace jedné zakázky drží pohromadě.',
    points: [
      'Pracovní list s prací a materiálem',
      'Předání práce zákazníkovi',
      'Faktura přímo ze zakázky',
    ],
  },
  reporting: {
    title: 'Výsledky provozu',
    benefit: 'Víte, kde se vydělává a kde utíkají peníze.',
    points: ['Tržby, marže a náklady', 'Porovnání poboček', 'Ztráty a ležáky'],
  },
  loyalty: {
    title: 'Věrnost, akce a ceny',
    benefit: 'Zákazníci se vracejí a akce se počítají samy — bez slev „z hlavy".',
    points: ['Věrnostní body', 'Akční ceny podle dne a času', 'Cenové hladiny pro stálé zákazníky'],
  },
  ai: {
    title: 'Nápověda a doporučení',
    benefit: 'Aplikace vám sama napoví, co dnes potřebuje pozornost.',
    points: ['Doporučení k provozu', 'Nápověda v kontextu obrazovky'],
  },
  integrations: {
    title: 'Napojení a exporty',
    benefit: 'Vystaveno mluví s vaším účetnictvím, terminálem, tiskárnou i e-shopem.',
    points: [
      'Export do účetnictví (Pohoda, ISDOC)',
      'Platební terminál a tiskárny',
      'Vlastní API a webhooky',
    ],
  },
  verified_signing: {
    title: 'Podpisy dokumentů',
    benefit: 'Smlouvy a předávací protokoly podepíšete ověřeně a s dohledatelnou evidencí.',
    points: ['Odeslání dokumentu k podpisu', 'Evidence podpisu', 'Přehled stavů obálek'],
  },
  crm: {
    title: 'CRM',
    benefit: 'Historie komunikace a úkoly u klienta na jednom místě, ne v e-mailech.',
    points: ['Poznámky a aktivity u klienta', 'Fronta úkolů', 'Timeline dokladů'],
  },
}

/** Katalog s doplněnou cenou a názvem modulu z ceníku. Jediný zdroj upsell textů pro celé UI. */
export const MODULE_UPSELL: Record<AppModuleId, ModuleUpsell> = Object.fromEntries(
  (Object.keys(UPSELL_COPY) as AppModuleId[]).map((module) => [
    module,
    { ...UPSELL_COPY[module], ...pricingFor(module) },
  ]),
) as Record<AppModuleId, ModuleUpsell>

export function upsellFor(module: string): ModuleUpsell {
  return (
    MODULE_UPSELL[module as AppModuleId] ?? {
      title: 'Další možnosti Vystaveno',
      benefit: 'Tato část aplikace není ve vašem tarifu.',
      ...BASIC,
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
