import AxeBuilder from '@axe-core/playwright'
import type { Route } from '@playwright/test'
import { test, expect, type Page } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

const product = {
  id: 'prod-coffee',
  name: 'Výběrová káva',
  sku: 'COFFEE',
  ean: null,
  salePrice: 249,
  vatRate: 12,
  purchasePrice: 140,
  minQuantity: 2,
  categoryId: null,
  allergens: [],
  lotTrackingEnabled: false,
}

const location = { id: 'loc-shop', name: 'Prodejna', address: null, isActive: true }

function paged<T>(items: T[], pageSize = 100) {
  return { items, total: items.length, page: 1, pageSize }
}

async function seedApiMode(page: Page): Promise<void> {
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
        modules: ['core', 'stock'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

test('rezervace zásoby funguje na mobilu od vytvoření po vyskladnění', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)

  const createBodies: unknown[] = []
  const fulfillBodies: unknown[] = []
  let reservations = [
    {
      id: 'res-existing',
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      locationId: location.id,
      locationName: location.name,
      quantity: 3,
      reservedFor: 'Zakázka Z-10',
      note: 'Vyzvednutí odpoledne',
      status: 'Active',
      createdAt: '2026-07-14T08:00:00Z',
      releasedAt: null,
      fulfilledAt: null,
      resolutionNote: null,
    },
  ]

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', name: 'E2E obchod', ico: '12345678' } })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product], 200) })
    if (method === 'GET' && path === '/locations') return route.fulfill({ json: paged([location]) })
    if (method === 'GET' && path === '/inventory/stock-levels') {
      return route.fulfill({
        json: paged([
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            locationId: location.id,
            quantity: 10,
            reservedQuantity: 3,
            availableQuantity: 7,
          },
        ]),
      })
    }
    if (method === 'GET' && path === '/inventory/stock-reservations')
      return route.fulfill({ json: paged(reservations) })
    if (method === 'POST' && path === '/inventory/stock-reservations') {
      const body = request.postDataJSON()
      createBodies.push(body)
      const created = {
        id: 'res-created',
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        locationId: location.id,
        locationName: location.name,
        quantity: body.quantity,
        reservedFor: body.reservedFor,
        note: body.note,
        status: 'Active',
        createdAt: '2026-07-14T10:00:00Z',
        releasedAt: null,
        fulfilledAt: null,
        resolutionNote: null,
      }
      reservations = [created, ...reservations]
      return route.fulfill({ status: 201, json: created })
    }
    if (method === 'POST' && path === '/inventory/stock-reservations/res-created/fulfill') {
      fulfillBodies.push(request.postDataJSON())
      const current = reservations.find((item) => item.id === 'res-created')!
      reservations = reservations.filter((item) => item.id !== 'res-created')
      return route.fulfill({ json: { ...current, status: 'Fulfilled', fulfilledAt: '2026-07-14T10:10:00Z' } })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/zasoby')
  await expect(page.getByText('Rezervováno').first()).toBeVisible()
  await expect(page.getByText('7', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Rezervace' }).click()
  await expect(page.getByRole('heading', { name: 'Rezervace zásob' })).toBeVisible()
  await expect(page.getByText('Zakázka Z-10')).toBeVisible()

  await page.getByRole('button', { name: 'Nová rezervace' }).click()
  await page.getByLabel('Množství').fill('2.5')
  await page.getByLabel('Pro koho nebo pro co').fill('Objednávka O-25')
  await page.getByLabel('Poznámka').fill('Připravit do boxu')
  await page.getByRole('button', { name: 'Rezervovat', exact: true }).click()

  await expect.poll(() => createBodies.at(-1)).toMatchObject({
    productId: product.id,
    locationId: location.id,
    quantity: 2.5,
    reservedFor: 'Objednávka O-25',
    note: 'Připravit do boxu',
  })
  await expect(page.getByText('Objednávka O-25')).toBeVisible()

  const createdCard = page.locator('article').filter({ hasText: 'Objednávka O-25' })
  await createdCard.getByRole('button', { name: 'Vyskladnit' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Poznámka k vyřízení').fill('Předáno zákazníkovi')
  await dialog.getByRole('button', { name: 'Vyskladnit', exact: true }).click()
  await expect.poll(() => fulfillBodies.at(-1)).toEqual({ note: 'Předáno zákazníkovi' })
  await expect(page.getByText('Objednávka O-25')).toHaveCount(0)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const results = await new AxeBuilder({ page })
    .exclude('[data-sonner-toaster]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? '')),
  ).toEqual([])
})
