import { test, expect } from './fixtures/test'
import { seedApp } from './helpers/seed'
import type { Route } from '@playwright/test'

const API = '**/api/v1/**'

test('nastavení firmy se promítne do nové faktury (číslo + splatnost)', async ({ page }) => {
  await seedApp(page, {
    subscription: 'pro',
    company: { invoiceNumberPrefix: 'TEST', nextInvoiceSeq: 7, defaultPaymentDays: 30 },
  })
  await page.goto('/app/faktury/editor')

  const year = new Date().getFullYear()
  await expect(page.locator('#inv-number')).toHaveValue(`TEST-${year}-0007`)

  const due = new Date()
  due.setDate(due.getDate() + 30)
  await expect(page.locator('#inv-due')).toHaveValue(due.toISOString().slice(0, 10))
})

test('výchozí splatnost 0 dní → splatnost = datum vystavení', async ({ page }) => {
  await seedApp(page, { subscription: 'pro', company: { defaultPaymentDays: 0 } })
  await page.goto('/app/faktury/editor')

  const issue = await page.locator('#inv-issue').inputValue()
  await expect(page.locator('#inv-due')).toHaveValue(issue)
})

test('nastavení ukáže pravdivý stav integrací a exportů', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/nastaveni')

  await expect(page.getByRole('heading', { name: 'Nastavení firmy' })).toBeVisible()
  await expect(page.getByText('Integrace a exporty')).toBeVisible()

  await expect(page.getByText('Faktury do účetnictví')).toBeVisible()
  await expect(page.getByText('Účtárna umí exportovat faktury jako ISDOC XML')).toBeVisible()
  await expect(page.getByText('Gastro Z-reporty')).toBeVisible()
  await expect(page.getByText('denní i měsíční účetní CSV')).toBeVisible()

  await expect(page.getByText('Platební terminál')).toBeVisible()
  await expect(page.getByText('Účtenky a kuchyňské bony')).toBeVisible()
  await expect(page.getByText('Manuální krok')).toHaveCount(2)
  await expect(page.getByText('Čeká na konektor')).toBeVisible()
  await expect(page.getByText('POHODA / Flexi')).toBeVisible()
  await expect(page.getByText('Exportní režim')).toBeVisible()
  await expect(page.getByText('Generic CSV export běží')).toBeVisible()
  await expect(page.getByText('Partnerské API')).toBeVisible()
  await expect(page.getByText('Plánováno')).toBeVisible()
})

test('nastavení v API režimu ukáže živý stav integrací a stáhne účetní export', async ({
  page,
}) => {
  await seedApiMode(page)

  let exportQuery = ''
  await page.route(API, async (route: Route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (method === 'GET' && path === '/company') {
      return route.fulfill({
        json: {
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
        },
      })
    }
    if (method === 'GET' && path === '/company/modules') {
      return route.fulfill({
        json: { modules: ['core', 'invoicing', 'pos', 'gastro', 'reporting', 'integrations'] },
      })
    }
    if (method === 'GET' && path === '/locations') {
      return route.fulfill({
        json: {
          items: [{ id: 'loc-1', name: 'Bistro Praha', address: null, isActive: true }],
          total: 1,
          page: 1,
          pageSize: 100,
        },
      })
    }
    if (method === 'GET' && path === '/integrations/terminal-payments') {
      const pendingOnly = url.searchParams.get('status') === 'Pending'
      return route.fulfill({
        json: {
          items: pendingOnly
            ? []
            : [
                {
                  id: 'pay-1',
                  provider: 'manual',
                  status: 'Succeeded',
                  amount: 209,
                  currency: 'CZK',
                  orderId: null,
                  locationId: 'loc-1',
                  reference: 'order-1-card',
                  providerReference: null,
                  failureReason: null,
                  createdAt: '2026-07-08T12:00:00Z',
                  updatedAt: '2026-07-08T12:01:00Z',
                },
              ],
          total: pendingOnly ? 2 : 1,
          page: 1,
          pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        },
      })
    }
    if (method === 'GET' && path === '/integrations/print-jobs') {
      const queuedOnly = url.searchParams.get('status') === 'Queued'
      return route.fulfill({
        json: {
          items: queuedOnly
            ? []
            : [
                {
                  id: 'print-1',
                  type: 'KitchenTicket',
                  status: 'Queued',
                  printer: 'kitchen',
                  payload: 'Burger',
                  relatedOrderId: 'order-1',
                  relatedSaleId: null,
                  relatedDayCloseId: null,
                  locationId: 'loc-1',
                  failureReason: null,
                  createdAt: '2026-07-08T12:02:00Z',
                  updatedAt: '2026-07-08T12:02:00Z',
                },
              ],
          total: queuedOnly ? 1 : 1,
          page: 1,
          pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        },
      })
    }
    if (method === 'GET' && path === '/integrations/exports') {
      exportQuery = url.search
      return route.fulfill({
        json: {
          type: 'ZReports',
          target: 'Generic',
          format: 'Csv',
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
          locationId: url.searchParams.get('locationId'),
          rowCount: 1,
          totalNet: 100,
          totalVat: 21,
          total: 121,
          rows: [],
          contentType: 'text/csv',
          fileName: 'zreports.csv',
          content: 'DocumentType;DocumentNumber;Total\nz-report;Z1;121\n',
        },
      })
    }

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })

  await page.goto('/app/nastaveni')

  await expect(page.getByText('Účetní export')).toBeVisible()
  await expect(page.getByText('2 plateb čeká')).toBeVisible()
  await expect(page.getByText('1 tisků čeká')).toBeVisible()
  await expect(page.getByText('209,00 Kč')).toBeVisible()
  await expect(page.getByText('Bon', { exact: true })).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Stáhnout CSV' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('zreports.csv')
  expect(exportQuery).toContain('type=ZReports')
  expect(exportQuery).toContain('target=Generic')
  expect(exportQuery).toContain('format=Csv')
})

test('veřejný slug se normalizuje pro online objednávky a QR stoly', async ({ page }) => {
  await seedApp(page, { subscription: 'pro' })
  await page.goto('/app/nastaveni')

  await page.locator('#public_slug').fill('  Žluťoučký Bistro 2026!!  ')
  await page.locator('#public_slug').blur()

  await expect(page.locator('#public_slug')).toHaveValue('zlutoucky-bistro-2026')
  await expect(page.getByText(/\/objednavka\/zlutoucky-bistro-2026/)).toBeVisible()

  await page.getByRole('button', { name: 'Uložit nastavení' }).click()
  await expect(page.getByText('Nastavení uloženo')).toBeVisible()

  const storedSlug = await page.evaluate(() => {
    const raw = localStorage.getItem('vystaveno.company.v1')
    return raw ? JSON.parse(raw).publicSlug : null
  })
  expect(storedSlug).toBe('zlutoucky-bistro-2026')
})

async function seedApiMode(page: Parameters<typeof seedApp>[0]): Promise<void> {
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
        modules: ['core', 'invoicing', 'pos', 'gastro', 'reporting', 'integrations'],
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
  })
}
