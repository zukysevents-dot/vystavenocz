import { test, expect, type Page } from './fixtures/test'
import type { Route } from '@playwright/test'
import { dismissCookies } from './helpers/cookies'

const API = '**/api/v1/**'

const company = {
  id: 'company-1',
  name: 'Export Bistro',
  ico: '12345678',
  dic: null,
  email: 'test@example.com',
  phone: null,
  logoUrl: null,
  defaultDueDays: 14,
  currency: 'CZK',
  address: { street: 'Testovací 1', city: 'Praha', postalCode: '11000', country: 'CZ' },
  bankAccount: { accountNumber: '123456789/0100', iban: null, bic: null },
  publicSlug: 'export-bistro',
}

const sales = [
  {
    id: 'sale-cash',
    soldAt: '2026-07-10T10:00:00.000Z',
    paymentMethod: 'Cash',
    status: 'Completed',
    totalNet: 100,
    totalVat: 21,
    total: 121,
    tipAmount: 10,
    discountPercent: 0,
  },
  {
    id: 'sale-card',
    soldAt: '2026-07-11T10:00:00.000Z',
    paymentMethod: 'Card',
    status: 'Cancelled',
    totalNet: 200,
    totalVat: 42,
    total: 242,
    tipAmount: 0,
    discountPercent: 5,
  },
]

function paged(items: unknown[], pageSize: number) {
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
        user: { id: 'user-1', email: 'test@example.com', fullName: 'Test Obsluha' },
        companyId: 'company-1',
        role: 'Owner',
        modules: ['core', 'pos'],
        features: [],
      }),
    )
  })
}

test('pokladna exportuje přesně vyfiltrované účtenky', async ({ page }) => {
  await seedApiMode(page)
  await dismissCookies(page)
  const salesRequests: string[] = []

  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')

    if (request.method() !== 'GET') {
      return route.fulfill({
        status: 404,
        json: { title: `Unhandled ${request.method()} ${path}` },
      })
    }
    if (path === '/company') return route.fulfill({ json: company })
    if (path === '/products') return route.fulfill({ json: paged([], 100) })
    if (path === '/categories') return route.fulfill({ json: paged([], 100) })
    if (path === '/locations') return route.fulfill({ json: paged([], 100) })
    if (path === '/sales/summary') {
      return route.fulfill({
        json: { count: 2, totalNet: 300, totalVat: 63, total: 363, cashTotal: 121, cardTotal: 242 },
      })
    }
    if (path === '/sales') {
      salesRequests.push(
        `${url.searchParams.get('from')}|${url.searchParams.get('to')}|${url.searchParams.get('paymentMethod')}|${url.searchParams.get('pageSize')}`,
      )
      const filtered = url.searchParams.get('paymentMethod') === 'Cash' ? [sales[0]] : sales
      return route.fulfill({
        json: paged(filtered, Number(url.searchParams.get('pageSize') ?? 50)),
      })
    }
    return route.fulfill({ status: 404, json: { title: `Unhandled GET ${path}` } })
  })

  await page.goto('/app/pokladna')
  await page.getByRole('button', { name: 'Tržby' }).click()
  await page.getByLabel('Od').fill('2026-07-01')
  await page.getByLabel('Do').fill('2026-07-31')
  await page.getByLabel('Platba').selectOption('Cash')
  await page.getByRole('button', { name: 'Použít filtr' }).click()

  await expect(page.getByText('121,00 Kč').last()).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('pokladni-uctenky-2026-07-01-2026-07-31.csv')
  expect(salesRequests).toContain('2026-07-01|2026-07-31|Cash|50')
  expect(salesRequests).toContain('2026-07-01|2026-07-31|Cash|100')
})
