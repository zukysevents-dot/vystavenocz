import AxeBuilder from '@axe-core/playwright'
import type { Route } from '@playwright/test'
import { test, expect, type Page } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

const location = { id: 'loc-shop', name: 'Prodejna', address: null, isActive: true }
const products = [
  {
    id: 'prod-coffee',
    name: 'Káva',
    sku: 'COFFEE',
    ean: '8590000000011',
    salePrice: 59,
    vatRate: 12,
    purchasePrice: 8,
    minQuantity: 2,
    categoryId: null,
    allergens: [],
  },
  {
    id: 'prod-milk',
    name: 'Mléko',
    sku: 'MILK',
    ean: '8590000000028',
    salePrice: 39,
    vatRate: 12,
    purchasePrice: 20,
    minQuantity: 1,
    categoryId: null,
    allergens: [7],
  },
]

function paged<T>(items: T[], pageSize = 200) {
  return { items, total: items.length, page: 1, pageSize }
}

async function seedApiMode(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-07-15T12:00:00+02:00') })
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
        modules: ['core', 'stock', 'reporting'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

test('mobilní inventura obnoví slepý sken, přepočítá rozdíl a odešle stabilní retry klíč', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)
  const stocktakeBodies: Array<Record<string, unknown>> = []

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', name: 'E2E obchod', ico: '12345678' } })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged(products) })
    if (method === 'GET' && path === '/categories') return route.fulfill({ json: paged([], 100) })
    if (method === 'GET' && path === '/locations')
      return route.fulfill({ json: paged([location], 100) })
    if (method === 'GET' && path === '/inventory/stock-levels') {
      return route.fulfill({
        json: paged([
          {
            productId: 'prod-coffee',
            productName: 'Káva',
            productSku: 'COFFEE',
            quantity: 5,
            reservedQuantity: 0,
            restrictedQuantity: 0,
            availableQuantity: 5,
            locationId: location.id,
          },
          {
            productId: 'prod-milk',
            productName: 'Mléko',
            productSku: 'MILK',
            quantity: 3,
            reservedQuantity: 0,
            restrictedQuantity: 0,
            availableQuantity: 3,
            locationId: location.id,
          },
        ]),
      })
    }
    if (method === 'POST' && path === '/inventory/stocktake') {
      const body = request.postDataJSON() as Record<string, unknown>
      stocktakeBodies.push(body)
      return route.fulfill({
        status: 201,
        json: {
          id: 'stocktake-1',
          locationId: location.id,
          note: 'Inventura',
          createdAt: '2026-07-15T10:15:00Z',
          idempotencyKey: body.idempotencyKey,
          items: [
            { productId: 'prod-coffee', systemQuantity: 5, countedQuantity: 4, difference: -1 },
            { productId: 'prod-milk', systemQuantity: 3, countedQuantity: 3, difference: 0 },
          ],
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/zasoby')
  await page.getByRole('button', { name: 'Inventura' }).click()
  await expect(page.getByRole('heading', { name: 'Nová inventura' })).toBeVisible()
  await expect(page.getByText('Vybráno 2 položek')).toBeVisible()
  await page.getByRole('button', { name: 'Zahájit počítání' }).click()
  await expect(page.getByRole('heading', { name: 'Inventura' })).toBeVisible()
  await expect(page.getByText('Slepé počítání zapnuto')).toBeVisible()
  await expect(page.getByText('•••').first()).toBeVisible()

  const scan = page.getByLabel('Načíst čárový kód')
  await scan.fill('8590000000011')
  await scan.press('Enter')
  await page.getByLabel('První počet: Káva').fill('4')
  await scan.fill('8590000000028')
  await scan.press('Enter')
  await page.getByLabel('První počet: Mléko').fill('3')
  await expect(page.getByText('2 / 2')).toBeVisible()

  const draftBeforeClose = await page.evaluate(() =>
    Object.entries(localStorage).find(([key]) => key.startsWith('vystaveno:stocktake-draft:v1')),
  )
  expect(draftBeforeClose?.[1]).toContain('prod-coffee')
  await page.getByRole('button', { name: 'Zavřít' }).first().click()
  await page.getByRole('button', { name: 'Inventura' }).click()
  await expect(page.getByText('2 / 2')).toBeVisible()

  await page.getByRole('button', { name: 'Zkontrolovat rozdíly' }).click()
  await expect(page.getByText('2. kontrolní přepočet')).toBeVisible()
  const recountDialog = page.getByRole('dialog').filter({ hasText: '2. kontrolní přepočet' })
  await expect(recountDialog.getByText('Mléko')).toHaveCount(0)
  await expect(recountDialog.getByText('5', { exact: true })).toBeVisible()
  await page.getByLabel('Kontrolní počet: Káva').fill('4')
  await page.getByRole('button', { name: 'Uložit inventuru' }).click()

  await expect.poll(() => stocktakeBodies.length).toBe(1)
  expect(stocktakeBodies[0]).toMatchObject({
    locationId: location.id,
    note: 'Inventura',
    items: [
      { productId: 'prod-coffee', countedQuantity: 4 },
      { productId: 'prod-milk', countedQuantity: 3 },
    ],
  })
  expect(stocktakeBodies[0].idempotencyKey).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )

  await expect(page.getByRole('heading', { name: 'Inventurní protokol' })).toBeVisible()
  await expect(page.getByText('-1', { exact: true })).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'CSV' }).click()
  expect((await downloadPromise).suggestedFilename()).toContain('inventurni-protokol-2026-07-15')

  const draftAfterSubmit = await page.evaluate(() =>
    Object.keys(localStorage).some((key) => key.startsWith('vystaveno:stocktake-draft:v1')),
  )
  expect(draftAfterSubmit).toBe(false)
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1)

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
