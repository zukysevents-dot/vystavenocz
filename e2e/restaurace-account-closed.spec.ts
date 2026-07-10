import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Když obsluha přidává položku na účet, který mezitím zavřel jiný terminál (nebo host doplatil přes QR), backend
// vrátí 409. Frontend to nesmí ukázat jako matoucí generickou chybu — musí říct „účet uzavřel jiný terminál"
// a vrátit obsluhu na mapu stolů (ne ji nechat u zdánlivě živého, ale zavřeného účtu).

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
  publicSlug: 'e2e-bistro',
}

const order = {
  id: 'order-1',
  tableId: 'table-1',
  locationId: null,
  status: 'Open',
  saleId: null,
  openedAt: '2026-07-06T10:00:00.000Z',
  closedAt: null,
  discountPercent: 0,
  tipAmount: 0,
  totalNet: 48.76,
  totalVat: 10.24,
  total: 59,
  splitGroups: [],
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
      kitchenStatus: 'New',
      lineTotal: product.salePrice,
    },
  ],
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

test('přidání položky na účet zavřený jiným terminálem hlásí konflikt a vrací na mapu', async ({
  page,
}) => {
  // Test schválně vyvolá 409 → prohlížeč zaloguje network chybu; povolíme ji (ověřujeme chybovou cestu).
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 409' })
  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)

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
    if (method === 'GET' && path === '/categories')
      return route.fulfill({ json: paged([category]) })
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged(tables) })
    if (method === 'GET' && path === '/orders') return route.fulfill({ json: paged([order]) })
    if (method === 'GET' && path === '/orders/order-1') return route.fulfill({ json: order })
    // Účet mezitím uzavřel jiný terminál → přidání položky vrátí 409.
    if (method === 'POST' && path === '/orders/order-1/items') {
      return route.fulfill({ status: 409, json: { title: 'Účet je uzavřený nebo zrušený.' } })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/restaurace')

  await page.getByRole('button', { name: /Stůl 1/ }).click()
  await expect(page.getByRole('heading', { name: 'Účet — Stůl 1' })).toBeVisible()

  // Přidání položky → backend 409 → jasná hláška + návrat na mapu (ne generická chyba).
  await page.getByRole('button', { name: /Espresso/ }).click()
  await expect(page.getByText('Účet mezitím zaplatil nebo zrušil jiný terminál.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Účet — Stůl 1' })).toBeHidden()
  await expect(page.getByRole('button', { name: /Stůl 1/ })).toBeVisible()
})
