import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Host doobjedná přes QR do otevřeného účtu stolu (backend připíše položky ke stejnému účtu). Obsluha, která
// má účet otevřený na svém terminálu, musí PŘED platbou vidět aktualizovaný total/položky — jinak by platila
// (a tiskla účtenku) podle zastaralého snapshotu. Ověřuje forced refresh v openPayment().

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

function espressoItem(id: string) {
  return {
    id,
    productId: product.id,
    name: product.name,
    quantity: 1,
    unitPrice: product.salePrice,
    vatRate: product.vatRate,
    course: null,
    note: null,
    kitchenSection: 'Bar',
    kitchenStatus: 'Sent',
    lineTotal: product.salePrice,
  }
}

function orderWith(items: ReturnType<typeof espressoItem>[]) {
  const total = items.reduce((s, i) => s + i.lineTotal, 0)
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
    totalNet: Math.round((total / 1.21) * 100) / 100,
    totalVat: Math.round((total - total / 1.21) * 100) / 100,
    total,
    splitGroups: [],
    items,
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

test('obsluha vidí QR doobjednávku hosta v aktualizovaném totalu před platbou', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedApiMode(page)

  // Backend má na stole otevřený účet s 1× Espresso; host přes QR přidá druhé — přepneme mock po otevření účtu.
  let qrReordered = false
  const oneItem = orderWith([espressoItem('item-1')])
  const twoItems = orderWith([espressoItem('item-1'), espressoItem('item-2')])

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()
    const current = qrReordered ? twoItems : oneItem

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([product]) })
    if (method === 'GET' && path === '/categories')
      return route.fulfill({ json: paged([category]) })
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged(tables) })
    // Obsazenost stolu + načtení/obnova konkrétního účtu vrací aktuální serverový stav.
    if (method === 'GET' && path === '/orders') return route.fulfill({ json: paged([current]) })
    if (method === 'GET' && path === '/orders/order-1') return route.fulfill({ json: current })

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await dismissCookies(page)
  await page.goto('/app/restaurace')

  await page.getByTestId('restaurant-table-list-table-1').click()
  await expect(page.getByTestId('restaurant-order-view')).toBeVisible()

  // Výchozí stav: obsluha vidí 1 položku za 59 Kč.
  const waiterBar = page.getByTestId('restaurant-mobile-actions')
  await expect(page.getByTestId('restaurant-total-mobile')).toContainText('59,00 Kč')

  // Host doobjedná přes QR (backend teď vrací 2 položky).
  qrReordered = true

  // Obsluha zmáčkne Zaplatit → forced refresh natáhne aktuální účet → dialog i lišta ukazují 118 Kč (2 položky).
  await waiterBar.getByRole('button', { name: /^Zaplatit$/ }).click()
  await expect(page.getByText('K úhradě')).toBeVisible()
  await expect(page.getByTestId('payment-total')).toContainText('118,00 Kč')
  await expect(page.getByTestId('restaurant-total-mobile')).toContainText('118,00 Kč')
  await expect(page.getByTestId('restaurant-order-item-item-2')).toBeAttached()
})
