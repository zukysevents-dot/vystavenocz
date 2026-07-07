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
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product]) })
    if (method === 'GET' && path === `/products/${product.id}/modifier-groups`)
      return route.fulfill({ json: [] })
    if (method === 'GET' && path === '/categories') {
      return route.fulfill({ json: paged([category]) })
    }
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged(tables) })
    if (method === 'GET' && path === '/orders') return route.fulfill({ json: paged([]) })

    if (method === 'POST' && path === '/orders') {
      return route.fulfill({ json: emptyOrder() })
    }
    if (method === 'POST' && path === '/orders/order-1/items') {
      return route.fulfill({ json: orderWithEspresso('New') })
    }
    if (method === 'POST' && path === '/orders/order-1/send-to-kitchen') {
      return route.fulfill({ json: orderWithEspresso('Sent') })
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

  await expect(page.getByRole('heading', { name: 'Restaurace' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Stůl 1/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Terasa 12/ })).toBeVisible()
  await expect(page.locator('.lg\\:block').filter({ hasText: 'Stůl 1' })).toBeHidden()

  await page.getByRole('button', { name: /Stůl 1/ }).click()
  await expect(page.getByRole('heading', { name: 'Účet — Stůl 1' })).toBeVisible()

  await page.getByRole('button', { name: /Espresso/ }).click()
  const waiterBar = page.locator('.fixed').filter({ hasText: 'Stůl 1' })
  await expect(waiterBar.getByText('1 položka · 59,00 Kč')).toBeVisible()
  await expect(waiterBar.getByRole('button', { name: /^Odeslat$/ })).toBeVisible()
  await expect(waiterBar.getByRole('button', { name: /^Zaplatit$/ })).toBeVisible()

  await waiterBar.getByRole('button', { name: /^Odeslat$/ }).click()
  await expect(page.getByText(/Objednávka odeslána/)).toBeVisible()
})
