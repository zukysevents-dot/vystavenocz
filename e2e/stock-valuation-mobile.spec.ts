import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import type { Route } from '@playwright/test'
import { test, expect, type Page } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

const products = [
  {
    id: 'prod-coffee',
    name: '=Výběrová káva',
    sku: 'COFFEE',
    ean: null,
    salePrice: 249,
    vatRate: 12,
    purchasePrice: 26,
    minQuantity: 2,
    categoryId: null,
    allergens: [],
    lotTrackingEnabled: false,
  },
  {
    id: 'prod-unknown',
    name: 'Dárkové balení',
    sku: 'GIFT',
    ean: null,
    salePrice: 99,
    vatRate: 21,
    purchasePrice: null,
    minQuantity: 0,
    categoryId: null,
    allergens: [],
    lotTrackingEnabled: false,
  },
]

const locations = [
  { id: 'loc-shop', name: 'Prodejna', address: null, isActive: true },
  { id: 'loc-stock', name: 'Centrální sklad', address: null, isActive: true },
]

const valuationItems = [
  {
    productId: 'prod-coffee',
    productName: '=Výběrová káva',
    productSku: 'COFFEE',
    unitCost: 26,
    costSource: 'CompanyPurchaseReceipts',
    isCostComplete: true,
    openingQuantity: 3,
    openingStockValue: 78,
    closingQuantity: 8,
    closingStockValue: 208,
    purchaseQuantity: 10,
    purchaseValue: 260,
    cogsQuantity: 2,
    cogsValue: 52,
    consumptionQuantity: 1,
    consumptionValue: 26,
    lossQuantity: 1,
    lossValue: 26,
    inventoryAdjustmentQuantity: -1,
    inventoryAdjustmentValue: -26,
  },
  {
    productId: 'prod-unknown',
    productName: 'Dárkové balení',
    productSku: 'GIFT',
    unitCost: null,
    costSource: 'Missing',
    isCostComplete: false,
    openingQuantity: 0,
    openingStockValue: null,
    closingQuantity: 2,
    closingStockValue: null,
    purchaseQuantity: 2,
    purchaseValue: null,
    cogsQuantity: 0,
    cogsValue: null,
    consumptionQuantity: 0,
    consumptionValue: null,
    lossQuantity: 0,
    lossValue: null,
    inventoryAdjustmentQuantity: 0,
    inventoryAdjustmentValue: null,
  },
]

function paged<T>(items: T[], page = 1, pageSize = 100) {
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize }
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

async function routeApi(page: Page, valuationRequests: string[]): Promise<void> {
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', name: 'E2E obchod', ico: '12345678', currency: 'CZK' } })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged(products, 1, 200) })
    if (method === 'GET' && path === '/locations') return route.fulfill({ json: paged(locations) })
    if (method === 'GET' && path === '/inventory/stock-levels') {
      return route.fulfill({
        json: paged(
          products.map((product) => ({
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            locationId: null,
            quantity: product.id === 'prod-coffee' ? 8 : 2,
            reservedQuantity: 0,
            availableQuantity: product.id === 'prod-coffee' ? 8 : 2,
          })),
        ),
      })
    }
    if (method === 'GET' && path === '/inventory/stock-valuation') {
      valuationRequests.push(url.search)
      const pageNumber = Number(url.searchParams.get('page') ?? 1)
      const pageSize = Number(url.searchParams.get('pageSize') ?? 25)
      return route.fulfill({
        json: {
          method: 'PeriodicWeightedAverage',
          from: url.searchParams.get('from') ?? '2026-07-01',
          to: url.searchParams.get('to') ?? '2026-07-14',
          locationId: url.searchParams.get('locationId'),
          currency: 'CZK',
          dataVersion: 'valuation-v1',
          summary: {
            openingStockValue: 78,
            closingStockValue: null,
            purchaseValue: null,
            cogsValue: 52,
            consumptionValue: 26,
            lossValue: 26,
            inventoryAdjustmentValue: -26,
            missingCostProductCount: 1,
            missingPurchaseCostProductCount: 1,
            isComplete: false,
          },
          products: paged(valuationItems, pageNumber, pageSize),
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('ocenění skladu je použitelné na mobilu a exportuje úplný kontrolní CSV', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)
  const valuationRequests: string[] = []
  await routeApi(page, valuationRequests)

  await page.goto('/app/zasoby')
  await page.getByRole('button', { name: 'Ocenění' }).click()

  await expect(page.getByRole('heading', { name: 'Ocenění skladu' })).toBeVisible()
  await expect(page.getByText('Výkaz není nákladově úplný')).toBeVisible()
  await expect(page.getByText('COGS z prodejů')).toBeVisible()
  await expect(page.getByText('52,00 Kč').first()).toBeVisible()
  await expect(page.getByText('=Výběrová káva')).toBeVisible()
  await expect(page.getByText('Chybí nákladová cena')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^oceneni-skladu-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/)
  const path = await download.path()
  const csv = await readFile(path!, 'utf8')
  expect(csv).toContain('Od;Do;Pobočka;Produkt;SKU;Metoda;Měna')
  expect(csv).toContain("'=Výběrová káva")
  expect(csv).toContain('CELKEM')
  expect(csv).toContain('Neúplné')
  expect(valuationRequests.filter((query) => query.includes('pageSize=100'))).toHaveLength(2)

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
