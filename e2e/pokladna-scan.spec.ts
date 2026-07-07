import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

function paged<T>(items: T[], pageSize = 100) {
  return { items, total: items.length, page: 1, pageSize }
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

const location = {
  id: 'loc-bar',
  name: 'Bar',
  address: 'Barová 1, Praha',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const kofola = {
  id: 'prod-kofola',
  name: 'Kofola 0,5l',
  sku: 'KOF05',
  ean: '8594001020304',
  salePrice: 49,
  vatRate: 21,
  purchasePrice: 18,
  minQuantity: 12,
  categoryId: null,
  allergens: [],
}

const voda = {
  id: 'prod-voda',
  name: 'Voda neperlivá',
  sku: 'VODA',
  ean: '8594001020305',
  salePrice: 35,
  vatRate: 21,
  purchasePrice: 9,
  minQuantity: 12,
  categoryId: null,
  allergens: [],
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
        user: { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Obsluha' },
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

async function routeApi(page: Page): Promise<void> {
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET') {
      if (path === '/company') return route.fulfill({ json: company })
      if (path === '/products') return route.fulfill({ json: paged([kofola, voda]) })
      if (path === '/locations') return route.fulfill({ json: paged([location]) })
      if (path === '/categories') return route.fulfill({ json: paged([]) })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('obsluha přidá produkt do pokladny skenem EAN', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)
  await routeApi(page)

  await page.goto('/app/pokladna')

  const scan = page.getByLabel('Sken / EAN')
  await expect(scan).toBeVisible()

  await scan.fill(kofola.ean)
  await scan.press('Enter')

  await expect(page.getByText(`${kofola.name} přidáno na účtenku.`)).toBeVisible()
  await expect(page.getByText(kofola.name).first()).toBeVisible()
  await expect(page.getByText('49,00 Kč × 1')).toBeVisible()

  await scan.fill(kofola.ean)
  await scan.press('Enter')

  await expect(page.getByText('49,00 Kč × 2')).toBeVisible()

  await scan.fill('123456789')
  await scan.press('Enter')

  await expect(page.getByText('EAN „123456789“ nenalezen v katalogu.')).toBeVisible()
})

test('obsluha najde produkt na pokladně podle názvu, SKU nebo EAN', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)
  await routeApi(page)

  await page.goto('/app/pokladna')

  const search = page.getByLabel('Hledat produkt')
  await expect(search).toBeVisible()

  await search.fill('kof')
  await expect(page.getByRole('button', { name: /Kofola 0,5l/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Voda neperlivá/ })).toHaveCount(0)

  await search.fill('VODA')
  await expect(page.getByRole('button', { name: /Voda neperlivá/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Kofola 0,5l/ })).toHaveCount(0)

  await search.fill(voda.ean)
  await expect(page.getByRole('button', { name: /Voda neperlivá/ })).toBeVisible()

  await search.fill('xyz-neexistuje')
  await expect(page.getByText('Žádný produkt neodpovídá hledání.')).toBeVisible()
})
