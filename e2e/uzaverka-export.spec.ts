import { readFile } from 'node:fs/promises'
import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
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
  id: 'loc-1',
  name: 'Bistro Praha',
  address: 'Testovací 1, Praha',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const closedDay = {
  status: 'Closed',
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
        modules: ['core', 'pos', 'gastro', 'stock', 'reporting'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}

test('uzávěrka stáhne měsíční souhrn Z-reportů s celkovým řádkem', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/locations') {
      return route.fulfill({ json: { items: [location], total: 1, page: 1, pageSize: 100 } })
    }
    if (method === 'GET' && path.startsWith('/day-close/')) {
      return route.fulfill({ json: closedDay })
    }
    if (method === 'GET' && path === '/day-close') {
      expect(url.searchParams.get('from')).toBe('2026-07-01')
      expect(url.searchParams.get('to')).toBe('2026-07-31')
      expect(url.searchParams.get('locationId')).toBe('loc-1')
      return route.fulfill({
        json: {
          items: [
            closedDay,
            {
              ...closedDay,
              date: '2026-07-06',
              zReportNumber: 13,
              saleCount: 2,
              totalNet: 500,
              totalVat: 105,
              total: 605,
              cashTotal: 100,
              cardTotal: 505,
              tipTotal: 0,
              discountTotal: 10,
              cancelledCount: 0,
              cancelledTotal: 0,
              cashDifference: 5,
            },
          ],
          total: 2,
          page: 1,
          pageSize: 100,
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/uzaverka')
  await page.locator('#uzaverka-date').fill('2026-07-05')
  await expect(page.getByText('Z-report č. 12')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export měsíc souhrn CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('z-reporty-souhrn-2026-07.csv')
  const path = await download.path()
  expect(path).toBeTruthy()
  const csv = await readFile(path!, 'utf8')

  expect(csv).toContain('Datum;Pobočka;Z-report;Účtenek')
  expect(csv).toContain('2026-07-05;Bistro Praha;12;3;1000;210;1210')
  expect(csv).toContain('2026-07-06;Bistro Praha;13;2;500;105;605')
  expect(csv).toContain('CELKEM;;;5;1500;315;1815')
})

test('uzávěrka stáhne měsíční účetní CSV pro uzavřené Z-reporty', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') return route.fulfill({ json: company })
    if (method === 'GET' && path === '/locations') {
      return route.fulfill({ json: { items: [location], total: 1, page: 1, pageSize: 100 } })
    }
    if (method === 'GET' && path.startsWith('/day-close/')) {
      return route.fulfill({ json: closedDay })
    }
    if (method === 'GET' && path === '/day-close') {
      expect(url.searchParams.get('from')).toBe('2026-07-01')
      expect(url.searchParams.get('to')).toBe('2026-07-31')
      expect(url.searchParams.get('locationId')).toBe('loc-1')
      return route.fulfill({
        json: {
          items: [
            closedDay,
            {
              ...closedDay,
              date: '2026-07-06',
              zReportNumber: 13,
              saleCount: 2,
              totalNet: 500,
              totalVat: 105,
              total: 605,
              cashTotal: 100,
              cardTotal: 505,
              tipTotal: 0,
              discountTotal: 10,
              cancelledCount: 0,
              cancelledTotal: 0,
              cashDifference: 5,
              vatBreakdown: [{ vatRate: 21, net: 500, vat: 105, gross: 605 }],
            },
          ],
          total: 2,
          page: 1,
          pageSize: 100,
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/uzaverka')
  await page.locator('#uzaverka-date').fill('2026-07-05')
  await expect(page.getByText('Z-report č. 12')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export měsíc účetní CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('z-reporty-ucetni-2026-07.csv')
  const path = await download.path()
  expect(path).toBeTruthy()
  const csv = await readFile(path!, 'utf8')

  expect(csv).toContain('Datum;Pobočka;Z-report;Sekce;Položka;Sazba DPH')
  expect(csv).toContain('2026-07-05;Bistro Praha;12;Tržba;DPH 21 %;21;;1000;210;1210')
  expect(csv).toContain('2026-07-05;Bistro Praha;12;Platby;Hotovost;;;;;500;CZK')
  expect(csv).toContain('2026-07-05;Bistro Praha;12;Korekce tržeb;Storna;;1;;;-99')
  expect(csv).toContain('2026-07-06;Bistro Praha;13;Tržba;DPH 21 %;21;;500;105;605')
})
