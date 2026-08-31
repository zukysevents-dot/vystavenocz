import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// Způsob úhrady faktury (2026-08-31): backend `Invoice.PaymentMethod` je serverové pole, takže
// se v API režimu na KONCEPTU normálně edituje (dřív bylo zamčené na „Převodem", protože ho
// entita neuměla uložit — hlášeno z ostrého testu). Vystavený doklad ho má zmražený jako zbytek
// hlavičky. Uložení musí zvolenou hodnotu poslat serveru (`paymentMethod` v PUT payloadu).

const API = '**/api/v1/**'
const MODULES = ['core', 'invoicing']

async function seedApiSession(page: Page): Promise<void> {
  await page.addInitScript((mods) => {
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
        modules: mods,
        features: [],
      }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, MODULES)
}

// Plný backend detail (InvoiceApiResponse) — koncept s jedním řádkem se serverovým id.
function invoiceDetail(over: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    number: null,
    status: 'Draft',
    documentType: 'Invoice',
    parentInvoiceId: null,
    clientId: 'cli-1',
    clientName: 'Acme s.r.o.',
    supplierName: 'E2E s.r.o.',
    isVatPayer: true,
    currency: 'CZK',
    issueDate: null,
    dueDate: '2026-09-14',
    taxableSupplyDate: null,
    paymentMethod: 'bank_transfer',
    subtotal: 1000,
    vatTotal: 210,
    total: 1210,
    paidAmount: 0,
    outstandingAmount: 1210,
    note: null,
    lines: [
      {
        id: 'it-1',
        description: 'Práce',
        unit: 'ks',
        quantity: 1,
        unitPrice: 1000,
        vatRate: 21,
        sortOrder: 0,
        lineBase: 1000,
        lineVat: 210,
        lineTotal: 1210,
      },
    ],
    vatSummary: [],
    payments: [],
    createdAt: '2026-08-31T08:00:00Z',
    updatedAt: '2026-08-31T08:00:00Z',
    ...over,
  }
}

interface HeaderPutCapture {
  paymentMethod?: string
}

function routeApp(
  page: Page,
  detail: Record<string, unknown>,
  capturedPuts: HeaderPutCapture[],
): Promise<void> {
  return page.route(API, async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const method = route.request().method()

    if (method === 'GET' && path === '/me')
      return route.fulfill({
        json: {
          userId: 'u_e2e',
          email: 'e2e@vystaveno.cz',
          displayName: 'E2E Test',
          companyId: 'c_e2e',
          role: 'Owner',
          modules: MODULES,
          features: [],
        },
      })
    if (method === 'GET' && path === '/company/modules')
      return route.fulfill({ json: { modules: MODULES } })
    if (method === 'GET' && path === '/company')
      return route.fulfill({ json: { id: 'c_e2e', companyName: 'E2E s.r.o.', currency: 'CZK' } })
    if (method === 'GET' && path === '/clients')
      return route.fulfill({
        json: { items: [{ id: 'cli-1', name: 'Acme s.r.o.', defaultPaymentDays: 14 }], total: 1 },
      })
    if (method === 'GET' && path === '/invoices')
      return route.fulfill({ json: { items: [], total: 0 } })
    if (method === 'GET' && path === '/invoices/inv-1') return route.fulfill({ json: detail })

    // Uložení konceptu: PUT hlavičky (tady se ověřuje paymentMethod) + /items synchronizace.
    if (method === 'PUT' && path === '/invoices/inv-1') {
      const body = route.request().postDataJSON() as HeaderPutCapture
      capturedPuts.push(body)
      return route.fulfill({
        json: invoiceDetail({ paymentMethod: body.paymentMethod ?? 'bank_transfer' }),
      })
    }
    if (path.startsWith('/invoices/inv-1/items')) return route.fulfill({ json: detail })

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('API režim: způsob úhrady jde na konceptu změnit a uložení ho pošle serveru', async ({
  page,
}) => {
  const capturedPuts: HeaderPutCapture[] = []
  await seedApiSession(page)
  await routeApp(page, invoiceDetail(), capturedPuts)

  await page.goto('/app/faktury/editor?id=inv-1')

  // Pole je editovatelný výběr (dřív jen šedý text „Převodem").
  const select = page.locator('#inv-payment')
  await expect(select).toBeVisible()
  await select.click()
  await page.getByRole('option', { name: 'Hotově' }).click()

  await page.getByRole('button', { name: 'Uložit koncept' }).click()

  // Server dostal zvolenou hodnotu.
  await expect.poll(() => capturedPuts.length).toBeGreaterThan(0)
  expect(capturedPuts[0].paymentMethod).toBe('cash')
})

test('API režim: vystavený doklad má způsob úhrady jen ke čtení (serverová hodnota)', async ({
  page,
}) => {
  const capturedPuts: HeaderPutCapture[] = []
  await seedApiSession(page)
  await routeApp(
    page,
    invoiceDetail({ status: 'Issued', number: 'FA-2026-0001', paymentMethod: 'cash' }),
    capturedPuts,
  )

  await page.goto('/app/faktury/editor?id=inv-1')

  // Zamčený doklad: žádný select, jen text se serverovou hodnotou.
  await expect(page.getByText('Doklad je vystavený, proto se už needituje.')).toBeVisible()
  await expect(page.locator('button#inv-payment')).toHaveCount(0)
  await expect(page.getByText('Hotově', { exact: true })).toBeVisible()
})
