import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

/**
 * Znovuotevření omylem zavřené uzávěrky (web).
 *
 * Autoritativní je server — testy proto ověřují, že UI nikdy nepřepne stav samo:
 * akce nejde jedním klikem, důvod je povinný, dvojklik pošle jeden request,
 * chyba nesmí vyrobit falešný úspěch a bez oprávnění se akce vůbec nenabízí.
 */

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
  id: 'loc-1',
  name: 'Bistro Praha',
  address: 'Testovací 1, Praha',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const closedDay = {
  status: 'Closed',
  id: 'dc-1',
  date: '2026-07-05',
  locationId: 'loc-1',
  zReportNumber: 12,
  closedAt: '2026-07-05T21:00:00Z',
  saleCount: 3,
  totalNet: 1000,
  totalVat: 210,
  total: 1210,
  cashTotal: 500,
  cardTotal: 710,
  tipTotal: 40,
  discountTotal: 25,
  cancelledCount: 1,
  cancelledTotal: 99,
  cashDifference: -10,
  vatBreakdown: [{ vatRate: 21, net: 1000, vat: 210, gross: 1210 }],
  productBreakdown: [],
}

const reopenedDay = {
  ...closedDay,
  status: 'Reopened',
  reopenedAt: '2026-07-05T21:30:00Z',
  reopenedByUserId: 'u_e2e',
  reopenedByName: 'Jana Nováková',
  reopenReason: 'Uzávěrka byla provedena omylem',
}

async function seedApiMode(page: Page, role = 'Owner'): Promise<void> {
  await page.addInitScript((r) => {
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
        role: r,
        modules: ['core', 'pos', 'gastro', 'stock', 'reporting'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  }, role)
}

/** Namockuje minimální API stránky Uzávěrka; `dayState` řídí, co vrací GET /day-close/{date}. */
async function routeApi(
  page: Page,
  options: {
    dayState: () => unknown
    onReopen?: (route: Route) => Promise<void> | void
    reopenCalls?: { count: number; bodies: unknown[] }
  },
): Promise<void> {
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/locations') {
      return route.fulfill({ json: { items: [location], total: 1, page: 1, pageSize: 100 } })
    }
    if (method === 'POST' && path === '/day-close/dc-1/reopen') {
      if (options.reopenCalls) {
        options.reopenCalls.count += 1
        options.reopenCalls.bodies.push(request.postDataJSON())
      }
      if (options.onReopen) return options.onReopen(route)
      return route.fulfill({ json: reopenedDay })
    }
    if (method === 'GET' && path.startsWith('/day-close/')) {
      return route.fulfill({ json: options.dayState() })
    }
    // Živý přehled znovuotevřeného dne (useSalesReport) — prázdná, ale platná data.
    if (method === 'GET' && path === '/sales/summary') {
      return route.fulfill({
        json: { count: 0, totalNet: 0, totalVat: 0, total: 0, cashTotal: 0, cardTotal: 0 },
      })
    }
    if (
      method === 'GET' &&
      (path === '/sales' || path === '/day-close' || path === '/products' || path === '/categories')
    ) {
      return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 100 } })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('majitel znovu otevře omylem zavřenou uzávěrku a uvidí důvod, kdo a kdy', async ({ page }) => {
  let state: unknown = closedDay
  const reopenCalls = { count: 0, bodies: [] as unknown[] }
  await seedApiMode(page)
  await dismissCookies(page)
  await routeApi(page, {
    dayState: () => state,
    reopenCalls,
    onReopen: (route) => {
      state = reopenedDay // server je zdroj pravdy — až po jeho odpovědi se mění UI
      return route.fulfill({ json: reopenedDay })
    },
  })

  await page.goto('/app/uzaverka')
  await page.locator('#uzaverka-date').fill('2026-07-05')
  await expect(page.getByText('Z-report č. 12')).toBeVisible()

  // Akce neproběhne jedním kliknutím — otevře se potvrzovací dialog.
  await page.getByTestId('uzaverka-reopen').click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Znovu otevřít uzávěrku?')).toBeVisible()
  await expect(dialog.getByText(/vrátí do rozpracovaného stavu/)).toBeVisible()
  await expect(dialog.getByText(/zapíše do auditu/)).toBeVisible()
  expect(reopenCalls.count).toBe(0)

  await page.getByTestId('uzaverka-reopen-reason').fill('Uzávěrka byla provedena omylem')
  await page.getByTestId('uzaverka-reopen-confirm').click()

  const banner = page.getByTestId('uzaverka-reopened-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Znovuotevřená')
  await expect(banner).toContainText('Uzávěrka byla provedena omylem')
  await expect(banner).toContainText('Jana Nováková')
  // Uživatel ví, co dál — den je zase rozpracovaný a jde provést novou uzávěrku.
  await expect(page.getByRole('button', { name: 'Provést novou uzávěrku' })).toBeVisible()

  expect(reopenCalls.count).toBe(1)
  expect(reopenCalls.bodies[0]).toEqual({ reason: 'Uzávěrka byla provedena omylem' })
})

test('bez důvodu se uzávěrka neotevře a na server nejde žádný request', async ({ page }) => {
  const reopenCalls = { count: 0, bodies: [] as unknown[] }
  await seedApiMode(page)
  await dismissCookies(page)
  await routeApi(page, { dayState: () => closedDay, reopenCalls })

  await page.goto('/app/uzaverka')
  await page.locator('#uzaverka-date').fill('2026-07-05')
  await page.getByTestId('uzaverka-reopen').click()
  await page.getByTestId('uzaverka-reopen-confirm').click()

  await expect(page.getByText(/Napište alespoň pěti znaky/)).toBeVisible()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  expect(reopenCalls.count).toBe(0)
  // Stav uzávěrky se nezměnil.
  await expect(page.getByTestId('uzaverka-reopened-banner')).toHaveCount(0)
})

test('dvojklik na potvrzení pošle jen jeden požadavek', async ({ page }) => {
  let state: unknown = closedDay
  const reopenCalls = { count: 0, bodies: [] as unknown[] }
  await seedApiMode(page)
  await dismissCookies(page)
  await routeApi(page, {
    dayState: () => state,
    reopenCalls,
    onReopen: async (route) => {
      await new Promise((r) => setTimeout(r, 600)) // pomalá odpověď = okno pro druhý klik
      state = reopenedDay
      await route.fulfill({ json: reopenedDay })
    },
  })

  await page.goto('/app/uzaverka')
  await page.locator('#uzaverka-date').fill('2026-07-05')
  await page.getByTestId('uzaverka-reopen').click()
  await page.getByTestId('uzaverka-reopen-reason').fill('Uzávěrka byla provedena omylem')

  const confirm = page.getByTestId('uzaverka-reopen-confirm')
  await confirm.click()
  // Během zpracování je potvrzení neaktivní a hlásí stav.
  await expect(confirm).toBeDisabled()
  await expect(confirm).toContainText('Zpracovávám')
  await confirm.click({ force: true })

  await expect(page.getByTestId('uzaverka-reopened-banner')).toBeVisible()
  expect(reopenCalls.count).toBe(1)
})

test('zamítnutí serverem nevyrobí falešný úspěch a ukáže konkrétní důvod', async ({ page }) => {
  test.info().annotations.push({ type: 'allowConsoleError', description: 'status of 409' })
  await seedApiMode(page)
  await dismissCookies(page)
  await routeApi(page, {
    dayState: () => closedDay,
    onReopen: (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/problem+json',
        json: {
          title: 'Conflict',
          status: 409,
          detail:
            'Uzávěrku nelze znovu otevřít, protože pro tuto pobočku už existuje novější uzávěrka.',
        },
      }),
  })

  await page.goto('/app/uzaverka')
  await page.locator('#uzaverka-date').fill('2026-07-05')
  await page.getByTestId('uzaverka-reopen').click()
  await page.getByTestId('uzaverka-reopen-reason').fill('Uzávěrka byla provedena omylem')
  await page.getByTestId('uzaverka-reopen-confirm').click()

  await expect(page.getByText(/už existuje novější uzávěrka/)).toBeVisible()
  // Den zůstal uzavřený — žádný lokální „úspěch".
  await expect(page.getByText('Z-report č. 12')).toBeVisible()
  await expect(page.getByTestId('uzaverka-reopened-banner')).toHaveCount(0)
})

test('vedoucí směny ani obsluha akci nevidí', async ({ page }) => {
  await seedApiMode(page, 'Manager')
  await dismissCookies(page)
  await routeApi(page, { dayState: () => closedDay })

  await page.goto('/app/uzaverka')
  await page.locator('#uzaverka-date').fill('2026-07-05')
  await expect(page.getByText('Z-report č. 12')).toBeVisible()
  await expect(page.getByTestId('uzaverka-reopen')).toHaveCount(0)
})
