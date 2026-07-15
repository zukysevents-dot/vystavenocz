import AxeBuilder from '@axe-core/playwright'
import type { Route } from '@playwright/test'
import { test, expect, type Page } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

const product = {
  id: 'prod-yogurt',
  name: 'Farmářský jogurt',
  sku: 'YOGURT',
  ean: null,
  salePrice: 49,
  vatRate: 12,
  purchasePrice: 21,
  minQuantity: 2,
  categoryId: null,
  allergens: [7],
  lotTrackingEnabled: true,
}

const location = {
  id: 'loc-shop',
  name: 'Prodejna',
  address: null,
  isActive: true,
}

const lots = [
  {
    id: 'lot-july',
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    locationId: location.id,
    locationName: location.name,
    lotNumber: 'JUL-2026',
    expiresOn: '2026-07-20',
    daysToExpiry: 6,
    quantity: 4,
    isUnspecified: false,
    status: 'Active',
  },
  {
    id: 'lot-august',
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    locationId: location.id,
    locationName: location.name,
    lotNumber: 'AUG-2026',
    expiresOn: '2026-08-20',
    daysToExpiry: 37,
    quantity: 6,
    isUnspecified: false,
    status: 'Active',
  },
]

function paged<T>(items: T[], pageSize = 100) {
  return { items, total: items.length, page: 1, pageSize }
}

async function seedApiMode(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-07-14T12:00:00+02:00') })
  await dismissCookies(page)
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

test('šarže lze na mobilu zobrazit, přesně odepsat a přijmout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)

  const issueBodies: unknown[] = []
  const receiptBodies: unknown[] = []
  const lotQueries: string[] = []
  const statusBodies: unknown[] = []
  let julyStatus = 'Active'

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') {
      return route.fulfill({ json: { id: 'c_e2e', name: 'E2E obchod', ico: '12345678' } })
    }
    if (method === 'GET' && path === '/products')
      return route.fulfill({ json: paged([product], 200) })
    if (method === 'GET' && path === '/locations') return route.fulfill({ json: paged([location]) })
    if (method === 'GET' && path === '/inventory/stock-levels') {
      return route.fulfill({
        json: paged([
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: 10,
            locationId: location.id,
          },
        ]),
      })
    }
    if (method === 'GET' && path === '/inventory/stock-lots') {
      lotQueries.push(url.search)
      return route.fulfill({
        json: paged(
          lots.map((lot) => (lot.id === 'lot-july' ? { ...lot, status: julyStatus } : lot)),
        ),
      })
    }
    if (method === 'POST' && path === '/inventory/stock-lots/lot-july/status') {
      const body = request.postDataJSON()
      statusBodies.push(body)
      julyStatus = body.status
      return route.fulfill({ json: { ...lots[0], status: julyStatus } })
    }
    if (method === 'GET' && path === '/inventory/stock-lots/lot-july/status-history') {
      return route.fulfill({
        json: [
          {
            id: 'status-event-1',
            fromStatus: 'Active',
            toStatus: 'Quarantined',
            reason: 'Poškozené víčko',
            changedBy: 'u_e2e',
            changedAt: '2026-07-14T12:15:00Z',
          },
        ],
      })
    }
    if (method === 'POST' && path === '/inventory/issues') {
      issueBodies.push(request.postDataJSON())
      return route.fulfill({
        json: {
          id: 'move-expiry',
          productId: product.id,
          locationId: location.id,
          type: 'Expiration',
          quantity: -2,
          quantityAfter: 8,
          note: 'Expirace šarže JUL-2026',
          createdAt: '2026-07-14T12:00:00Z',
        },
      })
    }
    if (method === 'POST' && path === '/inventory/receipts') {
      receiptBodies.push(request.postDataJSON())
      return route.fulfill({ json: {} })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/zasoby')
  await page.getByRole('button', { name: 'Šarže' }).click()

  await expect(page.getByRole('heading', { name: 'Šarže a expirace' })).toBeVisible()
  await expect(page.getByText('JUL-2026')).toBeVisible()
  await expect(page.getByText('6 dní do expirace')).toBeVisible()
  expect(lotQueries.at(-1)).toContain('positiveOnly=true')

  await page.getByRole('button', { name: 'Odepsat expiraci' }).first().click()
  await page.getByLabel('Množství').fill('2')
  await page.getByRole('button', { name: 'Odepsat', exact: true }).click()

  await expect
    .poll(() => issueBodies.at(-1))
    .toMatchObject({
      productId: product.id,
      quantity: 2,
      type: 'Expiration',
      locationId: location.id,
      stockLotId: 'lot-july',
    })

  const julyCard = page.locator('article').filter({ hasText: 'JUL-2026' })
  await julyCard.getByRole('button', { name: 'Změnit stav' }).click()
  await page.getByLabel('Důvod').fill('Poškozené víčko')
  await page.getByRole('button', { name: 'Uložit stav' }).click()
  await expect
    .poll(() => statusBodies.at(-1))
    .toEqual({
      status: 'Quarantined',
      reason: 'Poškozené víčko',
    })
  await expect(julyCard.getByText('Karanténa')).toBeVisible()
  await julyCard.getByRole('button', { name: 'Historie' }).click()
  await expect(page.getByRole('heading', { name: 'Historie stavu šarže' })).toBeVisible()
  await expect(page.getByText('Poškozené víčko')).toBeVisible()
  await page.getByRole('button', { name: 'Zavřít' }).click()

  await page.getByRole('button', { name: 'Stav zásob' }).click()
  await page.getByTitle('Příjem').click()
  await page.getByLabel('Množství').fill('3')
  await page.getByLabel('Číslo šarže').fill('SEP-2026')
  await page.getByLabel('Expirace').fill('2026-09-30')
  await page.getByRole('button', { name: 'Uložit', exact: true }).click()

  await expect
    .poll(() => receiptBodies.at(-1))
    .toMatchObject({
      productId: product.id,
      quantity: 3,
      locationId: location.id,
      lotNumber: 'SEP-2026',
      expiresOn: '2026-09-30',
    })

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)

  const results = await new AxeBuilder({ page })
    .exclude('[data-sonner-toaster]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
})
