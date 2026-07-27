import type { Page } from '@playwright/test'

// Klíče localStorage musí odpovídat stores (auth/company/subscription) a useApi.
const KEYS = {
  auth: 'vystaveno.auth.user.v1',
  company: 'vystaveno.company.v1',
  subscription: 'vystaveno.subscription.v1',
  // Mock režim nemá server → stav tarifu se pro náhled/e2e simuluje tímto snapshotem.
  entitlement: 'vystaveno.entitlement.mock.v1',
  invoices: 'vystaveno:invoices',
  clients: 'vystaveno:clients',
}

// Jeden klient stačí, aby se vypnul demo seeding (seed.ts seedne jen při 0 klientech) —
// e2e tak mají deterministická data místo demo faktur.
const DEFAULT_CLIENT = {
  id: 'cl_e2e',
  name: 'E2E Klient',
  ico: '27604977',
  dic: 'CZ27604977',
  email: 'klient@e2e.cz',
  phone: null,
  street: 'Klientská 2',
  city: 'Brno',
  zip: '60200',
  country: 'CZ',
  defaultPaymentDays: 14,
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

type SubState = 'trial' | 'pro' | 'expired'

export interface SeedOptions {
  /** trial (výchozí, běžící), pro (zaplaceno), expired (bez přístupu). */
  subscription?: SubState
  /** Přepíše vybraná pole firmy (zbytek z výchozího profilu). */
  company?: Record<string, unknown>
  invoices?: unknown[]
}

/**
 * Naseeduje localStorage (přihlášený uživatel + firma + předplatné) přes addInitScript,
 * takže stav existuje ještě před načtením appky — route guard /app projde.
 */
export async function seedApp(page: Page, opts: SeedOptions = {}): Promise<void> {
  const user = { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Test' }

  const company = {
    id: 'c_e2e',
    companyName: 'E2E s.r.o.',
    fullName: null,
    email: user.email,
    ico: '12345678',
    dic: null,
    vatMode: 'non_payer',
    street: 'Testovací 1',
    city: 'Praha',
    zip: '11000',
    country: 'CZ',
    bankAccount: '123456789/0100',
    iban: null,
    swift: null,
    logoUrl: null,
    invoiceColor: null,
    invoiceNumberPrefix: 'FA',
    invoiceNumberFormat: '{prefix}-{year}-{seq}',
    nextInvoiceSeq: 1,
    defaultPaymentDays: 14,
    ...(opts.company ?? {}),
  }

  const day = 86_400_000
  const now = Date.now()
  const sub = opts.subscription ?? 'trial'
  const subscription =
    sub === 'pro'
      ? { active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }
      : sub === 'expired'
        ? { active: false, plan: 'free', trialEndsAt: null, subscriptionUntil: null }
        : {
            active: true,
            plan: 'trial',
            trialEndsAt: new Date(now + 10 * day).toISOString(),
            subscriptionUntil: null,
          }

  // Snapshot ve stejném tvaru, jaký v API režimu vrací /me → stránky i banner čtou jeden kontrakt.
  const entitlement = {
    companyId: 'c_e2e',
    plan: {
      id: sub === 'pro' ? 'growth' : sub === 'expired' ? 'free' : 'growth',
      name: sub === 'pro' ? 'Růst' : sub === 'expired' ? 'Základ' : 'Růst',
      status: sub === 'pro' ? 'active' : sub === 'expired' ? 'expired' : 'trial',
      renewsAt: sub === 'trial' ? new Date(now + 10 * day).toISOString() : null,
      graceEndsAt: null,
      canManageSubscription: true,
    },
    modules: [
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
      'crm',
    ],
    features: [],
    limits: {},
    accessMode: sub === 'expired' ? 'read_only' : 'full',
    lockedModules: sub === 'expired' ? [] : ['verified_signing'],
  }

  await page.addInitScript(
    ({ keys, user, company, subscription, entitlement, invoices, client }) => {
      // Seed jen jednou za kontext — jinak by se přepsaly změny stavu (např. activatePro)
      // při každé další navigaci, protože addInitScript běží před každým načtením stránky.
      if (localStorage.getItem('__e2e_seeded__')) return
      localStorage.setItem(keys.auth, JSON.stringify(user))
      localStorage.setItem(keys.company, JSON.stringify(company))
      localStorage.setItem(keys.subscription, JSON.stringify(subscription))
      localStorage.setItem(keys.entitlement, JSON.stringify(entitlement))
      localStorage.setItem(keys.invoices, JSON.stringify(invoices ?? []))
      localStorage.setItem(keys.clients, JSON.stringify([client]))
      localStorage.setItem('__e2e_seeded__', '1')
    },
    {
      keys: KEYS,
      user,
      company,
      subscription,
      entitlement,
      invoices: opts.invoices,
      client: DEFAULT_CLIENT,
    },
  )
}
