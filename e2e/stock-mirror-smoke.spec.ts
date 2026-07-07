import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

function paged<T>(items: T[], pageSize = 200) {
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

const product = {
  id: 'prod-rum',
  name: 'Rum 0,04l',
  sku: 'RUM04',
  ean: null,
  salePrice: 89,
  vatRate: 21,
  purchasePrice: 120,
  minQuantity: 3,
  categoryId: null,
  allergens: [],
}

const mirrorItem = {
  productId: product.id,
  productName: product.name,
  productSku: product.sku,
  openingQuantity: 10,
  receivedQuantity: 4,
  soldQuantity: 3,
  stornoQuantity: 1,
  issuedQuantity: 3,
  correctionQuantity: -1,
  stocktakingQuantity: -1,
  expectedQuantity: 9,
  actualQuantity: 7,
  varianceQuantity: -2,
  unitCost: 120,
  varianceValue: -240,
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

test('skladové zrcadlo ukazuje stav má být, realitu a rozdíl s vysvětlením', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  const mirrorRequests: Array<Record<string, string | null>> = []

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product]) })
    if (method === 'GET' && path === '/locations') {
      return route.fulfill({ json: paged([location], 100) })
    }
    if (method === 'GET' && path === '/inventory/stock-levels') {
      return route.fulfill({
        json: paged([
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: 7,
            locationId: location.id,
          },
        ]),
      })
    }
    if (method === 'GET' && path === '/inventory/stock-mirror') {
      mirrorRequests.push({
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        search: url.searchParams.get('search'),
        locationId: url.searchParams.get('locationId'),
      })
      return route.fulfill({
        json: {
          from: url.searchParams.get('from') ?? '2026-07-07',
          to: url.searchParams.get('to') ?? '2026-07-07',
          items: [mirrorItem],
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/zasoby')
  await page.getByRole('button', { name: /Zrcadlo/ }).click()
  await expect(page.getByText('Rum 0,04l')).toBeVisible()

  await page.getByLabel('Od').fill('2026-07-01')
  await page.getByLabel('Do').fill('2026-07-07')
  await page.getByLabel('Položka').fill('rum')
  await page.getByRole('button', { name: 'Načíst zrcadlo' }).click()

  await expect
    .poll(() => mirrorRequests.at(-1))
    .toMatchObject({
      from: '2026-07-01',
      to: '2026-07-07',
      search: 'rum',
      locationId: null,
    })

  await expect(page.getByText('Stav má být')).toBeVisible()
  await expect(page.getByText('Realita')).toBeVisible()
  await expect(page.getByText('Rozdíl', { exact: true })).toBeVisible()
  await expect(page.getByText('9').first()).toBeVisible()
  await expect(page.getByText('7').first()).toBeVisible()
  await expect(page.getByText('-2').first()).toBeVisible()
  await expect(page.getByText('-240,00 Kč', { exact: true })).toBeVisible()
  await expect(page.getByText('kor. -1 / inv. -1')).toBeVisible()
  await expect(page.getByText('náklad 120,00 Kč/ks')).toBeVisible()

  await page.getByRole('button', { name: /Detail zrcadla/ }).click()
  await expect(page.getByText('Výpočet stavu má být')).toBeVisible()
  await expect(page.getByText('Vysvětlení rozdílu')).toBeVisible()
  await expect(
    page.getByText(
      'Rozdíl vzniká z: korekce -1 + inventura -1. Prodeje, výdeje a přesuny už jsou započtené ve stavu „má být".',
    ),
  ).toBeVisible()
})
