import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

const company = {
  id: 'c_e2e',
  name: 'E2E Bistro',
  ico: '12345678',
  currency: 'CZK',
}

const locations = [
  { id: 'loc-bar', name: 'Bar', address: null, isActive: true },
  { id: 'loc-kitchen', name: 'Kuchyně', address: null, isActive: true },
]

const products = [
  {
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
  },
  {
    id: 'prod-coffee',
    name: 'Káva',
    sku: 'COFFEE',
    ean: null,
    salePrice: 59,
    vatRate: 12,
    purchasePrice: 8,
    minQuantity: 20,
    categoryId: null,
    allergens: [],
  },
]

const targetMovement = {
  id: 'move-target',
  productId: 'prod-rum',
  locationId: 'loc-bar',
  type: 'Receipt',
  quantity: 3.5,
  quantityAfter: 8,
  note: '=HYPERLINK("https://example.test")',
  relatedSaleId: null,
  relatedStocktakeId: null,
  relatedPurchaseReceiptId: 'receipt-1',
  relatedProductionBatchId: null,
  relatedJobId: null,
  createdAt: '2026-07-14T10:00:00Z',
  productName: 'Rum 0,04l',
  productSku: 'RUM04',
  locationName: 'Bar',
  createdBy: 'user-1',
  lotAllocations: [
    {
      stockLotId: 'lot-rum',
      lotNumber: 'RUM-JUL',
      expiresOn: '2026-07-31',
      quantity: 3.5,
    },
  ],
}

const movements = [
  targetMovement,
  ...Array.from({ length: 101 }, (_, index) => ({
    ...targetMovement,
    id: `move-${String(index + 1).padStart(3, '0')}`,
    productId: 'prod-coffee',
    type: 'Sale',
    quantity: -1,
    quantityAfter: 100 - index,
    note: null,
    relatedPurchaseReceiptId: null,
    relatedSaleId: `sale-${index + 1}`,
    productName: 'Káva',
    productSku: 'COFFEE',
    createdAt: `2026-07-${String(13 - (index % 12)).padStart(2, '0')}T09:00:00Z`,
  })),
]

function paged<T>(items: T[], page: number, pageSize: number) {
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
  }
}

async function seedApiMode(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-07-14T12:00:00+02:00') })
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

async function routeApp(page: Page, movementRequests: string[]): Promise<void> {
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') {
      return route.fulfill({
        json: { items: products, total: products.length, page: 1, pageSize: 200 },
      })
    }
    if (method === 'GET' && path === '/locations') {
      return route.fulfill({
        json: { items: locations, total: locations.length, page: 1, pageSize: 100 },
      })
    }
    if (method === 'GET' && path === '/inventory/stock-levels') {
      return route.fulfill({
        json: {
          items: products.map((product) => ({
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: 8,
            locationId: null,
          })),
          total: products.length,
          page: 1,
          pageSize: 200,
        },
      })
    }
    if (method === 'GET' && path === '/inventory/movement-filters') {
      return route.fulfill({
        json: {
          products: [
            ...products.map((product) => ({
              id: product.id,
              name: product.name,
              sku: product.sku,
              isArchived: false,
            })),
            { id: 'prod-archive', name: 'Staré zboží', sku: 'OLD', isArchived: true },
          ],
          locations: [
            ...locations.map((location) => ({
              id: location.id,
              name: location.name,
              isArchived: false,
            })),
            { id: 'loc-archive', name: 'Zavřená provozovna', isArchived: true },
          ],
          lots: [
            {
              id: 'lot-rum',
              productId: 'prod-rum',
              lotNumber: 'RUM-JUL',
              expiresOn: '2026-07-31',
            },
          ],
        },
      })
    }
    if (method === 'GET' && path === '/inventory/movements') {
      movementRequests.push(url.search)
      let filtered = [...movements]
      const productId = url.searchParams.get('productId')
      const type = url.searchParams.get('type')
      const locationId = url.searchParams.get('locationId')
      const stockLotId = url.searchParams.get('stockLotId')
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      if (productId) filtered = filtered.filter((movement) => movement.productId === productId)
      if (type) filtered = filtered.filter((movement) => movement.type === type)
      if (locationId) filtered = filtered.filter((movement) => movement.locationId === locationId)
      if (stockLotId) {
        filtered = filtered.filter((movement) =>
          movement.lotAllocations?.some((allocation) => allocation.stockLotId === stockLotId),
        )
      }
      if (from) filtered = filtered.filter((movement) => movement.createdAt.slice(0, 10) >= from)
      if (to) filtered = filtered.filter((movement) => movement.createdAt.slice(0, 10) <= to)
      filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      const requestedPage = Number(url.searchParams.get('page') ?? 1)
      const pageSize = Number(url.searchParams.get('pageSize') ?? 100)
      return route.fulfill({ json: paged(filtered, requestedPage, pageSize) })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

async function openLedger(page: Page, movementRequests: string[]): Promise<void> {
  await seedApiMode(page)
  await dismissCookies(page)
  await routeApp(page, movementRequests)
  await page.goto('/app/zasoby')
  await page.getByRole('button', { name: 'Pohyby' }).click()
  await expect(page.getByText('102 pohybů')).toBeVisible()
}

test('skladová karta načte všechny stránky, filtruje a exportuje přesně vybraný pohyb', async ({
  page,
}) => {
  const movementRequests: string[] = []
  await openLedger(page, movementRequests)
  expect(movementRequests.some((query) => query.includes('page=2'))).toBe(false)

  const firstDesktopRow = page.locator('table tbody tr').first().locator('td')
  await expect(firstDesktopRow.nth(1)).toContainText('Rum 0,04l')
  await expect(firstDesktopRow.nth(2)).toHaveText('Bar')
  await expect(firstDesktopRow.nth(3)).toHaveText('Příjem')
  await expect(firstDesktopRow.nth(4)).toContainText('Nákupní příjemka')
  await expect(firstDesktopRow.nth(5)).toContainText('RUM-JUL')

  await page.getByLabel('Produkt', { exact: true }).click()
  await expect(page.getByRole('option', { name: 'Staré zboží · OLD (archiv)' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByLabel('Pobočka', { exact: true }).click()
  await expect(page.getByRole('option', { name: 'Zavřená provozovna (archiv)' })).toBeVisible()
  await page.keyboard.press('Escape')

  const completeDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  await completeDownloadPromise
  expect(movementRequests.some((query) => query.includes('page=2'))).toBe(true)

  await page.getByLabel('Produkt', { exact: true }).click()
  await page.getByRole('option', { name: /Rum 0,04l/ }).click()
  await page.getByLabel('Šarže').click()
  await page.getByRole('option', { name: /RUM-JUL/ }).click()
  await page.getByLabel('Produkt', { exact: true }).click()
  await page.getByRole('option', { name: /Káva/ }).click()
  await expect(page.getByLabel('Šarže')).toContainText('Všechny šarže')
  await page.getByLabel('Produkt', { exact: true }).click()
  await page.getByRole('option', { name: /Rum 0,04l/ }).click()
  await page.getByLabel('Šarže').click()
  await page.getByRole('option', { name: /RUM-JUL/ }).click()
  await page.getByLabel('Typ pohybu').click()
  await page.getByRole('option', { name: 'Příjem', exact: true }).click()
  await page.getByLabel('Pobočka', { exact: true }).click()
  await page.getByRole('option', { name: 'Bar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  await expect(page.getByText(/Filtry byly změněny/)).toBeVisible()
  await page.getByRole('button', { name: 'Použít filtry' }).click()

  await expect(page.getByText('1 pohybů')).toBeVisible()
  await expect(page.getByText('Rum 0,04l').first()).toBeVisible()
  await expect(page.getByText('receipt-1').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
  expect(movementRequests.at(-1)).toContain('productId=prod-rum')
  expect(movementRequests.at(-1)).toContain('type=Receipt')
  expect(movementRequests.at(-1)).toContain('locationId=loc-bar')
  expect(movementRequests.at(-1)).toContain('stockLotId=lot-rum')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('skladove-pohyby-2026-07-01_2026-07-14.csv')
  const path = await download.path()
  expect(path).toBeTruthy()
  const csv = await readFile(path!, 'utf8')
  expect(csv).toContain('Datum a čas;Produkt;SKU;Pobočka;Typ pohybu')
  expect(csv).toContain(
    'Rum 0,04l;RUM04;Bar;Příjem;3,5;RUM-JUL;2026-07-31;3,5;lot-rum;8;Nákupní příjemka;receipt-1',
  )
  expect(csv).toContain(`'=HYPERLINK(""https://example.test"")`)
  expect(csv).not.toContain('move-001')
})

test('skladová karta je použitelná na 390 px bez horizontálního scrollu a axe blokérů', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openLedger(page, [])

  await expect(page.getByRole('heading', { name: 'Skladová karta a pohyby' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
})
