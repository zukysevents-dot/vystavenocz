import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

function paged<T>(items: T[]) {
  return { items, total: items.length, page: 1, pageSize: 200 }
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
  categoryId: 'cat-food',
}

const category = {
  id: 'cat-food',
  name: 'Jídla',
  color: null,
  sortOrder: 0,
  parentId: null,
  kitchenSection: 'Kitchen',
}

const floor = { id: 'floor-main', name: 'Sál', sortOrder: 0, locationId: null }
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

const modifierGroups = [
  {
    id: 'group-sides',
    name: 'Přílohy',
    selectionType: 'Single',
    isRequired: true,
    maxSelect: null,
    sortOrder: 0,
    options: [
      { id: 'opt-fries', name: 'Hranolky', priceDelta: 0, sortOrder: 0 },
      { id: 'opt-salad', name: 'Salát', priceDelta: 15, sortOrder: 1 },
    ],
  },
  {
    id: 'group-extra',
    name: 'Extra',
    selectionType: 'Multi',
    isRequired: false,
    maxSelect: 2,
    sortOrder: 1,
    options: [{ id: 'opt-cheese', name: 'Sýr navíc', priceDelta: 20, sortOrder: 0 }],
  },
]

function emptyOrder() {
  return {
    id: 'order-1',
    tableId: table.id,
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

function orderWithBurger() {
  return {
    ...emptyOrder(),
    totalNet: 186.61,
    totalVat: 22.39,
    total: 209,
    items: [
      {
        id: 'item-1',
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: 209,
        vatRate: product.vatRate,
        course: null,
        note: null,
        kitchenSection: 'Kitchen',
        kitchenStatus: 'New',
        lineTotal: 209,
        modifiers: [
          { groupName: 'Přílohy', name: 'Hranolky', priceDelta: 0 },
          { groupName: 'Extra', name: 'Sýr navíc', priceDelta: 20 },
        ],
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

test('obsluha vybere povinné modifikátory při přidání položky na účet', async ({ page }) => {
  await seedApiMode(page)
  let addPayload: unknown

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product]) })
    if (method === 'GET' && path === '/categories')
      return route.fulfill({ json: paged([category]) })
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged([table]) })
    if (method === 'GET' && path === '/orders') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === `/products/${product.id}/modifier-groups`) {
      return route.fulfill({ json: modifierGroups })
    }
    if (method === 'POST' && path === '/orders') return route.fulfill({ json: emptyOrder() })
    if (method === 'POST' && path === '/orders/order-1/items') {
      addPayload = request.postDataJSON()
      return route.fulfill({ json: orderWithBurger() })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/restaurace')

  await page.getByRole('button', { name: /Stůl 1/ }).click()
  await expect(page.getByRole('heading', { name: 'Účet — Stůl 1' })).toBeVisible()

  await page.getByRole('button', { name: /Burger/ }).click()
  await expect(page.getByRole('dialog', { name: 'Vybrat modifikátory' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Přidat na účet' })).toBeDisabled()

  await page.getByRole('button', { name: /Hranolky/ }).click()
  await page.getByRole('button', { name: /Sýr navíc/ }).click()
  await page.getByRole('button', { name: 'Přidat na účet' }).click()

  expect(addPayload).toMatchObject({
    productId: product.id,
    quantity: 1,
    modifierOptionIds: ['opt-fries', 'opt-cheese'],
  })
  await expect(page.getByText('Přílohy: Hranolky')).toBeVisible()
  await expect(page.getByText('Extra: Sýr navíc')).toBeVisible()
  await expect(page.getByText('209,00 Kč').first()).toBeVisible()
})
