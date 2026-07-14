import AxeBuilder from '@axe-core/playwright'
import type { Route } from '@playwright/test'
import { test, expect, type Page } from './fixtures/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

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
  ean: '8590000000012',
  salePrice: 89,
  vatRate: 21,
  purchasePrice: 120,
  minQuantity: 3,
  categoryId: null,
  allergens: [],
}

const secondProduct = {
  ...product,
  id: 'prod-coffee',
  name: 'Káva',
  sku: 'COFFEE',
  ean: '8590000000013',
  purchasePrice: 80,
}

const supplier = {
  id: 'supplier-makro',
  name: 'Makro',
  ico: '12345678',
  dic: null,
  email: 'objednavky@makro.test',
  phone: null,
  contactPerson: null,
  note: null,
  isArchived: false,
  createdAt: '2026-07-01T10:00:00Z',
}

function paged<T>(items: T[], pageSize = 100) {
  return { items, total: items.length, page: 1, pageSize }
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

test('objednávka projde na mobilu návrhem, objednáním a vícepoložkovým částečným příjmem', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)
  await dismissCookies(page)

  let order: Record<string, unknown> | null = null
  let receivePayload: Record<string, unknown> | null = null

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') {
      return route.fulfill({ json: paged([product, secondProduct]) })
    }
    if (method === 'GET' && path === '/locations') return route.fulfill({ json: paged([location]) })
    if (method === 'GET' && path === '/inventory/stock-levels') {
      return route.fulfill({
        json: paged([
          {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: 1,
            locationId: location.id,
          },
        ]),
      })
    }
    if (method === 'GET' && path === '/inventory/purchase-receipts') {
      return route.fulfill({ json: paged([]) })
    }
    if (method === 'GET' && path === '/inventory/purchase-suggestions') {
      return route.fulfill({
        json: {
          from: '2026-07-07',
          to: '2026-07-14',
          daysAhead: 7,
          locationId: null,
          items: [],
        },
      })
    }
    if (method === 'GET' && path === '/inventory/suppliers') {
      return route.fulfill({ json: paged([supplier]) })
    }
    if (method === 'GET' && path === '/inventory/purchase-orders') {
      return route.fulfill({ json: paged(order ? [order] : [], 50) })
    }
    if (method === 'POST' && path === '/inventory/purchase-orders') {
      const body = request.postDataJSON()
      order = {
        id: 'order-1',
        number: 'OBJ-2026-0001',
        status: 'Draft',
        supplierId: body.supplierId,
        supplierName: supplier.name,
        locationId: body.locationId,
        orderedOn: body.orderedOn,
        expectedOn: body.expectedOn,
        note: body.note,
        totalCost: 1000,
        placedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: '2026-07-14T10:00:00Z',
        items: [
          {
            id: 'order-item-1',
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            orderedQuantity: 5,
            receivedQuantity: 0,
            remainingQuantity: 5,
            unitCost: 120,
            lineCost: 600,
          },
          {
            id: 'order-item-2',
            productId: secondProduct.id,
            productName: secondProduct.name,
            productSku: secondProduct.sku,
            orderedQuantity: 5,
            receivedQuantity: 0,
            remainingQuantity: 5,
            unitCost: 80,
            lineCost: 400,
          },
        ],
        receipts: [],
      }
      return route.fulfill({ status: 201, json: order })
    }
    if (method === 'POST' && path === '/inventory/purchase-orders/order-1/place') {
      order = { ...order!, status: 'Ordered', placedAt: '2026-07-14T10:05:00Z' }
      return route.fulfill({ json: order })
    }
    if (method === 'POST' && path === '/inventory/purchase-orders/order-1/receipts') {
      receivePayload = request.postDataJSON()
      order = {
        ...order!,
        status: 'PartiallyReceived',
        items: [
          {
            ...(order!.items as Array<Record<string, unknown>>)[0],
            receivedQuantity: 2,
            remainingQuantity: 3,
          },
          (order!.items as Array<Record<string, unknown>>)[1],
        ],
        receipts: [
          {
            id: 'receipt-1',
            documentNumber: 'DL-1',
            receivedOn: '2026-07-14',
            totalCost: 240,
            createdAt: '2026-07-14T10:10:00Z',
          },
        ],
      }
      return route.fulfill({
        status: 201,
        json: {
          order,
          receipt: {
            id: 'receipt-1',
            locationId: location.id,
            purchaseOrderId: 'order-1',
            supplierName: supplier.name,
            documentNumber: 'DL-1',
            receivedOn: '2026-07-14',
            note: null,
            totalCost: 240,
            createdAt: '2026-07-14T10:10:00Z',
            items: [
              {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: 2,
                unitCost: 120,
                lineCost: 240,
              },
            ],
          },
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/naskladneni')
  await expect(page.getByRole('heading', { name: 'Nákupní objednávky' })).toBeVisible()
  await page.getByTestId('new-purchase-order').click()
  await page.getByLabel('Položky *').fill('Rum')
  await page.getByRole('button', { name: /Rum 0,04l/ }).click()
  await page.getByLabel('Množství').fill('5')
  await page.getByLabel('Položky *').fill('Káva')
  await page.getByRole('button', { name: /Káva/ }).click()
  await page.getByLabel('Množství').last().fill('5')
  await page.getByTestId('save-purchase-order').click()

  await expect(page.getByText('OBJ-2026-0001')).toBeVisible()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Objednat' }).click()
  await expect(page.getByText('Objednáno', { exact: true })).toBeVisible()

  await page.getByTestId('receive-purchase-order').click()
  await page.getByLabel('Číslo dokladu').last().fill('DL-1')
  await page.getByLabel('Přijato nyní').first().fill('2')
  await page.getByTestId('confirm-purchase-order-receipt').click()

  await expect(page.getByText('Částečně přijato', { exact: true })).toBeVisible()
  await expect(page.getByText('Přijato 2 z 10 jednotek')).toBeVisible()
  expect(receivePayload).toMatchObject({
    documentNumber: 'DL-1',
    items: [{ purchaseOrderItemId: 'order-item-1', quantity: 2, unitCost: 120 }],
  })
  expect(receivePayload?.idempotencyKey).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10_000 })
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(
    results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
})
