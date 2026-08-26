import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Samoobslužný nákup modulů z ceníku. Stránka NIC neaktivuje — jen si vyžádá adresu platební
// stránky a přesměruje. Test proto ověřuje, co si vybere uživatel, co odejde na server a že se
// nikdy netvrdí zaplaceno. API režim s mockovanými routes (vzor api-webhooky.spec.ts).

const API = '**/api/v1/**'
const MODULES = ['core', 'invoicing']

/** Co si firma může koupit. `owned` položka se nesmí nabízet — nikdo nemá platit dvakrát. */
const CATALOG = {
  items: [
    {
      key: 'pos',
      name: 'Pokladna',
      kind: 'Module',
      modules: ['pos'],
      monthlyNet: 199,
      yearlyNet: 1990,
      owned: false,
    },
    {
      key: 'inventory',
      name: 'Sklad',
      kind: 'Module',
      modules: ['stock'],
      monthlyNet: 149,
      yearlyNet: 1490,
      owned: false,
    },
    {
      key: 'invoicing',
      name: 'Fakturace',
      kind: 'Module',
      modules: ['invoicing'],
      monthlyNet: 0,
      yearlyNet: 0,
      owned: true,
    },
  ],
  currency: 'CZK',
  vatRatePercent: 21,
  trialEndsAt: '2026-11-01T23:59:59Z',
  canCheckout: true,
  hasBillingAccount: false,
}

let lastCheckoutBody: { items: string[]; period: string } | null = null

async function seedApiSession(page: Page): Promise<void> {
  await page.addInitScript((mods) => {
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
        role: 'Owner',
        modules: mods,
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, MODULES)
}

async function routeApp(page: Page, catalog: Record<string, unknown> = CATALOG): Promise<void> {
  lastCheckoutBody = null
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
          role: 'Owner',
          modules: MODULES,
          features: [],
          entitlement: {
            plan: {
              id: 'growth',
              name: 'Růst',
              status: 'trial',
              renewsAt: '2026-11-01T23:59:59Z',
              graceEndsAt: null,
              canManageSubscription: true,
            },
            modules: MODULES,
            features: [],
            limits: {},
            accessMode: 'full',
            lockedModules: ['pos', 'stock'],
          },
        },
      })

    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E Firma', currency: 'CZK' } })
    if (method === 'GET' && path === '/company/modules')
      return route.fulfill({ json: { modules: MODULES } })

    if (method === 'GET' && path === '/subscription/catalog')
      return route.fulfill({ json: catalog })
    if (method === 'POST' && path === '/subscription/checkout') {
      lastCheckoutBody = request.postDataJSON() as { items: string[]; period: string }
      // Přesměrování musí zůstat uvnitř testu — ven na skutečnou bránu nikdy nechodíme.
      return route.fulfill({ json: { redirectUrl: '/app/predplatne?nakup=zruseno' } })
    }

    return route.fulfill({ json: {} })
  })
}

test('vybrané moduly a období odejdou na server, platbu otevře až tlačítko', async ({ page }) => {
  await seedApiSession(page)
  await routeApp(page)
  await page.goto('/app/predplatne')

  await expect(page.getByRole('heading', { name: 'Přidat moduly' })).toBeVisible()

  // Co firma už má, se nenabízí.
  await expect(page.getByText('Fakturace', { exact: true })).toHaveCount(0)

  // Dokud není nic vybráno, koupit nejde.
  const pay = page.getByRole('button', { name: /Pokračovat k platbě/ })
  await expect(pay).toBeDisabled()

  await page.getByLabel('Pokladna').click()
  // Cena je vidět dvakrát — u položky i v součtu; stačí ověřit, že souhlasí obojí.
  await expect(page.getByText('199 Kč/měs').first()).toBeVisible()
  // 199 bez DPH → 241 s DPH (21 %). Zákazník vidí obojí, ceník je bez DPH.
  await expect(page.getByText('241 Kč/měs')).toBeVisible()

  await page.getByLabel('Sklad').click()
  await expect(page.getByText('348 Kč/měs')).toBeVisible() // 199 + 149

  // Roční ceník = 10 měsíců (2 zdarma), ne dvanáctinásobek měsíční ceny.
  await page.getByRole('button', { name: /Ročně/ }).click()
  await expect(page.getByText('3 480 Kč/rok')).toBeVisible()

  await expect(pay).toBeEnabled()
  await pay.click()

  expect(lastCheckoutBody).toEqual({ items: ['pos', 'inventory'], period: 'yearly' })
})

test('během zkušební doby stránka řekne, že se platí až po jejím konci', async ({ page }) => {
  await seedApiSession(page)
  await routeApp(page)
  await page.goto('/app/predplatne')

  await page.getByLabel('Pokladna').click()
  await expect(page.getByText(/máte vše zdarma/)).toBeVisible()
  await expect(page.getByText(/první\s+platba proběhne až po tomto datu/)).toBeVisible()
})

test('návrat z platby netvrdí, že je zaplaceno', async ({ page }) => {
  await seedApiSession(page)
  await routeApp(page)
  await page.goto('/app/predplatne?nakup=dokonceno')

  await expect(page.getByText('Platbu teď ověřujeme.')).toBeVisible()
  await expect(page.getByText(/Zaplaceno|Aktivováno/)).toHaveCount(0)
})
