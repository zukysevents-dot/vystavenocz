import { test, expect } from './fixtures/test'
import type { Page, Route } from '@playwright/test'

// GAP 2 — Účtárna v API režimu:
//  - CSV přehled vystačí s hlavičkovými součty z list-summary (subtotal/vatTotal) — bez dotahování řádků.
//  - ISDOC potřebuje řádky, a list-summary je nemá → export nejdřív dotáhne plný detail (GET /invoices/{id}),
//    teprve pak vygeneruje soubor.

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
      'vystaveno.subscription.v1',
      JSON.stringify({ active: true, plan: 'pro', trialEndsAt: null, subscriptionUntil: null }),
    )
    localStorage.setItem(
      'vystaveno.cookieConsent.v1',
      JSON.stringify({ necessary: true, analytics: false, decidedAt: '2026-07-09T00:00:00.000Z' }),
    )
  }, MODULES)
}

// List-summary: řádky NEnese, ale nese hlavičkové součty (subtotal/vatTotal/total) pro CSV.
const INVOICE_SUMMARY = {
  items: [
    {
      id: 'inv-1',
      number: 'FA-2026-0001',
      status: 'Issued',
      documentType: 'Invoice',
      clientId: 'cli-1',
      clientName: 'Acme s.r.o.',
      issueDate: '2026-07-05',
      dueDate: '2026-07-19',
      subtotal: 10000,
      vatTotal: 2100,
      total: 12100,
      currency: 'CZK',
    },
  ],
  total: 1,
}

// Plný detail — nese řádky (lines) potřebné pro ISDOC.
const INVOICE_DETAIL = {
  ...INVOICE_SUMMARY.items[0],
  isVatPayer: true,
  taxableSupplyDate: '2026-07-05',
  supplierName: 'E2E s.r.o.',
  supplierIco: '12345678',
  supplierDic: 'CZ12345678',
  supplierAddress: { street: 'Testovací 1', city: 'Praha', postalCode: '11000', country: 'CZ' },
  clientIco: '27604977',
  clientDic: 'CZ27604977',
  clientAddress: { street: 'Klientská 2', city: 'Brno', postalCode: '60200', country: 'CZ' },
  lines: [
    {
      id: 'ln-1',
      description: 'Práce',
      unit: 'h',
      quantity: 10,
      unitPrice: 1000,
      vatRate: 21,
      sortOrder: 0,
      lineBase: 10000,
      lineVat: 2100,
      lineTotal: 12100,
    },
  ],
}

async function routeApp(page: Page, detailHits: string[]): Promise<void> {
  await page.route(API, async (route: Route) => {
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
    if (method === 'GET' && path === '/locations')
      return route.fulfill({ json: { items: [{ id: 'loc1', name: 'Praha' }], total: 1 } })

    // Plný detail dokladu — ISDOC ho v API režimu dotahuje kvůli řádkům.
    if (method === 'GET' && path === '/invoices/inv-1') {
      detailHits.push(path)
      return route.fulfill({ json: INVOICE_DETAIL })
    }
    if (method === 'GET' && path === '/invoices') return route.fulfill({ json: INVOICE_SUMMARY })

    return route.fulfill({ status: 404, json: { title: `Unhandled ${method} ${path}` } })
  })
}

test('Účtárna: ISDOC v API režimu dotáhne detail (řádky) a stáhne soubor', async ({ page }) => {
  const detailHits: string[] = []
  await seedApiSession(page)
  await routeApp(page, detailHits)

  await page.goto('/app/uctarna')
  await expect(page.getByRole('heading', { name: 'Účtárna' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'FA-2026-0001' })).toBeVisible()

  // Klik na ISDOC v desktop tabulce → dotažení detailu + stažení souboru.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page
      .getByRole('row', { name: /FA-2026-0001/ })
      .getByRole('button', { name: 'ISDOC' })
      .click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.isdoc$/)
  expect(detailHits).toContain('/invoices/inv-1')
})

test('Účtárna: CSV přehled vystačí s hlavičkovými součty summary (bez dotažení řádků)', async ({
  page,
}) => {
  const detailHits: string[] = []
  await seedApiSession(page)
  await routeApp(page, detailHits)

  await page.goto('/app/uctarna')
  await expect(page.getByRole('heading', { name: 'Účtárna' })).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('faktury-vse.csv')
  // CSV se skládá jen z hlavičkových dat → detail se kvůli němu nedotahoval.
  expect(detailHits).toEqual([])
})
