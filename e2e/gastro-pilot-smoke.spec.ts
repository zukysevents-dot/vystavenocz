import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'
const businessDate = '2026-07-07'

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
  id: 'loc-1',
  name: 'Bistro Praha',
  address: 'Testovací 1, Praha',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const category = {
  id: 'cat-food',
  name: 'Jídla',
  color: null,
  sortOrder: 0,
  parentId: null,
  kitchenSection: 'Kitchen',
}

const product = {
  id: 'prod-burger',
  name: 'Burger',
  sku: 'BURG',
  ean: null,
  salePrice: 189,
  vatRate: 12,
  purchasePrice: 85,
  minQuantity: 0,
  categoryId: category.id,
  allergens: [1, 7],
}

const floor = { id: 'floor-main', name: 'Sál', sortOrder: 0, locationId: location.id }
const table = {
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
}

const orderItem = {
  id: 'item-1',
  productId: product.id,
  name: product.name,
  quantity: 1,
  unitPrice: 209,
  vatRate: product.vatRate,
  course: null,
  note: 'bez cibule',
  kitchenSection: 'Kitchen',
  kitchenStatus: 'New',
  lineTotal: 209,
  modifiers: [
    { groupName: 'Přílohy', name: 'Hranolky', priceDelta: 0 },
    { groupName: 'Extra', name: 'Sýr navíc', priceDelta: 20 },
  ],
}

function openOrder(kitchenStatus: string = 'New') {
  return {
    id: 'order-1',
    tableId: table.id,
    locationId: location.id,
    status: 'Open',
    saleId: null,
    openedAt: `${businessDate}T10:00:00.000Z`,
    closedAt: null,
    discountPercent: 0,
    tipAmount: 0,
    totalNet: 186.61,
    totalVat: 22.39,
    total: 209,
    splitGroups: [],
    items: [{ ...orderItem, kitchenStatus }],
  }
}

function sale() {
  return {
    id: 'sale-1',
    soldAt: `${businessDate}T10:30:00.000Z`,
    paymentMethod: 'Card',
    status: 'Completed',
    locationId: location.id,
    employeeId: null,
    totalNet: 186.61,
    totalVat: 22.39,
    total: 209,
    discountTotal: 0,
    tipAmount: 0,
    cashReceived: null,
    cashChange: null,
    items: [
      {
        id: 'sale-item-1',
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: 209,
        vatRate: product.vatRate,
        lineNet: 186.61,
        lineVat: 22.39,
        lineTotal: 209,
        modifiers: orderItem.modifiers,
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
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

test('pilotní gastro průchod: účet u stolu, kuchyň, platba a nenulová uzávěrka', async ({
  page,
}) => {
  await seedApiMode(page)
  await dismissCookies(page)

  let paid = false
  let kitchenStatus = 'New'
  let paymentPayload: unknown = null

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/locations') {
      return route.fulfill({ json: paged([location], 100) })
    }
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product]) })
    if (method === 'GET' && path === '/categories')
      return route.fulfill({ json: paged([category], 100) })
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged([table]) })
    if (method === 'GET' && path === '/orders') {
      return route.fulfill({ json: paged(paid ? [] : [openOrder(kitchenStatus)]) })
    }
    if (method === 'GET' && path === '/orders/order-1') {
      return route.fulfill({
        status: paid ? 404 : 200,
        json: paid ? { title: 'Order closed' } : openOrder(kitchenStatus),
      })
    }
    if (method === 'POST' && path === '/orders/order-1/send-to-kitchen') {
      kitchenStatus = 'Sent'
      return route.fulfill({ json: openOrder(kitchenStatus) })
    }
    if (method === 'POST' && path === '/orders/order-1/pay') {
      paymentPayload = request.postDataJSON()
      paid = true
      return route.fulfill({
        json: {
          ...openOrder(kitchenStatus),
          status: 'Closed',
          saleId: 'sale-1',
          closedAt: `${businessDate}T10:30:00.000Z`,
        },
      })
    }
    if (method === 'GET' && path === '/kitchen/queue') {
      const queue =
        kitchenStatus === 'New' || kitchenStatus === 'Served'
          ? []
          : [
              {
                itemId: orderItem.id,
                orderId: 'order-1',
                tableName: table.name,
                productName: product.name,
                quantity: 1,
                course: null,
                note: orderItem.note,
                kitchenSection: 'Kitchen',
                kitchenStatus,
                sentToKitchenAt: `${businessDate}T10:05:00.000Z`,
                kitchenStatusUpdatedAt: `${businessDate}T10:05:00.000Z`,
                customerName: null,
                fulfillment: null,
                modifiers: orderItem.modifiers,
              },
            ]
      return route.fulfill({ json: queue })
    }
    if (method === 'GET' && path === '/kitchen/history') {
      return route.fulfill({ json: [] })
    }
    if (method === 'POST' && path === '/kitchen/items/item-1/status') {
      const payload = JSON.parse(request.postData() ?? '{}') as { status: string }
      kitchenStatus = payload.status
      return route.fulfill({ json: null })
    }
    if (method === 'GET' && path.startsWith('/day-close/')) {
      return route.fulfill({
        json: {
          status: 'Open',
          date: businessDate,
          locationId: location.id,
          zReportNumber: null,
          closedAt: null,
          saleCount: null,
          totalNet: null,
          totalVat: null,
          total: null,
          cashTotal: null,
          cardTotal: null,
          tipTotal: null,
          discountTotal: null,
          cancelledCount: null,
          cancelledTotal: null,
          vatBreakdown: [],
          productBreakdown: [],
        },
      })
    }
    if (method === 'GET' && path === '/sales') {
      return route.fulfill({ json: paged(paid ? [sale()] : [], 100) })
    }
    if (method === 'GET' && path === '/sales/summary') {
      expect(url.searchParams.get('date')).toBe(businessDate)
      expect(url.searchParams.get('locationId')).toBe(location.id)
      return route.fulfill({
        json: {
          count: paid ? 1 : 0,
          totalNet: paid ? 186.61 : 0,
          totalVat: paid ? 22.39 : 0,
          total: paid ? 209 : 0,
          cashTotal: 0,
          cardTotal: paid ? 209 : 0,
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/restaurace')
  await page.getByRole('button', { name: /Stůl 1/ }).click()
  await expect(page.getByRole('heading', { name: 'Účet — Stůl 1' })).toBeVisible()
  await expect(page.getByText('Přílohy: Hranolky')).toBeVisible()
  await expect(page.getByText('Extra: Sýr navíc')).toBeVisible()

  await page.getByRole('button', { name: 'Odeslat objednávku' }).click()
  await expect(page.getByText('Objednávka odeslána')).toBeVisible()

  await page.goto('/app/kuchyne')
  await expect(page.getByText('Stůl 1')).toBeVisible()
  await expect(page.getByText('Burger')).toBeVisible()
  await expect(page.getByText('↳ Přílohy: Hranolky')).toBeVisible()
  await expect(page.getByText('↳ Extra: Sýr navíc')).toBeVisible()
  await expect(page.getByRole('button', { name: /Připravit/ })).toBeVisible()

  await page.goto('/app/restaurace')
  await page.getByRole('button', { name: /Stůl 1/ }).click()
  await page.getByRole('button', { name: 'Zaplatit' }).click()
  await page.getByRole('button', { name: 'Kartou' }).click()
  await page.getByRole('button', { name: 'Platba prošla' }).click()
  await expect(page.getByText('Zaplaceno 209,00 Kč kartou.')).toBeVisible()
  expect(paymentPayload).toEqual({ paymentMethod: 'Card', cashReceived: null })

  await page.goto('/app/uzaverka')
  await page.locator('#uzaverka-date').fill(businessDate)
  await expect(page.getByText('Den je otevřený.')).toBeVisible()
  await expect(page.getByText('Účtenek').locator('..').getByText('1')).toBeVisible()
  await expect(page.getByText('Tržba celkem').locator('..').getByText('209,00 Kč')).toBeVisible()
  await expect(page.getByText(/Karta\s+209,00\s+Kč/).first()).toBeVisible()
  await expect(page.getByText('186,61 Kč').first()).toBeVisible()
  await expect(page.getByText('22,39 Kč').first()).toBeVisible()
  await expect(page.getByText('Burger')).toBeVisible()
})
