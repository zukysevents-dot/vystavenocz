import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Offline režim pokladny: bar bez sítě musí dál prodávat za hotové a po obnovení spojení se
// všechno doúčtovat PRÁVĚ JEDNOU. Účtenka vytištěná offline se nesmí tvářit jako hotová.

const API = '**/api/v1/**'

function paged<T>(items: T[], pageSize = 100) {
  return { items, total: items.length, page: 1, pageSize }
}

const company = {
  id: 'c_e2e',
  name: 'Festival Bar',
  ico: '12345678',
  dic: null,
  email: 'bar@vystaveno.cz',
  phone: null,
  logoUrl: null,
  defaultDueDays: 14,
  currency: 'CZK',
  address: { street: 'Louka 1', city: 'Praha', postalCode: '11000', country: 'CZ' },
  bankAccount: { accountNumber: '123456789/0100', iban: null, bic: null },
  publicSlug: 'festival-bar',
}

const location = {
  id: 'loc-bar',
  name: 'Bar u pódia',
  address: 'Louka 1',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const pivo = {
  id: 'prod-pivo',
  name: 'Pivo 0,5l',
  sku: 'PIVO05',
  ean: '8594001020306',
  salePrice: 60,
  vatRate: 21,
  purchasePrice: 20,
  minQuantity: 0,
  categoryId: null,
  allergens: [],
}

interface SalePost {
  idempotencyKey: string
  soldAt: string | null
  paymentMethod: string
}

interface ApiHarness {
  posts: SalePost[]
  /** Simuluje nedostupnou síť festivalu: požadavky na API vůbec neodejdou. */
  setNetworkDown: (down: boolean) => void
  /** HTTP status, kterým server odpoví na POST /sales (201 = přijato). */
  setSaleStatus: (status: number) => void
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
        user: { id: 'u_e2e', email: 'bar@vystaveno.cz', fullName: 'Barman Bob' },
        companyId: 'c_e2e',
        role: 'Owner',
        modules: ['core', 'pos', 'stock'],
        features: [],
      }),
    )
  })
}

async function routeApi(page: Page): Promise<ApiHarness> {
  const posts: SalePost[] = []
  let networkDown = false
  let saleStatus = 201

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const method = request.method()

    // Pokus o odeslání zaznamenáme i tehdy, když spojení spadne — test tak vidí, jestli se při
    // opakování nezměnil idempotency klíč (jinak by vznikly dvě účtenky).
    if (method === 'POST' && path === '/sales') {
      const attempt = request.postDataJSON() as {
        idempotencyKey: string
        soldAt?: string | null
        paymentMethod: string
      }
      posts.push({
        idempotencyKey: attempt.idempotencyKey,
        soldAt: attempt.soldAt ?? null,
        paymentMethod: attempt.paymentMethod,
      })
    }

    if (networkDown) return route.abort('connectionfailed')

    if (method === 'GET') {
      if (path === '/company') return route.fulfill({ json: company })
      if (path === '/products') return route.fulfill({ json: paged([pivo]) })
      if (path === `/products/${pivo.id}/variants`) return route.fulfill({ json: [] })
      if (path === '/locations') return route.fulfill({ json: paged([location]) })
      if (path === '/categories') return route.fulfill({ json: paged([]) })
      if (path === '/sales') return route.fulfill({ json: paged([]) })
      if (path === '/sales/summary')
        return route.fulfill({
          json: {
            date: '2026-08-07',
            count: 0,
            totalNet: 0,
            totalVat: 0,
            total: 0,
            cashTotal: 0,
            cardTotal: 0,
          },
        })
    }

    if (method === 'POST' && path === '/sales') {
      const body = request.postDataJSON() as {
        paymentMethod: string
        soldAt?: string | null
        items: { quantity: number; unitPrice: number }[]
      }
      if (saleStatus === 409)
        return route.fulfill({
          status: 409,
          json: {
            status: 409,
            title: 'Konflikt',
            detail: 'Obchodní den je pro tuto pobočku už uzavřený (uzávěrka).',
          },
        })
      const total = body.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
      return route.fulfill({
        status: 201,
        json: {
          id: `sale-${posts.length}`,
          locationId: location.id,
          paymentMethod: body.paymentMethod,
          status: 'Completed',
          discountPercent: 0,
          tipAmount: 0,
          cashReceived: null,
          cashChange: null,
          totalNet: Math.round((total / 1.21) * 100) / 100,
          totalVat: Math.round((total - total / 1.21) * 100) / 100,
          total,
          createdAt: body.soldAt ?? '2026-08-07T20:15:00Z',
          redeemPoints: 0,
          redeemDiscount: 0,
          earnedPoints: 0,
          items: [],
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  return {
    posts,
    setNetworkDown: (down) => {
      networkDown = down
    },
    setSaleStatus: (status) => {
      saleStatus = status
    },
  }
}

async function addPivo(page: Page): Promise<void> {
  await page.getByRole('button', { name: new RegExp(pivo.name) }).click()
}

/** Hotovostní platba — jediné, co offline projde. */
async function payCash(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Zaplatit' }).click()
  await page.getByRole('button', { name: /^Hotově$/ }).click()
  await page.getByRole('button', { name: /^\d/ }).first().click() // rychlá částka (přesně / zaokrouhleno)
  await page.getByRole('button', { name: 'Zaplatit hotově' }).click()
}

async function goOffline(page: Page, api: ApiHarness): Promise<void> {
  api.setNetworkDown(true)
  await page.context().setOffline(true)
  await expect(page.getByTestId('pos-offline-banner')).toBeVisible()
}

async function goOnline(page: Page, api: ApiHarness): Promise<void> {
  api.setNetworkDown(false)
  await page.context().setOffline(false)
}

test.beforeEach(({}, testInfo) => {
  // Nedostupná síť je záměr testu — prohlížeč ji hlásí do konzole.
  testInfo.annotations.push({ type: 'allowConsoleError', description: 'net::ERR' })
  testInfo.annotations.push({ type: 'allowConsoleError', description: 'Failed to fetch' })
  testInfo.annotations.push({ type: 'allowConsoleError', description: 'Failed to load resource' })
  testInfo.annotations.push({ type: 'allowConsoleError', description: 'status of 409' })
})

test('bez sítě jde prodej dokončit a po obnovení spojení se objeví na serveru právě jednou', async ({
  page,
}) => {
  await seedApiMode(page)
  await dismissCookies(page)
  const api = await routeApi(page)

  await page.goto('/app/pokladna')
  await addPivo(page)
  await goOffline(page, api)

  await payCash(page)

  // Doklad je označený jako k doúčtování — nikdy „zaplaceno a odesláno".
  await expect(page.getByText(/Doklad k doúčtování/i)).toBeVisible()
  expect(api.posts).toHaveLength(0)
  await page.getByRole('button', { name: 'Hotovo' }).click()
  await expect(page.getByTestId('pos-queue-status')).toContainText('1')

  await goOnline(page, api)

  await expect(page.getByTestId('pos-queue-status')).toBeHidden({ timeout: 30_000 })
  expect(api.posts).toHaveLength(1)
  expect(api.posts[0].paymentMethod).toBe('Cash')
  // Prodej nese ČAS POŘÍZENÍ, aby spadl do správného obchodního dne, ne do dne synchronizace.
  expect(api.posts[0].soldAt).toBeTruthy()
})

test('výpadek uprostřed platby zařadí prodej do fronty se STEJNÝM klíčem (nenaúčtuje dvakrát)', async ({
  page,
}) => {
  await seedApiMode(page)
  await dismissCookies(page)
  const api = await routeApi(page)

  await page.goto('/app/pokladna')
  await addPivo(page)

  // Síť spadne až v okamžiku odeslání — prohlížeč to ještě neví, request tedy odejde a selže.
  api.setNetworkDown(true)
  await payCash(page)
  await expect(page.getByText(/Doklad k doúčtování/i)).toBeVisible()
  await page.getByRole('button', { name: 'Hotovo' }).click()

  // Síť se vrátí — prohlížeč ohlásí připojení a fronta se odešle sama.
  api.setNetworkDown(false)
  await page.context().setOffline(true)
  await page.context().setOffline(false)

  await expect(page.getByTestId('pos-queue-status')).toBeHidden({ timeout: 30_000 })
  // Dva pokusy o odeslání, ale VŽDY týž klíč → na serveru vznikne jediný prodej.
  expect(api.posts.length).toBeGreaterThanOrEqual(2)
  expect(new Set(api.posts.map((p) => p.idempotencyKey)).size).toBe(1)
})

test('prodej do mezitím uzavřeného dne skončí srozumitelnou hláškou a zůstane ve frontě', async ({
  page,
}) => {
  await seedApiMode(page)
  await dismissCookies(page)
  const api = await routeApi(page)

  await page.goto('/app/pokladna')
  await addPivo(page)
  await goOffline(page, api)
  await payCash(page)
  await page.getByRole('button', { name: 'Hotovo' }).click()

  api.setSaleStatus(409)
  await goOnline(page, api)

  await expect(page.getByTestId('pos-queue-status')).toContainText(/odmítl/i, { timeout: 30_000 })
  // Účtenka NIKDY nezmizí — čeká na rozhodnutí vedoucího.
  await expect(page.getByTestId('pos-queue-status')).toContainText('1')
})

test('po tvrdém refreshi během offline provozu přežije fronta i ceník', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)
  const api = await routeApi(page)

  await page.goto('/app/pokladna')
  await expect(page.getByRole('button', { name: new RegExp(pivo.name) })).toBeVisible()
  await addPivo(page)
  await goOffline(page, api)
  await payCash(page)
  await page.getByRole('button', { name: 'Hotovo' }).click()

  // Aplikace se načte (PWA shell), ale API je pořád nedostupné — přesně stav baru bez konektivity.
  await page.context().setOffline(false)
  await page.reload()

  // Fronta i ceník žijí v IndexedDB, ne v paměti záložky.
  await expect(page.getByTestId('pos-queue-status')).toContainText('1')
  await expect(page.getByRole('button', { name: new RegExp(pivo.name) })).toBeVisible()
})

test('offline nenabízí kartu — obsluha to ví předem, ne až u terminálu', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)
  const api = await routeApi(page)

  await page.goto('/app/pokladna')
  await addPivo(page)
  await goOffline(page, api)

  await page.getByRole('button', { name: 'Zaplatit' }).click()
  await expect(page.getByTestId('payment-card-unavailable')).toContainText('hotovost')
  await expect(page.getByRole('button', { name: /Kartou/ })).toBeDisabled()
})
