import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Provoz bez kuchyně (kavárna, stánek) bony nepoužívá — nemá je kdo na displeji vydávat.
// Vypnutý přepínač musí ubrat odesílání z obsluhy, ne přidat práci navíc: bez těchhle testů
// zůstanou položky navždy `New`, takže by u KAŽDÉ platby vyskočil dialog „Nejdřív odeslat?"
// a všechny stoly by trvale svítily oranžově jako „Neodesláno".

const API = '**/api/v1/**'

const floor = { id: 'floor-main', name: 'Sál', sortOrder: 0, locationId: null }
const tables = [
  {
    id: 'table-1',
    floorId: floor.id,
    name: 'Stůl 1',
    x: 32,
    y: 32,
    width: 110,
    height: 76,
    rotation: 0,
    seats: 4,
    shape: 'Rect',
  },
]

function paged<T>(items: T[]) {
  return { items, total: items.length, page: 1, pageSize: 200 }
}

// Účet s NEODESLANOU položkou — přesně stav, který se bez bonů nikdy nezmění.
function openOrder() {
  return {
    id: 'order-1',
    tableId: 'table-1',
    locationId: null,
    status: 'Open',
    saleId: null,
    openedAt: '2026-08-23T10:00:00.000Z',
    closedAt: null,
    discountPercent: 0,
    tipAmount: 0,
    totalNet: 59,
    totalVat: 0,
    total: 59,
    splitGroups: [],
    items: [
      {
        id: 'item-1',
        productId: null,
        name: 'Espresso',
        quantity: 1,
        unitPrice: 59,
        vatRate: 0,
        course: null,
        note: null,
        kitchenSection: 'Bar',
        kitchenStatus: 'New',
        lineTotal: 59,
      },
    ],
  }
}

async function seed(page: Page) {
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
        modules: ['core', 'gastro', 'pos', 'stock'],
        features: [],
      }),
    )
  })
}

async function mockApi(page: Page, usesKitchenTickets: boolean) {
  let sendCalls = 0

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', name: 'E2E Bistro', usesKitchenTickets } })
    if (method === 'GET' && path === '/products') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === '/categories') return route.fulfill({ json: paged([]) })
    if (method === 'GET' && path === '/floors') return route.fulfill({ json: paged([floor]) })
    if (method === 'GET' && path === '/tables') return route.fulfill({ json: paged(tables) })
    if (method === 'GET' && path === '/orders') return route.fulfill({ json: paged([openOrder()]) })
    if (method === 'GET' && path.startsWith('/orders/')) return route.fulfill({ json: openOrder() })
    if (method === 'GET' && path.startsWith('/kitchen/')) return route.fulfill({ json: [] })
    if (method === 'POST' && path === '/orders/order-1/send-to-kitchen') {
      sendCalls++
      return route.fulfill({ json: openOrder() })
    }
    return route.fulfill({ status: 404, json: { title: 'Unhandled ' + method + ' ' + path } })
  })

  return { sendCalls: () => sendCalls }
}

test('bez bonů jde platba rovnou, bez dialogu o neodeslaných položkách', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await seed(page)
  const calls = await mockApi(page, false)
  await page.goto('/app/restaurace')

  await page.getByTestId('restaurant-table-map-table-1').click()

  // Odesílat není kam — tlačítko se vůbec nenabízí.
  await expect(page.getByRole('button', { name: 'Odeslat na stanice' })).toHaveCount(0)

  await page.getByTestId('restaurant-pay-desktop').click()

  await expect(page.getByRole('heading', { name: 'Nejdřív odeslat do kuchyně?' })).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: /Platba/ })).toBeVisible()
  expect(calls.sendCalls()).toBe(0)
})

test('bez bonů stůl s neodeslanou položkou nesvítí jako „Neodesláno"', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await seed(page)
  await mockApi(page, false)
  await page.goto('/app/restaurace')

  await expect(page.getByTestId('restaurant-table-map-table-1')).toBeVisible()
  await expect(page.getByText('Neodesláno')).toHaveCount(0)
})

test('bez bonů zmizí Kuchyňské objednávky z menu a stránka řekne proč', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seed(page)
  await mockApi(page, false)

  // Přímá URL zůstává průchozí — nesmí ale předstírat prázdnou frontu.
  // (Kontroluje se tady, protože cockpit `/app/restaurace` běží bez sidebaru, takže by tam
  // test na chybějící položku menu prošel i s rozbitým filtrem.)
  await page.goto('/app/kuchyne')
  await expect(page.getByTestId('kuchyne-bony-vypnute')).toBeVisible()
  await expect(page.getByText('Provoz nepoužívá kuchyňské bony')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Kuchyňské objednávky' })).toHaveCount(0)
})

test('se zapnutými bony zůstává odesílání i varování před platbou beze změny', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seed(page)
  await mockApi(page, true)
  await page.goto('/app/kuchyne')
  await expect(page.getByRole('link', { name: 'Kuchyňské objednávky' }).first()).toBeVisible()

  await page.goto('/app/restaurace')
  await page.getByTestId('restaurant-table-map-table-1').click()
  await expect(page.getByRole('button', { name: 'Odeslat na stanice' })).toBeVisible()

  await page.getByTestId('restaurant-pay-desktop').click()
  await expect(page.getByRole('heading', { name: 'Nejdřív odeslat do kuchyně?' })).toBeVisible()
})
