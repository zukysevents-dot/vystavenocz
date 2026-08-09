import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Koncept otevřený v editoru mohl mezitím někdo smazat (jiná záložka, druhý terminál).
// Server pak na PUT vrátí 404 a dřív každé další „Uložit koncept“ selhalo napořád —
// rozdělaná faktura se nedala uložit vůbec. Teď se uloží jako NOVÝ doklad (POST).

const API = '**/api/v1/**'
const MODULES = ['core', 'invoicing']
const DRAFT_ID = 'inv-smazany'
const CLIENT_ID = 'cli-1'

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
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, MODULES)
}

function draftResponse(id: string) {
  return {
    id,
    number: null,
    status: 'Draft',
    documentType: 'Invoice',
    clientId: CLIENT_ID,
    clientName: 'Acme s.r.o.',
    currency: 'CZK',
    isVatPayer: true,
    issueDate: null,
    dueDate: '2026-07-23',
    taxableSupplyDate: null,
    subtotal: 2000,
    vatTotal: 420,
    total: 2420,
    lines: [
      {
        id: 'line-1',
        description: 'Práce',
        unit: 'ks',
        quantity: 2,
        unitPrice: 1000,
        vatRate: 21,
        lineBase: 2000,
        lineVat: 420,
        lineTotal: 2420,
      },
    ],
  }
}

/** Cesty zapsané volání, ať test dokáže, že uložení šlo přes POST (nový doklad), ne přes PUT. */
async function routeApp(page: Page, calls: string[]): Promise<void> {
  await page.route(API, async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const method = route.request().method()
    calls.push(`${method} ${path}`)

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
        },
      })
    if (method === 'GET' && path === '/company/modules')
      return route.fulfill({ json: { modules: MODULES } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E s.r.o.', currency: 'CZK' } })
    if (method === 'GET' && path === '/clients')
      return route.fulfill({
        json: { items: [{ id: CLIENT_ID, name: 'Acme s.r.o.', defaultPaymentDays: 14 }], total: 1 },
      })
    if (method === 'GET' && path === '/invoices')
      return route.fulfill({ json: { items: [], total: 0 } })
    if (method === 'GET' && path === `/invoices/${DRAFT_ID}`)
      return route.fulfill({ json: draftResponse(DRAFT_ID) })

    // Doklad byl mezitím smazán → úprava už nemá co změnit.
    if (method === 'PUT' && path === `/invoices/${DRAFT_ID}`)
      return route.fulfill({ status: 404, json: { title: 'Faktura nenalezena.' } })

    // Záchranná cesta: uložení rozdělané faktury jako nového konceptu.
    if (method === 'POST' && path === '/invoices')
      return route.fulfill({ status: 201, json: draftResponse('inv-novy') })

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('smazaný koncept: „Uložit koncept“ rozdělanou fakturu zachrání jako nový doklad', async ({
  page,
}) => {
  // PUT na smazaný doklad schválně vrací 404 — prohlížeč to zaloguje jako network chybu.
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 404' })
  const calls: string[] = []
  await seedApiSession(page)
  await routeApp(page, calls)

  await page.goto(`/app/faktury/editor?id=${DRAFT_ID}`)
  await expect(page.getByRole('button', { name: 'Uložit koncept' })).toBeEnabled()

  await page.getByRole('button', { name: 'Uložit koncept' }).click()

  await expect(page.getByText('Koncept uložen.')).toBeVisible()
  expect(calls).toContain(`PUT /invoices/${DRAFT_ID}`)
  expect(calls).toContain('POST /invoices')
  // Doklad má nové id → další uložení míří na nový koncept, ne na smazaný.
  await expect(page).toHaveURL(/id=inv-novy/)
})
