import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Placené moduly z pohledu uživatele. Server je autoritativní — tady kontrolujeme, že aplikace
// zamčenou část vysvětlí (ne odmítne jako chybu), nabídne cestu dál jen majiteli/správci a že
// omezený režim po skončení předplatného vypadá pravdivě.

const API = '**/api/v1/**'

type AccessMode = 'full' | 'read_only' | 'locked'
type PlanStatus = 'trial' | 'active' | 'grace_period' | 'expired' | 'cancelled' | 'suspended'

interface Plan {
  modules: string[]
  locked: string[]
  accessMode: AccessMode
  status: PlanStatus
  planId: string
  planName: string
  renewsAt: string | null
  graceEndsAt: string | null
  role: string
}

function plan(over: Partial<Plan> = {}): Plan {
  return {
    modules: ['core', 'invoicing'],
    locked: ['gastro', 'pos', 'verified_signing'],
    accessMode: 'full',
    status: 'active',
    planId: 'free',
    planName: 'Základ',
    renewsAt: null,
    graceEndsAt: null,
    role: 'Owner',
    ...over,
  }
}

function snapshot(p: Plan) {
  return {
    companyId: 'c_e2e',
    plan: {
      id: p.planId,
      name: p.planName,
      status: p.status,
      renewsAt: p.renewsAt,
      graceEndsAt: p.graceEndsAt,
      canManageSubscription: p.role === 'Owner' || p.role === 'Admin',
    },
    modules: p.modules,
    features: [],
    limits: {},
    accessMode: p.accessMode,
    lockedModules: p.locked,
  }
}

async function seedSession(page: Page, p: Plan): Promise<void> {
  await page.addInitScript(
    ({ modules, role, snap }) => {
      window.__VYSTAVENO_API_URL__ = '/api/v1'
      localStorage.setItem(
        'vystaveno.auth.tokens.v1',
        JSON.stringify({ accessToken: 'e2e-access', refreshToken: 'e2e-refresh' }),
      )
      localStorage.setItem(
        'vystaveno.auth.session.v1',
        JSON.stringify({
          user: { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Test' },
          companyId: 'c_e2e',
          role,
          modules,
          features: [],
          entitlement: snap,
        }),
      )
      localStorage.setItem(
        'vystaveno.cookieConsent.v1',
        JSON.stringify({
          necessary: true,
          analytics: false,
          decidedAt: '2026-07-09T00:00:00.000Z',
        }),
      )
    },
    { modules: p.modules, role: p.role, snap: snapshot(p) },
  )
}

async function routeApi(
  page: Page,
  p: Plan,
  extra?: (path: string) => object | null,
): Promise<void> {
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: 'c_e2e',
          role: p.role,
          modules: p.modules,
          features: [],
          companies: [{ id: 'c_e2e', name: 'E2E Firma', role: p.role, locationId: null }],
          entitlement: snapshot(p),
        },
      })
    if (method === 'GET' && path === '/entitlements') return route.fulfill({ json: snapshot(p) })
    if (method === 'GET' && path === '/company/modules')
      return route.fulfill({ json: { modules: p.modules } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E Firma', currency: 'CZK' } })
    if (method === 'GET' && path === '/locations')
      return route.fulfill({ json: { items: [], total: 0 } })

    const override = extra?.(path)
    if (override) return route.fulfill(override)

    // Server odmítá vše, na co firma nemá nárok — stejným tvarem jako produkce.
    const moduleOf: Record<string, string> = {
      '/sales': 'pos',
      '/orders': 'gastro',
      '/clients': 'invoicing',
      '/invoices': 'invoicing',
    }
    const needed = Object.entries(moduleOf).find(([prefix]) => path.startsWith(prefix))?.[1]
    if (needed && !p.modules.includes(needed))
      return route.fulfill({
        status: 403,
        json: {
          status: 403,
          detail: 'Tato část aplikace není ve vašem tarifu.',
          reason: 'module_not_in_plan',
        },
      })
    if (needed && p.accessMode !== 'full' && method !== 'GET')
      return route.fulfill({
        status: 403,
        json: {
          status: 403,
          detail: 'Vaše předplatné skončilo. Data zůstávají k nahlédnutí i k exportu.',
          reason: 'subscription_read_only',
        },
      })

    if (path.startsWith('/dashboard/')) return route.fulfill({ json: { series: [] } })
    // Firma bez akvizičního nároku — server vrací 404, ne prázdný objekt (jinak panel čte prázdný benefit).
    if (path.startsWith('/subscription-claims')) return route.fulfill({ status: 404, json: {} })
    if (path.startsWith('/growth')) return route.fulfill({ status: 404, json: {} })
    // Tady netestujeme pokrytí endpointů, ale gating — cokoli dalšího vrať prázdné, aby se stránka
    // načetla bez chyb v konzoli a test měřil jen to, co má.
    return route.fulfill({ json: { items: [], total: 0 } })
  })
}

test('navigace odpovídá tarifu — zamčené části v menu nejsou', async ({ page }) => {
  const p = plan()
  await seedSession(page, p)
  await routeApi(page, p)

  await page.goto('/app/predplatne')

  await expect(page.getByRole('link', { name: 'Faktury' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pokladna' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Stoly a objednávky' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Podpisy' })).toHaveCount(0)
})

test('přímá URL na část mimo tarif vysvětlí přínos a nabídne cestu dál', async ({ page }) => {
  const p = plan()
  await seedSession(page, p)
  await routeApi(page, p)

  await page.goto('/app/pokladna')

  await expect(page).toHaveURL(/\/app\/modul\/pos$/)
  await expect(page.getByRole('heading', { name: 'Pokladna' })).toBeVisible()
  await expect(page.getByText('Rychlý prodej bez front')).toBeVisible()
  // Majitel dostane cestu dál…
  await expect(page.getByRole('button', { name: 'Zobrazit možnosti' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Přejít na ceník' })).toBeVisible()
  // …a nikdy technický důvod.
  await expect(page.getByText('403')).toHaveCount(0)
  await expect(page.getByText('module_not_in_plan')).toHaveCount(0)
  await expect(page.getByText('Server je momentálně nedostupný')).toHaveCount(0)
})

test('zaměstnanec o změnu tarifu žádat nemůže', async ({ page }) => {
  const p = plan({ role: 'Employee', modules: ['core', 'invoicing'] })
  await seedSession(page, p)
  await routeApi(page, p)

  await page.goto('/app/modul/gastro')

  await expect(page.getByText('Objednávky, stoly i kuchyň')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zobrazit možnosti' })).toHaveCount(0)
  await expect(page.getByText('O rozšíření může požádat majitel nebo správce firmy.')).toBeVisible()
})

test('přímé API volání bez nároku je odmítnuté a appka nevypadá rozbitá', async ({ page }) => {
  // Test schválně vyvolá 403 — prohlížeč u toho zaloguje network chybu.
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 403' })
  const p = plan()
  await seedSession(page, p)
  await routeApi(page, p)
  await page.goto('/app/predplatne')

  const status = await page.evaluate(async () => {
    const res = await fetch('/api/v1/sales', { headers: { Authorization: 'Bearer e2e-access' } })
    return { status: res.status, body: await res.json() }
  })

  expect(status.status).toBe(403)
  expect(status.body.reason).toBe('module_not_in_plan')
  await expect(page.getByText('Server je momentálně nedostupný')).toHaveCount(0)
})

test('stránka Předplatné ukazuje tarif, obsah i co lze přidat — bez lokální aktivace', async ({
  page,
}) => {
  const p = plan({ planId: 'standard', planName: 'Provoz', modules: ['core', 'invoicing', 'pos'] })
  await seedSession(page, p)
  await routeApi(page, p)

  await page.goto('/app/predplatne')

  await expect(page.getByText('Aktivní tarif: Provoz')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'V tarifu Provoz' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Co můžete přidat' })).toBeVisible()
  // Tarif nelze „zaplatit" z prohlížeče.
  await expect(page.getByRole('button', { name: /Aktivovat/ })).toHaveCount(0)
})

test('zkušební doba na konci ukáže banner s počtem dní', async ({ page }) => {
  const endsAt = new Date(Date.now() + 3 * 86_400_000).toISOString()
  const p = plan({ status: 'trial', planId: 'growth', planName: 'Růst', renewsAt: endsAt })
  await seedSession(page, p)
  await routeApi(page, p)

  await page.goto('/app/predplatne')

  await expect(page.getByText(/Zkušební doba: zbývá/).first()).toBeVisible()
})

test('po skončení předplatného je režim jen pro čtení pravdivě vysvětlený', async ({ page }) => {
  const p = plan({ status: 'expired', accessMode: 'read_only' })
  await seedSession(page, p)
  await routeApi(page, p)

  await page.goto('/app/predplatne')

  await expect(page.getByText(/Předplatné skončilo/).first()).toBeVisible()
  await expect(page.getByText(/k nahlédnutí i k exportu/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Obnovit' })).toBeVisible()
  // Data zůstávají dostupná — stránka se normálně načte, nic nevypadá rozbitě.
  await expect(page.getByRole('heading', { name: 'Předplatné' })).toBeVisible()
})

test('pozastavený přístup pošle uživatele na podporu, ne na upsell', async ({ page }) => {
  const p = plan({ status: 'suspended', accessMode: 'locked', modules: ['core'] })
  await seedSession(page, p)
  await routeApi(page, p)

  await page.goto('/app/predplatne')

  await expect(page.getByText(/Přístup je pozastavený/).first()).toBeVisible()
  await expect(page.getByText(/podporu/).first()).toBeVisible()
})

test('změna tarifu se po obnovení stránky projeví v navigaci', async ({ page }) => {
  const before = plan()
  await seedSession(page, before)
  await routeApi(page, before)
  await page.goto('/app/predplatne')
  await expect(page.getByRole('link', { name: 'Pokladna' })).toHaveCount(0)

  // Support firmě přidá modul → po refreshi ho aplikace vidí (snapshot je serverový, ne lokální).
  const after = plan({
    modules: ['core', 'invoicing', 'pos'],
    locked: ['gastro', 'verified_signing'],
    planId: 'standard',
    planName: 'Provoz',
  })
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await routeApi(page, after)
  await seedSession(page, after)
  await page.reload()

  await expect(page.getByRole('link', { name: 'Pokladna' }).first()).toBeVisible()
})

test('zamčená část je na Předplatném vidět jako co lze přidat, ne jako chyba', async ({ page }) => {
  const p = plan()
  await seedSession(page, p)
  await routeApi(page, p)

  await page.goto('/app/predplatne')

  const addable = page.getByRole('heading', { name: 'Co můžete přidat' })
  await expect(addable).toBeVisible()
  await expect(page.getByText('Stoly a kuchyně')).toBeVisible()
  await expect(page.getByText('Podpisy dokumentů')).toBeVisible()
})
