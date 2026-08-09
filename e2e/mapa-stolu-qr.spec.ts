import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

function paged<T>(items: T[]) {
  return { items, total: items.length, page: 1, pageSize: 200 }
}

const company = {
  id: 'c_e2e',
  name: 'E2E Bistro',
  ico: '12345678',
  dic: null,
  email: 'e2e@vystaveno.cz',
  phone: null,
  logoUrl: null,
  defaultDueDays: 14,
  currency: 'CZK',
  address: { street: 'Testovací 1', city: 'Praha', postalCode: '11000', country: 'CZ' },
  bankAccount: { accountNumber: '123456789/0100', iban: null, bic: null },
  publicSlug: 'e2e-bistro',
}

const floor = { id: 'floor-main', name: 'Sál', sortOrder: 0, locationId: null }

const table = {
  id: 'table-terrace-12',
  floorId: floor.id,
  name: 'Terasa 12',
  x: 48,
  y: 48,
  width: 120,
  height: 80,
  rotation: 0,
  seats: 4,
  shape: 'Rect',
}

async function seedApiMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
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
        modules: ['core', 'gastro', 'pos', 'stock', 'reporting'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

test('Mapa stolů vygeneruje QR odkaz pro konkrétní stůl a veřejný slug', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged([table]) })

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/mapa-stolu')

  await expect(page.getByRole('heading', { name: 'Nastavení stolů' })).toBeVisible()
  await page.getByText('Terasa 12').click()
  await page.getByRole('button', { name: 'QR objednávka' }).click()

  await expect(page.getByRole('dialog', { name: 'QR objednávka ke stolu' })).toBeVisible()
  await expect(page.getByAltText('QR kód objednávky ke stolu')).toBeVisible()

  const expectedUrl = new URL('/objednavka/e2e-bistro', page.url())
  expectedUrl.searchParams.set('table', table.id)
  expectedUrl.searchParams.set('name', table.name)
  await expect(page.locator('#table-order-url')).toHaveValue(expectedUrl.toString())
})
