import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

function paged<T>(items: T[], pageSize = 100) {
  return { items, total: items.length, page: 1, pageSize }
}

const company = {
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
  publicSlug: 'e2e-bistro',
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

const sale = {
  id: 'sale-1',
  soldAt: '2026-07-07T10:30:00.000Z',
  paymentMethod: 'Cash',
  status: 'Completed',
  locationId: null,
  employeeId: null,
  totalNet: 100,
  totalVat: 21,
  total: 121,
  discountTotal: 0,
  tipAmount: 0,
  cashReceived: 200,
  cashChange: 79,
  items: [
    {
      id: 'sale-item-1',
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: 121,
      vatRate: 21,
      lineNet: 100,
      lineVat: 21,
      lineTotal: 121,
      modifiers: [],
    },
  ],
}

function approval(id: string, summary: string, type: 'SaleStorno' | 'StockIssue' | 'Stocktake') {
  return {
    id,
    type,
    status: 'Pending',
    summary,
    estimatedValue: type === 'SaleStorno' ? 121 : 480,
    locationId: null,
    requestedByUserId: 'u_waiter',
    requestedByName: 'Jana Obsluha',
    createdAt: '2026-07-07T10:35:00.000Z',
    resolvedByUserId: null,
    resolvedByName: null,
    resolvedAt: null,
    resolutionNote: null,
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
        role: 'Employee',
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

async function routeCommonInventory(route: Route): Promise<boolean> {
  const request = route.request()
  const url = new URL(request.url())
  const path = url.pathname.replace('/api/v1', '')
  const method = request.method()

  if (method === 'GET' && path === '/company') {
    await route.fulfill({ json: company })
    return true
  }
  if (method === 'GET' && path === '/products') {
    await route.fulfill({ json: paged([product]) })
    return true
  }
  if (method === 'GET' && path === '/locations') {
    await route.fulfill({ json: paged([]) })
    return true
  }
  if (method === 'GET' && path === '/inventory/stock-levels') {
    await route.fulfill({
      json: paged(
        [
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: 8,
          },
        ],
        200,
      ),
    })
    return true
  }
  return false
}

test('pokladní storno nad limitem ukáže čekání na schválení managerem', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  let stornoRequested = false

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product]) })
    if (method === 'GET' && path === '/locations') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === '/categories') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === '/sales/summary') {
      return route.fulfill({
        json: {
          date: '2026-07-07',
          count: 1,
          totalNet: 100,
          totalVat: 21,
          total: 121,
          cashTotal: 121,
          cardTotal: 0,
        },
      })
    }
    if (method === 'GET' && path === '/sales') return route.fulfill({ json: paged([sale], 50) })
    if (method === 'POST' && path === '/sales/sale-1/storno') {
      stornoRequested = true
      return route.fulfill({
        status: 202,
        json: approval('approval-storno', 'Storno účtenky 2026-0042', 'SaleStorno'),
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/pokladna')
  await page.getByRole('button', { name: 'Tržby' }).click()
  await expect(page.getByText('1 prodejů · DPH 21,00 Kč')).toBeVisible()

  await page.getByRole('button', { name: 'Storno' }).click()
  await page.getByRole('button', { name: 'Stornovat' }).click()

  await expect(page.getByText('Storno čeká na schválení managerem.')).toBeVisible()
  expect(stornoRequested).toBe(true)

  // 202 = akce se NEprovedla hned: prodej zůstává aktivní (dál má tlačítko Storno,
  // není označen štítkem „Stornováno") — čeká na schválení managerem.
  await expect(page.getByRole('button', { name: 'Storno', exact: true })).toBeVisible()
  await expect(page.getByText('Stornováno')).toHaveCount(0)
})

test('skladový výdej nad limitem ukáže čekání na schválení managerem', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  let issuePayload: unknown

  await page.route(API, async (route: Route) => {
    if (await routeCommonInventory(route)) return

    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'POST' && path === '/inventory/issues') {
      issuePayload = request.postDataJSON()
      return route.fulfill({
        status: 202,
        json: approval('approval-issue', 'Odpis položky Rum 0,04l', 'StockIssue'),
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/zasoby')
  await expect(page.getByText('Rum 0,04l')).toBeVisible()

  await page.getByTitle('Výdej').click()
  await page.getByLabel('Množství').fill('4')
  await page.getByLabel('Poznámka').fill('rozbitá láhev')
  await page.getByRole('button', { name: 'Uložit' }).click()

  await expect(page.getByText('Výdej čeká na schválení managerem.')).toBeVisible()
  expect(issuePayload).toMatchObject({
    productId: product.id,
    quantity: 4,
    note: 'rozbitá láhev',
    type: 'Issue',
    locationId: null,
  })
})

test('inventura nad limitem ukáže čekání na schválení managerem', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  let stocktakePayload: unknown

  await page.route(API, async (route: Route) => {
    if (await routeCommonInventory(route)) return

    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'POST' && path === '/inventory/stocktake') {
      stocktakePayload = request.postDataJSON()
      return route.fulfill({
        status: 202,
        json: approval('approval-stocktake', 'Inventura skladu', 'Stocktake'),
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/zasoby')
  await expect(page.getByText('Rum 0,04l')).toBeVisible()

  await page.getByRole('button', { name: 'Inventura' }).click()
  await page.getByLabel('Napočítaná realita').fill('5')
  await page.getByRole('button', { name: 'Uložit inventuru' }).click()

  await expect(page.getByText('Inventura čeká na schválení managerem.')).toBeVisible()
  expect(stocktakePayload).toMatchObject({
    items: [{ productId: product.id, countedQuantity: 5 }],
    note: 'Inventura',
    locationId: null,
  })
})
