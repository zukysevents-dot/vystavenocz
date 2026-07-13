import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

function paged<T>(items: T[]) {
  return { items, total: items.length, page: 1, pageSize: 200 }
}

const product = {
  id: 'prod-espresso',
  name: 'Espresso',
  sku: 'ESP',
  ean: null,
  salePrice: 59,
  vatRate: 21,
  purchasePrice: 20,
  minQuantity: 0,
  categoryId: 'cat-coffee',
}

const floor = { id: 'floor-main', name: 'Sál', sortOrder: 0, locationId: null }

const tables = [
  {
    id: 'table-1',
    floorId: floor.id,
    name: 'Stůl 1',
    x: 32,
    y: 32,
    width: 96,
    height: 72,
    rotation: 0,
    seats: 4,
    shape: 'Rect',
  },
  {
    id: 'table-2',
    floorId: floor.id,
    name: 'Terasa 12',
    x: 780,
    y: 420,
    width: 110,
    height: 72,
    rotation: 0,
    seats: 4,
    shape: 'Rect',
  },
]

const category = {
  id: 'cat-coffee',
  name: 'Káva',
  color: null,
  sortOrder: 0,
  parentId: null,
  kitchenSection: 'Bar',
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
  publicSlug: null,
}

function emptyOrder() {
  return {
    id: 'order-1',
    tableId: 'table-1',
    locationId: null,
    status: 'Open',
    saleId: null,
    openedAt: '2026-07-06T10:00:00.000Z',
    closedAt: null,
    discountPercent: 0,
    tipAmount: 0,
    totalNet: 0,
    totalVat: 0,
    total: 0,
    splitGroups: [],
    items: [],
  }
}

function orderWithEspresso(status: 'New' | 'Sent' = 'New') {
  return {
    ...emptyOrder(),
    totalNet: 48.76,
    totalVat: 10.24,
    total: 59,
    items: [
      {
        id: 'item-1',
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.salePrice,
        vatRate: product.vatRate,
        course: null,
        note: null,
        kitchenSection: 'Bar',
        kitchenStatus: status,
        lineTotal: product.salePrice,
      },
    ],
  }
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
      'vystaveno.company.v1',
      JSON.stringify({
        id: 'c_e2e',
        companyName: 'E2E Bistro',
        fullName: null,
        email: 'e2e@vystaveno.cz',
        ico: '12345678',
        dic: null,
        vatMode: 'non_payer',
        street: 'Testovací 1',
        city: 'Praha',
        zip: '11000',
        country: 'CZ',
        bankAccount: '123456789/0100',
        iban: null,
        swift: null,
        logoUrl: null,
        invoiceColor: null,
        invoiceNumberPrefix: 'FA',
        invoiceNumberFormat: '{prefix}-{year}-{seq}',
        nextInvoiceSeq: 1,
        defaultPaymentDays: 14,
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

async function mockRestaurantApi(page: Page): Promise<void> {
  let currentOrder = emptyOrder()
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product]) })
    if (method === 'GET' && path === `/products/${product.id}/variants`)
      return route.fulfill({ json: [] })
    if (method === 'GET' && path === `/products/${product.id}/modifier-groups`)
      return route.fulfill({ json: [] })
    if (method === 'GET' && path === '/categories') {
      return route.fulfill({ json: paged([category]) })
    }
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged(tables) })
    if (method === 'GET' && path === '/orders') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === '/orders/order-1') return route.fulfill({ json: currentOrder })

    if (method === 'POST' && path === '/orders') {
      currentOrder = emptyOrder()
      return route.fulfill({ json: currentOrder })
    }
    if (method === 'POST' && path === '/orders/order-1/items') {
      currentOrder = orderWithEspresso('New')
      return route.fulfill({ json: currentOrder })
    }
    if (method === 'POST' && path === '/orders/order-1/send-to-kitchen') {
      currentOrder = orderWithEspresso('Sent')
      return route.fulfill({ json: currentOrder })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('mobilní obsluha vybere stůl ze seznamu a má hlavní akce pořád po ruce', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)
  await mockRestaurantApi(page)
  await dismissCookies(page)

  await page.goto('/app/restaurace')

  await expect(page.getByTestId('restaurant-page')).toBeVisible()
  await expect(page.getByTestId('restaurant-table-list')).toBeVisible()
  await expect(page.getByTestId('restaurant-table-list-table-1')).toBeVisible()
  await expect(page.getByTestId('restaurant-table-list-table-2')).toBeVisible()
  await expect(page.getByTestId('restaurant-floor-map')).toBeHidden()

  await page.getByTestId('restaurant-table-list-table-1').click()
  await expect(page.getByTestId('restaurant-order-view')).toBeVisible()

  await page.getByTestId('restaurant-product-prod-espresso').click()
  const waiterBar = page.getByTestId('restaurant-mobile-actions')
  await expect(page.getByTestId('restaurant-total-mobile')).toContainText('59,00 Kč')
  await expect(waiterBar.getByRole('button', { name: /^Odeslat$/ })).toBeVisible()
  await expect(waiterBar.getByRole('button', { name: /^Zaplatit$/ })).toBeVisible()

  await waiterBar.getByRole('button', { name: /^Odeslat$/ }).click()
  await expect(page.getByText(/Objednávka odeslána/)).toBeVisible()
})

test('tablet na šířku používá plný cockpit bez boční navigace a s dotykovými cíli', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await seedApiMode(page)
  await mockRestaurantApi(page)
  await dismissCookies(page)

  await page.goto('/app/restaurace')
  await expect(page.locator('[data-layout="operational"]')).toBeVisible()
  await expect(page.getByTestId('restaurant-floor-map')).toBeVisible()
  await expect(page.locator('aside').filter({ hasText: 'Fakturace' })).toHaveCount(0)

  await page.getByTestId('restaurant-table-map-table-1').click()
  const productBrowser = page.getByTestId('restaurant-product-browser')
  const orderPanel = page.getByTestId('restaurant-order-panel')
  await expect(productBrowser).toBeVisible()
  await expect(orderPanel).toBeVisible()

  const productBox = await productBrowser.boundingBox()
  const orderBox = await orderPanel.boundingBox()
  expect(productBox).not.toBeNull()
  expect(orderBox).not.toBeNull()
  expect(productBox!.x + productBox!.width).toBeLessThanOrEqual(orderBox!.x + 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024)

  await page.getByTestId('restaurant-product-search').fill('ESP')
  await expect(page.getByTestId('restaurant-product-prod-espresso')).toBeVisible()

  const undersized = await page.locator('[data-pos-target]').evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        return (
          style.display !== 'none' &&
          rect.width > 0 &&
          rect.height > 0 &&
          (rect.width < 48 || rect.height < 48)
        )
      })
      .map((element) => ({
        label: element.getAttribute('aria-label') ?? element.textContent?.trim(),
        rect: element.getBoundingClientRect().toJSON(),
      })),
  )
  expect(undersized).toEqual([])
})

test('tablet na výšku zůstává v přehledném mobilním režimu', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await seedApiMode(page)
  await mockRestaurantApi(page)
  await dismissCookies(page)

  await page.goto('/app/restaurace')
  await expect(page.getByTestId('restaurant-table-list')).toBeVisible()
  await expect(page.getByTestId('restaurant-floor-map')).toBeHidden()

  await page.getByTestId('restaurant-table-list-table-1').click()
  await expect(page.getByTestId('restaurant-product-browser')).toBeVisible()
  await expect(page.getByTestId('restaurant-order-panel')).toBeHidden()
  await expect(page.getByTestId('restaurant-mobile-actions')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768)
})
