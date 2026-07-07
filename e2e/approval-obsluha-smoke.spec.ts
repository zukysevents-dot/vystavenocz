import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

// Strana OBSLUHY u schvalování rizikových akcí: když backend vrátí 202 Accepted
// s ApprovalRequest místo běžného výsledku, obsluha nesmí dostat chybu — místo toho
// vidí toast „čeká na schválení managerem" a akce se NEprovede (čeká na manažera).
// Manažerskou frontu (SchvalovaniPage) pokrývá e2e/schvalovani.spec.ts.

const API = '**/api/v1/**'

function paged<T>(items: T[], pageSize = 50) {
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
  ean: null,
  salePrice: 89,
  vatRate: 21,
  purchasePrice: 120,
  minQuantity: 3,
  categoryId: null,
  allergens: [],
}

// Prodej, který obsluha zkusí stornovat (stav != Cancelled → má tlačítko Storno).
const completedSale = {
  id: 'sale-1',
  locationId: location.id,
  employeeId: null,
  paymentMethod: 'Card',
  status: 'Completed',
  discountPercent: 0,
  tipAmount: 0,
  cashReceived: null,
  cashChange: null,
  totalNet: 1033,
  totalVat: 217,
  total: 1250,
  soldAt: '2026-07-07T10:30:00.000Z',
  items: [],
}

const summary = {
  date: '2026-07-07',
  count: 1,
  totalNet: 1033,
  totalVat: 217,
  total: 1250,
  cashTotal: 0,
  cardTotal: 1250,
}

// Tělo, které backend vrátí s 202 místo Sale/StockMovement/Stocktake.
function approval(
  type: 'SaleStorno' | 'StockIssue' | 'Stocktake',
  text: string,
  estimatedValue: number,
) {
  return {
    id: `appr-${type}`,
    type,
    status: 'Pending',
    summary: text,
    estimatedValue,
    locationId: null,
    requestedByUserId: 'u_e2e',
    requestedByName: 'E2E Obsluha',
    createdAt: '2026-07-07T10:30:00.000Z',
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
        user: { id: 'u_e2e', email: 'e2e@vystaveno.cz', fullName: 'E2E Obsluha' },
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

// Společný router: obslouží GET, které stránky Pokladna/Zásoby čtou při načtení,
// a předané POST akce vrátí jako 202 + ApprovalRequest.
async function routeApi(
  page: Page,
  handlers: {
    onStorno?: (id: string) => void
    onIssue?: (body: Record<string, unknown>) => void
    onStocktake?: (body: Record<string, unknown>) => void
  } = {},
): Promise<void> {
  await page.route(API, async (route: Route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = req.method()

    if (method === 'GET') {
      if (path === '/company') return route.fulfill({ json: company })
      if (path === '/products') return route.fulfill({ json: paged([product]) })
      if (path === '/locations') return route.fulfill({ json: paged([location], 100) })
      if (path === '/categories') return route.fulfill({ json: paged([]) })
      if (path === '/inventory/stock-levels') {
        return route.fulfill({
          json: paged([
            {
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              quantity: 20,
              locationId: location.id,
            },
          ]),
        })
      }
      if (path === '/sales/summary') return route.fulfill({ json: summary })
      if (path === '/sales') return route.fulfill({ json: paged([completedSale]) })
    }

    if (method === 'POST') {
      const storno = path.match(/^\/sales\/(.+)\/storno$/)
      if (storno && handlers.onStorno) {
        handlers.onStorno(storno[1])
        return route.fulfill({
          status: 202,
          json: approval('SaleStorno', `Storno účtenky ${storno[1]}`, 1250),
        })
      }
      if (path === '/inventory/issues' && handlers.onIssue) {
        handlers.onIssue(req.postDataJSON())
        return route.fulfill({ status: 202, json: approval('StockIssue', 'Výdej Rum 0,04l', 480) })
      }
      if (path === '/inventory/stocktake' && handlers.onStocktake) {
        handlers.onStocktake(req.postDataJSON())
        return route.fulfill({ status: 202, json: approval('Stocktake', 'Inventura Bar', 900) })
      }
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('POS storno nad limit → 202: čeká na schválení a prodej zůstává aktivní', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  let stornoRequestedId: string | null = null
  await routeApi(page, {
    onStorno: (id) => {
      stornoRequestedId = id
    },
  })

  await page.goto('/app/pokladna')

  await page.getByRole('button', { name: 'Tržby' }).click()
  await expect(page.getByRole('heading', { name: 'Tržby' })).toBeVisible()

  await page.getByRole('button', { name: 'Storno', exact: true }).click()
  await expect(page.getByText('Stornovat prodej?')).toBeVisible()
  await page.getByRole('button', { name: 'Stornovat', exact: true }).click()

  await expect(page.getByText('Storno čeká na schválení managerem.')).toBeVisible()
  expect(stornoRequestedId).toBe('sale-1')

  // 202 = akce se NEprovedla hned: prodej zůstává aktivní (má dál tlačítko Storno,
  // není označen štítkem „Stornováno").
  await expect(page.getByRole('button', { name: 'Storno', exact: true })).toBeVisible()
  await expect(page.getByText('Stornováno')).toHaveCount(0)
})

test('Skladový výdej nad limit → 202: čeká na schválení', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  let issueBody: Record<string, unknown> | null = null
  await routeApi(page, {
    onIssue: (body) => {
      issueBody = body
    },
  })

  await page.goto('/app/zasoby')
  await expect(page.getByText('Rum 0,04l')).toBeVisible()

  await page.getByRole('button', { name: 'Výdej', exact: true }).click()
  await expect(page.getByText(/Výdej — Rum/)).toBeVisible()

  await page.getByLabel('Množství').fill('5')
  await page.getByRole('button', { name: 'Uložit', exact: true }).click()

  await expect(page.getByText('Výdej čeká na schválení managerem.')).toBeVisible()
  expect(issueBody).toMatchObject({ productId: 'prod-rum', quantity: 5, type: 'Issue' })

  // Dialog se po založení žádosti zavře.
  await expect(page.getByText(/Výdej — Rum/)).toBeHidden()
})

test('Inventura nad limit → 202: čeká na schválení', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  let stocktakeBody: Record<string, unknown> | null = null
  await routeApi(page, {
    onStocktake: (body) => {
      stocktakeBody = body
    },
  })

  await page.goto('/app/zasoby')
  await expect(page.getByText('Rum 0,04l')).toBeVisible()

  await page.getByRole('button', { name: 'Inventura', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Inventura' })).toBeVisible()

  await page.getByRole('button', { name: 'Uložit inventuru' }).click()

  await expect(page.getByText('Inventura čeká na schválení managerem.')).toBeVisible()
  expect(Array.isArray(stocktakeBody?.items)).toBe(true)
})
